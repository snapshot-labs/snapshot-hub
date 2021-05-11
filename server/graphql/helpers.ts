import { jsonParse } from '../helpers/utils';

export function formatSpace(id, settings) {
  const space = jsonParse(settings, {});
  space.id = id;
  space.private = space.private || false;
  space.about = space.about || '';
  space.admins = space.admins || [];
  space.members = space.members || [];
  space.plugins = space.plugins || {};
  space.filters = space.filters || {};
  space.filters.minScore = space.filters.minScore || 0;
  space.filters.onlyMembers = space.filters.onlyMembers || false;
  return space;
}

export function formatProposal(proposal) {
  proposal.choices = jsonParse(proposal.choices, []);
  proposal.strategies = jsonParse(proposal.strategies, []);
  proposal.plugins = jsonParse(proposal.plugins, {});
  let proposalState = 'pending';
  const ts = parseInt((Date.now() / 1e3).toFixed());
  if (ts > proposal.start) proposalState = 'active';
  if (ts > proposal.end) proposalState = 'closed';
  proposal.state = proposalState;
  proposal.space = formatSpace(proposal.space, proposal.settings);
  return proposal;
}
