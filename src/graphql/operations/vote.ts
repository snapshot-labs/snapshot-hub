import graphqlFields from 'graphql-fields';
import db from '../../helpers/mysql';
import { formatProposal, formatVote } from '../helpers';
import log from '../../helpers/log';
import type { Vote } from '../../types';

type VoteWithProposalId = Omit<Vote, 'proposal'> & { proposal: string };

export default async function (parent: any, { id }: { id: string }, context: any, info: any) {
  const requestedFields = info ? graphqlFields(info) : {};
  const query = `
    SELECT v.*, spaces.settings FROM votes v
    INNER JOIN spaces ON spaces.id = v.space
    WHERE v.id = ? AND spaces.settings IS NOT NULL
    LIMIT 1
  `;
  let proposal;

  try {
    const votes = await db.queryAsync(query, [id]);
    const vote =
      votes.map((vote: any) => formatVote(vote) as unknown as VoteWithProposalId)[0] || null;
    if (requestedFields.proposal && vote?.proposal) {
      const proposalId = vote.proposal;
      const query = `
        SELECT p.*, spaces.settings FROM proposals p
        INNER JOIN spaces ON spaces.id = p.space
        WHERE spaces.settings IS NOT NULL AND p.id = ?
      `;
      try {
        const proposals = await db.queryAsync(query, [proposalId]);
        proposal = formatProposal(proposals[0]);
      } catch (e) {
        log.error(`[graphql] vote, ${JSON.stringify(e)}`);
        return Promise.reject('request failed');
      }
    }
    return {
      ...vote,
      proposal
    } as Vote;
  } catch (e) {
    log.error(`[graphql] vote, ${JSON.stringify(e)}`);
    return Promise.reject('request failed');
  }
}
