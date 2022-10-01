import isEqual from 'lodash/isEqual';
import snapshot from '@snapshot-labs/snapshot.js';
import { getAddress } from '@ethersproject/address';
import { jsonParse } from '../../helpers/utils';
import db from '../../helpers/mysql';
import { getSpace } from '../../helpers/actions';
import log from '../../helpers/log';

const proposalDayLimit = 32;
const proposalMonthLimit = 320;

async function getRecentProposalsCount(space) {
  const query = `
    SELECT
    COUNT(IF(created > (UNIX_TIMESTAMP() - 86400), 1, NULL)) AS count_1d,
    COUNT(*) AS count_30d
    FROM proposals WHERE space = ? AND created > (UNIX_TIMESTAMP() - 2592000)
  `;
  return await db.queryAsync(query, [space]);
}

export async function verify(body): Promise<any> {
  const msg = jsonParse(body.msg);
  const created = parseInt(msg.timestamp);

  const schemaIsValid = snapshot.utils.validateSchema(snapshot.schemas.proposal, msg.payload);
  if (schemaIsValid !== true) {
    log.warn('[writer] Wrong proposal format', schemaIsValid);
    return Promise.reject('wrong proposal format');
  }

  if (
    msg.payload.type === 'basic' &&
    !isEqual(['For', 'Against', 'Abstain'], msg.payload.choices)
  ) {
    return Promise.reject('wrong choices for basic type voting');
  }

  const space = await getSpace(msg.space);
  space.id = msg.space;

  // if (msg.payload.start < created) return Promise.reject('invalid start date');

  if (space.voting?.delay) {
    const isValidDelay = msg.payload.start === created + space.voting.delay;
    if (!isValidDelay) return Promise.reject('invalid voting delay');
  }

  if (space.voting?.period) {
    const isValidPeriod = msg.payload.end - msg.payload.start === space.voting.period;
    if (!isValidPeriod) return Promise.reject('invalid voting period');
  }

  if (space.voting?.type) {
    if (msg.payload.type !== space.voting.type) return Promise.reject('invalid voting type');
  }

  try {
    const validationName = space.validation?.name || 'basic';
    const validationParams = space.validation?.params || {};
    const isValid = await snapshot.utils.validations[validationName](
      body.address,
      space,
      msg.payload,
      validationParams
    );
    if (!isValid) return Promise.reject('validation failed');
  } catch (e) {
    return Promise.reject('failed to check validation');
  }

  const provider = snapshot.utils.getProvider(space.network);
  const currentBlockNum = parseInt(await provider.getBlockNumber());
  if (msg.payload.snapshot > currentBlockNum)
    return Promise.reject('proposal snapshot must be in past');

  try {
    const [{ count_1d: proposalsDayCount, count_30d: proposalsMonthCount }] =
      await getRecentProposalsCount(space.id);
    if (proposalsDayCount >= proposalDayLimit || proposalsMonthCount >= proposalMonthLimit)
      return Promise.reject('proposal limit reached');
  } catch (e) {
    return Promise.reject('failed to check proposals limit');
  }
}

export async function action(body, ipfs, receipt, id): Promise<void> {
  const msg = jsonParse(body.msg);
  const space = msg.space;

  /* Store the proposal in dedicated table 'proposals' */
  const spaceSettings = await getSpace(space);
  const author = getAddress(body.address);
  const created = parseInt(msg.timestamp);
  const metadata = msg.payload.metadata || {};
  const strategies = JSON.stringify(spaceSettings.strategies);
  const plugins = JSON.stringify(metadata.plugins || {});
  const network = spaceSettings.network;
  const proposalSnapshot = parseInt(msg.payload.snapshot || '0');

  const proposal = {
    id,
    ipfs,
    author,
    created,
    space,
    network,
    symbol: spaceSettings?.symbol || '',
    type: msg.payload.type || 'single-choice',
    strategies,
    plugins,
    title: msg.payload.name,
    body: msg.payload.body,
    discussion: msg.payload.discussion || '',
    choices: JSON.stringify(msg.payload.choices),
    start: parseInt(msg.payload.start || '0'),
    end: parseInt(msg.payload.end || '0'),
    quorum: spaceSettings?.voting?.quorum || 0,
    privacy: spaceSettings?.voting?.privacy || '',
    snapshot: proposalSnapshot || 0,
    app: msg.payload.app || '',
    scores: JSON.stringify([]),
    scores_by_strategy: JSON.stringify([]),
    scores_state: '',
    scores_total: 0,
    scores_updated: 0,
    votes: 0
  };
  const query = 'INSERT IGNORE INTO proposals SET ?; ';
  const params: any[] = [proposal];

  await db.queryAsync(query, params);
}
