const _ = require('lodash');
const moment = require('moment');
const math = require('mathjs');

const pubsub = require('../pubsub');
const { getLogger } = require('../utils/logger');
const blockchain = require('../api/blockchain');
const network = require('../api/network');
const wallet = require('../api/wallet');
const runebasePredictionToken = require('../api/runebaseprediction_token');
const funToken = require('../api/fun_token');
const eventFactory = require('../api/event_factory');
const topicEvent = require('../api/topic_event');
const centralizedOracle = require('../api/centralized_oracle');
const decentralizedOracle = require('../api/decentralized_oracle');
const { Config, getContractMetadata } = require('../config');
const { db, DBHelper } = require('../db');
const { txState, phase } = require('../constants');
const { calculateSyncPercent, getAddressBalances, getExchangeBalances } = require('../sync');
const Utils = require('../utils');
const exchange = require('../api/exchange');
const { getInstance } = require('../qclient');

const DEFAULT_LIMIT_NUM = 50;
const DEFAULT_SKIP_NUM = 0;

function buildCursorOptions(cursor, orderBy, limit, skip) {
  if (!_.isEmpty(orderBy)) {
    const sortDict = {};
    _.forEach(orderBy, (order) => {
      sortDict[order.field] = order.direction === 'ASC' ? 1 : -1;
    });

    cursor.sort(sortDict);
  }

  cursor.limit(limit || DEFAULT_LIMIT_NUM);
  cursor.skip(skip || DEFAULT_SKIP_NUM);

  return cursor;
}

function buildTopicFilters({
  OR = [], txid, address, status, resultIdx, creatorAddress,
}) {
  const filter = (txid || address || status || resultIdx || creatorAddress) ? {} : null;
  if (txid) {
    filter.txid = txid;
  }

  if (address) {
    filter.address = address;
  }

  if (status) {
    filter.status = status;
  }

  if (resultIdx) {
    filter.resultIdx = resultIdx;
  }

  if (creatorAddress) {
    filter.creatorAddress = creatorAddress;
  }

  let filters = filter ? [filter] : [];
  for (let i = 0; i < OR.length; i++) {
    filters = filters.concat(buildTopicFilters(OR[i]));
  }
  return filters;
}

function buildOracleFilters({
  OR = [], txid, address, topicAddress, resultSetterQAddress, status, token, excludeResultSetterQAddress,
}) {
  const filter = (txid || address || topicAddress || resultSetterQAddress || status || token || excludeResultSetterQAddress) ? {} : null;
  if (txid) {
    filter.txid = txid;
  }

  if (address) {
    filter.address = address;
  }

  if (topicAddress) {
    filter.topicAddress = topicAddress;
  }

  if (resultSetterQAddress) {
    filter.resultSetterQAddress = resultSetterQAddress;
  } else if (excludeResultSetterQAddress) {
    filter.resultSetterQAddress = { $nin: excludeResultSetterQAddress };
  }

  if (status) {
    filter.status = status;
  }

  if (token) {
    filter.token = token;
  }

  let filters = filter ? [filter] : [];
  for (let i = 0; i < OR.length; i++) {
    filters = filters.concat(buildOracleFilters(OR[i]));
  }

  return filters;
}

function buildSearchOracleFilter(searchPhrase) {
  const filterFields = ['name', '_id', 'topicAddress', 'resultSetterAddress', 'resultSetterQAddress'];
  if (!searchPhrase) {
    return [];
  }

  const filters = [];
  const searchRegex = new RegExp(`.*${searchPhrase}.*`);
  for (let i = 0; i < filterFields.length; i++) {
    const filter = {};
    filter[filterFields[i]] = { $regex: searchRegex };
    filters.push(filter);
  }

  return filters;
}

function buildVoteFilters({
  OR = [], topicAddress, oracleAddress, voterAddress, voterQAddress, optionIdx,
}) {
  const filter = (topicAddress || oracleAddress || voterAddress || voterQAddress || optionIdx) ? {} : null;

  if (topicAddress) {
    filter.topicAddress = topicAddress;
  }

  if (oracleAddress) {
    filter.oracleAddress = oracleAddress;
  }

  if (voterAddress) {
    filter.voterAddress = voterAddress;
  }

  if (voterQAddress) {
    filter.voterQAddress = voterQAddress;
  }

  if (optionIdx) {
    filter.optionIdx = optionIdx;
  }

  let filters = filter ? [filter] : [];
  for (let i = 0; i < OR.length; i++) {
    filters = filters.concat(buildVoteFilters(OR[i]));
  }
  return filters;
}

