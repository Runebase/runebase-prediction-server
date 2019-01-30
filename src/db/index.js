const datastore = require('nedb-promise');
const _ = require('lodash');
const fs = require('fs-extra');

const Utils = require('../utils');
const { getLogger } = require('../utils/logger');
const migrateTxDB = require('./migrations/migrateTx');
const Market = require('../models/market');
const { getContractMetadata } = require('../config');

const db = {
  Topics: undefined,
  Oracles: undefined,
  Votes: undefined,
  Blocks: undefined,
  Transactions: undefined,
  NewOrder: undefined,
  Trade: undefined,
  MarketMaker: undefined,
  OrderFulfilled: undefined,
  Markets: undefined,
  FundRedeem: undefined,
};


// Init datastores
async function initDB() {
  try {
    await migrateDB();
  } catch (err) {
    throw new Error(`DB Migration Error: ${err.message}`);
  }

  const blockchainDataPath = Utils.getDataDir();
  getLogger().info(`Blockchain data path: ${blockchainDataPath}`);

  const localCacheDataPath = Utils.getLocalCacheDataDir();
  getLogger().info(`Local cache data path: ${localCacheDataPath}`);

  db.Topics = datastore({ filename: `${blockchainDataPath}/topics.db` });
  db.Oracles = datastore({ filename: `${blockchainDataPath}/oracles.db` });
  db.Votes = datastore({ filename: `${blockchainDataPath}/votes.db` });
  db.Blocks = datastore({ filename: `${blockchainDataPath}/blocks.db` });
  db.Transactions = datastore({ filename: `${blockchainDataPath}/transactions.db` });
  db.NewOrder = datastore({ filename: `${blockchainDataPath}/neworder.db` });
  db.Trade = datastore({ filename: `${blockchainDataPath}/trade.db` });
  db.MarketMaker = datastore({ filename: `${blockchainDataPath}/marketMaker.db` });
  db.OrderFulfilled = datastore({ filename: `${blockchainDataPath}/orderfulfilled.db` });
  db.Markets = datastore({ filename: `${blockchainDataPath}/markets.db` });
  db.FundRedeem = datastore({ filename: `${blockchainDataPath}/fundRedeem.db` });

  try {
    await Promise.all([
      db.Topics.loadDatabase(),
      db.Oracles.loadDatabase(),
      db.Votes.loadDatabase(),
      db.Blocks.loadDatabase(),
      db.Transactions.loadDatabase(),
      db.NewOrder.loadDatabase(),
      db.Trade.loadDatabase(),
      db.MarketMaker.loadDatabase(),
      db.OrderFulfilled.loadDatabase(),
      db.Markets.loadDatabase(),
      db.FundRedeem.loadDatabase(),
    ]);

    await db.Topics.ensureIndex({ fieldName: 'txid', unique: true });
    await db.Oracles.ensureIndex({ fieldName: 'txid', unique: true });
    await db.Votes.ensureIndex({ fieldName: 'txid', unique: true });


    const metadata = getContractMetadata();

    for (var key in metadata){
      if (metadata[key].pair) {
        if (key !== 'Runebase') {
          const addMarket = metadata[key].pair;
          const dataSrc = blockchainDataPath + '/' + addMarket + '.tsv';
          if (!fs.existsSync(dataSrc)){
            fs.writeFile(dataSrc, 'date\topen\thigh\tlow\tclose\tvolume\n2018-01-01\t0\t0\t0\t0\t0\n2018-01-02\t0\t0\t0\t0\t0\n', { flag: 'w' }, function(err) {
              if (err)
                return console.error(err);
            });
          }
          fs.closeSync(fs.openSync(dataSrc, 'a'));
          db.Markets.count({ market: addMarket }, function (err, count) {
            if (count === 0) {
              const market = new Market(addMarket).translate();
              db.Markets.insert(market);
            }
          });
        }
      }
    }

  } catch (err) {
    throw Error(`DB load Error: ${err.message}`);
  }
}

