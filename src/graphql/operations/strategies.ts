import { spaces } from '../../helpers/spaces';

export default function() {
  const strategies = {};
  Object.values(spaces).forEach((space: any) => {
    const uniqueStrategies = new Set<string>(
      space.strategies.map(strategy => strategy.name)
    );
    uniqueStrategies.forEach(strategyName => {
      strategies[strategyName] = strategies[strategyName]
        ? strategies[strategyName] + 1
        : 1;
    });
  });
  return Object.entries(strategies).map(strategy => ({
    id: strategy[0],
    spacesCount: strategy[1]
  }));
}
