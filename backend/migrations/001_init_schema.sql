CREATE TABLE IF NOT EXISTS devices (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(100) NOT NULL UNIQUE,
    location_label VARCHAR(150),
    status VARCHAR(30) NOT NULL DEFAULT 'offline',
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS sensor_readings (
    id BIGSERIAL PRIMARY KEY,
    device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    window_start TIMESTAMPTZ NOT NULL,
    window_end TIMESTAMPTZ NOT NULL,
    co2_avg NUMERIC(10,2),
    co2_max NUMERIC(10,2),
    voc_avg NUMERIC(10,2),
    voc_max NUMERIC(10,2),
    pm1_0_avg NUMERIC(10,2),
    pm2_5_avg NUMERIC(10,2),
    pm10_avg NUMERIC(10,2),
    sample_count INTEGER NOT NULL DEFAULT 0,
    raw_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT sensor_window_valid CHECK (window_end > window_start),
    CONSTRAINT sensor_readings_unique_window UNIQUE (device_id, window_start, window_end)
);

CREATE TABLE IF NOT EXISTS alert_rules (
    id SERIAL PRIMARY KEY,
    device_id INTEGER REFERENCES devices(id) ON DELETE CASCADE,
    metric_name VARCHAR(50) NOT NULL,
    operator VARCHAR(10) NOT NULL CHECK (operator IN ('>', '>=', '<', '<=', '=')),
    threshold_value NUMERIC(10,2) NOT NULL,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alerts (
    id BIGSERIAL PRIMARY KEY,
    device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    metric_name VARCHAR(50) NOT NULL,
    threshold_value NUMERIC(10,2),
    comparison_operator VARCHAR(10),
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    peak_value NUMERIC(10,2),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved')),
    message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS device_sync_state (
    id SERIAL PRIMARY KEY,
    device_id INTEGER NOT NULL UNIQUE REFERENCES devices(id) ON DELETE CASCADE,
    last_uploaded_timestamp TIMESTAMPTZ,
    last_sequence_number BIGINT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sensor_readings_device_time
    ON sensor_readings (device_id, window_start DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_device_status
    ON alerts (device_id, status);

CREATE INDEX IF NOT EXISTS idx_alert_rules_device_metric
    ON alert_rules (device_id, metric_name);