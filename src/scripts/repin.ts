import 'dotenv/config';
import db from '../helpers/mysql';
import { pin } from '@snapshot-labs/pineapple';
import IPFSHash from 'ipfs-only-hash';
import {
  voteTypes,
  voteArrayTypes,
  voteStringTypes,
  vote2Types,
  voteArray2Types,
  voteString2Types
} from './types';

(async () => {
  let votesRepinned = 0;
  let votesNotPinned = 0;

  // fetch and repin votes
  const votesQuery = `SELECT * FROM votes WHERE proposal = ? LIMIT 1000`;
  const proposalId =
    '0xc6596e12ae6391d81d73cbeee16254ebe9592fb2c47ba9bd1c2dd2861ed3c70b';
  const proposalType = 'single-choice';
  let votes = await db.queryAsync(votesQuery, [proposalId]);
  const ids = votes.map(vote => vote.id);
  let msgs = await db.queryAsync(
    'SELECT id, sig AS msgSig, version AS msgVersion, timestamp AS msgTimestamp FROM messages WHERE id IN (?)',
    [ids]
  );
  msgs = Object.fromEntries(msgs.map(msg => [msg.id, msg]));
  votes = votes.map(vote => {
    vote = { ...vote, ...msgs[vote.id], proposalType };
    return vote;
  });

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

    const voteMessage = {
      address: vote.voter,
      sig: vote.msgSig,
      data: {
        domain: {
          name: 'snapshot',
          version: '0.1.4'
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
      const { cid } = await pin(voteMessage);
      votesRepinned++;
      console.log(`Typed data vote ${vote.ipfs} repinned`);
      if (cid !== vote.ipfs) {
        console.log('Oooops, wrong hash', cid, vote.ipfs);
      }
    } else if (rebuiltMessageHashPersonalSign === vote.ipfs) {
      const { cid } = await pin(voteMessagePersonalSign);
      if (cid !== vote.ipfs) {
        console.log('Oooops, wrong hash', cid, vote.ipfs);
      }
      votesRepinned++;
      console.log(`Personal sign vote ${vote.ipfs} repinned`);
    } else {
      console.log('Wrong IFPS hash');
      votesNotPinned++;
    }
  }
  console.log(`${votesRepinned} votes repinned.`);
  console.log(`${votesNotPinned} votes not pinned.`);
})();
