import { strategies } from '../../helpers/strategies';

export default function (parent, { id }) {
  return strategies.find(strategy => strategy.id === id);
}
