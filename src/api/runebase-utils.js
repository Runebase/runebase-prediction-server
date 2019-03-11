const _ = require('lodash');
const { getInstance } = require('../qclient');

const RunebaseUtils = {
  async validateAddress(args) {
    const { address } = args;

    if (_.isUndefined(address)) {
      throw new TypeError('address needs to be defined');
    }

    return getInstance().validateAddress(address);
  },
};

module.exports = RunebaseUtils;
