CREATE TABLE hubs (
  host VARCHAR(64) NOT NULL,
  address VARCHAR(64),
  is_self INT DEFAULT 0,
  is_active INT DEFAULT 1,
  scope TEXT NOT NULL,
  PRIMARY KEY (host),
  INDEX address (address),
  INDEX is_self (is_self),
  INDEX is_active (is_active)
);

CREATE TABLE messages (
  id VARCHAR(66) NOT NULL,
  ipfs VARCHAR(64) NOT NULL,
  address VARCHAR(64) NOT NULL,
  version VARCHAR(6) NOT NULL,
  timestamp BIGINT NOT NULL,
  space VARCHAR(64),
  type VARCHAR(24) NOT NULL,
  sig VARCHAR(256) NOT NULL,
  receipt VARCHAR(128) NOT NULL,
  PRIMARY KEY (id),
  INDEX ipfs (ipfs),
  INDEX address (address),
  INDEX version (version),
  INDEX timestamp (timestamp),
  INDEX space (space),
  INDEX type (type),
  INDEX receipt (receipt)
);

CREATE TABLE spaces (
  id VARCHAR(64) NOT NULL,
  settings JSON,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  PRIMARY KEY (id),
  INDEX address (created_at),
  INDEX is_self (updated_at)
);

CREATE TABLE proposals (
  id VARCHAR(66) NOT NULL,
  ipfs VARCHAR(64) NOT NULL,
  author VARCHAR(64) NOT NULL,
  created INT(11) NOT NULL,
  space VARCHAR(64) NOT NULL,
  network VARCHAR(12) NOT NULL,
  type VARCHAR(24) NOT NULL,
  strategies JSON NOT NULL,
  plugins JSON NOT NULL,
  title TEXT NOT NULL,
  body MEDIUMTEXT NOT NULL,
  choices JSON NOT NULL,
  start INT(11) NOT NULL,
  end INT(11) NOT NULL,
  snapshot INT(24) NOT NULL,
  scores JSON NOT NULL,
  scores_by_strategy JSON NOT NULL,
  scores_state VARCHAR(24) NOT NULL,
  scores_total DECIMAL(64,30) NOT NULL,
  scores_updated INT(11) NOT NULL,
  votes INT(12) NOT NULL,
  PRIMARY KEY (id),
  INDEX ipfs (ipfs),
  INDEX author (author),
  INDEX created (created),
  INDEX network (network),
  INDEX space (space),
  INDEX start (start),
  INDEX end (end),
  INDEX scores_state (scores_state),
  INDEX scores_updated (scores_updated),
  INDEX votes (votes)
);

CREATE TABLE votes (
  id VARCHAR(66) NOT NULL,
  ipfs VARCHAR(64) NOT NULL,
  voter VARCHAR(64) NOT NULL,
  created INT(11) NOT NULL,
  space VARCHAR(64) NOT NULL,
  proposal VARCHAR(66) NOT NULL,
  choice JSON NOT NULL,
  metadata JSON NOT NULL,
  vp DECIMAL(64,30) NOT NULL,
  vp_by_strategy JSON NOT NULL,
  vp_state VARCHAR(24) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY unique_vote (voter, proposal),
  INDEX ipfs (ipfs),
  INDEX voter (voter),
  INDEX created (created),
  INDEX space (space),
  INDEX proposal (proposal),
  INDEX vp (vp),
  INDEX vp_state (vp_state)
);

CREATE TABLE events (
  id VARCHAR(128) NOT NULL,
  event VARCHAR(64) NOT NULL,
  space VARCHAR(64) NOT NULL,
  expire INT(11) NOT NULL,
  PRIMARY KEY (id, event),
  INDEX space (space),
  INDEX expire (expire)
);

CREATE TABLE follows (
  id VARCHAR(66) NOT NULL,
  ipfs VARCHAR(64) NOT NULL,
  follower VARCHAR(64) NOT NULL,
  space VARCHAR(64) NOT NULL,
  created INT(11) NOT NULL,
  PRIMARY KEY (follower, space),
  INDEX ipfs (ipfs),
  INDEX created (created)
);

CREATE TABLE aliases (
  id VARCHAR(66) NOT NULL,
  ipfs VARCHAR(64) NOT NULL,
  address VARCHAR(64) NOT NULL,
  alias VARCHAR(64) NOT NULL,
  created INT(11) NOT NULL,
  PRIMARY KEY (address, alias),
  INDEX ipfs (ipfs)
);

CREATE TABLE subscriptions (
  id VARCHAR(66) NOT NULL,
  ipfs VARCHAR(64) NOT NULL,
  address VARCHAR(64) NOT NULL,
  space VARCHAR(64) NOT NULL,
  created INT(11) NOT NULL,
  PRIMARY KEY (address, space),
  INDEX ipfs (ipfs),
  INDEX created (created)
);
