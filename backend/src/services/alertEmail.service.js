const crypto = require('node:crypto');

const pool = require('../config/db');
const { ALERT_METRIC_CONFIG } = require('../constants/metrics');

const DEFAULT_REPEAT_INTERVAL_MINUTES = 20;
const MIN_REPEAT_INTERVAL_MINUTES = 5;
const MAX_REPEAT_INTERVAL_MINUTES = 1440;
const CONFIRMATION_TTL_MS = 60 * 60 * 1000;

const METRIC_UNITS = {
    co2: 'ppm',
    voc: 'ppb',
    pm1_0: 'ug/m3',
    pm2_5: 'ug/m3',
    pm10: 'ug/m3',
    temperature: 'C',
    humidity: '%'
};

function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}

function assertValidEmail(email) {
    const normalized = normalizeEmail(email);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) || normalized.length > 320) {
        const error = new Error('A valid email address is required');
        error.status = 400;
        throw error;
    }

    return normalized;
}

function normalizeRepeatIntervalMinutes(value) {
    const repeatIntervalMinutes = Number(value);

    if (!Number.isInteger(repeatIntervalMinutes)
        || repeatIntervalMinutes < MIN_REPEAT_INTERVAL_MINUTES
        || repeatIntervalMinutes > MAX_REPEAT_INTERVAL_MINUTES) {
        const error = new Error(
            `repeatIntervalMinutes must be an integer between ${MIN_REPEAT_INTERVAL_MINUTES} and ${MAX_REPEAT_INTERVAL_MINUTES}`
        );
        error.status = 400;
        throw error;
    }

    return repeatIntervalMinutes;
}

function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

function generateConfirmationToken() {
    return crypto.randomBytes(32).toString('hex');
}

function getApiBaseUrl() {
    return (
        process.env.API_BASE_URL
        || process.env.PUBLIC_API_BASE_URL
        || `http://localhost:${process.env.PORT || 5000}`
    ).replace(/\/+$/, '');
}

function ensureEmailTransportConfigured() {
    if (process.env.ALERT_EMAIL_ENABLED !== 'true') {
        const error = new Error('Alert email delivery is disabled');
        error.status = 503;
        throw error;
    }

    if (!process.env.RESEND_API_KEY || !process.env.ALERT_EMAIL_FROM) {
        const error = new Error('Alert email delivery is not configured');
        error.status = 503;
        throw error;
    }
}

function mapSettingsRow(row) {
    return {
        enabled: row?.enabled || false,
        recipientEmail: row?.recipient_email || null,
        recipientVerifiedAt: row?.recipient_verified_at || null,
        pendingRecipientEmail: row?.pending_recipient_email || null,
        confirmationExpiresAt: row?.confirmation_expires_at || null,
        repeatIntervalMinutes: Number(row?.repeat_interval_minutes || DEFAULT_REPEAT_INTERVAL_MINUTES),
        emailDeliveryConfigured: process.env.ALERT_EMAIL_ENABLED === 'true'
            && !!process.env.RESEND_API_KEY
            && !!process.env.ALERT_EMAIL_FROM
    };
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getMetricLabel(metricName) {
    return ALERT_METRIC_CONFIG[metricName]?.label || metricName;
}

function getReadingValue(metricName, reading) {
    if (!reading) {
        return null;
    }

    const metricConfig = ALERT_METRIC_CONFIG[metricName];

    if (!metricConfig) {
        return null;
    }

    const primaryValue = reading[metricConfig.readingColumn];

    if (primaryValue !== null && primaryValue !== undefined) {
        return Number(primaryValue);
    }

    if (metricConfig.fallbackColumn) {
        const fallbackValue = reading[metricConfig.fallbackColumn];

        if (fallbackValue !== null && fallbackValue !== undefined) {
            return Number(fallbackValue);
        }
    }

    return null;
}

function formatNumber(value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
        return 'n/a';
    }

    return Number(value).toLocaleString('en-US', {
        maximumFractionDigits: 2
    });
}

function formatMetricValue(metricName, value) {
    const unit = METRIC_UNITS[metricName];
    return `${formatNumber(value)}${unit ? ` ${unit}` : ''}`;
}

function formatTimestamp(value) {
    if (!value) {
        return 'n/a';
    }

    return new Date(value).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short'
    });
}

