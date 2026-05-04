INSERT INTO alert_rules (
    device_id,
    metric_name,
    operator,
    threshold_value,
    duration_seconds,
    enabled
)
SELECT
    devices.id,
    defaults.metric_name,
    defaults.operator,
    defaults.threshold_value,
    defaults.duration_seconds,
    TRUE
FROM devices
CROSS JOIN (
    VALUES
        ('co2', '>=', 1500::numeric, 0),
        ('voc', '>=', 1000::numeric, 0),
        ('pm2_5', '>=', 55::numeric, 0),
        ('pm10', '>=', 254::numeric, 0)
) AS defaults(metric_name, operator, threshold_value, duration_seconds)
WHERE NOT EXISTS (
    SELECT 1
    FROM alert_rules
    WHERE alert_rules.device_id = devices.id
        AND alert_rules.metric_name = defaults.metric_name
        AND alert_rules.operator = defaults.operator
        AND alert_rules.threshold_value = defaults.threshold_value
        AND alert_rules.duration_seconds = defaults.duration_seconds
);