function buildTransactionFilters({
  OR = [], type, status, topicAddress, oracleAddress, senderAddress, senderQAddress,
}) {
  const filter = (type || status || topicAddress || oracleAddress || senderAddress || senderQAddress) ? {} : null;

  if (type) {
    filter.type = type;
  }

  if (status) {
    filter.status = status;
  }

  if (topicAddress) {
    filter.topicAddress = topicAddress;
  }

  if (oracleAddress) {
    filter.oracleAddress = oracleAddress;
  }

  if (senderAddress) {
    filter.senderAddress = senderAddress;
  }

  if (senderQAddress) {
    filter.senderQAddress = senderQAddress;
  }

  let filters = filter ? [filter] : [];
  for (let i = 0; i < OR.length; i++) {
    filters = filters.concat(buildTransactionFilters(OR[i]));
  }
  return filters;
}

function buildNewOrderFilters({
  OR = [], txid, tokenName, orderType, status, token, type, price, orderId, owner, sellToken, buyToken, priceMul, priceDiv, time, amount, blockNum
}) {
  const filter = (txid || tokenName || orderType || status || token || type || price || orderId || owner || sellToken || buyToken || priceMul || priceDiv || time || amount || blockNum) ? {} : null;
  if (txid) {
    filter.txid = txid;
  }

  if (tokenName) {
    filter.tokenName = tokenName;
  }

  if (orderType) {
    filter.orderType = orderType;
  }

  if (status) {
    filter.status = status;
  }  

  if (token) {
    filter.token = token;
  }

  if (type) {
    filter.type = type;
  }

  if (price) {
    filter.price = price;
  }

  if (orderId) {
    filter.orderId = orderId;
  }

  if (owner) {
    filter.owner = owner;
  }

  if (sellToken) {
    filter.sellToken = sellToken;
  }

  if (buyToken) {
    filter.buyToken = buyToken;
  }

  if (priceMul) {
    filter.priceMul = priceMul;
  }

  if (priceDiv) {
    filter.priceDiv = priceDiv;
  }

  if (time) {
    filter.time = time;
  }

  if (amount) {
    filter.amount = amount;
  }

  if (blockNum) {
    filter.blockNum = blockNum;
  }  
  let filters = filter ? [filter] : [];
  for (let i = 0; i < OR.length; i++) {
    filters = filters.concat(buildNewOrderFilters(OR[i]));
  }
  return filters;
}


function buildTradeFilters({
  OR = [], date, from, to, soldTokens, boughtTokens, tokenName, orderType, price, orderId, time, amount, blockNum
}) {
  const filter = (date || from || to || soldTokens || boughtTokens || tokenName || orderType || price || orderId  || time || amount || blockNum) ? {} : null;

  if (date) {
    filter.date = date;
  }

  if (from) {
    filter.from = from;
  }

  if (to) {
    filter.to = to;
  }

  if (soldTokens) {
    filter.soldTokens = soldTokens;
  }

  if (boughtTokens) {
    filter.boughtTokens = boughtTokens;
  }

  if (tokenName) {
    filter.tokenName = tokenName;
  }

  if (orderType) {
    filter.orderType = orderType;
  }

  if (price) {
    filter.price = price;
  }

  if (orderId) {
    filter.orderId = orderId;
  }

  if (time) {
    filter.time = time;
  }

  if (amount) {
    filter.amount = amount;
  }

  if (blockNum) {
    filter.blockNum = blockNum;
  }  
  let filters = filter ? [filter] : [];
  for (let i = 0; i < OR.length; i++) {
    filters = filters.concat(buildNewOrderFilters(OR[i]));
  }
  return filters;
}

/**
 * Takes an oracle object and returns which phase it is in.
 * @param {oracle} oracle
 */
const getPhase = ({ token, status }) => {
  const [PRED, RUNES] = [token === 'PRED', token === 'RUNES'];
  if (RUNES && ['VOTING', 'CREATED'].includes(status)) return phase.BETTING;
  if (PRED && status === 'VOTING') return phase.VOTING;
  if (RUNES && ['WAITRESULT', 'OPENRESULTSET'].includes(status)) return phase.RESULT_SETTING;
  if ((PRED || RUNES) && status === 'PENDING') return phase.PENDING;
  if (PRED && status === 'WAITRESULT') return phase.FINALIZING;
  if ((PRED || RUNES) && status === 'WITHDRAW') return phase.WITHDRAWING;
  throw Error(`Invalid Phase determined by these -> TOKEN: ${token} STATUS: ${status}`);
};

