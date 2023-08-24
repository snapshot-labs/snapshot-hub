import 'dotenv/config';
import db from '../src/helpers/mysql';

// Usage: yarn ts-node scripts/generate_user_space_counters.ts
async function main() {
  console.log('Inserting/Updating proposals_count');
  const proposalsCountRes = await db.queryAsync(
    `INSERT INTO user_space (proposals_count, user_id, space_id)
    (select * from (select count(id) as proposals_count, author, space from proposals group by author, space) as t)
    ON DUPLICATE KEY UPDATE proposals_count = t.proposals_count`
  );
  console.log(proposalsCountRes);

  console.log('Inserting/Updating votes_count');
  const votesCountRes = await db.queryAsync(
    `INSERT INTO user_space (votes_count, user_id, space_id)
    (select * from (select count(id) as votes_count, voter, space from votes group by voter, space) as t)
    ON DUPLICATE KEY UPDATE votes_count = t.votes_count`
  );
  console.log(votesCountRes);
}

(async () => {
  try {
    await main();
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
