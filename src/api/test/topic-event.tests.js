const Chai = require('chai');
const ChaiAsPromised = require('chai-as-promised');

const TopicEvent = require('../../api/topic-event');
const ContractUtils = require('./util/contract-utils');
const TestConfig = require('./config/test-config');
const Mocks = require('./mock/topic-event');

Chai.use(ChaiAsPromised);
const assert = Chai.assert;
const expect = Chai.expect;

describe('TopicEvent', () => {
  const contractAddress = 'e4ba4d301d4c22d2634a3d8e23c47b7e9e4ef4df';

  describe('withdrawWinnings()', () => {
    it('returns a tx receipt', () => {
      const res = Mocks.withdrawWinnings.result;
      assert.isTrue(ContractUtils.isTxReceipt(res));
    });

    it('throws if contractAddress is undefined', () => {
      expect(TopicEvent.withdrawWinnings({ senderAddress: TestConfig.SENDER_ADDRESS })).to.be.rejectedWith(Error);
    });

    it('throws if senderAddress is undefined', () => {
      expect(TopicEvent.withdrawWinnings({ contractAddress })).to.be.rejectedWith(Error);
    });
  });

  describe('totalRunebaseValue()', () => {
    it('returns the totalRunebaseValue', () => {
      const res = Mocks.totalRunebaseValue.result;
      assert.isDefined(res[0]);
      assert.isNotNaN(Number(res[0]));
    });

    it('throws if contractAddress is undefined', () => {
      expect(TopicEvent.totalRunebaseValue({ senderAddress: TestConfig.SENDER_ADDRESS })).to.be.rejectedWith(Error);
    });

    it('throws if senderAddress is undefined', () => {
      expect(TopicEvent.totalRunebaseValue({ contractAddress })).to.be.rejectedWith(Error);
    });
  });

  describe('totalPredValue()', () => {
    it('returns the totalPredValue', () => {
      const res = Mocks.totalPredValue.result;
      assert.isDefined(res[0]);
      assert.isNotNaN(Number(res[0]));
    });

    it('throws if contractAddress is undefined', () => {
      expect(TopicEvent.totalPredValue({ senderAddress: TestConfig.SENDER_ADDRESS })).to.be.rejectedWith(Error);
    });

    it('throws if senderAddress is undefined', () => {
      expect(TopicEvent.totalPredValue({ contractAddress })).to.be.rejectedWith(Error);
    });
  });

  describe('getFinalResult()', () => {
    it('returns the final result and valid flag', () => {
      const res = Mocks.getFinalResult.result;
      assert.isDefined(res[0]);
      assert.isNotNaN(Number(res[0]));
      assert.isDefined(res[1]);
      assert.isBoolean(res[1]);
    });

    it('throws if contractAddress is undefined', () => {
      expect(TopicEvent.getFinalResult({ senderAddress: TestConfig.SENDER_ADDRESS })).to.be.rejectedWith(Error);
    });

    it('throws if senderAddress is undefined', () => {
      expect(TopicEvent.getFinalResult({ contractAddress })).to.be.rejectedWith(Error);
    });
  });

  describe('status()', () => {
    it('returns the status', () => {
      const res = Mocks.status.result;
      assert.isDefined(res[0]);
      assert.isNotNaN(Number(res[0]));
    });

    it('throws if contractAddress is undefined', () => {
      expect(TopicEvent.status({ senderAddress: TestConfig.SENDER_ADDRESS })).to.be.rejectedWith(Error);
    });

    it('throws if senderAddress is undefined', () => {
      expect(TopicEvent.status({ contractAddress })).to.be.rejectedWith(Error);
    });
  });

  describe('didWithdraw()', () => {
    const address = 'qKjn4fStBaAtwGiwueJf9qFxgpbAvf1xAy';

    it('returns the didWithdraw flag', () => {
      const res = Mocks.didWithdraw.result;
      assert.isDefined(res[0]);
      assert.isBoolean(res[0]);
    });

    it('throws if contractAddress is undefined', () => {
      expect(TopicEvent.didWithdraw({
        address,
        senderAddress: TestConfig.SENDER_ADDRESS,
      })).to.be.rejectedWith(Error);
    });

    it('throws if address is undefined', () => {
      expect(TopicEvent.didWithdraw({
        contractAddress,
        senderAddress: TestConfig.SENDER_ADDRESS,
      })).to.be.rejectedWith(Error);
    });

    it('throws if senderAddress is undefined', () => {
      expect(TopicEvent.didWithdraw({
        contractAddress,
        address,
      })).to.be.rejectedWith(Error);
    });
  });

  describe('calculateWinnings()', () => {
    it('returns the PRED and RUNEBASE winnings', () => {
      const res = Mocks.calculateWinnings.result;
      assert.isDefined(res[0]);
      assert.isNotNaN(Number(res[0]));
      assert.isDefined(res[1]);
      assert.isNotNaN(Number(res[1]));
    });

    it('throws if contractAddress is undefined', () => {
      expect(TopicEvent.calculateWinnings({ senderAddress: TestConfig.SENDER_ADDRESS })).to.be.rejectedWith(Error);
    });

    it('throws if senderAddress is undefined', () => {
      expect(TopicEvent.calculateWinnings({ contractAddress })).to.be.rejectedWith(Error);
    });
  });
});
