/* eslint no-underscore-dangle: 0 */

const _ = require('lodash');
const { Decoder, Utils } = require('rweb3');
const { isMainnet } = require('../config');

class MarketMaker {
  constructor(blockNum, txid, rawLog) {
    if (!_.isEmpty(rawLog)) {
      this.blockNum = blockNum;
      this.txid = txid;
      this.rawLog = rawLog;
      this.decode();
    }
  }

  decode() {
    this.time = this.rawLog._time.toString(10);   
    this.amount = this.rawLog._amount.toString(10); 
    this.token = this.rawLog._token;
    this.owner = this.rawLog._owner;
  }

  translate() {
    return {
      status: 'CONFIRMED',
      amount: this.amount,
      time: this.time,
      token: this.token,
      owner: Decoder.toRunebaseAddress(this.owner, isMainnet()),
    };
  }
}

module.exports = MarketMaker;
