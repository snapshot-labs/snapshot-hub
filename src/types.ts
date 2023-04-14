export type Strategy = {
  id: string;
  name: string;
  spacesCount: number;
  network?: string;
};

export type Space = {
  id: string;
};

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
