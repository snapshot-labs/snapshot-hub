const fixtures: Record<string, any>[] = [
  {
    id: 'fabien.eth',
    name: 'Fabien.eth',
    flagged: false,
    verified: true,
    turbo: false,
    hibernated: false,
    settings: { network: 1 },
    created: Math.floor(Date.now() / 1e3),
    updated: Math.floor(Date.now() / 1e3)
  }
];

export default fixtures;
