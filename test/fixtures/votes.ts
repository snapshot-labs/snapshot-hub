// Mock return results from SQL
const fixtures: Record<string, any>[] = [
  {
    id: '1',
    ipfs: 'ipfs-1',
    voter: '1',
    created: 1,
    space: 'test.eth',
    proposal: 'single-proposal-id-1',
    metadata: {},
    reason: '',
    app: '',
    vp: 1.0,
    vp_by_strategy: {},
    vp_state: 'final',
    cb: 1
  },
  {
    id: '2',
    ipfs: 'ipfs-2',
    voter: '1',
    created: 1,
    space: 'test.eth',
    proposal: 'single-proposal-id-2',
    metadata: {},
    reason: '',
    app: '',
    vp: 1.0,
    vp_by_strategy: {},
    vp_state: 'final',
    cb: 1
  },
  {
    id: '3',
    ipfs: 'ipfs-3',
    voter: '2',
    created: 1,
    space: 'test.eth',
    proposal: 'single-proposal-id-1',
    metadata: {},
    reason: '',
    app: '',
    vp: 1.0,
    vp_by_strategy: {},
    vp_state: 'final',
    cb: 1
  },
  {
    id: '4',
    ipfs: 'ipfs-4',
    voter: '3',
    created: 1,
    space: 'test.eth',
    proposal: 'single-proposal-id-1',
    metadata: {},
    reason: '',
    app: '',
    vp: 1.0,
    vp_by_strategy: {},
    vp_state: 'final',
    cb: 1
  }
];

export default fixtures;
