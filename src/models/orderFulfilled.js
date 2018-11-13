/* eslint no-underscore-dangle: 0 */

const _ = require('lodash');
const { Decoder, Utils } = require('rweb3');
const { isMainnet } = require('../config');

class OrderFulFilled {
  constructor(blockNum, txid, rawLog) {
    if (!_.isEmpty(rawLog)) {
      this.blockNum = blockNum;
      this.txid = txid;
      this.rawLog = rawLog;
      this.decode();
    }
  }

  decode() {
    this.orderId = this.rawLog._id.toString(10);
    this.time = this.rawLog._time.toString(10);   
  }

  translate() {
    return {
      status: 'ORDERFULFILLED',
      orderId: this.orderId,
      txCanceled: this.txid,
      timeCanceled: this.time,
    };
  }
}

module.exports = OrderFulFilled;
