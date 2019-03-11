const fs = require('fs-extra');
const { isEmpty, includes, each, split, map } = require('lodash');
const Web3Utils = require('web3-utils');

const { Config, getEnvConfig } = require('../config');
const { getLogger } = require('./logger');

/**
 * Returns the base data dir path, and also creates the directory if it doesn't exist. This will vary based on OS.
 * @return {string} Absolute path to the base data directory.
 */
function getBaseDataDir() {
  // DATA_DIR is defined in environment variables
  if (!isEmpty(process.env.DATA_DIR)) {
    return process.env.DATA_DIR;
  }

  let osBasePath;
  switch (process.platform) {
    case 'darwin': {
      osBasePath = `${process.env.HOME}/Library/Application Support/RunebasePrediction`;
      break;
    }
    case 'win32': {
      osBasePath = `${process.env.APPDATA}/RunebasePrediction`;
      break;
    }
    case 'linux': {
      osBasePath = `${process.env.HOME}/.runebaseprediction`;
      break;
    }
    default: {
      throw Error(`Operating system not supported: ${process.platform}`);
    }
  }
  const envDir = getEnvConfig().network;
  const dataDir = Config.IS_DEV ? 'dev' : 'data';
  return `${osBasePath}/${envDir}/${dataDir}`;
}

/*
* Returns the path where the local cache data (Transaction table) directory is,
* and also creates the directory if it doesn't exist.
* The Local cache should exist regardless of version change, for now
*/
function getLocalCacheDataDir() {
  const dataDir = `${getBaseDataDir()}/local/nedb`;

  // Create data dir if needed
  fs.ensureDirSync(dataDir);

  return dataDir;
}

/**
 * Returns the full path to the database directory, and creates the directory if it doesn't exist.
 * @return {string} Absolute path to database directory.
 */
function getDataDir() {
  const basePath = getBaseDataDir();
  const path = `${basePath}/nedb`;
  fs.ensureDirSync(path); // Create dir if needed
  return path;
}

/**
 * Returns the full path to the logs directory, and creates the directory if it doesn't exist.
 * @return {string} Absolute path to logs directory.
 */
function getLogDir() {
  const basePath = getBaseDataDir();
  const path = `${basePath}/logs`;
  fs.ensureDirSync(path); // Create dir if needed
  return path;
}

/**
 * Gets the path for the Runebase binaries. Can either:
 * 1. Set RUNEBASE_PATH in .env file. eg. RUNEBASE_PATH=./runebase/mac/bin
 * 2. Pass the path in the --runebasepath flag via commandline. eg. --runebasepath=./runebase/mac/bin
 * The RUNEBASE_PATH in .env will take priority over the runebasepath cli flag.
 * @return {string} The path to the Runebase bin folder.
 */
function getDevRunebaseExecPath() {
  // Must pass in the absolute path to the bin/ folder
  let runebasePath;

  if (process.env.RUNEBASE_PATH) {
    // RUNEBASEPATH found in .env
    runebasePath = process.env.RUNEBASE_PATH;
  } else {
    // Search for --runebasepath flag in command-line args
    each(process.argv, (arg) => {
      if (includes(arg, '--runebasepath')) {
        runebasePath = (split(arg, '=', 2))[1];
      }
    });
  }

  if (!runebasePath) {
    throw Error('Runebase path was not found.');
  }
  return runebasePath;
}

/**
 * Checks if the object contains the keys to check for. Throws error if one is not found.
 * @param {object} obj Object to verify keys for.
 * @param {array} keysToCheck Array of strings to check key/values for.
 */
const validateObjKeyValues = (obj, keysToCheck) => {
  keysToCheck.forEach((key) => {
    if (!(key in obj)) {
      throw Error(`${key} should not be undefined.`);
    }
  });
};

/*
* Converts a hex number to decimal string.
* @param input {String|Hex|BN} The hex number to convert.
*/
function hexToDecimalString(input) {
  if (!input) {
    return undefined;
  }

  if (Web3Utils.isBN(input)) {
    return input.toString(10);
  }

  if (Web3Utils.isHex(input)) {
    return Web3Utils.toBN(input).toString(10);
  }

  return input.toString();
}

function hexArrayToDecimalArray(array) {
  if (!array) {
    return undefined;
  }
  return map(array, item => hexToDecimalString(item));
}

async function isAllowanceEnough(owner, spender, amount) {
  try {
    const res = await require('../api/runebaseprediction-token').allowance({ // eslint-disable-line global-require
      owner,
      spender,
      senderAddress: owner,
    });

    const allowance = Web3Utils.toBN(res.remaining);
    const amountBN = Web3Utils.toBN(amount);
    return allowance.gte(amountBN);
  } catch (err) {
    getLogger().error(`Error checking allowance: ${err.message}`);
    throw err;
  }
}

/*
* Get correct gas limit determined if voting over consensus threshold or not
*/
async function getVotingGasLimit(oraclesDb, oracleAddress, voteOptionIdx, voteAmount) {
  const oracle = await oraclesDb.findOne({ address: oracleAddress }, { consensusThreshold: 1, amounts: 1 });
  if (!oracle) {
    getLogger().error(`Could not find Oracle ${oracleAddress} in DB.`);
    throw new Error(`Could not find Oracle ${oracleAddress} in DB.`);
  }

  const threshold = Web3Utils.toBN(oracle.consensusThreshold);
  const currentTotal = Web3Utils.toBN(oracle.amounts[voteOptionIdx]);
  const maxVote = threshold.sub(currentTotal);
  return Web3Utils.toBN(voteAmount).gte(maxVote) ? Config.CREATE_DORACLE_GAS_LIMIT : Config.DEFAULT_GAS_LIMIT;
}

module.exports = {
  getBaseDataDir,
  getLocalCacheDataDir,
  getDataDir,
  getLogDir,
  getDevRunebaseExecPath,
  validateObjKeyValues,
  hexToDecimalString,
  hexArrayToDecimalArray,
  isAllowanceEnough,
  getVotingGasLimit,
};
