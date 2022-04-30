/**
 * This is (probably) a one-time use script, to re-pin IPFS files that have not been pinned correctly by the services we use.
 * For example fleek had an issue where it returned IPFS hashes but without actually pinning the files.
 * We are now using our own proxy server for IPFS pinning, which uses multiple services for redundancy.
 * So hopefully this script will only be invoked once. Held in version control for future reference.
 */

import 'dotenv/config';
import db from '../helpers/mysql';
import { pin } from '@snapshot-labs/pineapple';

// import { proposalTypes } from '@snapshot-labs/snapshot.js/src/sign/types';
// doesn't work because it returns the json file not the ts file
const proposalTypes = {
  Proposal: [
    { name: 'from', type: 'address' },
    { name: 'space', type: 'string' },
    { name: 'timestamp', type: 'uint64' },
    { name: 'type', type: 'string' },
    { name: 'title', type: 'string' },
    { name: 'body', type: 'string' },
    { name: 'discussion', type: 'string' },
    { name: 'choices', type: 'string[]' },
    { name: 'start', type: 'uint64' },
    { name: 'end', type: 'uint64' },
    { name: 'snapshot', type: 'uint64' },
    { name: 'network', type: 'string' },
    { name: 'strategies', type: 'string' },
    { name: 'plugins', type: 'string' },
    { name: 'metadata', type: 'string' }
  ]
};

// take proposal id as parameter
const proposalId = process.argv[2];
if (!proposalId) {
  console.log('Usage: yarn run scripts:repin <proposal id>');
  process.exit(1);
}

let proposalsRepinned = 0;
let votesRepinned = 0;
let receiptsRepinned = 0;

const run = async () => {
  const proposalQuery = `SELECT
      p.*,
      m.sig as sig,
      m.version as version,
      m.timestamp as timestamp
    FROM
      proposals p,
      messages m
    WHERE
      p.id = ? AND m.id = p.id`;
  const proposals = await db.queryAsync(proposalQuery, [proposalId]);

  if (proposals.length !== 1) {
    console.log(`Proposal ${proposalId} not found`);
    process.exit(1);
  }

  // repin proposal
  const proposal = proposals[0];

  // sort strategy properties
  // strategies are passed in proposal create messages but what's stored in the db
  // is actually the strategies from space settings, which makes it a bit tricky to
  // recreate the original message.
  proposal.strategies = JSON.stringify(JSON.parse(proposal.strategies).map(strategy => {
    return Object.keys(strategy).sort((a, b) => a.localeCompare(b))
      .reduce((acc, key) => { acc[key] = strategy[key]; return acc; }, {});
  }));
  // get message
  const proposalMessage = {
    address: proposal.author,
    sig: proposal.sig,
    data: {
      domain: {
        name: 'snapshot',
        version: proposal.version
      },
      types: proposalTypes,
      message: {
        space: proposal.space,
        type: proposal.type,
        title: proposal.title,
        body: proposal.body,
        discussion: proposal.discussion,
        choices: JSON.parse(proposal.choices),
        start: proposal.start,
        end: proposal.end,
        snapshot: proposal.snapshot,
        network: proposal.network,
        strategies: proposal.strategies,
        plugins: proposal.plugins,
        metadata: '{}',
        from: proposal.author,
        timestamp: proposal.timestamp
      }
    }
  }

  const ipfsHash = await pin(proposalMessage);
  if (ipfsHash.cid === proposal.ipfs) proposalsRepinned++;

  const votesQuery = `SELECT * FROM votes WHERE proposal = ?`;
  const votes = await db.queryAsync(votesQuery, [proposalId]);

  console.log(`${proposalsRepinned} proposals repinned.`);
  console.log(`${votesRepinned} votes repinned.`);
  console.log(`${receiptsRepinned} receipts repinned.`);
  
  process.exit(0);
};

run();