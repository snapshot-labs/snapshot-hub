CREATE TABLE spaces (
  id VARCHAR(64) NOT NULL,
  name VARCHAR(64) NOT NULL,
  settings JSON,
  verified INT NOT NULL DEFAULT '0',
  deleted INT NOT NULL DEFAULT '0',
  flagged INT NOT NULL DEFAULT '0',
  hibernated INT NOT NULL DEFAULT '0',
  turbo INT NOT NULL DEFAULT '0',
  turbo_expiration BIGINT NOT NULL DEFAULT '0',
  proposal_count INT NOT NULL DEFAULT '0',
  vote_count INT NOT NULL DEFAULT '0',
  follower_count INT NOT NULL DEFAULT '0',
  domain VARCHAR(64) DEFAULT NULL,
  created BIGINT NOT NULL,
  updated BIGINT NOT NULL,
  PRIMARY KEY (id),
  INDEX name (name),
  UNIQUE KEY domain (domain),
  INDEX verified (verified),
  INDEX flagged (flagged),
  INDEX hibernated (hibernated),
  INDEX turbo (turbo),
  INDEX proposal_count (proposal_count),
  INDEX vote_count (vote_count),
  INDEX follower_count (follower_count),
  INDEX deleted (deleted),
  INDEX created (created),
  INDEX updated (updated)
);

-- Note: The `proposals` table schema might have some discrepancies
-- compared to the production database. This is due to legacy reasons
-- and the challenges associated with updating the schema because of its size.
-- `id` and `ipfs` columns should not have any default values.
CREATE TABLE proposals (
  id VARCHAR(66) NOT NULL,
  ipfs VARCHAR(64) NOT NULL,
  author VARCHAR(100) NOT NULL,
  created INT(11) NOT NULL,
  updated INT(11) DEFAULT NULL,
  space VARCHAR(64) NOT NULL,
  network VARCHAR(24) NOT NULL,
  symbol VARCHAR(16) NOT NULL DEFAULT '',
  type VARCHAR(24) NOT NULL DEFAULT '',
  strategies JSON NOT NULL,
  validation JSON NOT NULL,
  plugins JSON NOT NULL,
  title TEXT NOT NULL,
  body MEDIUMTEXT NOT NULL,
  discussion TEXT NOT NULL,
  choices JSON NOT NULL,
  labels JSON DEFAULT NULL,
  start INT(11) NOT NULL,
  end INT(11) NOT NULL,
  quorum DECIMAL(64,30) NOT NULL,
  quorum_type VARCHAR(24) DEFAULT '',
  privacy VARCHAR(24) NOT NULL,
  snapshot INT(24) NOT NULL,
  app VARCHAR(24) NOT NULL,
  scores JSON NOT NULL,
  scores_by_strategy JSON NOT NULL,
  scores_state VARCHAR(24) NOT NULL DEFAULT '',
  scores_total DECIMAL(64,30) NOT NULL,
  scores_updated INT(11) NOT NULL,
  scores_total_value DECIMAL(64,30) NOT NULL DEFAULT '0.000000000000000000000000000000',
  vp_value_by_strategy json NOT NULL,
  votes INT(12) NOT NULL,
  flagged INT NOT NULL DEFAULT 0,
  cb INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  INDEX ipfs (ipfs),
  INDEX author (author),
  INDEX created (created),
  INDEX updated (updated),
  INDEX network (network),
  INDEX space (space),
  INDEX start (start),
  INDEX end (end),
  INDEX app (app),
  INDEX scores_state (scores_state),
  INDEX scores_updated (scores_updated),
  INDEX votes (votes),
  INDEX flagged (flagged),
  INDEX cb (cb)
);

CREATE TABLE votes (
  id VARCHAR(66) NOT NULL,
  ipfs VARCHAR(64) NOT NULL,
  voter VARCHAR(100) NOT NULL,
  created INT(11) NOT NULL,
  space VARCHAR(100) NOT NULL,
  proposal VARCHAR(66) NOT NULL,
  choice JSON NOT NULL,
  metadata JSON NOT NULL,
  reason TEXT NOT NULL,
  app VARCHAR(24) NOT NULL,
  vp DECIMAL(64,30) NOT NULL,
  vp_by_strategy JSON NOT NULL,
  vp_state VARCHAR(24) NOT NULL,
  cb INT(11) NOT NULL,
  PRIMARY KEY (voter, space, proposal),
  UNIQUE KEY id (id),
  INDEX ipfs (ipfs),
  INDEX voter (voter),
  INDEX created (created),
  INDEX space (space),
  INDEX proposal (proposal),
  INDEX app (app),
  INDEX vp (vp),
  INDEX vp_state (vp_state),
  INDEX cb (cb)
);

