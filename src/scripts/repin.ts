/**
 * This is (probably) a one-time use script, to re-pin IPFS files that have not been pinned correctly by the services we use.
 * For example fleek had an issue where it returned IPFS hashes but without actually pinning the files.
 * We are now using our own proxy server for IPFS pinning, which uses multiple services for redundancy.
 * So hopefully this script will only be invoked once. Held in version control for future reference.
 */

import 'dotenv/config';
import db from '../helpers/mysql';
import { pin } from '@snapshot-labs/pineapple';
import IPFSHash from 'ipfs-only-hash';

import {
  proposalTypes,
  voteTypes,
  voteArrayTypes,
  voteStringTypes,
  vote2Types,
  voteArray2Types,
  voteString2Types
// } from '@snapshot-labs/snapshot.js/src/sign/types';
} from './types';
// import from snapshot.js doesn't work, because it returns the json file not
// the ts file, and ts extension doesn't work either, idk why. Put a copy of
// the file in the same directory as this script.

(async () => {
  // take proposal id as parameter and load proposal from db
  const proposalId = process.argv[2];
  if (!proposalId) {
    console.log('Usage: yarn run scripts:repin <proposal id>');
    process.exit(1);
  }

  const proposalQuery = `SELECT
      p.*,
      m.sig as msgSig,
      m.version as msgVersion,
      m.timestamp as msgTimestamp
    FROM
      proposals p,
      messages m
    WHERE
      p.id = ? AND m.id = p.id`;
  const proposals = await db.queryAsync(proposalQuery, [proposalId]);

  if (proposals.length !== 1) {
    console.log(`Proposal ${proposalId} not found.`);
    process.exit(1);
  }

  const proposal = proposals[0];

  let proposalsRepinned = 0;
  let votesRepinned = 0;
  // let receiptsRepinned = 0;

  // sort strategy properties
  // strategies are passed in proposal create messages but what's stored in the db
  // is actually the strategies from space settings, which makes it a bit tricky to
  // recreate the original message.
  proposal.strategies = JSON.stringify(JSON.parse(proposal.strategies).map(strategy => {
    return Object.keys(strategy).sort((a, b) => a.localeCompare(b))
      .reduce((acc, key) => { acc[key] = strategy[key]; return acc; }, {});
  }));

  // rebuild message
  const proposalMessage = {
    address: proposal.author,
    sig: proposal.msgSig,
    data: {
      domain: {
        name: 'snapshot',
        version: proposal.msgVersion
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
        timestamp: proposal.msgTimestamp
      }
    }
  }

  const rebuiltMessageHash = await IPFSHash.of(JSON.stringify(proposalMessage));
  
  if (rebuiltMessageHash === proposal.ipfs) {
    await pin(proposalMessage);
    proposalsRepinned++;
    console.log(`Proposal ${proposalId} repinned. Continuing with votes.`);
  } else {
    console.error(`Rebuilt message for proposal ${proposalId} has an unexpected IPFS hash.`);
    process.exit(1);
  }

  // fetch and repin votes
  const votesQuery = `SELECT
      v.*,
      m.sig as msgSig,
      m.version as msgVersion,
      m.timestamp as msgTimestamp
    FROM
      votes v,
      messages m
    WHERE
      v.proposal = ? AND m.id = v.id`;
  const votes = await db.queryAsync(votesQuery, [proposalId]);

  const isType2Proposal = proposalId.startsWith('0x');

  for (const vote of votes) {
    // select the correct type for the vote, based on proposal type and voting type
    let type = isType2Proposal ? vote2Types : voteTypes;
    let choice = JSON.parse(vote.choice);
    if (['approval', 'ranked-choice'].includes(proposal.type)) {
      type = isType2Proposal ? voteArray2Types : voteArrayTypes;
    }
    if (['quadratic', 'weighted'].includes(proposal.type)) {
      type = isType2Proposal ? voteString2Types : voteStringTypes;
      choice = JSON.stringify(choice);
    }

    // rebuild message
    const voteMessage = {
      address: vote.voter,
      sig: vote.msgSig,
      data: {
        domain: {
          name: 'snapshot',
          version: vote.msgVersion
        },
        types: type,
        message: {
          space: vote.space,
          proposal: vote.proposal,
          choice: choice,
          metadata: vote.metadata,
          from: vote.voter,
          timestamp: vote.msgTimestamp
        }
      }
    }

    const rebuiltMessageHash = await IPFSHash.of(JSON.stringify(voteMessage));

    if (rebuiltMessageHash === vote.ipfs) {
      await pin(voteMessage);
      votesRepinned++;
      console.log(`Vote ${vote.ipfs} repinned.`);
    } else {
      console.error(`Rebuilt message for vote ${vote.ipfs} has an unexpected IPFS hash.`);
      process.exit(1);
    }
  }

  console.log(`${proposalsRepinned} proposals repinned.`);
  console.log(`${votesRepinned} votes repinned.`);
  // console.log(`${receiptsRepinned} receipts repinned.`);
  
  process.exit(0);
})();