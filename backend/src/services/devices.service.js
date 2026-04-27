const pool = require('../config/db');

const HISTORY_METRICS = {
    co2: {
        sourceColumn: 'co2_avg',
        maxColumn: 'co2_max'
    },
    voc: {
        sourceColumn: 'voc_avg',
        maxColumn: 'voc_max'
    },
    pm1_0: {
        sourceColumn: 'pm1_0_avg',
        maxColumn: 'pm1_0_avg'
    },
    pm2_5: {
        sourceColumn: 'pm2_5_avg',
        maxColumn: 'pm2_5_avg'
    },
    pm10: {
        sourceColumn: 'pm10_avg',
        maxColumn: 'pm10_avg'
    },
    temperature: {
        sourceColumn: 'temperature',
        maxColumn: 'temperature'
    },
    humidity: {
        sourceColumn: 'humidity',
        maxColumn: 'humidity'
    }
};

function parseBucketToSeconds(bucket) {
    const matches = /^(\d+)([mhd])$/.exec(bucket);

    if (!matches) {
        const error = new Error(`Unsupported bucket value: ${bucket}`);
        error.status = 400;
        throw error;
    }

    const [, rawAmount, unit] = matches;
    const amount = Number(rawAmount);
    const unitMultiplier = {
        m: 60,
        h: 60 * 60,
        d: 60 * 60 * 24
    };

    return amount * unitMultiplier[unit];
}

async function getDeviceByDeviceId(deviceId) {
    const result = await pool.query(
        `
        SELECT id, device_id, location_label, status, registered_at, last_seen_at
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

async function registerDevice({ deviceId, locationLabel }) {
    // Use UPSERT to insert or update the device record
    const query = `
        INSERT INTO devices (device_id, location_label, status, last_seen_at)
        VALUES ($1, $2, 'online', NOW())
        ON CONFLICT (device_id)
        DO UPDATE SET
            location_label = COALESCE(EXCLUDED.location_label, devices.location_label),
            status = 'online',
            last_seen_at = NOW()
        RETURNING id, device_id, location_label, status, registered_at, last_seen_at;
    `;

    const values = [deviceId, locationLabel || null];
    const result = await pool.query(query, values);
    return result.rows[0];
}

async function listDevices() {
    const result = await pool.query(`
        SELECT id, device_id, location_label, status, registered_at, last_seen_at
        FROM devices
        ORDER BY COALESCE(location_label, device_id) ASC, device_id ASC
    `);

    return result.rows;
}

async function getLatestDeviceSummary(deviceId) {
    const device = await getDeviceByDeviceId(deviceId);
    const result = await pool.query(
        `
        SELECT
            window_start,
            window_end,
            sample_count,
            co2_avg,
            co2_max,
            voc_avg,
            voc_max,
            pm1_0_avg,
            pm2_5_avg,
            pm10_avg,
            temperature,
            humidity
        FROM sensor_readings
        WHERE device_id = $1
        ORDER BY window_end DESC, window_start DESC
        LIMIT 1
        `,
        [device.id]
    );

    return result.rows[0] || null;
}

async function getMetricHistory({ internalDeviceId, start, end, bucketSeconds, metricName }) {
    const metricConfig = HISTORY_METRICS[metricName];

    const query = `
        SELECT
            (
                $2::timestamptz +
                FLOOR(EXTRACT(EPOCH FROM (window_start - $2::timestamptz)) / $4::numeric)
                * ($4 * INTERVAL '1 second')
            ) AS bucket_start,
            AVG(${metricConfig.sourceColumn})::float8 AS avg_value,
            MIN(${metricConfig.sourceColumn})::float8 AS min_value,
            MAX(COALESCE(${metricConfig.maxColumn}, ${metricConfig.sourceColumn}))::float8 AS max_value
        FROM sensor_readings
        WHERE device_id = $1
            AND window_start >= $2
            AND window_start < $3
            AND ${metricConfig.sourceColumn} IS NOT NULL
        GROUP BY bucket_start
        ORDER BY bucket_start ASC
    `;

    const result = await pool.query(query, [internalDeviceId, start, end, bucketSeconds]);

    return result.rows.map((row) => ({
        timestamp: row.bucket_start,
        avg: row.avg_value,
        min: row.min_value,
        max: row.max_value
    }));
}

async function getDeviceHistory({ deviceId, start, end, bucket, metric }) {
    const device = await getDeviceByDeviceId(deviceId);
    const bucketSeconds = parseBucketToSeconds(bucket);

    if (metric) {
        return {
            deviceId,
            metric,
            range: {
                start,
                end,
                bucket
            },
            points: await getMetricHistory({
                internalDeviceId: device.id,
                start,
                end,
                bucketSeconds,
                metricName: metric
            })
        };
    }

    const metrics = {};

    for (const metricName of Object.keys(HISTORY_METRICS)) {
        metrics[metricName] = await getMetricHistory({
            internalDeviceId: device.id,
            start,
            end,
            bucketSeconds,
            metricName
        });
    }

    return {
        deviceId,
        range: {
            start,
            end,
            bucket
        },
        metrics
    };
}

async function getDeviceAlerts({ deviceId, status }) {
    const device = await getDeviceByDeviceId(deviceId);

    if (status) {
        const filteredAlerts = await pool.query(
            `
            SELECT
                id,
                metric_name,
                threshold_value,
                comparison_operator,
                started_at,
                ended_at,
                peak_value,
                status,
                message,
                created_at
            FROM alerts
            WHERE device_id = $1
                AND status = $2
            ORDER BY COALESCE(ended_at, started_at) DESC, created_at DESC
            `,
            [device.id, status]
        );

        return filteredAlerts.rows;
    }

    const [activeAlerts, resolvedAlerts] = await Promise.all([
        pool.query(
            `
            SELECT
                id,
                metric_name,
                threshold_value,
                comparison_operator,
                started_at,
                ended_at,
                peak_value,
                status,
                message,
                created_at
            FROM alerts
            WHERE device_id = $1
                AND status = 'active'
            ORDER BY started_at DESC, created_at DESC
            `,
            [device.id]
        ),
        pool.query(
            `
            SELECT
                id,
                metric_name,
                threshold_value,
                comparison_operator,
                started_at,
                ended_at,
                peak_value,
                status,
                message,
                created_at
            FROM alerts
            WHERE device_id = $1
                AND status = 'resolved'
            ORDER BY COALESCE(ended_at, started_at) DESC, created_at DESC
            LIMIT 20
            `,
            [device.id]
        )
    ]);

    return [...activeAlerts.rows, ...resolvedAlerts.rows];
}

module.exports = {
    registerDevice,
    listDevices,
    getLatestDeviceSummary,
    getDeviceHistory,
    getDeviceAlerts
};
