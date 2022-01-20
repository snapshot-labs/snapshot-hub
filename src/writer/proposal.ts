import isEqual from 'lodash/isEqual';
import snapshot from '@snapshot-labs/snapshot.js';
import { getAddress } from '@ethersproject/address';
import { jsonParse } from '../helpers/utils';
import { spaces } from '../helpers/spaces';
import db from '../helpers/mysql';

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

  const schemaIsValid = snapshot.utils.validateSchema(
    snapshot.schemas.proposal,
    msg.payload
  );
  if (schemaIsValid !== true) {
    console.log('[writer] Wrong proposal format', schemaIsValid);
    return Promise.reject('wrong proposal format');
  }

  if (
    msg.payload.type === 'basic' &&
    !isEqual(['For', 'Against', 'Abstain'], msg.payload.choices)
  ) {
    return Promise.reject('wrong choices for basic type voting');
  }

  const space = spaces[msg.space];
  space.id = msg.space;

  if (space.voting?.delay) {
    const isValidDelay =
      msg.payload.start === parseInt(msg.timestamp) + space.voting.delay;

    if (!isValidDelay) return Promise.reject('invalid voting delay');
  }

  if (space.voting?.period) {
    const isValidPeriod =
      msg.payload.end - msg.payload.start === space.voting.period;
    if (!isValidPeriod) return Promise.reject('invalid voting period');
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

  try {
    const [
      { count_1d: proposalsDayCount, count_30d: proposalsMonthCount }
    ] = await getRecentProposalsCount(space.id);

    if (proposalsDayCount >= proposalDayLimit) {
      return Promise.reject('daily proposal limit reached');
    }
    if (proposalsMonthCount >= proposalMonthLimit) {
      return Promise.reject('monthly proposal limit reached');
    }
  } catch (e) {
    return Promise.reject('failed to check proposals limit');
  }
}

export async function action(body, ipfs, receipt, id): Promise<void> {
  const msg = jsonParse(body.msg);
  const space = msg.space;

  await db.queryAsync('INSERT IGNORE INTO messages SET ?', [
    {
      id,
      ipfs,
      address: body.address,
      version: msg.version,
      timestamp: msg.timestamp,
      space,
      type: 'proposal',
      sig: body.sig,
      receipt
    }
  ]);

  /* Store the proposal in dedicated table 'proposals' */
  const spaceSettings = spaces[space];
  const author = getAddress(body.address);
  const created = parseInt(msg.timestamp);
  const metadata = msg.payload.metadata || {};
  const strategies = JSON.stringify(spaceSettings.strategies);
  const plugins = JSON.stringify(metadata.plugins || {});
  const network = metadata.network || spaceSettings.network;
  const proposalSnapshot = parseInt(msg.payload.snapshot || '0');

  const proposal = {
    id,
    ipfs,
    author,
    created,
    space,
    network,
    type: msg.payload.type || 'single-choice',
    strategies,
    plugins,
    title: msg.payload.name,
    body: msg.payload.body,
    choices: JSON.stringify(msg.payload.choices),
    start: parseInt(msg.payload.start || '0'),
    end: parseInt(msg.payload.end || '0'),
    snapshot: proposalSnapshot || 0,
    scores: JSON.stringify([]),
    scores_by_strategy: JSON.stringify([]),
    scores_state: '',
    scores_total: 0,
    scores_updated: 0,
    votes: 0
  };
  let query = 'INSERT IGNORE INTO proposals SET ?; ';
  const params: any[] = [proposal];

  /* Store events in database */
  const event = {
    id: `proposal/${id}`,
    space
  };
  const ts = Date.now() / 1e3;

  query += 'INSERT IGNORE INTO events SET ?; ';
  params.push({
    event: 'proposal/created',
    expire: proposal.created,
    ...event
  });

  query += 'INSERT IGNORE INTO events SET ?; ';
  params.push({
    event: 'proposal/start',
    expire: proposal.start,
    ...event
  });

  if (proposal.end > ts) {
    query += 'INSERT IGNORE INTO events SET ?; ';
    params.push({
      event: 'proposal/end',
      expire: proposal.end,
      ...event
    });
  }

  await db.queryAsync(query, params);
  console.log('Store proposal complete', space, id);
}