// Delete blockchain RunebasePrediction data
function deleteRunebasePredictionData() {
  const logger = getLogger();
  const blockchainDataPath = Utils.getDataDir();

  try {
    fs.removeSync(`${blockchainDataPath}/PRED.tsv`);
  } catch (err) {
    logger.error(`Delete PRED.tsv error: ${err.message}`);
  }

  try {
    fs.removeSync(`${blockchainDataPath}/FUN.tsv`);
  } catch (err) {
    logger.error(`Delete FUN.tsv error: ${err.message}`);
  }

  try {
    fs.removeSync(`${blockchainDataPath}/fundRedeem.db`);
  } catch (err) {
    logger.error(`Delete fundRedeem.db error: ${err.message}`);
  }

  try {
    fs.removeSync(`${blockchainDataPath}/markets.db`);
  } catch (err) {
    logger.error(`Delete markets.db error: ${err.message}`);
  }

  try {
    fs.removeSync(`${blockchainDataPath}/orderfulfilled.db`);
  } catch (err) {
    logger.error(`Delete orderfulfilled.db error: ${err.message}`);
  }

  try {
    fs.removeSync(`${blockchainDataPath}/marketMaker.db`);
  } catch (err) {
    logger.error(`Delete marketMaker.db error: ${err.message}`);
  }

  try {
    fs.removeSync(`${blockchainDataPath}/trade.db`);
  } catch (err) {
    logger.error(`Delete trade.db error: ${err.message}`);
  }

  try {
    fs.removeSync(`${blockchainDataPath}/neworder.db`);
  } catch (err) {
    logger.error(`Delete neworder.db error: ${err.message}`);
  }

  try {
    fs.removeSync(`${blockchainDataPath}/topics.db`);
  } catch (err) {
    logger.error(`Delete topics.db error: ${err.message}`);
  }

  try {
    fs.removeSync(`${blockchainDataPath}/oracles.db`);
  } catch (err) {
    logger.error(`Delete oracles.db error: ${err.message}`);
  }

  try {
    fs.removeSync(`${blockchainDataPath}/votes.db`);
  } catch (err) {
    logger.error(`Delete votes.db error: ${err.message}`);
  }

  try {
    fs.removeSync(`${blockchainDataPath}/blocks.db`);
  } catch (err) {
    logger.error(`Delete blocks.db error: ${err.message}`);
  }

  logger.info('RunebasePrediction data deleted.');
}

// Migrate DB
async function migrateDB() {
  // check migration script in migration folder
  await migrateTxDB();
}

class DBHelper {
  static async getCount(db, query) {
    try {
      return await db.count(query);
    } catch (err) {
      getLogger().error(`Error getting DB count. db:${db} err:${err.message}`);
    }
  }

  /*
  *removeOrdersByQuery
  *
  */
  static async removeOrdersByQuery(orderDb, query) {
    try {
      const numRemoved = await orderDb.remove(query, { multi: true });
      getLogger().debug(`Remove: ${numRemoved} Orders query:${query}`);
    } catch (err) {
      getLogger().error(`Remove Orders by query:${query}: ${err.message}`);
    }
  }

  /*
  * Update FundRedeem
  *
  */
  static async updateFundRedeemByQuery(db, query, topic) {
    try {
      await db.update(
        query,
        {
          $set: {
            txid: topic.txid,
            type: topic.type,
            token: topic.token,
            tokenName: topic.tokenName,
            status: topic.status,
            owner: topic.owner,
            time: topic.time,
            date: topic.date,
            amount: topic.amount,
            blockNum: topic.blockNum,
          },
        },
        {},
      );
    } catch (err) {
      getLogger().error(`Error update Topic by query:${query}: ${err.message}`);
    }
  }

  /*
  * Update Trade
  *
  */
  static async updateTradeByQuery(db, query, topic) {
    try {
      await db.update(
        query,
        {
          $set: {
            date: topic.date,
            txid: topic.txid,
            status: topic.status,
            orderId: topic.orderId,
            time: topic.time,
            from: topic.from,
            to: topic.to,
            soldTokens: topic.soldTokens,
            boughtTokens: topic.boughtTokens,
            price: topic.price,
            orderType: topic.orderType,
            tokenName: topic.tokenName,
            amount: topic.amount,
            blockNum: topic.blockNum,
          },
        },
        {},
      );
    } catch (err) {
      getLogger().error(`Error update Topic by query:${query}: ${err.message}`);
    }
  }

  /*
  * Update Markets
  *
  */
  static async updateMarketsByQuery(db, query, topic) {
    try {
      await db.update(
        query,
        {
          $set: {
            tokenName: topic.tokenName,
            change: topic.change,
            volume: topic.volume,
            price: topic.price,
            market: topic.market,
          },
        },
        {},
      );
    } catch (err) {
      getLogger().error(`Error update Topic by query:${query}: ${err.message}`);
    }
  }

