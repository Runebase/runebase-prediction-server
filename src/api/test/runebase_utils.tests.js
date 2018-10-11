const Chai = require('chai');
const ChaiAsPromised = require('chai-as-promised');

const RunebaseUtils = require('../../api/runebase_utils');

Chai.use(ChaiAsPromised);
const assert = Chai.assert;
const expect = Chai.expect;

describe('RunebaseUtils', () => {
  const realAddress = '5bpVRBLUgPSfNqfGE1JSwWqdPcoTBBjQPz';
  const fakeAddress = '5bpVRBLUgPSfNqfGE1JSwWqdP123456789';

  describe('validateAddress()', () => {
    it('asserts address to be valid runebase address', async () => {
      const res = await RunebaseUtils.validateAddress({ address: realAddress });
      assert.isTrue(res.isvalid);
    });

    it('asserts address to be invalid runebase address', async () => {
      const res = await RunebaseUtils.validateAddress({ address: fakeAddress });
      assert.isFalse(res.isvalid);
    });

    it('throws if address is undefined', () => {
      expect(RunebaseUtils.validateAddress()).to.be.rejectedWith(Error);
    });
  });
});
