require('dotenv').config({ quiet: true });

const pool = require('../config/db');
const { evaluateAlertsForDevice } = require('../services/alert.service');

const DEMO_DEVICES = [
    {
        deviceId: 'pi-demo-101',
        locationLabel: 'Engineering Lab',
        profile: 'office'
    },
    {
        deviceId: 'pi-demo-202',
        locationLabel: 'Classroom North',
        profile: 'busy'
    }
];

const RULE_SETS = {
    office: [
        { metricName: 'co2', operator: '>=', thresholdValue: 950, durationSeconds: 1800, enabled: true },
        { metricName: 'voc', operator: '>=', thresholdValue: 350, durationSeconds: 900, enabled: true },
        { metricName: 'humidity', operator: '>=', thresholdValue: 60, durationSeconds: 1800, enabled: true }
    ],
    busy: [
        { metricName: 'co2', operator: '>=', thresholdValue: 1000, durationSeconds: 1800, enabled: true },
        { metricName: 'pm2_5', operator: '>=', thresholdValue: 35, durationSeconds: 900, enabled: true },
        { metricName: 'temperature', operator: '>=', thresholdValue: 25, durationSeconds: 1800, enabled: true }
    ]
};

function round(value, digits = 2) {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function wave(index, scale, speed, offset = 0) {
    return Math.sin(index / speed + offset) * scale;
}

function pulse(index, center, width, amplitude) {
    const distance = Math.abs(index - center);

    if (distance > width) {
        return 0;
    }

    return (1 - (distance / width)) * amplitude;
}

function createReading(profile, index, totalPoints, windowStart, windowEnd) {
    const progress = index;
    const hour = windowStart.getUTCHours();
    const isOccupiedWindow = (hour >= 14 && hour <= 22) ? 1 : 0;

    let co2Avg = 610 + wave(progress, 55, 5);
    let co2Max = co2Avg + 60 + wave(progress, 20, 3);
    let vocAvg = 140 + wave(progress, 28, 6, 0.8);
    let vocMax = vocAvg + 35 + wave(progress, 16, 4);
    let pm10Avg = 12 + wave(progress, 3, 7, 0.5);
    let pm25Avg = 7 + wave(progress, 2.2, 6, 0.2);
    let pm1Avg = 4 + wave(progress, 1.4, 5, 1.1);
    let temperature = 21.4 + wave(progress, 1.1, 8, 0.3);
    let humidity = 44 + wave(progress, 6, 9, 1.6);

    if (profile === 'office') {
        co2Avg += isOccupiedWindow * 170 + pulse(progress, totalPoints - 10, 8, 250);
        co2Max += isOccupiedWindow * 220 + pulse(progress, totalPoints - 10, 8, 320);
        vocAvg += isOccupiedWindow * 45 + pulse(progress, totalPoints - 18, 4, 120);
        vocMax += isOccupiedWindow * 60 + pulse(progress, totalPoints - 18, 4, 170);
        humidity += pulse(progress, totalPoints - 8, 6, 14);
    }

    if (profile === 'busy') {
        co2Avg += isOccupiedWindow * 280 + pulse(progress, totalPoints - 14, 8, 300);
        co2Max += isOccupiedWindow * 340 + pulse(progress, totalPoints - 14, 8, 360);
        pm25Avg += isOccupiedWindow * 4 + pulse(progress, totalPoints - 28, 7, 34);
        pm10Avg += isOccupiedWindow * 6 + pulse(progress, totalPoints - 28, 7, 28);
        temperature += isOccupiedWindow * 1.8 + pulse(progress, totalPoints - 12, 6, 2.2);
        vocAvg += isOccupiedWindow * 35;
        vocMax += isOccupiedWindow * 50;
    }

    co2Avg = clamp(round(co2Avg), 430, 2000);
    co2Max = clamp(round(Math.max(co2Max, co2Avg + 10)), 450, 2400);
    vocAvg = clamp(round(vocAvg), 60, 900);
    vocMax = clamp(round(Math.max(vocMax, vocAvg + 10)), 80, 1200);
    pm1Avg = clamp(round(pm1Avg), 1, 60);
    pm25Avg = clamp(round(pm25Avg), 2, 150);
    pm10Avg = clamp(round(pm10Avg), 5, 180);
    temperature = clamp(round(temperature), 18, 30);
    humidity = clamp(round(humidity), 25, 80);

    return {
        windowStart: windowStart.toISOString(),
        windowEnd: windowEnd.toISOString(),
        sampleCount: 30,
        co2_avg: co2Avg,
        co2_max: co2Max,
        voc_avg: vocAvg,
        voc_max: vocMax,
        pm1_0_avg: pm1Avg,
        pm2_5_avg: pm25Avg,
        pm10_avg: pm10Avg,
        temperature,
        humidity
    };
}

function generateReadings(profile, hours = 24, windowMinutes = 15) {
    const readings = [];
    const totalPoints = Math.floor((hours * 60) / windowMinutes);
    const now = new Date();

    for (let point = 0; point < totalPoints; point += 1) {
        const windowsRemaining = totalPoints - point;
        const windowEnd = new Date(now.getTime() - ((windowsRemaining - 1) * windowMinutes * 60 * 1000));
        const windowStart = new Date(windowEnd.getTime() - (windowMinutes * 60 * 1000));

        readings.push(createReading(profile, point, totalPoints, windowStart, windowEnd));
    }

    return readings;
}

async function upsertDevice(client, device) {
    const result = await client.query(
        `
        INSERT INTO devices (device_id, location_label, status, last_seen_at)
        VALUES ($1, $2, 'online', NOW())
        ON CONFLICT (device_id)
        DO UPDATE SET
            location_label = EXCLUDED.location_label,
            status = 'online',
            last_seen_at = NOW()
        RETURNING id, device_id, location_label;
        `,
        [device.deviceId, device.locationLabel]
    );

    return result.rows[0];
}

async function replaceRules(client, internalDeviceId, rules) {
    await client.query(
        `
        DELETE FROM alert_rules
        WHERE device_id = $1
        `,
        [internalDeviceId]
    );

    for (const rule of rules) {
        await client.query(
            `
            INSERT INTO alert_rules (
                device_id,
                metric_name,
                operator,
                threshold_value,
                duration_seconds,
                enabled
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            `,
            [
                internalDeviceId,
                rule.metricName,
                rule.operator,
                rule.thresholdValue,
                rule.durationSeconds,
                rule.enabled
            ]
        );
    }
}

async function replaceReadings(client, internalDeviceId, readings) {
    await client.query(
        `
        DELETE FROM sensor_readings
        WHERE device_id = $1
        `,
        [internalDeviceId]
    );

    for (const reading of readings) {
        await client.query(
            `
            INSERT INTO sensor_readings (
                device_id,
                window_start,
                window_end,
                co2_avg,
                co2_max,
                voc_avg,
                voc_max,
                pm1_0_avg,
                pm2_5_avg,
                pm10_avg,
                temperature,
                humidity,
                sample_count,
                raw_payload
            )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
            )
            `,
            [
                internalDeviceId,
                reading.windowStart,
                reading.windowEnd,
                reading.co2_avg,
                reading.co2_max,
                reading.voc_avg,
                reading.voc_max,
                reading.pm1_0_avg,
                reading.pm2_5_avg,
                reading.pm10_avg,
                reading.temperature,
                reading.humidity,
                reading.sampleCount,
                reading
            ]
        );
    }

    const lastUploadedTimestamp = readings[readings.length - 1]?.windowEnd || null;

    await client.query(
        `
        INSERT INTO device_sync_state (device_id, last_uploaded_timestamp, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (device_id)
        DO UPDATE SET
            last_uploaded_timestamp = EXCLUDED.last_uploaded_timestamp,
            updated_at = NOW()
        `,
        [internalDeviceId, lastUploadedTimestamp]
    );
}

async function seedDevice(client, deviceConfig) {
    const device = await upsertDevice(client, deviceConfig);
    const rules = RULE_SETS[deviceConfig.profile];
    const readings = generateReadings(deviceConfig.profile);

    await replaceRules(client, device.id, rules);
    await replaceReadings(client, device.id, readings);
    await evaluateAlertsForDevice(client, device.id);

    return {
        deviceId: device.device_id,
        locationLabel: device.location_label,
        readingsInserted: readings.length
    };
}

async function cleanupDemoDevices(client) {
    const deviceIds = DEMO_DEVICES.map((device) => device.deviceId);

    await client.query(
        `
        DELETE FROM devices
        WHERE device_id = ANY($1::text[])
        `,
        [deviceIds]
    );
}

async function seedDemoData() {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        await cleanupDemoDevices(client);

        const seededDevices = [];

        for (const deviceConfig of DEMO_DEVICES) {
            const seededDevice = await seedDevice(client, deviceConfig);
            seededDevices.push(seededDevice);
        }

        await client.query('COMMIT');

        console.log('Demo data seeded successfully.');
        for (const device of seededDevices) {
            console.log(
                `- ${device.deviceId} (${device.locationLabel}) with ${device.readingsInserted} history windows`
            );
        }
        console.log('Suggested endpoints:');
        for (const device of seededDevices) {
            console.log(`  GET /devices/${device.deviceId}/latest`);
            console.log(
                `  GET /devices/${device.deviceId}/history?start=${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()}&end=${new Date().toISOString()}&bucket=1h&metric=co2`
            );
            console.log(`  GET /devices/${device.deviceId}/alerts`);
        }
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Demo data seeding failed:', error);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
}

if (require.main === module) {
    seedDemoData();
}

module.exports = {
    DEMO_DEVICES,
    RULE_SETS,
    generateReadings,
    seedDemoData
};
