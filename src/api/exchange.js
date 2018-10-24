const _ = require('lodash');
const { Contract, Rweb3 } = require('rweb3');

const { getContractMetadata, getRunebaseRPCAddress } = require('../config');
const Utils = require('../utils');

function getContract() {
  const metadata = getContractMetadata();
  return new Contract(getRunebaseRPCAddress(), metadata.Radex.address, metadata.Radex.abi);
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

  
};

module.exports = Exchange;
