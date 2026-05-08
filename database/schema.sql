CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(190) NOT NULL,
    email VARCHAR(190) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('administrator', 'designer', 'operator', 'auditor') NOT NULL DEFAULT 'operator',
    mfa_enabled TINYINT(1) NOT NULL DEFAULT 0,
    password_changed_at DATETIME NULL,
    locked_at DATETIME NULL,
    last_login_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

CREATE TABLE mfa_secrets (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    encrypted_secret TEXT NOT NULL,
    confirmed_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_mfa_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

CREATE TABLE smtp_profiles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(190) NOT NULL,
    host VARCHAR(255) NOT NULL,
    port INT UNSIGNED NOT NULL,
    username VARCHAR(255) NOT NULL,
    encrypted_password TEXT NOT NULL,
    encryption ENUM('tls', 'ssl') NOT NULL DEFAULT 'tls',
    from_address VARCHAR(255) NOT NULL,
    from_name VARCHAR(255) NOT NULL,
    active TINYINT(1) NOT NULL DEFAULT 1,
    created_by BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_smtp_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

CREATE TABLE certificate_templates (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name_en VARCHAR(190) NOT NULL,
    name_ar VARCHAR(190) NULL,
    description TEXT NULL,
    layout_json JSON NOT NULL,
    background_path VARCHAR(500) NULL,
    status ENUM('draft', 'approved', 'retired') NOT NULL DEFAULT 'draft',
    version INT UNSIGNED NOT NULL DEFAULT 1,
    created_by BIGINT UNSIGNED NULL,
    approved_by BIGINT UNSIGNED NULL,
    approved_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_template_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_template_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

CREATE TABLE certificate_template_versions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    template_id BIGINT UNSIGNED NOT NULL,
    version INT UNSIGNED NOT NULL,
    layout_json JSON NOT NULL,
    change_summary VARCHAR(500) NULL,
    created_by BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_template_version (template_id, version),
    CONSTRAINT fk_template_version_template FOREIGN KEY (template_id) REFERENCES certificate_templates(id) ON DELETE CASCADE,
    CONSTRAINT fk_template_version_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

CREATE TABLE recipient_batches (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    template_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(190) NOT NULL,
    original_csv_name VARCHAR(255) NOT NULL,
    row_count INT UNSIGNED NOT NULL DEFAULT 0,
    uploaded_by BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_batch_template FOREIGN KEY (template_id) REFERENCES certificate_templates(id),
    CONSTRAINT fk_batch_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

CREATE TABLE recipients (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    batch_id BIGINT UNSIGNED NOT NULL,
    email VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NULL,
    name_ar VARCHAR(255) NULL,
    unique_identifier VARCHAR(190) NOT NULL,
    data_json JSON NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_batch_identifier (batch_id, unique_identifier),
    CONSTRAINT fk_recipient_batch FOREIGN KEY (batch_id) REFERENCES recipient_batches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

CREATE TABLE certificate_jobs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    recipient_id BIGINT UNSIGNED NOT NULL,
    template_id BIGINT UNSIGNED NOT NULL,
    certificate_number VARCHAR(190) NULL UNIQUE,
    pdf_path VARCHAR(500) NULL,
    pdf_sha256 CHAR(64) NULL,
    verification_token_hash CHAR(64) NULL,
    status ENUM('pending', 'rendering', 'rendered', 'failed', 'revoked') NOT NULL DEFAULT 'pending',
    failure_reason TEXT NULL,
    revocation_reason TEXT NULL,
    revoked_by BIGINT UNSIGNED NULL,
    revoked_at DATETIME NULL,
    rendered_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_job_recipient FOREIGN KEY (recipient_id) REFERENCES recipients(id) ON DELETE CASCADE,
    CONSTRAINT fk_job_template FOREIGN KEY (template_id) REFERENCES certificate_templates(id),
    CONSTRAINT fk_job_revoked_by FOREIGN KEY (revoked_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

CREATE TABLE certificate_verification_events (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    certificate_job_id BIGINT UNSIGNED NOT NULL,
    success TINYINT(1) NOT NULL DEFAULT 0,
    ip_address VARBINARY(16) NULL,
    user_agent VARCHAR(500) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_verification_job (certificate_job_id, created_at),
    CONSTRAINT fk_verification_job FOREIGN KEY (certificate_job_id) REFERENCES certificate_jobs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

CREATE TABLE email_templates (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(190) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    html_body MEDIUMTEXT NOT NULL,
    text_body MEDIUMTEXT NULL,
    language ENUM('en', 'ar', 'bilingual') NOT NULL DEFAULT 'bilingual',
    created_by BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_email_template_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

CREATE TABLE mail_queue (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    certificate_job_id BIGINT UNSIGNED NOT NULL,
    smtp_profile_id BIGINT UNSIGNED NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    html_body MEDIUMTEXT NOT NULL,
    pdf_path VARCHAR(500) NOT NULL,
    status ENUM('pending', 'processing', 'sent', 'failed') NOT NULL DEFAULT 'pending',
    attempts INT UNSIGNED NOT NULL DEFAULT 0,
    scheduled_at DATETIME NOT NULL,
    next_attempt_at DATETIME NULL,
    sent_at DATETIME NULL,
    last_error TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_queue_ready (status, scheduled_at, next_attempt_at),
    CONSTRAINT fk_queue_job FOREIGN KEY (certificate_job_id) REFERENCES certificate_jobs(id) ON DELETE CASCADE,
    CONSTRAINT fk_queue_smtp FOREIGN KEY (smtp_profile_id) REFERENCES smtp_profiles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

CREATE TABLE delivery_events (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    mail_queue_id BIGINT UNSIGNED NOT NULL,
    event_type ENUM('queued', 'processing', 'sent', 'retry_scheduled', 'failed', 'bounce') NOT NULL,
    provider_message_id VARCHAR(255) NULL,
    metadata_json JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_delivery_queue (mail_queue_id, created_at),
    CONSTRAINT fk_delivery_event_queue FOREIGN KEY (mail_queue_id) REFERENCES mail_queue(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

CREATE TABLE audit_log (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    actor_id BIGINT UNSIGNED NULL,
    action VARCHAR(120) NOT NULL,
    entity_type VARCHAR(120) NOT NULL,
    entity_id BIGINT UNSIGNED NULL,
    ip_address VARBINARY(16) NULL,
    user_agent VARCHAR(500) NULL,
    metadata_json JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_entity (entity_type, entity_id),
    INDEX idx_audit_created_at (created_at),
    CONSTRAINT fk_audit_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
