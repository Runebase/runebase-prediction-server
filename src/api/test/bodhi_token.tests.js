const Chai = require('chai');
const ChaiAsPromised = require('chai-as-promised');

const RunebasePredictionToken = require('../../api/runebaseprediction_token');
const ContractUtils = require('./util/contract_utils');
const TestConfig = require('./config/test_config');
const Mocks = require('./mock/runebaseprediction_token');

Chai.use(ChaiAsPromised);
const assert = Chai.assert;
const expect = Chai.expect;

describe('RunebasePredictionToken', () => {
  describe('approve()', () => {
    it('returns a tx receipt', () => {
      const res = Mocks.approve.result;
      assert.isTrue(ContractUtils.isTxReceipt(res));
    });

    it('throws if spender is undefined', () => {
      expect(RunebasePredictionToken.approve({
        value: '0',
        senderAddress: TestConfig.SENDER_ADDRESS,
      })).to.be.rejectedWith(Error);
    });

    it('throws if value is undefined', () => {
      expect(RunebasePredictionToken.approve({
        spender: 'qUDvDKsZQv84iS6mrA2i7ghjgM34mfUxQu',
        senderAddress: TestConfig.SENDER_ADDRESS,
      })).to.be.rejectedWith(Error);
    });

    it('throws if senderAddress is undefined', () => {
      expect(RunebasePredictionToken.approve({
        spender: 'qUDvDKsZQv84iS6mrA2i7ghjgM34mfUxQu',
        value: '0',
      })).to.be.rejectedWith(Error);
    });
  });

  describe('allowance()', () => {
    it('returns the allowance', () => {
      const res = Mocks.allowance.result;
      assert.isDefined(res.remaining);
      assert.isNotNaN(Number(res.remaining));
    });

    it('throws if owner is undefined', () => {
      expect(RunebasePredictionToken.allowance({
        spender: 'qUDvDKsZQv84iS6mrA2i7ghjgM34mfUxQu',
        senderAddress: TestConfig.SENDER_ADDRESS,
      })).to.be.rejectedWith(Error);
    });

    it('throws if spender is undefined', () => {
      expect(RunebasePredictionToken.allowance({
        owner: 'qKjn4fStBaAtwGiwueJf9qFxgpbAvf1xAy',
        senderAddress: TestConfig.SENDER_ADDRESS,
      })).to.be.rejectedWith(Error);
    });

    it('throws if senderAddress is undefined', () => {
      expect(RunebasePredictionToken.allowance({
        owner: 'qKjn4fStBaAtwGiwueJf9qFxgpbAvf1xAy',
        spender: 'qUDvDKsZQv84iS6mrA2i7ghjgM34mfUxQu',
      })).to.be.rejectedWith(Error);
    });
  });

  describe('balanceOf()', () => {
    it('returns the allowance', () => {
      const res = Mocks.balanceOf.result;
      assert.isDefined(res.balance);
      assert.isNotNaN(Number(res.balance));
    });

    it('throws if owner is undefined', () => {
      expect(RunebasePredictionToken.balanceOf({
        senderAddress: TestConfig.SENDER_ADDRESS,
      })).to.be.rejectedWith(Error);
    });

    it('throws if senderAddress is undefined', () => {
      expect(RunebasePredictionToken.balanceOf({
        owner: 'qKjn4fStBaAtwGiwueJf9qFxgpbAvf1xAy',
      })).to.be.rejectedWith(Error);
    });
  });
});
