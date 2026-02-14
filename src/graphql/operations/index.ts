import { capture } from '@snapshot-labs/snapshot-sentry';
import aliases from './aliases';
import follows from './follows';
import leaderboards from './leaderboards';
import messages from './messages';
import networks from './networks';
import options from './options';
import plugins from './plugins';
import proposal from './proposal';
import proposals from './proposals';
import ranking from './ranking';
import roles from './roles';
import skins from './skins';
import space from './space';
import spaces from './spaces';
import statement from './statement';
import statements from './statements';
import strategies from './strategies';
import strategy from './strategy';
import subscriptions from './subscriptions';
import user from './user';
import users from './users';
import validations from './validations';
import vote from './vote';
import votes from './votes';
import vp from './vp';
import log from '../../helpers/log';

function withErrorHandler(fn) {
  return (...args) =>
    fn(...args).catch(e => {
      if (e.code !== 'ER_QUERY_TIMEOUT') capture(e);
      log.error(`[graphql] ${JSON.stringify(e)}`);
      return Promise.reject(new Error('request failed'));
    });
}

const operations = {
  space,
  spaces,
  ranking,
  proposal,
  proposals,
  vote,
  votes,
  aliases,
  follows,
  subscriptions,
  skins,
  networks,
  options,
  validations,
  plugins,
  strategies,
  strategy,
  users,
  user,
  statements,
  statement,
  vp,
  messages,
  roles,
  leaderboards
};

export default Object.fromEntries(
  Object.entries(operations).map(([key, fn]) => [key, withErrorHandler(fn)])
);
