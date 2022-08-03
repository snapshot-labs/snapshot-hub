import { strategiesObj } from '../../helpers/strategies';

export default async function (parent, { id }) {
  return strategiesObj[id];
}
