CREATE TABLE messages (
  id VARCHAR(64) NOT NULL,
  address VARCHAR(64) NOT NULL,
  version VARCHAR(6) NOT NULL,
  timestamp VARCHAR(6) NOT NULL,
  space VARCHAR(64) NOT NULL,
  type VARCHAR(12) NOT NULL,
  payload JSON,
  sig VARCHAR(64) NOT NULL,
  metadata JSON,
  created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY address (address),
  KEY version (version),
  KEY timestamp (timestamp),
  KEY space (space),
  KEY type (type)
);

CREATE TABLE hubs (
  host VARCHAR(64) NOT NULL,
  address VARCHAR(64),
  is_self INT DEFAULT 0,
  is_active INT DEFAULT 1,
  created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`host`),
  KEY address (address),
  KEY is_self (is_self)
);
