const { isEmpty, isUndefined, each, split } = require('lodash');
const { spawn, spawnSync } = require('child_process');
const portscanner = require('portscanner');

const { BIN_TYPE } = require('./constants');
const { Config, setRunebaseEnv, getEnvConfig, isMainnet, getRPCPassword } = require('./config');
const { initDB } = require('./db');
const { initLogger, getLogger } = require('./utils/logger');
const EmitterHelper = require('./utils/emitter-helper');
const { startSync } = require('./sync');
const { getInstance } = require('./qclient');
const { initApiServer } = require('./route');
const Wallet = require('./api/wallet');

const walletEncryptedMessage = 'Your wallet is encrypted. Please use a non-encrypted wallet for the server.';

let runebaseProcess;
let encryptOk = false;
let isEncrypted = false;
let checkInterval;
let shutdownInterval;

function getRunebaseProcess() {
  return runebaseProcess;
}

/**
 * Sets the env and inits all the required processes.
 * @param {string} env BLOCKCHAIN_ENV var for mainnet, testnet, or regtest.
 * @param {string} runebasePath Full path to the Runebase bin folder.
 * @param {boolean} encryptionAllowed Are encrypted Runebase wallets allowed.
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

/**
 * Starts the runebase daemon.
 * Will restart automatically if the chainstate is corrupted.
 * @param {boolean} reindex Should add the reindex flag when starting runebased.
 */
function startRunebaseProcess(reindex) {
  try {
    const flags = [
      '-deprecatedrpc=accounts',
      '-daemon',
      '-logevents',
      '-rpcworkqueue=32',
      `-rpcuser=${Config.RPC_USER}`,
      `-rpcpassword=${getRPCPassword()}`,
    ];
    if (!isMainnet()) {
      flags.push(`-${getEnvConfig().network}`);
    }
    if (reindex) {
      flags.push('-reindex');
    }
    if (!isEmpty(process.env.RUNEBASE_DATA_DIR)) {
      flags.push(`-datadir=${process.env.RUNEBASE_DATA_DIR}`);
    }

    const runebasedPath = `${getEnvConfig().runebasePath}/${BIN_TYPE.RUNEBASED}`;
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
    throw Error(`startRunebaseProcess: ${err.message}`);
  }
}

/**
 * Ensure runebased is running before starting sync/API.
 */
async function checkRunebasedInit() {
  try {
    // getInfo throws an error if trying to be called before runebased is running
    await getInstance().getBlockchainInfo();

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

/**
 * Checks if the wallet is encrypted to prompt the wallet unlock dialog.
 * Electron version only. Don't run remote version with encrypted wallet.
 */
async function checkWalletEncryption() {
  const res = await Wallet.getWalletInfo();
  isEncrypted = !isUndefined(res.unlocked_until);

  if (isEncrypted) {
    // For Electron, flag passed via Electron Builder
    if (encryptOk) {
      EmitterHelper.onWalletEncrypted();
      return;
    }

    let flagFound = false;
    each(process.argv, (arg) => {
      if (arg === '--encryptok') {
        // For Electron, flag passed via command-line
        EmitterHelper.onWalletEncrypted();
        flagFound = true;
      } else if (arg.startsWith('--passphrase=')) {
        // For dev purposes, unlock wallet directly in server
        const passphrase = (split(arg, '=', 2))[1];
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

/**
 * Used to unlock the wallet without having to use the Electron dialog.
 * The --passphrase flag with the passphrase must be passed via commandline.
 * @param {string} passphrase Passphrase to unlock wallet.
 */
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

/**
 * Starts the services following a successful runebased launch.
 */
function startServices() {
  startSync(true);
  initApiServer();
}

/**
 * Shuts down the already running runebased and starts runebase-qt.
 * Electron version only.
 */
function startRunebaseWallet() {
  // Start runebase-qt
  const runebaseqtPath = `${getEnvConfig().runebasePath}/${BIN_TYPE.RUNEBASE_QT}`;
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

/**
 * Checks to see if the runebased port is still in use.
 * This was necessary when switching from the dapp to the runebase wallet.
 */
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

/**
 * Kills the running runebase process using the stop command.
 * @param {boolean} emitEvent Should emit an event when runebase is fully shutdown.
 */
function killRunebaseProcess(emitEvent) {
  if (runebaseProcess) {
    const flags = [`-rpcuser=${Config.RPC_USER}`, `-rpcpassword=${getRPCPassword()}`];
    if (!isMainnet()) {
      flags.push(`-${getEnvConfig().network}`);
    }
    flags.push('stop');

    const runebasecliPath = `${getEnvConfig().runebasePath}/${BIN_TYPE.RUNEBASE_CLI}`;
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
process.on('uncaughtException', exit);

module.exports = {
  getRunebaseProcess,
  startServer,
  startServices,
  killRunebaseProcess,
  startRunebaseWallet,
  exit,
};
