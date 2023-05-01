import { strategiesObj } from '../../helpers/strategies';

export default async function (parent: any, { id }: { id: string }) {
  return strategiesObj[id];
}