  /*
  * Canceled orders
  *
  */
  static async updateCanceledOrdersByQuery(db, query, topic) {
    try {
      await db.update(
        query,
        {
          $set: {
            orderId: topic.orderId,
            status: topic.status,
            timeCanceled: topic.timeCanceled,
            txCanceled: topic.txCanceled,
          },
        },
        {},
      );
    } catch (err) {
      getLogger().error(`Error update Topic by query:${query}: ${err.message}`);
    }
  }

  /*
  * FulFill orders
  *
  */
  static async updateFulfilledOrdersByQuery(db, query, topic) {
    try {
      await db.update(
        query,
        {
          $set: {
            orderId: topic.orderId,
            status: topic.status,
            timeFulfilled: topic.timeFulfilled,
            txFulfilled: topic.txFulfilled,
          },
        },
        {},
      );
    } catch (err) {
      getLogger().error(`Error update Topic by query:${query}: ${err.message}`);
    }
  }

  /*
  * Update Order
  *
  */
  static async updateOrderByQuery(db, query, topic) {
    try {
      await db.update(
        query,
        {
          $set: {
            txid: topic.txid,
            orderId: topic.orderId,
            blockNum: topic.blockNum,
            token: topic.token,
            price: topic.price,
            type: topic.type,
            status: topic.status,
            resultIdx: topic.resultIdx,
            creatorAddress: topic.creatorAddress,
            owner: topic.owner,
            sellToken: topic.sellToken,
            buyToken: topic.buyToken,
            priceMul: topic.priceMul,
            priceDiv: topic.priceDiv,
            time: topic.time,
            amount: topic.amount,
            startAmount: topic.startAmount,
          },
        },
        {},
      );
    } catch (err) {
      getLogger().error(`Error update Topic by query:${query}: ${err.message}`);
    }
  }

  /*
  * Update TradeOrder
  *
  */
  static async updateTradeOrderByQuery(db, query, topic) {
    try {
      await db.update(
        query,
        {
          $set: {
            amount: topic.amount,
          },
        },
        {},
      );
    } catch (err) {
      getLogger().error(`Error update Topic by query:${query}: ${err.message}`);
    }
  }

  static async cancelOrderByQuery(db, query, topic) {
    try {
      await db.update(
        query,
        {
          $set: {
            orderId: topic.orderId,
            status: topic.status,
            timeCanceled: topic.timeCanceled,
            txCanceled: topic.txCanceled,
          },
        },
        {},
      );
    } catch (err) {
      getLogger().error(`Error update Topic by query:${query}: ${err.message}`);
    }
  }

 /*
  * Returns the fields of the object in one of the tables searched by the query.
  * @param db The DB table.
  * @param query {Object} The query by items.
  * @param fields {Array} The fields to return for the found item in an array.
  */
  static async findTradeAndUpdate(db, query, fields, soldTokens, orderId) {
    let fieldsObj;
    if (!_.isEmpty(fields)) {
      fieldsObj = {};
      _.each(fields, field => fieldsObj[field] = 1);
    }

    const found = await db.findOne(query, fieldsObj);
    if (!found) {
      const { filename } = db.nedb;
      throw Error(`Could not findOne ${filename.substr(filename.lastIndexOf('/') + 1)} by query ${JSON.stringify(query)}`);
    }
    const newAmount = Number(found.amount) - Number(soldTokens);
    const updateOrder = {
      amount: newAmount,
    }
    await DBHelper.updateTradeOrderByQuery(db, { orderId }, updateOrder);
    return found;
  }


  /*
  * Returns the fields of the object in one of the tables searched by the query.
  * @param db The DB table.
  * @param query {Object} The query by items.
  * @param fields {Array} The fields to return for the found item in an array.
  */
  static async findOne(db, query, fields) {
    let fieldsObj;
    if (!_.isEmpty(fields)) {
      fieldsObj = {};
      _.each(fields, field => fieldsObj[field] = 1);
    }

    const found = await db.findOne(query, fieldsObj);
    if (!found) {
      const { filename } = db.nedb;
      throw Error(`Could not findOne ${filename.substr(filename.lastIndexOf('/') + 1)} by query ${JSON.stringify(query)}`);
    }
    return found;
  }

