/* eslint no-underscore-dangle: 0 */

const _ = require('lodash');
const { Decoder, Utils } = require('rweb3');
const { isMainnet } = require('../config');

class NewOrder {
  constructor(blockNum, txid, rawLog) {
    if (!_.isEmpty(rawLog)) {
      this.blockNum = blockNum;
      this.txid = txid;
      this.rawLog = rawLog;
      this.decode();
    }
  }

  decode() {
    console.log(this.rawLog);
    this.orderId = this.rawLog._id.toString(10);
    this.sellToken = this.rawLog._sellToken;
    this.buyToken = this.rawLog._buyToken;
    this.priceMul = this.rawLog._priceMul.toString(10);
    this.priceDiv = this.rawLog._priceDiv.toString(10);
    this.amount = this.rawLog._amount.toString(10);
    this.owner = this.rawLog._owner;
    this.time = this.rawLog._time.toString(10);   
  }

  translate() {
    return {
      status: 'NEWORDER',
      txid: this.txid,
      orderId: this.orderId,
      owner: Decoder.toRunebaseAddress(this.owner, isMainnet()),
      sellToken: this.sellToken,
      buyToken: this.buyToken,
      priceMul: this.priceMul,
      priceDiv: this.priceDiv,
      time: this.time,
      amount: this.amount,
      blockNum: this.blockNum,
    };
  }
}

module.exports = NewOrder;
