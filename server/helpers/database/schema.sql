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
  PRIMARY KEY (`id`),
  KEY address (address),
  KEY version (version),
  KEY timestamp (timestamp),
  KEY space (space),
  KEY token (token),
  KEY type (type)
);

CREATE TABLE hubs (
  host VARCHAR(64) NOT NULL,
  address VARCHAR(64),
  is_self INT DEFAULT 0,
  is_active INT DEFAULT 1,
  PRIMARY KEY (`host`),
  KEY address (address),
  KEY is_self (is_self)
);