CREATE TABLE follows (
  id VARCHAR(66) NOT NULL,
  ipfs VARCHAR(64) NOT NULL,
  follower VARCHAR(100) NOT NULL,
  space VARCHAR(100) NOT NULL,
  network VARCHAR(24) NOT NULL DEFAULT 's',
  created INT(11) NOT NULL,
  PRIMARY KEY (follower, space, network),
  INDEX ipfs (ipfs),
  INDEX space (space),
  INDEX network (network),
  INDEX created (created)
);

CREATE TABLE aliases (
  id VARCHAR(66) NOT NULL,
  ipfs VARCHAR(64) NOT NULL,
  address VARCHAR(100) NOT NULL,
  alias VARCHAR(100) NOT NULL,
  created INT(11) NOT NULL,
  PRIMARY KEY (address, alias),
  INDEX ipfs (ipfs)
);

CREATE TABLE subscriptions (
  id VARCHAR(66) NOT NULL,
  ipfs VARCHAR(64) NOT NULL,
  address VARCHAR(100) NOT NULL,
  space VARCHAR(64) NOT NULL,
  created INT(11) NOT NULL,
  PRIMARY KEY (address, space),
  INDEX ipfs (ipfs),
  INDEX created (created)
);

CREATE TABLE users (
  id VARCHAR(100) NOT NULL,
  ipfs VARCHAR(64) NOT NULL,
  profile JSON,
  created INT(11) NOT NULL,
  PRIMARY KEY (id),
  INDEX ipfs (ipfs),
  INDEX created (created)
);

CREATE TABLE statements (
  id VARCHAR(66) NOT NULL,
  ipfs VARCHAR(64) DEFAULT NULL,
  delegate VARCHAR(100) NOT NULL,
  space VARCHAR(100) NOT NULL,
  about TEXT,
  statement TEXT,
  network VARCHAR(24) NOT NULL DEFAULT 's',
  discourse VARCHAR(64),
  source VARCHAR(24) DEFAULT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'INACTIVE',
  created INT(11) NOT NULL,
  updated INT(11) NOT NULL,
  PRIMARY KEY (delegate, space, network),
  INDEX ipfs (ipfs),
  INDEX space (space),
  INDEX network (network),
  INDEX created (created),
  INDEX updated (updated),
  INDEX source (source),
  INDEX status (status)
);

CREATE TABLE leaderboard (
  user VARCHAR(100) NOT NULL,
  space VARCHAR(64) NOT NULL,
  vote_count SMALLINT UNSIGNED NOT NULL DEFAULT '0',
  proposal_count SMALLINT UNSIGNED NOT NULL DEFAULT '0',
  last_vote BIGINT,
  PRIMARY KEY user_space (user,space),
  INDEX space (space),
  INDEX vote_count (vote_count),
  INDEX proposal_count (proposal_count),
  INDEX last_vote (last_vote)
);

CREATE TABLE options (
  name VARCHAR(100) NOT NULL,
  value VARCHAR(100) NOT NULL,
  PRIMARY KEY (name)
);

CREATE TABLE skins (
  id VARCHAR(100) NOT NULL,
  bg_color VARCHAR(7) DEFAULT NULL,
  link_color VARCHAR(7) DEFAULT NULL,
  text_color VARCHAR(7) DEFAULT NULL,
  content_color VARCHAR(7) DEFAULT NULL,
  border_color VARCHAR(7) DEFAULT NULL,
  heading_color VARCHAR(7) DEFAULT NULL,
  primary_color VARCHAR(7) DEFAULT NULL,
  header_color VARCHAR(7) DEFAULT NULL,
  theme VARCHAR(5) NOT NULL DEFAULT 'light',
  logo VARCHAR(256) DEFAULT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE networks (
  id VARCHAR(64) NOT NULL,
  name VARCHAR(32) NOT NULL,
  testnet TINYINT UNSIGNED NOT NULL DEFAULT '0',
  premium TINYINT UNSIGNED NOT NULL DEFAULT '0',
  PRIMARY KEY (id),
  INDEX premium (premium)
);