function buildSnapshotRows(reading) {
    return [
        { metricName: 'co2', label: 'CO2', value: reading?.co2_max ?? reading?.co2_avg },
        { metricName: 'voc', label: 'VOC', value: reading?.voc_max ?? reading?.voc_avg },
        { metricName: 'pm1_0', label: 'PM1.0', value: reading?.pm1_0_avg },
        { metricName: 'pm2_5', label: 'PM2.5', value: reading?.pm2_5_avg },
        { metricName: 'pm10', label: 'PM10', value: reading?.pm10_avg },
        { metricName: 'temperature', label: 'Temperature', value: reading?.temperature },
        { metricName: 'humidity', label: 'Humidity', value: reading?.humidity }
    ];
}

function buildConfirmationEmail({ device, pendingEmail, confirmationUrl }) {
    const displayName = device.location_label || device.device_id;
    const subject = `Confirm PiAQ alert emails for ${displayName}`;
    const text = [
        `Confirm alert emails for ${displayName}`,
        '',
        `Use this link to confirm ${pendingEmail} for PiAQ alert emails:`,
        confirmationUrl,
        '',
        'This link expires in 60 minutes.'
    ].join('\n');
    const html = `
        <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
            <h1 style="font-size: 20px;">Confirm PiAQ alert emails</h1>
            <p>Use the button below to confirm <strong>${escapeHtml(pendingEmail)}</strong> for <strong>${escapeHtml(displayName)}</strong>.</p>
            <p>
                <a href="${escapeHtml(confirmationUrl)}" style="display: inline-block; padding: 10px 14px; background: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 6px;">
                    Confirm alert email
                </a>
            </p>
            <p style="font-size: 13px; color: #6b7280;">This link expires in 60 minutes.</p>
        </div>
    `;

    return { subject, text, html };
}

