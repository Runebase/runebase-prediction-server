const { getLogger } = require('../../utils/logger');

async function migration2(db) {
  try {
    const votes = await db.Votes.find({ type: { $exists: false } });
    /* eslint-disable no-await-in-loop */
    for (let i = 0; i < votes.length; i++) {
      const vote = votes[i];
      let type;
      if (vote.token === 'RUNEBASE') {
        type = { type: 'BET' };
      } else if (vote.token === 'PRED') {
        const oracle = await db.Oracles.find({ address: vote.oracleAddress });
        if (oracle[0].token === 'RUNEBASE') type = { type: 'RESULT_SET' };
        else if (oracle[0].token === 'PRED') type = { type: 'VOTE' };
      }
      await db.Votes.update({ txid: vote.txid }, { $set: type });
    }
  } catch (err) {
    getLogger().error(`Migration 2 DB update Error: ${err.message}`);
    throw Error(`Migration 2 DB update Error: ${err.message}`);
  }
}

module.exports = migration2;
