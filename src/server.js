const _ = require('lodash');
const restify = require('restify');
const corsMiddleware = require('restify-cors-middleware');
const { spawn, spawnSync } = require('child_process');
const { execute, subscribe } = require('graphql');
const { SubscriptionServer } = require('subscriptions-transport-ws');
const fetch = require('node-fetch');
const portscanner = require('portscanner');

const { execFile } = require('./constants');
const {
  Config, setRunebaseEnv, getRunebasePath, isMainnet, getRPCPassword,
} = require('./config');
const { initDB } = require('./db');
const { initLogger, getLogger } = require('./utils/logger');
const EmitterHelper = require('./utils/emitterHelper');
const schema = require('./schema');
const syncRouter = require('./route/sync');
const apiRouter = require('./route/api');
const { startSync } = require('./sync');
const { getInstance } = require('./qclient');
const Wallet = require('./api/wallet');

const walletEncryptedMessage = 'Your wallet is encrypted. Please use a non-encrypted wallet for the server.';

let runebaseProcess;
let server;
let encryptOk = false;
let isEncrypted = false;
let checkInterval;
let checkApiInterval;
let shutdownInterval;

/*
* Shuts down the already running runebased and starts runebase-qt.
* @param runebaseqtPath {String} The full path to the runebase-qt binary.
*/
function startRunebaseWallet() {
  // Start runebase-qt
  const runebaseqtPath = `${getRunebasePath()}/${execFile.RUNEBASE_QT}`;
  getLogger().debug(`runebase-qt dir: ${runebaseqtPath}`);

  // Construct flags
  const flags = ['-logevents'];
  if (!isMainnet()) {
    flags.push('-testnet');
  }

  const qtProcess = spawn(runebaseqtPath, flags, {
    detached: true,
    stdio: 'ignore',
  });
  qtProcess.unref();
  getLogger().debug(`runebase-qt started on PID ${qtProcess.pid}`);

  // Kill backend process after runebase-qt has started
  setTimeout(() => process.exit(), 2000);
}

function getRunebaseProcess() {
  return runebaseProcess;
}

// Checks to see if the runebased port is still in use
function checkRunebasePort() {
  const port = isMainnet() ? Config.RPC_PORT_MAINNET : Config.RPC_PORT_TESTNET;
  portscanner.checkPortStatus(port, Config.HOSTNAME, (err, status) => {
    if (err) {
      getLogger().error(`Error: runebased: ${err.message}`);
    }
    if (status === 'closed') {
      clearInterval(shutdownInterval);

      // Slight delay before sending runebased killed signal
      setTimeout(() => EmitterHelper.onRunebaseKilled(), 1500);
    } else {
      getLogger().debug('Waiting for runebased to shut down.');
    }
  });
}

/*
* Kills the running runebase process using the stop command.
* @param emitEvent {Boolean} Flag to emit an event when runebase is fully shutdown.
*/
function killRunebaseProcess(emitEvent) {
  if (runebaseProcess) {
    const flags = [`-rpcuser=${Config.RPC_USER}`, `-rpcpassword=${getRPCPassword()}`];
    if (!isMainnet()) {
      flags.push('-testnet');
    }
    flags.push('stop');

    const runebasecliPath = `${getRunebasePath()}/${execFile.RUNEBASE_CLI}`;
    const res = spawnSync(runebasecliPath, flags);
    const code = res.status;
    if (res.stdout) {
      getLogger().debug(`runebased stopped with code ${code}: ${res.stdout}`);
    } else if (res.stderr) {
      getLogger().error(`runebased stopped with code ${code}: ${res.stderr}`);
      if (res.error) {
        throw Error(res.error.message);
      }
    }

    // Repeatedly check if runebase port is in use
    if (emitEvent) {
      shutdownInterval = setInterval(checkRunebasePort, 500);
    }
  }
}

async function unlockWallet(passphrase) {
  // Unlock wallet
  await Wallet.walletPassphrase({ passphrase, timeout: Config.UNLOCK_SECONDS });

  // Ensure wallet is unlocked
  const info = await Wallet.getWalletInfo();
  if (info.unlocked_until > 0) {
    getLogger().info('Wallet unlocked');
    startServices();
  } else {
    const errMessage = 'Wallet unlock failed';
    getLogger().error(errMessage);
    throw Error(errMessage);
  }
}

// Checks if the wallet is encrypted to prompt the wallet unlock dialog
async function checkWalletEncryption() {
  const res = await Wallet.getWalletInfo();
  isEncrypted = !_.isUndefined(res.unlocked_until);

  if (isEncrypted) {
    // For Electron, flag passed via Electron Builder
    if (encryptOk) {
      EmitterHelper.onWalletEncrypted();
      return;
    }

    let flagFound = false;
    _.each(process.argv, (arg) => {
      if (arg === '--encryptok') {
        // For Electron, flag passed via command-line
        EmitterHelper.onWalletEncrypted();
        flagFound = true;
      } else if (arg.startsWith('--passphrase=')) {
        // For dev purposes, unlock wallet directly in server
        const passphrase = (_.split(arg, '=', 2))[1];
        unlockWallet(passphrase);
        flagFound = true;
      }
    });
    if (flagFound) {
      return;
    }

    // No flags found to handle encryption, crash server
    EmitterHelper.onServerStartError(walletEncryptedMessage);
    throw Error(walletEncryptedMessage);
  } else {
    startServices();
  }
}

