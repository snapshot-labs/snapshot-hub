export type SpaceMetadata = {
  name?: string;
  strategies?: Strategy[];
  private?: boolean;
  terms?: string;
  network?: string;
  networks: string[];
  categories?: string[];
  activeProposals?: number;
  proposals?: number;
  proposals_active?: number;
  proposals_7d?: number;
  votes?: number;
  votes_7d?: number;
  followers?: number;
  followers_7d?: number;
};

export type SpaceSetting = {
  name: string;
  private?: boolean;
  terms?: string;
  network: string;
  networks?: string[];
  categories: string[];
  strategies?: Strategy[];
};

export type QueryArgs = {
  where: { [key: string]: any };
  first: number;
  skip: number;
  orderBy?: string;
  orderDirection?: string;
};

export type Countable = { [key: string]: number };

export type SqlRow = {
  [key: string]: string | number | boolean | null;
} & { space?: Space['id'] };

// Types

export type Space = {
  id: string;
  name?: string;
  private?: boolean;
  about?: string;
  avatar?: string;
  terms?: string;
  location?: string;
  website?: string;
  twitter?: string;
  github?: string;
  coingecko?: string;
  email?: string;
  network?: string;
  symbol?: string;
  skin?: string;
  domain?: string;
  strategies?: Strategy[];
  admins?: string[];
  members?: string[];
  moderators?: string[];
  filters?: SpaceFilters;
  plugins?: any;
  voting?: SpaceVoting;
  categories?: string[];
  validation?: Validation;
  voteValidation?: Validation;
  treasuries?: Treasury[];
  followersCount?: number;
  proposalsCount?: number;
  parent?: Space;
  children?: Space[];
  guidelines?: string;
  template?: string;
};

export type SpaceFilters = {
  minScore?: number;
  onlyMembers?: boolean;
};

export type SpaceVoting = {
  delay?: number;
  period?: number;
  type?: string;
  quorum?: number;
  blind?: boolean;
  hideAbstain?: boolean;
  privacy?: string;
  aliased?: boolean;
};

export type Proposal = {
  id: string;
  ipfs?: string;
  author: string;
  created: number;
  space?: Space;
  network: string;
  symbol: string;
  type?: string;
  strategies: Strategy[];
  validation?: Validation;
  plugins: any;
  title: string;
  body?: string;
  discussion: string;
  choices: string[];
  start: number;
  end: number;
  quorum: number;
  privacy?: string;
  snapshot?: string;
  state?: string;
  link?: string;
  app?: string;
  scores?: number[];
  scores_by_strategy?: any;
  scores_state?: string;
  scores_total?: number;
  scores_updated?: number;
  votes?: number;
};

export type Strategy = {
  name: string;
  network?: string;
  params: any;
};

export type Validation = {
  name: string;
  params?: any;
};

export type Vote = {
  id: string;
  ipfs?: string;
  voter: string;
  created: number;
  space: Space;
  proposal?: Proposal;
  choice: any;
  metadata?: any;
  reason?: string;
  app?: string;
  vp?: number;
  vp_by_strategy?: number[];
  vp_state?: string;
};

export type Alias = {
  id: string;
  ipfs?: string;
  address: string;
  alias: string;
  created: number;
};

export type Follow = {
  id: string;
  ipfs?: string;
  follower: string;
  space: Space;
  created: number;
};
export type Subscription = {
  id: string;
  ipfs?: string;
  address: string;
  space: Space;
  created: number;
};

export type User = {
  id: string;
  created: number;
  ipfs?: string;
  name?: string;
  about?: string;
  avatar?: string;
};

export type Item = {
  id: string;
  spacesCount?: number;
};

export type StrategyItem = {
  id: string;
  author?: string;
  version?: string;
  schema?: any;
  examples?: any[];
  about?: string;
  spacesCount?: number;
};

export type Treasury = {
  name?: string;
  address?: string;
  network?: string;
};

export type Vp = {
  vp?: number;
  vp_by_strategy?: number[];
  vp_state?: string;
};

export type Message = {
  mci?: number;
  id?: string;
  ipfs?: string;
  address?: string;
  version?: string;
  timestamp?: number;
  space?: string;
  type?: string;
  sig?: string;
  receipt?: string;
};