function buildAlertEmail({ device, triggeredAlerts, latestReading, isTest = false }) {
    const displayName = device.location_label || device.device_id;
    const triggeredLabels = triggeredAlerts.map((alert) => getMetricLabel(alert.metric_name));
    const subject = isTest
        ? `PiAQ Test Alert - ${displayName}`
        : `PiAQ Alert: ${triggeredLabels.join(', ')} triggered - ${displayName}`;
    const triggeredAt = latestReading?.window_end || triggeredAlerts[0]?.started_at || new Date().toISOString();

    const triggerRows = triggeredAlerts.map((alert) => {
        const currentValue = getReadingValue(alert.metric_name, latestReading) ?? alert.peak_value;
        return {
            metricName: alert.metric_name,
            label: getMetricLabel(alert.metric_name),
            currentValue,
            thresholdValue: alert.threshold_value,
            operator: alert.comparison_operator
        };
    });
    const snapshotRows = buildSnapshotRows(latestReading);

    const textLines = [
        isTest ? 'PiAQ test alert' : 'PiAQ alert triggered',
        '',
        `Device: ${displayName}`,
        `Triggered at: ${formatTimestamp(triggeredAt)}`,
        '',
        'Triggered sensors:',
        ...triggerRows.map((row) =>
            `- ${row.label}: ${formatMetricValue(row.metricName, row.currentValue)} `
            + `(threshold ${row.operator} ${formatMetricValue(row.metricName, row.thresholdValue)})`
        ),
        '',
        'Current sensor readings:',
        ...snapshotRows.map((row) =>
            `- ${row.label}: ${formatMetricValue(row.metricName, row.value)}`
        )
    ];

    const html = `
        <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
            <h1 style="font-size: 22px; margin-bottom: 4px;">${isTest ? 'PiAQ test alert' : 'PiAQ alert triggered'}</h1>
            <p style="margin-top: 0; color: #4b5563;">${escapeHtml(displayName)} &middot; ${escapeHtml(formatTimestamp(triggeredAt))}</p>

            <h2 style="font-size: 16px; margin-top: 24px;">Triggered sensors</h2>
            <table cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; max-width: 640px;">
                <thead>
                    <tr style="background: #fee2e2;">
                        <th align="left">Sensor</th>
                        <th align="left">Current</th>
                        <th align="left">Threshold</th>
                    </tr>
                </thead>
                <tbody>
                    ${triggerRows.map((row) => `
                        <tr>
                            <td style="border-bottom: 1px solid #e5e7eb;">${escapeHtml(row.label)}</td>
                            <td style="border-bottom: 1px solid #e5e7eb;">${escapeHtml(formatMetricValue(row.metricName, row.currentValue))}</td>
                            <td style="border-bottom: 1px solid #e5e7eb;">${escapeHtml(row.operator)} ${escapeHtml(formatMetricValue(row.metricName, row.thresholdValue))}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <h2 style="font-size: 16px; margin-top: 24px;">Current sensor readings</h2>
            <table cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; max-width: 640px;">
                <tbody>
                    ${snapshotRows.map((row) => `
                        <tr>
                            <td style="border-bottom: 1px solid #e5e7eb; color: #4b5563;">${escapeHtml(row.label)}</td>
                            <td style="border-bottom: 1px solid #e5e7eb;">${escapeHtml(formatMetricValue(row.metricName, row.value))}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    return {
        subject,
        text: textLines.join('\n'),
        html
    };
}

async function sendResendEmail({ to, subject, html, text }) {
    ensureEmailTransportConfigured();

    if (typeof fetch !== 'function') {
        const error = new Error('Global fetch is not available for Resend delivery');
        error.status = 500;
        throw error;
    }

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            from: process.env.ALERT_EMAIL_FROM,
            to,
            subject,
            html,
            text
        })
    });

    if (!response.ok) {
        const responseText = await response.text();
        const error = new Error(`Resend email delivery failed (${response.status}): ${responseText}`);
        error.status = 502;
        throw error;
    }

    return response.json();
}

async function getDeviceByDeviceId(executor, deviceId) {
    const result = await executor.query(
        `
        SELECT id, device_id, location_label
        FROM devices
        WHERE device_id = $1
        `,
        [deviceId]
    );

    if (result.rows.length === 0) {
        const error = new Error(`Unknown deviceId: ${deviceId}`);
        error.status = 404;
        throw error;
    }

    return result.rows[0];
}

async function getOrCreateSettingsForDevice(executor, internalDeviceId) {
    const result = await executor.query(
        `
        INSERT INTO alert_email_settings (device_id)
        VALUES ($1)
        ON CONFLICT (device_id)
        DO UPDATE SET updated_at = alert_email_settings.updated_at
        RETURNING
            enabled,
            recipient_email,
            recipient_verified_at,
            pending_recipient_email,
            confirmation_expires_at,
            repeat_interval_minutes
        `,
        [internalDeviceId]
    );

    return result.rows[0];
}

async function getLatestReading(executor, internalDeviceId) {
    const result = await executor.query(
        `
        SELECT
            window_start,
            window_end,
            co2_avg::float8 AS co2_avg,
            co2_max::float8 AS co2_max,
            voc_avg::float8 AS voc_avg,
            voc_max::float8 AS voc_max,
            pm1_0_avg::float8 AS pm1_0_avg,
            pm2_5_avg::float8 AS pm2_5_avg,
            pm10_avg::float8 AS pm10_avg,
            temperature::float8 AS temperature,
            humidity::float8 AS humidity
        FROM sensor_readings
        WHERE device_id = $1
        ORDER BY window_end DESC, window_start DESC
        LIMIT 1
        `,
        [internalDeviceId]
    );

    return result.rows[0] || null;
}

async function getAlertEmailSettings(deviceId) {
    const device = await getDeviceByDeviceId(pool, deviceId);
    const settings = await getOrCreateSettingsForDevice(pool, device.id);

    return mapSettingsRow(settings);
}

async function updateAlertEmailSettings({ deviceId, enabled, repeatIntervalMinutes }) {
    const device = await getDeviceByDeviceId(pool, deviceId);
    const normalizedRepeatInterval = repeatIntervalMinutes === undefined
        ? null
        : normalizeRepeatIntervalMinutes(repeatIntervalMinutes);
    const currentSettings = await getOrCreateSettingsForDevice(pool, device.id);
    const nextEnabled = enabled === undefined
        ? currentSettings.enabled
        : enabled === true || enabled === 'true';

    if (nextEnabled && !currentSettings.recipient_email) {
        const error = new Error('Confirm an alert email recipient before enabling alert emails');
        error.status = 400;
        throw error;
    }

    const result = await pool.query(
        `
        UPDATE alert_email_settings
        SET
            enabled = $2,
            repeat_interval_minutes = COALESCE($3, repeat_interval_minutes),
            updated_at = NOW()
        WHERE device_id = $1
        RETURNING
            enabled,
            recipient_email,
            recipient_verified_at,
            pending_recipient_email,
            confirmation_expires_at,
            repeat_interval_minutes
        `,
        [device.id, nextEnabled, normalizedRepeatInterval]
    );

    return mapSettingsRow(result.rows[0]);
}

async function requestAlertEmailConfirmation({ deviceId, email }) {
    ensureEmailTransportConfigured();

    const normalizedEmail = assertValidEmail(email);
    const device = await getDeviceByDeviceId(pool, deviceId);
    const token = generateConfirmationToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + CONFIRMATION_TTL_MS);

    const result = await pool.query(
        `
        INSERT INTO alert_email_settings (
            device_id,
            pending_recipient_email,
            confirmation_token_hash,
            confirmation_expires_at,
            repeat_interval_minutes,
            updated_at
        )
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (device_id)
        DO UPDATE SET
            pending_recipient_email = EXCLUDED.pending_recipient_email,
            confirmation_token_hash = EXCLUDED.confirmation_token_hash,
            confirmation_expires_at = EXCLUDED.confirmation_expires_at,
            repeat_interval_minutes = alert_email_settings.repeat_interval_minutes,
            updated_at = NOW()
        RETURNING pending_recipient_email, confirmation_expires_at
        `,
        [
            device.id,
            normalizedEmail,
            tokenHash,
            expiresAt.toISOString(),
            DEFAULT_REPEAT_INTERVAL_MINUTES
        ]
    );

    const confirmationUrl = `${getApiBaseUrl()}/devices/${encodeURIComponent(deviceId)}/alert-email/confirm?token=${token}`;
    const emailPayload = buildConfirmationEmail({
        device,
        pendingEmail: normalizedEmail,
        confirmationUrl
    });

    await sendResendEmail({
        to: normalizedEmail,
        ...emailPayload
    });

    return {
        pendingRecipientEmail: result.rows[0].pending_recipient_email,
        confirmationExpiresAt: result.rows[0].confirmation_expires_at
    };
}

async function confirmAlertEmail({ deviceId, token }) {
    const tokenHash = hashToken(String(token || ''));
    const device = await getDeviceByDeviceId(pool, deviceId);
    const result = await pool.query(
        `
        UPDATE alert_email_settings
        SET
            recipient_email = pending_recipient_email,
            recipient_verified_at = NOW(),
            pending_recipient_email = NULL,
            confirmation_token_hash = NULL,
            confirmation_expires_at = NULL,
            enabled = TRUE,
            updated_at = NOW()
        WHERE device_id = $1
            AND confirmation_token_hash = $2
            AND confirmation_expires_at > NOW()
            AND pending_recipient_email IS NOT NULL
        RETURNING
            enabled,
            recipient_email,
            recipient_verified_at,
            pending_recipient_email,
            confirmation_expires_at,
            repeat_interval_minutes
        `,
        [device.id, tokenHash]
    );

    if (result.rows.length === 0) {
        const error = new Error('Confirmation link is invalid or expired');
        error.status = 400;
        throw error;
    }

    return mapSettingsRow(result.rows[0]);
}

async function sendTestAlertEmail({ deviceId }) {
    const device = await getDeviceByDeviceId(pool, deviceId);
    const settings = await getOrCreateSettingsForDevice(pool, device.id);

    if (!settings.enabled || !settings.recipient_email) {
        const error = new Error('Alert emails are not enabled for this device');
        error.status = 400;
        throw error;
    }

    const latestReading = await getLatestReading(pool, device.id);
    const emailPayload = buildAlertEmail({
        device,
        latestReading,
        isTest: true,
        triggeredAlerts: [{
            metric_name: 'pm2_5',
            threshold_value: 35,
            comparison_operator: '>',
            peak_value: latestReading?.pm2_5_avg ?? null,
            started_at: latestReading?.window_end || new Date().toISOString()
        }]
    });

    await sendResendEmail({
        to: settings.recipient_email,
        ...emailPayload
    });

    return {
        sentTo: settings.recipient_email
    };
}

async function getActiveAlerts(executor, internalDeviceId) {
    const result = await executor.query(
        `
        SELECT DISTINCT ON (metric_name)
            id,
            metric_name,
            threshold_value::float8 AS threshold_value,
            comparison_operator,
            started_at,
            peak_value::float8 AS peak_value,
            message
        FROM alerts
        WHERE device_id = $1
            AND status = 'active'
        ORDER BY metric_name ASC, started_at DESC, created_at DESC
        `,
        [internalDeviceId]
    );

    return result.rows;
}

function selectDueAlerts({ activeAlerts, stateRows, repeatIntervalMinutes, now }) {
    const stateByMetric = new Map(stateRows.map((row) => [row.metric_name, row]));
    const repeatIntervalMs = repeatIntervalMinutes * 60 * 1000;

    return activeAlerts.filter((alert) => {
        const state = stateByMetric.get(alert.metric_name);

        if (!state || !state.active || !state.last_sent_at) {
            return true;
        }

        const lastSentMs = new Date(state.last_sent_at).getTime();
        return now.getTime() - lastSentMs >= repeatIntervalMs;
    });
}

async function markInactiveMetrics(executor, internalDeviceId, activeMetricNames) {
    if (activeMetricNames.length === 0) {
        await executor.query(
            `
            UPDATE alert_email_metric_state
            SET active = FALSE,
                resolved_at = NOW(),
                updated_at = NOW()
            WHERE device_id = $1
                AND active = TRUE
            `,
            [internalDeviceId]
        );
        return;
    }

    await executor.query(
        `
        UPDATE alert_email_metric_state
        SET active = FALSE,
            resolved_at = NOW(),
            updated_at = NOW()
        WHERE device_id = $1
            AND active = TRUE
            AND NOT (metric_name = ANY($2))
        `,
        [internalDeviceId, activeMetricNames]
    );
}

async function markSentMetrics(executor, internalDeviceId, metricNames, sentAt) {
    for (const metricName of metricNames) {
        await executor.query(
            `
            INSERT INTO alert_email_metric_state (
                device_id,
                metric_name,
                active,
                last_sent_at,
                last_violation_at,
                resolved_at,
                updated_at
            )
            VALUES ($1, $2, TRUE, $3, $3, NULL, NOW())
            ON CONFLICT (device_id, metric_name)
            DO UPDATE SET
                active = TRUE,
                last_sent_at = EXCLUDED.last_sent_at,
                last_violation_at = EXCLUDED.last_violation_at,
                resolved_at = NULL,
                updated_at = NOW()
            `,
            [internalDeviceId, metricName, sentAt.toISOString()]
        );
    }
}

async function sendDueAlertEmailForDevice(deviceId) {
    if (process.env.ALERT_EMAIL_ENABLED !== 'true'
        || !process.env.RESEND_API_KEY
        || !process.env.ALERT_EMAIL_FROM) {
        return {
            sent: false,
            reason: 'transport_not_configured'
        };
    }

    const device = await getDeviceByDeviceId(pool, deviceId);
    const settings = await getOrCreateSettingsForDevice(pool, device.id);

    if (!settings.enabled || !settings.recipient_email) {
        return {
            sent: false,
            reason: 'recipient_not_enabled'
        };
    }

    const activeAlerts = await getActiveAlerts(pool, device.id);
    const activeMetricNames = activeAlerts.map((alert) => alert.metric_name);

    await markInactiveMetrics(pool, device.id, activeMetricNames);

    if (activeAlerts.length === 0) {
        return {
            sent: false,
            reason: 'no_active_alerts'
        };
    }

    const stateResult = await pool.query(
        `
        SELECT metric_name, active, last_sent_at
        FROM alert_email_metric_state
        WHERE device_id = $1
            AND metric_name = ANY($2)
        `,
        [device.id, activeMetricNames]
    );
    const now = new Date();
    const dueAlerts = selectDueAlerts({
        activeAlerts,
        stateRows: stateResult.rows,
        repeatIntervalMinutes: Number(settings.repeat_interval_minutes || DEFAULT_REPEAT_INTERVAL_MINUTES),
        now
    });

    if (dueAlerts.length === 0) {
        return {
            sent: false,
            reason: 'cooldown_active'
        };
    }

    const latestReading = await getLatestReading(pool, device.id);
    const emailPayload = buildAlertEmail({
        device,
        triggeredAlerts: dueAlerts,
        latestReading
    });

    await sendResendEmail({
        to: settings.recipient_email,
        ...emailPayload
    });

    await markSentMetrics(
        pool,
        device.id,
        dueAlerts.map((alert) => alert.metric_name),
        now
    );

    return {
        sent: true,
        sentTo: settings.recipient_email,
        metricNames: dueAlerts.map((alert) => alert.metric_name)
    };
}

module.exports = {
    DEFAULT_REPEAT_INTERVAL_MINUTES,
    MIN_REPEAT_INTERVAL_MINUTES,
    MAX_REPEAT_INTERVAL_MINUTES,
    buildAlertEmail,
    buildConfirmationEmail,
    confirmAlertEmail,
    getAlertEmailSettings,
    normalizeRepeatIntervalMinutes,
    requestAlertEmailConfirmation,
    selectDueAlerts,
    sendDueAlertEmailForDevice,
    sendTestAlertEmail,
    updateAlertEmailSettings
};
