CREATE TABLE subscribers (
  email VARCHAR(256) NOT NULL,
  address VARCHAR(256) NOT NULL,
  subscriptions JSON DEFAULT NULL,
  created BIGINT NOT NULL,
  verified BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (email, address),
  UNIQUE KEY idx_address_email (address, email),
  INDEX created (created),
  INDEX verified (verified)
);
