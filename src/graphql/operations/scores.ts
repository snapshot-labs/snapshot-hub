import snapshot from '@snapshot-labs/snapshot.js';

export default async function(parent, args) {
  const { space = '', strategies = [], network = '1', addresses = [] } = args;
  const snapshotBlockNumber = args.snapshot || 'latest';
  const scores = await snapshot.utils.getScores(
    space,
    strategies,
    network,
    snapshot.utils.getProvider(network),
    addresses,
    snapshotBlockNumber
  );
  return { scores };
}