    /*
  * Returns the fields of the object in one of the tables searched by the query.
  * @param db The DB table.
  * @param query {Object} The query by items.
  * @param fields {Array} The fields to return for the found item in an array.
  */
  static async find(db, query, fields) {
    let fieldsObj;
    if (!_.isEmpty(fields)) {
      fieldsObj = {};
      _.each(fields, field => fieldsObj[field] = 1);
    }

    const found = await db.find(query, fieldsObj);
    if (!found) {
      const { filename } = db.nedb;
      throw Error(`Could not find ${filename.substr(filename.lastIndexOf('/') + 1)} by query ${JSON.stringify(query)}`);
    }
    return found;
  }

  static async insertTopic(db, topic) {
    try {
      await db.insert(topic);
    } catch (err) {
      getLogger().error(`Error insert Topic ${topic}: ${err.message}`);
    }
  }

  static async updateObjectByQuery(db, query, update) {
    try {
      await db.update(query, { $set: update }, {});
    } catch (err) {
      getLogger().error(`Error update ${update} object by query:${query}: ${err.message}`);
    }
  }

  static async updateTopicByQuery(db, query, topic) {
    try {
      await db.update(
        query,
        {
          $set: {
            txid: topic.txid,
            blockNum: topic.blockNum,
            status: topic.status,
            version: topic.version,
            address: topic.address,
            name: topic.name,
            options: topic.options,
            runebaseAmount: topic.runebaseAmount,
            predAmount: topic.predAmount,
            resultIdx: topic.resultIdx,
            creatorAddress: topic.creatorAddress,
          },
        },
        {},
      );
    } catch (err) {
      getLogger().error(`Error update Topic by query:${query}: ${err.message}`);
    }
  }

  static async removeTopicsByQuery(topicDb, query) {
    try {
      const numRemoved = await topicDb.remove(query, { multi: true });
      getLogger().debug(`Remove: ${numRemoved} Topic query:${query}`);
    } catch (err) {
      getLogger().error(`Remove Topics by query:${query}: ${err.message}`);
    }
  }

  static async insertOracle(db, oracle) {
    try {
      await db.insert(oracle);
    } catch (err) {
      getLogger().error(`Error insert COracle:${oracle}: ${err.message}`);
    }
  }

  static async updateOracleByQuery(db, query, oracle) {
    try {
      await db.update(
        query,
        {
          $set: {
            txid: oracle.txid,
            blockNum: oracle.blockNum,
            status: oracle.status,
            version: oracle.version,
            address: oracle.address,
            topicAddress: oracle.topicAddress,
            resultSetterAddress: oracle.resultSetterAddress,
            resultSetterQAddress: oracle.resultSetterQAddress,
            token: oracle.token,
            name: oracle.name,
            options: oracle.options,
            optionIdxs: oracle.optionIdxs,
            amounts: oracle.amounts,
            resultIdx: oracle.resultIdx,
            startTime: oracle.startTime,
            endTime: oracle.endTime,
            resultSetStartTime: oracle.resultSetStartTime,
            resultSetEndTime: oracle.resultSetEndTime,
            consensusThreshold: oracle.consensusThreshold,
          },
        },
        {},
      );
    } catch (err) {
      getLogger().error(`Error update Oracle by query:${query}: ${err.message}`);
    }
  }

  static async removeOraclesByQuery(oracleDb, query) {
    try {
      const numRemoved = await oracleDb.remove(query, { multi: true });
      getLogger().debug(`Remove: ${numRemoved} Oracle by query:${query}`);
    } catch (err) {
      getLogger().error(`Remove Oracles by query:${query}: ${err.message}`);
    }
  }

  static async insertTransaction(db, tx) {
    try {
      getLogger().debug(`Mutation Insert: Transaction ${tx.type} txid:${tx.txid}`);
      await db.insert(tx);
    } catch (err) {
      getLogger().error(`Error inserting Transaction ${tx.type} ${tx.txid}: ${err.message}`);
      throw err;
    }
  }

  static async isPreviousCreateEventPending(txDb, senderAddress) {
    try {
      return await txDb.count({
        type: { $in: ['APPROVECREATEEVENT', 'CREATEEVENT'] },
        status: 'PENDING',
        senderAddress,
      });
    } catch (err) {
      getLogger().error(`Checking CreateEvent pending: ${err.message}`);
      throw err;
    }
  }
}

module.exports = {
  db,
  initDB,
  deleteRunebasePredictionData,
  DBHelper,
};
