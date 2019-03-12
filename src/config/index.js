const fs = require('fs');
const { includes, isEmpty, each, split, isNumber } = require('lodash');
const crypto = require('crypto');

const { BLOCKCHAIN_ENV } = require('../constants');
const mainnetMetadata = require('./mainnet/contract-metadata');
const testnetMetadata = require('./testnet/contract-metadata');

const API_PORT_MAINNET = 8990;
const API_PORT_TESTNET = 6768;
const API_PORT_REGTEST = 5556;

const EXPLORER_MAINNET = 'https://explorer.runebase.io';
const EXPLORER_TESTNET = 'https://testnet.runebase.io';

const { MAINNET, TESTNET, REGTEST } = BLOCKCHAIN_ENV;

const Config = {
  IS_DEV: includes(process.argv, '--dev'),
  PROTOCOL: includes(process.argv, '--local') ? 'http' : 'https',
  HOSTNAME: 'localhost',
  RPC_USER: 'runebaseprediction',
  RPC_PORT_TESTNET: 19432,
  RPC_PORT_MAINNET: 9432,
  DEFAULT_LOG_LEVEL: 'debug',
  CONTRACT_VERSION_NUM: 0,
  TRANSFER_MIN_CONFIRMATIONS: 1,
  DEFAULT_GAS_LIMIT: 250000,
  DEFAULT_GAS_PRICE: 0.0000004,
  CREATE_CORACLE_GAS_LIMIT: 3500000,
  CREATE_DORACLE_GAS_LIMIT: 1500000,
  UNLOCK_SECONDS: 604800,
};
const rpcPassword = getRandomPassword(); // Generate random password for every session

let runebaseEnv; // runebased chain network: mainnet/testnet/regtest
let runebasePath; // path to Runebase executables

function setRunebaseEnv(env, path) {
  if (isEmpty(env)) {
    throw Error('env cannot be empty.');
  }
  if (isEmpty(path)) {
    throw Error('path cannot be empty.');
  }
  if (runebaseEnv) {
    throw Error('runebaseEnv was already set.');
  }
  if (runebasePath) {
    throw Error('runebasePath was already set.');
  }

  runebaseEnv = env;
  runebasePath = path;
}

/**
 * Returns the environment configuration variables.
 * @return {object} Environment config variables.
 */
function getEnvConfig() {
  if (!runebaseEnv || !runebasePath) {
    throw Error('setRunebaseEnv was not called yet.');
  }

  let apiPort;
  switch (runebaseEnv) {
    case MAINNET: {
      apiPort = API_PORT_MAINNET;
      break;
    }
    case TESTNET: {
      apiPort = API_PORT_TESTNET;
      break;
    }
    case REGTEST: {
      apiPort = API_PORT_REGTEST;
      break;
    }
    default: {
      throw Error(`Invalid runebase environment: ${runebaseEnv}`);
    }
  }

  return { network: runebaseEnv, runebasePath, apiPort };
}

function isMainnet() {
  // Throw an error to ensure no code is using this check before it is initialized
  if (!runebaseEnv) {
    throw Error('runebaseEnv not initialized yet.');
  }

  return runebaseEnv === BLOCKCHAIN_ENV.MAINNET;
}

function getRPCPassword() {
  let password = rpcPassword;
  each(process.argv, (arg) => {
    if (includes(arg, '--rpcpassword')) {
      password = (split(arg, '=', 2))[1];
    }
  });

  return password;
}

function getRunebaseRPCAddress() {
  const port = isMainnet() ? Config.RPC_PORT_MAINNET : Config.RPC_PORT_TESTNET;
  return `http://${Config.RPC_USER}:${getRPCPassword()}@${Config.HOSTNAME}:${port}`;
}

function getRunebaseExplorerUrl() {
  return isMainnet() ? EXPLORER_MAINNET : EXPLORER_TESTNET;
}

function getSSLCredentials() {
  if (!process.env.SSL_KEY_PATH || !process.env.SSL_CERT_PATH) {
    throw Error('SSL Key and Cert paths not found.');
  }

  return {
    key: fs.readFileSync(process.env.SSL_KEY_PATH),
    cert: fs.readFileSync(process.env.SSL_CERT_PATH),
  };
}

/*
* Gets the smart contract metadata based on version and environment.
* @param versionNum {Number} The version number of the contracts to get, ie. 0, 1, 2.
* @param testnet {Boolean} Whether on testnet env or not.
* @return {Object} The contract metadata.
*/
function getContractMetadata(versionNum = Config.CONTRACT_VERSION_NUM) {
  if (!isNumber(versionNum)) {
    throw new Error('Must supply a version number');
  }

  if (isMainnet()) {
    return mainnetMetadata[versionNum];
  }
  return testnetMetadata[versionNum];
}

/*
* Creates a randomized RPC password.
* Protects against external RPC attacks when the username/password are already known: runebaseprediction/runebaseprediction.
* @return {String} Randomized password.
*/
function getRandomPassword() {
  return crypto.randomBytes(5).toString('hex');
}

module.exports = {
  Config,
  setRunebaseEnv,
  getEnvConfig,
  isMainnet,
  getRPCPassword,
  getRunebaseRPCAddress,
  getRunebaseExplorerUrl,
  getSSLCredentials,
  getContractMetadata,
};
