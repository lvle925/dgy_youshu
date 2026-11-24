CREATE TABLE IF NOT EXISTS records (
    collection VARCHAR(64) NOT NULL,
    id VARCHAR(128) NOT NULL,
    payload TEXT NOT NULL,
    PRIMARY KEY (collection, id)
) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS seed_state (
    collection VARCHAR(64) NOT NULL PRIMARY KEY
) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS local_account (
    id INT NOT NULL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS trusted_device (
    username VARCHAR(100) NOT NULL,
    token_hash VARCHAR(64) NOT NULL PRIMARY KEY,
    expires_at BIGINT NOT NULL,
    INDEX idx_trusted_device_username (username)
) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS member_account (
    member_id VARCHAR(128) NOT NULL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    must_change_password BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS op_log (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    occurred_at DATETIME(3) NOT NULL,
    actor VARCHAR(100) NOT NULL DEFAULT '',
    department_id VARCHAR(128) NOT NULL DEFAULT '',
    module VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    object_type VARCHAR(100) NOT NULL DEFAULT '',
    object_id VARCHAR(128) NOT NULL DEFAULT '',
    before_summary TEXT NULL,
    after_summary TEXT NULL,
    result_status VARCHAR(20) NOT NULL,
    ip VARCHAR(64) NOT NULL DEFAULT '',
    user_agent VARCHAR(512) NOT NULL DEFAULT '',
    duration_ms BIGINT NOT NULL DEFAULT 0,
    INDEX idx_op_log_time (occurred_at),
    INDEX idx_op_log_department (department_id, occurred_at),
    INDEX idx_op_log_module (module, occurred_at),
    INDEX idx_op_log_actor (actor, occurred_at)
) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS auth_session (
    session_id VARCHAR(128) NOT NULL PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    expires_at BIGINT NOT NULL,
    INDEX idx_auth_session_username (username)
) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS login_attempt (
    username VARCHAR(100) NOT NULL PRIMARY KEY,
    failed_attempts INT NOT NULL DEFAULT 0,
    locked_until BIGINT NOT NULL DEFAULT 0,
    last_attempt_at BIGINT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
