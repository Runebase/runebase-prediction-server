const { Rweb3 } = require('rweb3');

const { getRunebaseRPCAddress } = require('./config');
const QClient = (() => {
  let instance;

  function createInstance() {
    return new Rweb3(getRunebaseRPCAddress());
  }

  return {
    getInstance: () => {
      if (!instance) {
        instance = createInstance();
      }
      return instance;
    },
  };
})();

module.exports = QClient;
