import * as proposal from './proposal';
import * as vote from './vote';
import * as settings from './settings';
import * as deleteProposal from './delete-proposal';
import * as follow from './follow';
import * as unfollow from './unfollow';
import * as alias from './alias';

export default {
  proposal,
  vote,
  settings,
  'delete-proposal': deleteProposal,
  follow,
  unfollow,
  alias
};
