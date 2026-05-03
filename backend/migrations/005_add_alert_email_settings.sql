CREATE TABLE IF NOT EXISTS alert_email_settings (
    device_id INTEGER PRIMARY KEY REFERENCES devices(id) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    recipient_email VARCHAR(320),
    recipient_verified_at TIMESTAMPTZ,
    pending_recipient_email VARCHAR(320),
    confirmation_token_hash VARCHAR(128),
    confirmation_expires_at TIMESTAMPTZ,
    repeat_interval_minutes INTEGER NOT NULL DEFAULT 20,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT alert_email_repeat_interval_range
        CHECK (repeat_interval_minutes BETWEEN 5 AND 1440),
    CONSTRAINT alert_email_verified_recipient_consistent
        CHECK (
            (recipient_email IS NULL AND recipient_verified_at IS NULL)
            OR (recipient_email IS NOT NULL AND recipient_verified_at IS NOT NULL)
        )
);

CREATE TABLE IF NOT EXISTS alert_email_metric_state (
    device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    metric_name VARCHAR(50) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT FALSE,
    last_sent_at TIMESTAMPTZ,
    last_violation_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (device_id, metric_name)
);

CREATE INDEX IF NOT EXISTS idx_alert_email_settings_pending_token
    ON alert_email_settings (confirmation_token_hash)
    WHERE confirmation_token_hash IS NOT NULL;
