const { each, split, includes } = require('lodash');

const RunebasePredictionServer = require('./server');
const RunebasePredictionConfig = require('./config');
const RunebasePredictionDb = require('./db');
const Constants = require('./constants');
const Utils = require('./utils');
const EmitterHelper = require('./utils/emitter-helper');
const { getLogger } = require('./utils/logger');
const AddressManager = require('./api/address-manager');
const BaseContract = require('./api/base-contract');
const Blockchain = require('./api/blockchain');
const RunebasePredictionToken = require('./api/runebaseprediction-token');
const CentralizedOracle = require('./api/centralized-oracle');
const DecentralizedOracle = require('./api/decentralized-oracle');
const EventFactory = require('./api/event-factory');
const Oracle = require('./api/oracle');
const RunebaseUtils = require('./api/runebase-utils');
const TopicEvent = require('./api/topic-event');
const Transaction = require('./api/transaction');
const Wallet = require('./api/wallet');

const { startServer } = RunebasePredictionServer;
const { BLOCKCHAIN_ENV } = Constants;
const { getDevRunebaseExecPath } = Utils;

// Find chain type (mainnet/testnet/regtest) from flags and start server
each(process.argv, async (arg) => {
  if (arg.startsWith('--chain')) {
    const { MAINNET, TESTNET, REGTEST } = BLOCKCHAIN_ENV;
    const chain = (split(arg, '=', 2))[1];
    if (includes([MAINNET, TESTNET, REGTEST], chain)) {
      await startServer(chain, getDevRunebaseExecPath());
    } else {
      throw Error(`Invalid type for --chain: ${chain}`);
    }
  }
});

module.exports = {
  RunebasePredictionServer,
  RunebasePredictionConfig,
  RunebasePredictionDb,
  Constants,
  Utils,
  EmitterHelper,
  getLogger,
  AddressManager,
  BaseContract,
  Blockchain,
  RunebasePredictionToken,
  CentralizedOracle,
  DecentralizedOracle,
  EventFactory,
  Oracle,
  RunebaseUtils,
  TopicEvent,
  Transaction,
  Wallet,
};
