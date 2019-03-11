const _ = require('lodash');
const { Contract } = require('rweb3');

const { Config, getContractMetadata, getRunebaseRPCAddress } = require('../config');
const Utils = require('../utils');

function getContract(contractAddress) {
  const metadata = getContractMetadata();
  return new Contract(getRunebaseRPCAddress(), contractAddress, metadata.DecentralizedOracle.abi);
}

const DecentralizedOracle = {
  async vote(args) {
    const {
      contractAddress, // address
      resultIndex, // number
      predAmount, // string: Predoshi
      gasLimit, // number
      senderAddress, // address
    } = args;

    if (_.isUndefined(contractAddress)) {
      throw new TypeError('contractAddress needs to be defined');
    }
    if (_.isUndefined(resultIndex)) {
      throw new TypeError('resultIndex needs to be defined');
    }
    if (_.isUndefined(predAmount)) {
      throw new TypeError('predAmount needs to be defined');
    }
    if (_.isUndefined(senderAddress)) {
      throw new TypeError('senderAddress needs to be defined');
    }

    // If gasLimit is not specified, we need to make sure the vote succeeds in the event this vote will surpass the
    // consensus threshold and will require a higher gas limit.
    const contract = getContract(contractAddress);
    return contract.send('voteResult', {
      methodArgs: [resultIndex, predAmount],
      gasLimit: gasLimit || Config.CREATE_DORACLE_GAS_LIMIT,
      senderAddress,
    });
  },

  async finalizeResult(args) {
    const {
      contractAddress, // address
      senderAddress, // address
    } = args;

    if (_.isUndefined(contractAddress)) {
      throw new TypeError('contractAddress needs to be defined');
    }
    if (_.isUndefined(senderAddress)) {
      throw new TypeError('senderAddress needs to be defined');
    }

    const contract = getContract(contractAddress);
    return contract.send('finalizeResult', {
      methodArgs: [],
      senderAddress,
    });
  },

  async arbitrationEndBlock(args) {
    const {
      contractAddress, // address
      senderAddress, // address
    } = args;

    if (_.isUndefined(contractAddress)) {
      throw new TypeError('contractAddress needs to be defined');
    }
    if (_.isUndefined(senderAddress)) {
      throw new TypeError('senderAddress needs to be defined');
    }

    const contract = getContract(contractAddress);
    return contract.call('arbitrationEndBlock', {
      methodArgs: [],
      senderAddress,
    });
  },

  async lastResultIndex(args) {
    const {
      contractAddress, // address
      senderAddress, // address
    } = args;

    if (_.isUndefined(contractAddress)) {
      throw new TypeError('contractAddress needs to be defined');
    }
    if (_.isUndefined(senderAddress)) {
      throw new TypeError('senderAddress needs to be defined');
    }

    const contract = getContract(contractAddress);
    const res = await contract.call('lastResultIndex', {
      methodArgs: [],
      senderAddress,
    });
    res[0] = Utils.hexToDecimalString(res[0]);
    return res;
  },
};

module.exports = DecentralizedOracle;
