const _ = require('lodash');
const { Contract, Rweb3 } = require('rweb3');
const math = require('mathjs');

const { getContractMetadata, getRunebaseRPCAddress } = require('../config');
const Utils = require('../utils');

function getContract() {
  const metadata = getContractMetadata();
  return new Contract(getRunebaseRPCAddress(), metadata.Radex.address, metadata.Radex.abi);
}
function getContractToken(tokenChoice) {
  const metadata = getContractMetadata();
  const func = new Function("new Contract(getRunebaseRPCAddress()," + metadata + "." + tokenChoice + ".address, " + metadata + "." + tokenChoice + ".abi);")();
  return func();
}
function getContractpred() {
  const metadata = getContractMetadata();
  return new Contract(getRunebaseRPCAddress(), metadata.RunebasePredictionToken.address, metadata.RunebasePredictionToken.abi);
}
const Exchange = {

  async balanceOf(args) {
    const {
      token, // address
      user, // address
      senderAddress,
    } = args;

    if (_.isUndefined(user)) {
      throw new TypeError('user needs to be defined');
    }
    if (_.isUndefined(token)) {
      throw new TypeError('token needs to be defined');
    }

    const res = await getContract().call('balanceOf', {
      methodArgs: [token, user],
      senderAddress,
    });
    res.balance = Utils.hexToDecimalString(res[0]);
    res[0] = Utils.hexToDecimalString(res[0]);
    return res;
  },

  async fundExchangeRunes(args) {
    const {
      exchangeAddress, // address
      amount,
      senderAddress,    
    } = args;
    console.log(args);
    if (_.isUndefined(senderAddress)) {
      throw new TypeError('senderAddress needs to be defined');
    }
    if (_.isUndefined(exchangeAddress)) {
      throw new TypeError('to address needs to be defined');
    }
    if (_.isUndefined(amount)) {
      throw new TypeError('value needs to be defined');
    }

    const res = await getContract().send('fund', {
      methodArgs: [],
      amount,
      senderAddress,
    });
    return res.txid;
  },

  async redeemExchange(args) {
    const {
      exchangeAddress, // address
      amount,
      token,
      tokenaddress,
      senderAddress,    
    } = args;
    console.log(args);
    if (_.isUndefined(senderAddress)) {
      throw new TypeError('senderAddress needs to be defined');
    }
    if (_.isUndefined(exchangeAddress)) {
      throw new TypeError('to address needs to be defined');
    }
    if (_.isUndefined(amount)) {
      throw new TypeError('value needs to be defined');
    }
    let calculatedAmount;
    if (token == "RUNES") {
      calculatedAmount = amount * 1e8;
    }
    else {
      calculatedAmount = amount;
    }
    
    const res = await getContract().send('redeem', {
      methodArgs: [tokenaddress, calculatedAmount],
      senderAddress,
    });
    console.log(res);
    return res.txid;
  },
  
  async orderExchange(args) {
    const {
      exchangeAddress, // address
      amount,
      token,
      tokenaddress,
      senderAddress,
      price,
      orderType,    
    } = args;
    const fract = math.fraction(price);
    console.log(fract.n);
    console.log(fract.d);
    console.log(orderType);
    console.log(args);
    if (_.isUndefined(senderAddress)) {
      throw new TypeError('senderAddress needs to be defined');
    }
    if (_.isUndefined(exchangeAddress)) {
      throw new TypeError('exchangeAddress needs to be defined');
    }
    if (_.isUndefined(amount)) {
      throw new TypeError('amount needs to be defined');
    }
    if (_.isUndefined(orderType)) {
      throw new TypeError('orderType needs to be defined');
    }
    if (_.isUndefined(price)) {
      throw new TypeError('price needs to be defined');
    }

    let res;
    if (orderType == 'buy') {
      res = await getContract().send('createOrder', {
        methodArgs: ["0000000000000000000000000000000000000000", tokenaddress, amount, fract.n, fract.d],
        senderAddress,
      });
    }
    if (orderType == 'sell') {
      res = await getContract().send('createOrder', {
        methodArgs: [tokenaddress, "0000000000000000000000000000000000000000", amount, fract.n, fract.d],
        senderAddress,
      });
    }    
    
    console.log(res);
    return res.txid;
  },
};


module.exports = Exchange;
