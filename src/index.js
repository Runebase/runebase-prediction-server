const _ = require('lodash');

const RunebasePredictionServer = require('./server');
const RunebasePredictionConfig = require('./config');
const RunebasePredictionDb = require('./db');
const Constants = require('./constants');
const Utils = require('./utils');
const EmitterHelper = require('./utils/emitterHelper');
const { getLogger } = require('./utils/logger');
const AddressManager = require('./api/address_manager');
const BaseContract = require('./api/base_contract');
const Blockchain = require('./api/blockchain');
const RunebasePredictionToken = require('./api/runebaseprediction_token');
const FunToken = require('./api/fun_token');
const CentralizedOracle = require('./api/centralized_oracle');
const DecentralizedOracle = require('./api/decentralized_oracle');
const EventFactory = require('./api/event_factory');
const Oracle = require('./api/oracle');
const RunebaseUtils = require('./api/runebase_utils');
const TopicEvent = require('./api/topic_event');
const Transaction = require('./api/transaction');
const Wallet = require('./api/wallet');

const { startServer } = RunebasePredictionServer;
const { blockchainEnv } = Constants;
const { getDevRunebaseExecPath } = Utils;
if (_.includes(process.argv, '--testnet')) {
  startServer(blockchainEnv.TESTNET, getDevRunebaseExecPath());
} else if (_.includes(process.argv, '--mainnet')) {
  startServer(blockchainEnv.MAINNET, getDevRunebaseExecPath());
} else {
  console.log('testnet/mainnet flag not found. startServer() will need to be called explicitly.');
}

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
  FunToken,
  CentralizedOracle,
  DecentralizedOracle,
  EventFactory,
  Oracle,
  RunebaseUtils,
  TopicEvent,
  Transaction,
  Wallet,
};
