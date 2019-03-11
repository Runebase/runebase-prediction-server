/* eslint no-underscore-dangle: 0 */
const _ = require('lodash');
const Decoder = require('rweb3').Decoder;
const Web3Utils = require('web3-utils');

const { isMainnet } = require('../config');
const { WITHDRAW_TYPE } = require('../constants');

class Withdraw {
  constructor(blockNum, txid, contractAddress, rawLog, type) {
    if (!_.isFinite(blockNum)) {
      throw Error('blockNum must be a Number');
    }
    if (!_.isString(txid)) {
      throw Error('txid must be a String');
    }
    if (_.isEmpty(rawLog)) {
      throw Error('rawLog must not be empty');
    }
    if (type !== WITHDRAW_TYPE.ESCROW && type !== WITHDRAW_TYPE.WINNINGS) {
      throw Error(`Invalid escrow type: ${type}`);
    }

    this.blockNum = blockNum;
    this.txid = txid;
    this.contractAddress = contractAddress;
    this.rawLog = rawLog;
    this.type = type;
    this.decode();
  }

  decode() {
    switch (this.type) {
      case WITHDRAW_TYPE.ESCROW: {
        this.version = null;
        this.topicAddress = this.rawLog._eventAddress;
        this.withdrawerAddress = Decoder.toRunebaseAddress(this.rawLog._depositer, isMainnet());
        this.runebaseAmount = '0';
        this.predAmount = Web3Utils.hexToNumberString(this.rawLog.escrowAmount);
        break;
      }
      case WITHDRAW_TYPE.WINNINGS: {
        this.version = this.rawLog._version.toNumber();
        this.topicAddress = this.contractAddress;
        this.withdrawerAddress = Decoder.toRunebaseAddress(this.rawLog._winner, isMainnet());
        this.runebaseAmount = Web3Utils.hexToNumberString(this.rawLog._runebaseTokenWon);
        this.predAmount = Web3Utils.hexToNumberString(this.rawLog._predTokenWon);
        break;
      }
      default: {
        throw Error(`Invalid escrow type: ${this.type}`);
      }
    }
  }

  translate() {
    return {
      blockNum: this.blockNum,
      txid: this.txid,
      type: this.type,
      version: this.version,
      topicAddress: this.topicAddress,
      withdrawerAddress: this.withdrawerAddress,
      runebaseAmount: this.runebaseAmount,
      predAmount: this.predAmount,
    };
  }
}

module.exports = Withdraw;
