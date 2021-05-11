CREATE TABLE messages (
  id VARCHAR(64) NOT NULL,
  address VARCHAR(64) NOT NULL,
  version VARCHAR(6) NOT NULL,
  timestamp BIGINT NOT NULL,
  space VARCHAR(64),
  token VARCHAR(64),
  type VARCHAR(12) NOT NULL,
  payload JSON,
  sig VARCHAR(256) NOT NULL,
  metadata JSON,
  PRIMARY KEY (id),
  INDEX address (address),
  INDEX version (version),
  INDEX timestamp (timestamp),
  INDEX space (space),
  INDEX token (token),
  INDEX type (type)
);

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

CREATE TABLE proposals (
  id VARCHAR(64) NOT NULL,
  author VARCHAR(64) NOT NULL,
  created INT(11) NOT NULL,
  space VARCHAR(64) NOT NULL,
  network VARCHAR(12) NOT NULL,
  strategies JSON NOT NULL,
  plugins JSON NOT NULL,
  title TEXT NOT NULL,
  body MEDIUMTEXT NOT NULL,
  choices JSON NOT NULL,
  start INT(11) NOT NULL,
  end INT(11) NOT NULL,
  snapshot INT(24) NOT NULL,
  PRIMARY KEY (id),
  INDEX author (author),
  INDEX created (created),
  INDEX network (network),
  INDEX space (space),
  INDEX start (start),
  INDEX end (end)
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