module.exports = {
  Query: {
    allTopics: async (root, {
      filter, orderBy, limit, skip,
    }, { db: { Topics } }) => {
      const query = filter ? { $or: buildTopicFilters(filter) } : {};
      let cursor = Topics.cfind(query);
      cursor = buildCursorOptions(cursor, orderBy, limit, skip);
      return cursor.exec();
    },

    allNewOrders: async (root, {
      filter, orderBy, limit, skip,
    }, { db: { NewOrder } }) => {
      const query = filter ? { $or: buildNewOrderFilters(filter) } : {};
      let cursor = NewOrder.cfind(query);
      cursor = buildCursorOptions(cursor, orderBy, limit, skip);
      return cursor.exec();
    },

    allTrades: async (root, {
      filter, orderBy, limit, skip,
    }, { db: { Trade } }) => {
      const query = filter ? { $or: buildTradeFilters(filter) } : {};
      let cursor = Trade.cfind(query);
      cursor = buildCursorOptions(cursor, orderBy, limit, skip);
      return cursor.exec();
    },

    allOracles: async (root, {
      filter, orderBy, limit, skip,
    }, { db: { Oracles } }) => {
      const query = filter ? { $or: buildOracleFilters(filter) } : {};
      let cursor = Oracles.cfind(query);
      cursor = buildCursorOptions(cursor, orderBy, limit, skip);
      return cursor.exec();
    },

    searchOracles: async (root, {
      searchPhrase, orderBy, limit, skip,
    }, { db: { Oracles } }) => {
      const query = searchPhrase ? { $or: buildSearchOracleFilter(searchPhrase) } : {};
      let cursor = Oracles.cfind(query);
      cursor = buildCursorOptions(cursor, orderBy, limit, skip);
      return cursor.exec();
    },

    allVotes: async (root, {
      filter, orderBy, limit, skip,
    }, { db: { Votes } }) => {
      const query = filter ? { $or: buildVoteFilters(filter) } : {};
      let cursor = Votes.cfind(query);
      cursor = buildCursorOptions(cursor, orderBy, limit, skip);
      return cursor.exec();
    },

    allTransactions: async (root, {
      filter, orderBy, limit, skip,
    }, { db: { Transactions } }) => {
      const query = filter ? { $or: buildTransactionFilters(filter) } : {};
      let cursor = Transactions.cfind(query);
      cursor = buildCursorOptions(cursor, orderBy, limit, skip);
      return cursor.exec();
    },

    syncInfo: async (root, { includeBalance }, { db: { Blocks } }) => {
      let blocks;
      try {
        blocks = await Blocks.cfind({}).sort({ blockNum: -1 }).limit(1).exec();
      } catch (err) {
        getLogger().error(`Error query latest block from db: ${err.message}`);
      }

      let syncBlockNum;
      let syncBlockTime;
      if (blocks && blocks.length > 0) {
        // Use latest block synced
        syncBlockNum = blocks[0].blockNum;
        syncBlockTime = blocks[0].blockTime;
      } else {
        // Fetch current block from runebase
        syncBlockNum = Math.max(0, await blockchain.getBlockCount());
        const blockHash = await blockchain.getBlockHash({ blockNum: syncBlockNum });
        syncBlockTime = (await blockchain.getBlock({ blockHash })).time;
      }
      const syncPercent = await calculateSyncPercent(syncBlockNum, syncBlockTime);
      let addressBalances = [];
      let exchangeBalances = [];
      if (includeBalance || false) {
        addressBalances = await getAddressBalances();
        exchangeBalances = await getExchangeBalances();
      }
      const peerNodeCount = await network.getPeerNodeCount();

      return {
        syncBlockNum,
        syncBlockTime,
        syncPercent,
        peerNodeCount,
        addressBalances,
        exchangeBalances,
      };
    },
  },

  Mutation: {
    createTopic: async (root, data, { db: { Topics, Oracles, Transactions } }) => {
      const {
        name,
        options,
        resultSetterAddress,
        bettingStartTime,
        bettingEndTime,
        resultSettingStartTime,
        resultSettingEndTime,
        amount,
        senderAddress,
      } = data;
      const addressManagerAddr = getContractMetadata().AddressManager.address;

      // Check for existing CreateEvent transactions
      if (await DBHelper.isPreviousCreateEventPending(Transactions, senderAddress)) {
        getLogger().error('Pending CreateEvent transaction found.');
        throw new Error('Pending CreateEvent transaction found');
      }

      // Check the allowance first
      let type;
      let sentTx;
      if (await Utils.isAllowanceEnough(senderAddress, addressManagerAddr, amount)) {
        // Send createTopic tx
        type = 'CREATEEVENT';
        try {
          sentTx = await eventFactory.createTopic({
            oracleAddress: resultSetterAddress,
            eventName: name,
            resultNames: options,
            bettingStartTime,
            bettingEndTime,
            resultSettingStartTime,
            resultSettingEndTime,
            senderAddress,
          });
        } catch (err) {
          getLogger().error(`Error calling EventFactory.createTopic: ${err.message}`);
          throw err;
        }
      } else {
        // Send approve first since allowance is not enough
        type = 'APPROVECREATEEVENT';
        try {
          sentTx = await runebasePredictionToken.approve({
            spender: addressManagerAddr,
            value: amount,
            senderAddress,
          });
        } catch (err) {
          getLogger().error(`Error calling RunebasePredictionToken.approve: ${err.message}`);
          throw err;
        }
      }

      const version = Config.CONTRACT_VERSION_NUM;

      // Insert Transaction
      const tx = {
        txid: sentTx.txid,
        type,
        status: txState.PENDING,
        createdTime: moment().unix(),
        gasLimit: sentTx.args.gasLimit.toString(10),
        gasPrice: sentTx.args.gasPrice.toFixed(8),
        senderAddress,
        version,
        name,
        options,
        resultSetterAddress,
        bettingStartTime,
        bettingEndTime,
        resultSettingStartTime,
        resultSettingEndTime,
        amount,
        token: 'PRED',
      };
      await DBHelper.insertTransaction(Transactions, tx);

      // Insert Topic
      const topic = {
        txid: sentTx.txid,
        status: 'CREATED',
        version,
        escrowAmount: amount,
        name,
        options,
        runebaseAmount: _.fill(Array(options), '0'),
        predAmount: _.fill(Array(options), '0'),
        creatorAddress: senderAddress,
      };
      getLogger().debug(`Mutation Insert: Topic txid:${topic.txid}`);
      await DBHelper.insertTopic(Topics, topic);

      // Insert Oracle
      const oracle = {
        txid: sentTx.txid,
        status: 'CREATED',
        version,
        resultSetterAddress,
        token: 'RUNES',
        name,
        options,
        optionIdxs: Array.from(Array(options).keys()),
        amounts: _.fill(Array(options), '0'),
        startTime: bettingStartTime,
        endTime: bettingEndTime,
        resultSetStartTime: resultSettingStartTime,
        resultSetEndTime: resultSettingEndTime,
      };
      getLogger().debug(`Mutation Insert: Oracle txid:${oracle.txid}`);
      await DBHelper.insertOracle(Oracles, oracle);

      return tx;
    },

    createBet: async (root, data, { db: { Transactions } }) => {
      const {
        version,
        topicAddress,
        oracleAddress,
        optionIdx,
        amount,
        senderAddress,
      } = data;

      // Send bet tx
      let sentTx;
      try {
        sentTx = await centralizedOracle.bet({
          contractAddress: oracleAddress,
          index: optionIdx,
          amount,
          senderAddress,
        });
      } catch (err) {
        getLogger().error(`Error calling CentralizedOracle.bet: ${err.message}`);
        throw err;
      }

      // Insert Transaction
      const tx = {
        txid: sentTx.txid,
        type: 'BET',
        status: txState.PENDING,
        gasLimit: sentTx.args.gasLimit.toString(10),
        gasPrice: sentTx.args.gasPrice.toFixed(8),
        createdTime: moment().unix(),
        senderAddress,
        version,
        topicAddress,
        oracleAddress,
        optionIdx,
        token: 'RUNES',
        amount,
      };
      await DBHelper.insertTransaction(Transactions, tx);

      return tx;
    },

    setResult: async (root, data, { db: { Transactions } }) => {
      const {
        version,
        topicAddress,
        oracleAddress,
        optionIdx,
        amount,
        senderAddress,
      } = data;

      // Check the allowance first
      let type;
      let sentTx;
      if (await Utils.isAllowanceEnough(senderAddress, topicAddress, amount)) {
        // Send setResult since the allowance is enough
        type = 'SETRESULT';
        try {
          sentTx = await centralizedOracle.setResult({
            contractAddress: oracleAddress,
            resultIndex: optionIdx,
            senderAddress,
          });
        } catch (err) {
          getLogger().error(`Error calling CentralizedOracle.setResult: ${err.message}`);
          throw err;
        }
      } else {
        // Send approve first since allowance is not enough
        type = 'APPROVESETRESULT';
        try {
          sentTx = await runebasePredictionToken.approve({
            spender: topicAddress,
            value: amount,
            senderAddress,
          });
        } catch (err) {
          getLogger().error(`Error calling RunebasePredictionToken.approve: ${err.message}`);
          throw err;
        }
      }

      // Insert Transaction
      const tx = {
        txid: sentTx.txid,
        type,
        status: txState.PENDING,
        gasLimit: sentTx.args.gasLimit.toString(10),
        gasPrice: sentTx.args.gasPrice.toFixed(8),
        createdTime: moment().unix(),
        senderAddress,
        version,
        topicAddress,
        oracleAddress,
        optionIdx,
        token: 'PRED',
        amount,
      };
      await DBHelper.insertTransaction(Transactions, tx);

      return tx;
    },

    createVote: async (root, data, { db: { Oracles, Transactions } }) => {
      const {
        version,
        topicAddress,
        oracleAddress,
        optionIdx,
        amount,
        senderAddress,
      } = data;

      // Check allowance
      let type;
      let sentTx;
      if (await Utils.isAllowanceEnough(senderAddress, topicAddress, amount)) {
        // Send vote since allowance is enough
        type = 'VOTE';
        try {
          // Find if voting over threshold to set correct gas limit
          const gasLimit = await Utils.getVotingGasLimit(Oracles, oracleAddress, optionIdx, amount);

          sentTx = await decentralizedOracle.vote({
            contractAddress: oracleAddress,
            resultIndex: optionIdx,
            predAmount: amount,
            senderAddress,
            gasLimit,
          });
        } catch (err) {
          getLogger().error(`Error calling DecentralizedOracle.vote: ${err.message}`);
          throw err;
        }
      } else {
        // Send approve first because allowance is not enough
        type = 'APPROVEVOTE';
        try {
          sentTx = await runebasePredictionToken.approve({
            spender: topicAddress,
            value: amount,
            senderAddress,
          });
        } catch (err) {
          getLogger().error(`Error calling RunebasePredictionToken.approve: ${err.message}`);
          throw err;
        }
      }

      // Insert Transaction
      const tx = {
        txid: sentTx.txid,
        type,
        status: txState.PENDING,
        gasLimit: sentTx.args.gasLimit.toString(10),
        gasPrice: sentTx.args.gasPrice.toFixed(8),
        createdTime: moment().unix(),
        senderAddress,
        version,
        topicAddress,
        oracleAddress,
        optionIdx,
        token: 'PRED',
        amount,
      };
      await DBHelper.insertTransaction(Transactions, tx);

      return tx;
    },

    finalizeResult: async (root, data, { db: { Oracles, Transactions } }) => {
      const {
        version,
        topicAddress,
        oracleAddress,
        senderAddress,
      } = data;

      // Fetch oracle to get the finalized result
      const oracle = await Oracles.findOne({ address: oracleAddress }, { options: 1, optionIdxs: 1 });
      let winningIndex;
      if (!oracle) {
        getLogger().error(`Could not find Oracle ${oracleAddress} in DB.`);
        throw new Error(`Could not find Oracle ${oracleAddress} in DB.`);
      } else {
        // Compare optionIdxs to options since optionIdxs will be missing the index of the last round's result
        for (let i = 0; i < oracle.options.length; i++) {
          if (!_.includes(oracle.optionIdxs, i)) {
            winningIndex = i;
            break;
          }
        }
      }

      // Send finalizeResult tx
      let sentTx;
      try {
        sentTx = await decentralizedOracle.finalizeResult({
          contractAddress: oracleAddress,
          senderAddress,
        });
      } catch (err) {
        getLogger().error(`Error calling DecentralizedOracle.finalizeResult: ${err.message}`);
        throw err;
      }

      // Insert Transaction
      const tx = {
        txid: sentTx.txid,
        type: 'FINALIZERESULT',
        status: txState.PENDING,
        gasLimit: sentTx.args.gasLimit.toString(10),
        gasPrice: sentTx.args.gasPrice.toFixed(8),
        createdTime: moment().unix(),
        senderAddress,
        version,
        topicAddress,
        oracleAddress,
        optionIdx: winningIndex,
      };
      await DBHelper.insertTransaction(Transactions, tx);

      return tx;
    },

    withdraw: async (root, data, { db: { Transactions } }) => {
      const {
        type,
        version,
        topicAddress,
        senderAddress,
      } = data;

      let sentTx;
      switch (type) {
        case 'WITHDRAW': {
          // Send withdrawWinnings tx
          try {
            sentTx = await topicEvent.withdrawWinnings({
              contractAddress: topicAddress,
              senderAddress,
            });
          } catch (err) {
            getLogger().error(`Error calling TopicEvent.withdrawWinnings: ${err.message}`);
            throw err;
          }
          break;
        }
        case 'WITHDRAWESCROW': {
          // Send withdrawEscrow tx
          try {
            sentTx = await topicEvent.withdrawEscrow({
              contractAddress: topicAddress,
              senderAddress,
            });
          } catch (err) {
            getLogger().error(`Error calling TopicEvent.withdrawEscrow: ${err.message}`);
            throw err;
          }
          break;
        }
        default: {
          throw new Error(`Invalid withdraw type: ${type}`);
        }
      }

      // Insert Transaction
      const tx = {
        txid: sentTx.txid,
        type,
        status: txState.PENDING,
        gasLimit: sentTx.args.gasLimit.toString(10),
        gasPrice: sentTx.args.gasPrice.toFixed(8),
        createdTime: moment().unix(),
        senderAddress,
        version,
        topicAddress,
      };
      await DBHelper.insertTransaction(Transactions, tx);

      return tx;
    },

    transfer: async (root, data, { db: { Transactions } }) => {
      const {
        senderAddress,
        receiverAddress,
        token,
        amount,
      } = data;

      const version = Config.CONTRACT_VERSION_NUM;

      let txid;
      let sentTx;
      switch (token) {
        case 'RUNES': {
          // Send sendToAddress tx
          try {
            txid = await wallet.sendToAddress({
              address: receiverAddress,
              amount,
              senderAddress,
              changeToAddress: true,
            });
          } catch (err) {
            getLogger().error(`Error calling Wallet.sendToAddress: ${err.message}`);
            throw err;
          }
          break;
        }
        case 'PRED': {
          // Send transfer tx
          try {
            sentTx = await runebasePredictionToken.transfer({
              to: receiverAddress,
              value: amount,
              senderAddress,
            });
            txid = sentTx.txid;
          } catch (err) {
            getLogger().error(`Error calling RunebasePredictionToken.transfer: ${err.message}`);
            throw err;
          }
          break;
        }
        case 'FUN': {
          // Send transfer tx
          try {
            sentTx = await funToken.transfer({
              to: receiverAddress,
              value: amount,
              senderAddress,
            });
            txid = sentTx.txid;
          } catch (err) {
            getLogger().error(`Error calling FunToken.transfer: ${err.message}`);
            throw err;
          }
          break;
        }
        default: {
          throw new Error(`Invalid token transfer type: ${token}`);
        }
      }

      // Insert Transaction
      const gasLimit = sentTx ? sentTx.args.gasLimit : Config.DEFAULT_GAS_LIMIT;
      const gasPrice = sentTx ? sentTx.args.gasPrice : Config.DEFAULT_GAS_PRICE;
      const tx = {
        txid,
        type: 'TRANSFER',
        status: txState.PENDING,
        gasLimit: gasLimit.toString(10),
        gasPrice: gasPrice.toFixed(8),
        createdTime: moment().unix(),
        senderAddress,
        version,
        receiverAddress,
        token,
        amount,
      };
      await DBHelper.insertTransaction(Transactions, tx);

      return tx;
    },
    transferExchange: async (root, data, { db: { Transactions } }) => {
      const {
        senderAddress,
        receiverAddress,
        token,
        amount,
      } = data;      
      let metadata = getContractMetadata();
      const exchangeAddress = await getInstance().fromHexAddress(metadata.Radex.address);
      const version = Config.CONTRACT_VERSION_NUM;
      let txid;
      let sentTx;
      switch (token) {
        case 'RUNES': {
          // Send sendToAddress tx
          try {
            txid = await exchange.fundExchangeRunes({
              exchangeAddress,
              amount,
              senderAddress,
            });
          } catch (err) {
            getLogger().error(`Error calling exchange.fund: ${err.message}`);
            throw err;
          }
          break;
        }
        case 'PRED': {
          // Send transfer tx          
          try {
            sentTx = await runebasePredictionToken.transfer({
              to: exchangeAddress,
              value: amount,
              senderAddress,
            });
            txid = sentTx.txid;
          } catch (err) {
            getLogger().error(`Error calling RunebasePredictionToken.transfer: ${err.message}`);
            throw err;
          }
          break;
        }
        case 'FUN': {
          // Send transfer tx
          try {
            sentTx = await funToken.transfer({
              to: exchangeAddress,
              value: amount,
              senderAddress,
            });
            txid = sentTx.txid;
          } catch (err) {
            getLogger().error(`Error calling FunToken.transfer: ${err.message}`);
            throw err;
          }
          break;
        }
        default: {
          throw new Error(`Invalid token transfer type: ${token}`);
        }
      }

      // Insert Transaction
      const gasLimit = sentTx ? sentTx.args.gasLimit : Config.DEFAULT_GAS_LIMIT;
      const gasPrice = sentTx ? sentTx.args.gasPrice : Config.DEFAULT_GAS_PRICE;
      const tx = {
        txid,
        type: 'FUNDEXCHANGE',
        status: txState.PENDING,
        gasLimit: gasLimit.toString(10),
        gasPrice: gasPrice.toFixed(8),
        createdTime: moment().unix(),
        senderAddress,
        version,
        receiverAddress,
        token,
        amount,
      };
      await DBHelper.insertTransaction(Transactions, tx);
      return tx;
    },
    redeemExchange: async (root, data, { db: { Transactions } }) => {
      const {
        senderAddress,
        receiverAddress,
        token,
        amount,
      } = data;      
      let metadata = getContractMetadata();
      const exchangeAddress = await getInstance().fromHexAddress(metadata.Radex.address);
      const version = Config.CONTRACT_VERSION_NUM;
      let txid;
      let sentTx;
      let tokenaddress;

      switch (token) {
        case 'RUNES': {
          // Send sendToAddress tx
          try {
            tokenaddress = "0000000000000000000000000000000000000000";
            txid = await exchange.redeemExchange({
              exchangeAddress,
              amount,
              token,
              tokenaddress,
              senderAddress,
            });
          } catch (err) {
            getLogger().error(`Error calling redeemExchange: ${err.message}`);
            throw err;
          }
          break;
        }
        case 'PRED': {
          // Send transfer tx          
          try {
            tokenaddress = metadata.RunebasePredictionToken.address;
            txid = await exchange.redeemExchange({
              exchangeAddress,
              amount,
              token,
              tokenaddress,
              senderAddress,
            });
          } catch (err) {
            getLogger().error(`Error calling redeemExchange: ${err.message}`);
            throw err;
          }
          break;
        }
        case 'FUN': {
          // Send transfer tx
          try {
            tokenaddress = metadata.FunToken.address;
            txid = await exchange.redeemExchange({
              exchangeAddress,
              amount,
              token,
              tokenaddress,
              senderAddress,
            });
          } catch (err) {
            getLogger().error(`Error calling redeemExchange: ${err.message}`);
            throw err;
          }
          break;
        }
        default: {
          throw new Error(`Invalid token transfer type: ${token}`);
        }
      }

      // Insert Transaction
      const gasLimit = sentTx ? sentTx.args.gasLimit : Config.DEFAULT_GAS_LIMIT;
      const gasPrice = sentTx ? sentTx.args.gasPrice : Config.DEFAULT_GAS_PRICE;
      const tx = {
        txid,
        type: 'REDEEMEXCHANGE',
        status: txState.PENDING,
        gasLimit: gasLimit.toString(10),
        gasPrice: gasPrice.toFixed(8),
        createdTime: moment().unix(),
        senderAddress,
        version,
        receiverAddress,
        token,
        amount,
      };
      await DBHelper.insertTransaction(Transactions, tx);
      return tx;
    },
    orderExchange: async (root, data, { db: { Transactions } }) => {
      const {
        senderAddress,
        receiverAddress,
        token,
        amount,
        price,
        orderType,
      } = data;      
      let metadata = getContractMetadata();
      const exchangeAddress = await getInstance().fromHexAddress(metadata.Radex.address);
      const version = Config.CONTRACT_VERSION_NUM;
      let txid;
      let sentTx;
      let tokenaddress;
      const priceFract = math.fraction(price);
      const priceFractN = priceFract.n;
      const priceFractD = priceFract.d;
      switch (token) {
        case 'PRED': {
          // Send transfer tx          
          try {
            tokenaddress = metadata.RunebasePredictionToken.address;            
          } catch (err) {
            getLogger().error(`Error calling metadata.RunebasePredictionToken.address: ${err.message}`);
            throw err;
          }
          break;
        }
        case 'FUN': {
          // Send transfer tx
          try {
            tokenaddress = metadata.FunToken.address;
          } catch (err) {
            getLogger().error(`Error calling metadata.FunToken.address: ${err.message}`);
            throw err;
          }
          break;
        }
        default: {
          throw new Error(`Invalid token transfer type: ${token}`);
        }
      }
      try {
        txid = await exchange.orderExchange({
          exchangeAddress,
          amount,
          token,
          tokenaddress,
          senderAddress,
          priceFractN,
          priceFractD,
          orderType,
        });
      } catch (err) {
        getLogger().error(`Error calling orderExchange: ${err.message}`);
        throw err;
      }
      let typeOrder;
      if (orderType == 'buy') {
        typeOrder = 'BUYORDER';
        sellToken = '0000000000000000000000000000000000000000';
        buyToken = tokenaddress;
      }
      if (orderType == 'sell') {
        typeOrder = 'SELLORDER'
        sellToken = tokenaddress;
        buyToken = '0000000000000000000000000000000000000000';
      }
      // Insert Transaction
      const gasLimit = sentTx ? sentTx.args.gasLimit : Config.DEFAULT_GAS_LIMIT;
      const gasPrice = sentTx ? sentTx.args.gasPrice : Config.DEFAULT_GAS_PRICE;
      const tx = {
        txid,
        type: typeOrder,
        orderType: typeOrder,
        tokenName: token,
        status: txState.PENDING,
        gasLimit: gasLimit.toString(10),
        gasPrice: gasPrice.toFixed(8),
        createdTime: moment().unix(),
        time: moment().unix(),
        senderAddress,
        owner: senderAddress,
        version,
        receiverAddress,
        token,
        price,
        amount,    
        orderId: '?',
        sellToken,
        buyToken,
        priceMul: priceFractN,
        priceDiv: priceFractD,
      };
      await DBHelper.insertTopic(db.NewOrder, tx);
      await DBHelper.insertTransaction(Transactions, tx);
      return tx;
    },
    cancelOrderExchange: async (root, data, { db: { Transactions } }) => {
      const {
        senderAddress,
        orderId,
      } = data;
      let sentTx;      
      let metadata = getContractMetadata();
      const exchangeAddress = await getInstance().fromHexAddress(metadata.Radex.address);
      const version = Config.CONTRACT_VERSION_NUM;
      let txid;
      try {
        txid = await exchange.cancelOrderExchange({
          exchangeAddress,
          senderAddress,
          orderId,
        });

      } catch (err) {
        getLogger().error(`Error calling orderExchange: ${err.message}`);
        throw err;
      }

      // Insert Transaction
      const gasLimit = sentTx ? sentTx.args.gasLimit : Config.DEFAULT_GAS_LIMIT;
      const gasPrice = sentTx ? sentTx.args.gasPrice : Config.DEFAULT_GAS_PRICE;
      const NewOrder = {
        status: 'CANCELED',
        orderId: orderId,
        type: 'CANCELORDER',
      }
      const tx = {
        txid,
        type: 'CANCELORDER',
        version,
        status: 'PENDING',
        gasLimit: gasLimit.toString(10),
        gasPrice: gasPrice.toFixed(8),
        createdTime: moment().unix(),
        senderAddress,
        receiverAddress: exchangeAddress,
      };
      await DBHelper.cancelOrderByQuery(db.NewOrder, { orderId }, NewOrder);
      await DBHelper.insertTransaction(Transactions, tx);
      return tx;
    },
    executeOrderExchange: async (root, data, { db: { Transactions } }) => {
      const {
        senderAddress,
        orderId,
        exchangeAmount,
      } = data;
      let sentTx;     
      let metadata = getContractMetadata();
      const exchangeAddress = await getInstance().fromHexAddress(metadata.Radex.address);
      const version = Config.CONTRACT_VERSION_NUM;
      let txid;
      try {
        txid = await exchange.executeOrderExchange({
          exchangeAddress,
          senderAddress,
          orderId,
          exchangeAmount,
        });

      } catch (err) {
        getLogger().error(`Error calling executeExchange: ${err.message}`);
        throw err;
      }
      // Insert Transaction
      const gasLimit = sentTx ? sentTx.args.gasLimit : Config.DEFAULT_GAS_LIMIT;
      const gasPrice = sentTx ? sentTx.args.gasPrice : Config.DEFAULT_GAS_PRICE;
      const tx = {
        txid,
        type: 'EXECUTEORDER',
        version,
        exchangeAmount,
        status: 'PENDING',
        gasLimit: gasLimit.toString(10),
        gasPrice: gasPrice.toFixed(8),
        createdTime: moment().unix(),
        senderAddress,
        receiverAddress: exchangeAddress,
      };
      //await DBHelper.cancelOrderByQuery(db.NewOrder, { orderId }, NewOrder);
      await DBHelper.insertTransaction(Transactions, tx);
      return tx;
    },
  },



  Topic: {
    oracles: ({ address }, data, { db: { Oracles } }) => Oracles.find({ topicAddress: address }),
    transactions: async ({ address }, data, { db: { Transactions } }) => {
      const types = [{ type: 'WITHDRAWESCROW' }, { type: 'WITHDRAW' }];
      return Transactions.find({ topicAddress: address, $or: types });
    },
  },

  Oracle: {
    transactions: (oracle, data, { db: { Transactions } }) => {
      const calculatedPhase = getPhase(oracle);
      let types = [];
      switch (calculatedPhase) {
        case phase.BETTING:
          types = [{ type: 'BET' }, { type: 'CREATEEVENT' }, { type: 'APPROVECREATEEVENT' }];
          break;
        case phase.VOTING:
          types = [{ type: 'VOTE' }, { type: 'APPROVEVOTE' }];
          break;
        case phase.RESULT_SETTING:
          types = [{ type: 'SETRESULT' }, { type: 'APPROVESETRESULT' }];
          break;
        case phase.PENDING:
          // Oracles in PENDING phase don't have any transactions to query
          return [];
        case phase.FINALIZING:
          types = [{ type: 'FINALIZERESULT' }];
          break;
        case phase.WITHDRAWING:
          types = [{ type: 'WITHDRAW' }];
          break;
        default:
          throw Error(`Invalid phase: ${calculatedPhase}`);
      }
      return Transactions.find({ oracleAddress: oracle.address, $or: types });
    },
  },

  Transaction: {
    topic: async ({ topicAddress }, data, { db: { Topics } }) => {
      if (_.isEmpty(topicAddress)) {
        return null;
      }

      const topics = await Topics.find({ address: topicAddress });
      if (!_.isEmpty(topics)) {
        return topics[0];
      }
      return null;
    },
  },

  Subscription: {
    onSyncInfo: {
      subscribe: () => pubsub.asyncIterator('onSyncInfo'),
    },
  },
};
