import isEqual from 'lodash/isEqual';
import snapshot from '@snapshot-labs/snapshot.js';
import {
  getRecentProposalsCount,
  storeProposal
} from '../helpers/adapters/mysql';
import { jsonParse } from '../helpers/utils';
import { spaces } from '../helpers/spaces';

const proposalDayLimit = 32;
const proposalMonthLimit = 320;

export async function verify(body): Promise<any> {
  const msg = jsonParse(body.msg);

  const schemaIsValid = snapshot.utils.validateSchema(
    snapshot.schemas.proposal,
    msg.payload
  );
  if (schemaIsValid !== true) {
    console.log('Wrong proposal format', schemaIsValid);
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

    if (
      proposalsDayCount >= proposalDayLimit ||
      proposalsMonthCount >= proposalMonthLimit
    ) {
      return Promise.reject('too many proposals');
    }
  } catch (e) {
    return Promise.reject('failed to check proposals limit');
  }
}

export async function action(body, ipfs, receipt, id): Promise<void> {
  const msg = jsonParse(body.msg);
  await storeProposal(msg.space, body, ipfs, receipt, id);
}
