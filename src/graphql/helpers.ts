import { jsonParse } from '../helpers/utils';
import { spaceProposals, spaceFollowers } from '../helpers/spaces';

const network = process.env.NETWORK || 'testnet';

export function formatSpace(id, settings) {
  const space = jsonParse(settings, {});
  space.id = id;
  space.private = space.private || false;
  space.avatar = space.avatar || '';
  space.about = space.about || '';
  space.categories = space.categories || [];
  space.admins = space.admins || [];
  space.members = space.members || [];
  space.plugins = space.plugins || {};
  space.filters = space.filters || {};
  space.filters.minScore = space.filters.minScore || 0;
  space.filters.onlyMembers = space.filters.onlyMembers || false;
  space.voting = space.voting || {};
  space.voting.delay = space.voting.delay || null;
  space.voting.period = space.voting.period || null;
  space.voting.type = space.voting.type || null;
  space.voting.quorum = space.voting.quorum || null;
  space.voting.blind = space.voting.blind || false;
  space.followersCount = spaceFollowers[id]?.count || 0;
  space.proposalsCount = spaceProposals[id]?.count || 0;
  space.voting.hideAbstain = space.voting.hideAbstain || false;
  space.validation = space.validation || { name: 'basic', params: {} };
  space.strategies = space.strategies.map(strategy => ({
    ...strategy,
    // By default return space network if strategy network is not defined
    network: strategy.network || space.network
  }));
  return space;
}

export function formatProposal(proposal) {
  proposal.choices = jsonParse(proposal.choices, []);
  proposal.strategies = jsonParse(proposal.strategies, []);
  proposal.plugins = jsonParse(proposal.plugins, {});
  proposal.scores = jsonParse(proposal.scores, []);
  proposal.scores_by_strategy = jsonParse(proposal.scores_by_strategy, []);
  let proposalState = 'pending';
  const ts = parseInt((Date.now() / 1e3).toFixed());
  if (ts > proposal.start) proposalState = 'active';
  if (ts > proposal.end) proposalState = 'closed';
  proposal.state = proposalState;
  proposal.space = formatSpace(proposal.space, proposal.settings);
  const networkStr = network === 'testnet' ? 'demo.' : '';
  proposal.link = `https://${networkStr}snapshot.org/#/${proposal.space.id}/proposal/${proposal.id}`;
  return proposal;
}

export function formatVote(vote) {
  vote.choice = jsonParse(vote.choice);
  vote.metadata = jsonParse(vote.metadata, {});
  vote.vp_by_strategy = jsonParse(vote.vp_by_strategy, []);
  vote.space = formatSpace(vote.space, vote.settings);
  return vote;
}

export function formatFollow(follow) {
  follow.space = formatSpace(follow.space, follow.settings);
  return follow;
}

export function formatSubscription(subscription) {
  subscription.space = formatSpace(subscription.space, subscription.settings);
  return subscription;
}

export function buildWhereQuery(fields, alias, where) {
  let query: any = '';
  const params: any[] = [];
  Object.entries(fields).forEach(([field, type]) => {
    if (where[field]) {
      query += `AND ${alias}.${field} = ? `;
      params.push(where[field]);
    }
    const fieldIn = where[`${field}_in`] || [];
    if (fieldIn.length > 0) {
      query += `AND ${alias}.${field} IN (?) `;
      params.push(fieldIn);
    }
    if (type === 'number') {
      const fieldGt = where[`${field}_gt`];
      const fieldGte = where[`${field}_gte`];
      const fieldLt = where[`${field}_lt`];
      const fieldLte = where[`${field}_lte`];
      if (fieldGt) {
        query += `AND ${alias}.${field} > ? `;
        params.push(fieldGt);
      }
      if (fieldGte) {
        query += `AND ${alias}.${field} >= ? `;
        params.push(fieldGte);
      }
      if (fieldLt) {
        query += `AND ${alias}.${field} < ? `;
        params.push(fieldLt);
      }
      if (fieldLte) {
        query += `AND ${alias}.${field} <= ? `;
        params.push(fieldLte);
      }
    }
  });
  return { query, params };
}
