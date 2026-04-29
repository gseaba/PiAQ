ALTER TABLE alerts
    ADD COLUMN IF NOT EXISTS rule_id INTEGER REFERENCES alert_rules(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_alerts_rule_status
    ON alerts (rule_id, status);
