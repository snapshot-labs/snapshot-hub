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
import fs from 'fs';
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
  // const proposalId = process.argv[2];
  // if (!proposalId) {
  //   console.log('Usage: yarn run scripts:repin <proposal id>');
  //   process.exit(1);
  // }

  // const proposalQuery = `SELECT
  //     p.*,
  //     m.sig as msgSig,
  //     m.version as msgVersion,
  //     m.timestamp as msgTimestamp
  //   FROM
  //     proposals p,
  //     messages m
  //   WHERE
  //     p.id = ? AND m.id = p.id`;
  // const proposals = await db.queryAsync(proposalQuery, [proposalId]);

  // if (proposals.length !== 1) {
  //   console.log(`Proposal ${proposalId} not found.`);
  //   process.exit(1);
  // }

  // const proposal = proposals[0];

  let votesRepinned = 0;
  let votesNotPinned = 0;
  // let receiptsRepinned = 0;

  // sort strategy properties
  // strategies are passed in proposal create messages but what's stored in the db
  // is actually the strategies from space settings, which makes it a bit tricky to
  // recreate the original message.
  // proposal.strategies = JSON.stringify(
  //   JSON.parse(proposal.strategies).map(strategy => {
  //     return Object.keys(strategy)
  //       .sort((a, b) => a.localeCompare(b))
  //       .reduce((acc, key) => {
  //         acc[key] = strategy[key];
  //         return acc;
  //       }, {});
  //   })
  // );

  // rebuild message
  // const proposalMessage = {
  //   address: proposal.author,
  //   sig: proposal.msgSig,
  //   data: {
  //     domain: {
  //       name: 'snapshot',
  //       version: proposal.msgVersion
  //     },
  //     types: proposalTypes,
  //     message: {
  //       space: proposal.space,
  //       type: proposal.type,
  //       title: proposal.title,
  //       body: proposal.body,
  //       discussion: proposal.discussion,
  //       choices: JSON.parse(proposal.choices),
  //       start: proposal.start,
  //       end: proposal.end,
  //       snapshot: proposal.snapshot,
  //       network: proposal.network,
  //       strategies: proposal.strategies,
  //       plugins: proposal.plugins,
  //       metadata: '{}',
  //       from: proposal.author,
  //       timestamp: proposal.msgTimestamp
  //     }
  //   }
  // };

  // const rebuiltMessageHash = await IPFSHash.of(JSON.stringify(proposalMessage));

  // if (rebuiltMessageHash === proposal.ipfs) {
  //   await pin(proposalMessage);
  //   proposalsRepinned++;
  //   console.log(`Proposal ${proposalId} repinned. Continuing with votes.`);
  // } else {
  //   console.error(
  //     `Rebuilt message for proposal ${proposalId} has an unexpected IPFS hash.`
  //   );
  //   process.exit(1);
  // }

  // fetch and repin votes
  const votesQuery = `SELECT
    votes.*,
    messages.sig as msgSig,
    messages.version as msgVersion,
    messages.timestamp as msgTimestamp,
    proposals.type as proposalType
  FROM votes
  JOIN proposals ON proposals.id = votes.proposal
  JOIN messages ON messages.id = votes.id limit 1000`;

  const votes = await db.queryAsync(votesQuery);

  console.log('total votes', votes.length);

  for (const vote of votes) {
    const isType2Proposal = vote.proposal.startsWith('0x');
    // select the correct type for the vote, based on proposal type and voting type
    let type = isType2Proposal ? vote2Types : voteTypes;
    let choice = JSON.parse(vote.choice);
    if (['approval', 'ranked-choice'].includes(vote.proposalType)) {
      type = isType2Proposal ? voteArray2Types : voteArrayTypes;
    }
    if (['quadratic', 'weighted'].includes(vote.proposalType)) {
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
    };

    const voteMessagePersonalSign = {
      address: vote.voter,
      msg: JSON.stringify({
        version: '0.1.3',
        timestamp: vote.msgTimestamp.toString(),
        space: vote.space,
        type: 'vote',
        payload: {
          proposal: vote.proposal,
          choice: JSON.parse(vote.choice),
          metadata: {}
        }
      }),
      sig: vote.msgSig,
      version: '2'
    };

    const rebuiltMessageHash = await IPFSHash.of(JSON.stringify(voteMessage));
    const rebuiltMessageHashPersonalSign = await IPFSHash.of(
      JSON.stringify(voteMessagePersonalSign)
    );

    if (rebuiltMessageHash === vote.ipfs) {
      // await pin(voteMessage);
      votesRepinned++;
      console.log(`Typed Array Vote ${vote.ipfs} repinned.`);
    } else if (rebuiltMessageHashPersonalSign === vote.ipfs) {
      // await pin(voteMessagePersonalSign);
      // write to file
      votesRepinned++;
      console.log(`Personal Sign Vote ${vote.ipfs} repinned.`);
    } else {
      if (
        vote.msgSig ===
        '0x60e0ce3b45e7a4e9bb9871eeb36547945e978bde3f2a9c32a683d25f9e91cfed069f1c19f487ff8a9d1d9fe83605a1ec48d673c0e252b6614a3d8cbec861cb9c1b'
      ) {
        fs.writeFileSync(`./ipfs`, JSON.stringify(voteMessagePersonalSign));
      }
      console.log({
        voteMessagePersonalSign: JSON.stringify(voteMessagePersonalSign),
        voteHash: vote.ipfs,
        rebuiltHash: rebuiltMessageHashPersonalSign
      });
      console.error(
        `Rebuilt message for vote ${vote.ipfs} has an unexpected IPFS hash.`
      );
      votesNotPinned++;
      // process.exit(1);
    }
  }

  console.log(`${votesRepinned} votes repinned.`);
  console.log(`${votesNotPinned} votes not pinned.`);
  // console.log(`${receiptsRepinned} receipts repinned.`);

  process.exit(0);
})();
