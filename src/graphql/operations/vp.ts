import snapshot from '@snapshot-labs/snapshot.js';
import type { Strategy } from '@snapshot-labs/snapshot.js/dist/voting/types';
import { GraphQLError } from 'graphql';
import db from '../../helpers/mysql';

const scoreAPIUrl = process.env.SCORE_API_URL || 'https://score.snapshot.org';

type Payload = {
  voter: string;
  network?: string;
  strategies?: Strategy[];
  snapshot: number | 'latest';
  space: string;
  options: any;
};

export default async function (_parent, { voter, space, proposal }) {
  if (voter === '0x0000000000000000000000000000000000000000' || voter === '') {
    return Promise.reject(new Error('invalid address'));
  }

  const payload: Payload = {
    voter,
    space,
    snapshot: 'latest',
    options: { url: scoreAPIUrl }
  };

  if (proposal) {
    const query = `SELECT * FROM proposals WHERE id = ? LIMIT 1`;
    const [p] = await db.queryAsync(query, [proposal]);

    if (!p) {
      return Promise.reject(new Error('proposal not found'));
    }

    payload.network = p.network;
    payload.strategies = JSON.parse(p.strategies);
    payload.snapshot = p.snapshot;
  } else if (space) {
    const query = `SELECT settings FROM spaces WHERE id = ? AND deleted = 0 LIMIT 1`;
    let [s] = await db.queryAsync(query, [space]);

    if (!s) {
      return Promise.reject(new Error('space not found'));
    }

    s = JSON.parse(s.settings);
    payload.network = s.network;
    payload.strategies = s.strategies;
  }

  try {
    return await snapshot.utils.getVp(
      payload.voter,
      payload.network as string,
      payload.strategies as Strategy[],
      payload.snapshot,
      payload.space,
      payload.options
    );
  } catch (e: any) {
    throw new GraphQLError('failed to get voting power', null, null, null, null, null, e);
  }
}