// Ensure runebased is running before starting sync/API
async function checkRunebasedInit() {
  try {
    // getInfo throws an error if trying to be called before runebased is running
    await getInstance().getInfo();

    // no error was caught, runebased is initialized
    clearInterval(checkInterval);
    checkWalletEncryption();
  } catch (err) {
    if (err.message === walletEncryptedMessage) {
      throw Error(err.message);
    } else {
      getLogger().debug(err.message);
    }
  }
}

function startRunebaseProcess(reindex) {
  try {
    const flags = ['-logevents', '-rpcworkqueue=32', `-rpcuser=${Config.RPC_USER}`, `-rpcpassword=${getRPCPassword()}`];
    if (!isMainnet()) {
      flags.push('-testnet');
    }
    if (reindex) {
      flags.push('-reindex');
    }

    const runebasedPath = `${getRunebasePath()}/${execFile.RUNEBASED}`;
    getLogger().info(`runebased dir: ${runebasedPath}`);

    runebaseProcess = spawn(runebasedPath, flags);
    getLogger().info(`runebased started on PID ${runebaseProcess.pid}`);

    runebaseProcess.stdout.on('data', (data) => {
      getLogger().debug(`runebased output: ${data}`);
    });

    runebaseProcess.stderr.on('data', (data) => {
      getLogger().error(`runebased failed with error: ${data}`);

      if (data.includes('You need to rebuild the database using -reindex-chainstate')) {
        // Clean old process first
        killRunebaseProcess(false);
        clearInterval(checkInterval);

        // Restart runebased with reindex flag
        setTimeout(() => {
          getLogger().info('Restarting and reindexing Runebase blockchain');
          startRunebaseProcess(true);
        }, 3000);
      } else {
        // Emit startup error event to Electron listener
        EmitterHelper.onRunebaseError(data.toString('utf-8'));

        // add delay to give some time to write to log file
        setTimeout(() => process.exit(), 500);
      }
    });

    runebaseProcess.on('close', (code) => {
      getLogger().debug(`runebased exited with code ${code}`);
    });

    // repeatedly check if runebased is running
    checkInterval = setInterval(checkRunebasedInit, 500);
  } catch (err) {
    throw Error(`runebased error: ${err.message}`);
  }
}

// Create Restify server and apply routes
async function startAPI() {
  server = restify.createServer({ title: 'RunebasePrediction API' });
  const cors = corsMiddleware({ origins: ['*'] });
  server.pre(cors.preflight);
  server.use(cors.actual);
  server.use(restify.plugins.bodyParser({ mapParams: true }));
  server.use(restify.plugins.queryParser());
  server.on('after', (req, res, route, err) => {
    if (route) {
      getLogger().debug(`${route.methods[0]} ${route.spec.path} ${res.statusCode}`);
    } else {
      getLogger().error(`${err.message}`);
    }
  });

  syncRouter.applyRoutes(server);
  apiRouter.applyRoutes(server);

  server.listen(Config.PORT, () => {
    SubscriptionServer.create(
      { execute, subscribe, schema },
      { server, path: '/subscriptions' },
    );
    getLogger().info(`RunebasePrediction API is running at http://${Config.HOSTNAME}:${Config.PORT}.`);
  });
}

// Ensure API is running before loading UI
async function checkApiInit() {
  try {
    const res = await fetch(`http://${Config.HOSTNAME}:${Config.PORT}/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"query":"{syncInfo{syncBlockNum,syncBlockTime,syncPercent,peerNodeCount}}"}',
    });

    if (res.status >= 200 && res.status < 300) {
      clearInterval(checkApiInterval);
      setTimeout(() => EmitterHelper.onApiInitialized(), 1000);
    }
  } catch (err) {
    getLogger().debug(err.message);
  }
}

function startServices() {
  startSync();
  startAPI();

  checkApiInterval = setInterval(checkApiInit, 500);
}

/*
* Sets the env and inits all the required processes.
* @param env {String} blockchainEnv var for mainnet or testnet.
* @param runebasePath {String} Full path to the Runebase execs folder.
* @param encryptionAllowed {Boolean} Are encrypted Runebase wallets allowed.
*/
async function startServer(env, runebasePath, encryptionAllowed) {
  try {
    encryptOk = encryptionAllowed;
    setRunebaseEnv(env, runebasePath);
    initLogger();
    await initDB();
    startRunebaseProcess(false);
  } catch (err) {
    EmitterHelper.onServerStartError(err.message);
  }
}

function getServer() {
  return server;
}

function exit(signal) {
  getLogger().info(`Received ${signal}, exiting...`);

  try {
    killRunebaseProcess(false);
  } catch (err) {
    // catch error so exit can still call process.exit()
  }

  // add delay to give some time to write to log file
  setTimeout(() => process.exit(), 500);
}

process.on('SIGINT', exit);
process.on('SIGTERM', exit);
process.on('SIGHUP', exit);

module.exports = {
  getRunebaseProcess,
  killRunebaseProcess,
  startServices,
  startServer,
  getServer,
  startRunebaseWallet,
};
