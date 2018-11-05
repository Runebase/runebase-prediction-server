/* eslint no-underscore-dangle: 0 */

const _ = require('lodash');
const { Decoder, Utils } = require('rweb3');
const { isMainnet } = require('../config');

class Trade {
  constructor(blockNum, txid, rawLog, getOrder) {
    if (!_.isEmpty(rawLog)) {
      this.blockNum = blockNum;
      this.txid = txid;
      this.rawLog = rawLog;
      this.getOrder = getOrder;
      this.decode();
    }
  }

  decode() {
    this.date = new Date(this.rawLog._time.toString(10)*1000);  
    this.orderId = this.rawLog._orderId.toString(10);
    this.time = Number(this.rawLog._time.toString(10));
    this.from = this.rawLog._from;
    this.to = this.rawLog._to; 
    this.soldTokens = this.rawLog._soldTokens.toString(10);   
    this.boughtTokens = this.rawLog._boughtTokens.toString(10);  
    this.price = this.getOrder.price;
    this.orderType = this.getOrder.orderType;
    this.tokenName = this.getOrder.tokenName;
    if (this.orderType === "SELLORDER") {
      this.amount = this.soldTokens;              
    }
    if (this.orderType === "BUYORDER") {
      this.amount = this.boughtTokens;  
    }
  }

  translate() {
    return {
      date: this.date,
      txid: this.txid,
      status: 'CONFIRMED',
      orderId: this.orderId,
      time: this.time,
      from: Decoder.toRunebaseAddress(this.from, isMainnet()),
      to: Decoder.toRunebaseAddress(this.to, isMainnet()),
      soldTokens: this.soldTokens,
      boughtTokens: this.boughtTokens,
      price: this.price,
      orderType: this.orderType,
      tokenName: this.tokenName,
      amount: this.amount,
      blockNum: this.blockNum,
    };
  }
}

module.exports = Trade;
