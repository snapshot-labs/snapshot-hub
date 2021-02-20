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
  PRIMARY KEY (host),
  INDEX address (address),
  INDEX is_self (is_self)
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

INSERT INTO spaces (id, created_at, updated_at) VALUES
  ('bonustrack.eth', 1605387647, 1605955059),
  ('samuv.eth', 1610006388, 1610377573);
