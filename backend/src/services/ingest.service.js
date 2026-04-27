const pool = require('../config/db');
const { evaluateAlertsForDevice } = require('./alert.service');

async function ingestBatch({ deviceId, readings }) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const deviceResult = await client.query(
            `SELECT id, device_id FROM devices WHERE device_id = $1`,
            [deviceId]
        );

        if (deviceResult.rows.length === 0) {
            const error = new Error(`Unknown deviceId: ${deviceId}`);
            error.status = 404;
            throw error;
        }

        const internalDeviceId = deviceResult.rows[0].id;
        const insertedRows = [];

        for (const reading of readings) {
            const insertQuery = `
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
                ON CONFLICT (device_id, window_start, window_end)
                DO NOTHING
                RETURNING id, window_start, window_end;
            `;

            const values = [
                internalDeviceId,
                reading.windowStart,
                reading.windowEnd,
                reading.co2_avg ?? null,
                reading.co2_max ?? null,
                reading.voc_avg ?? null,
                reading.voc_max ?? null,
                reading.pm1_0_avg ?? null,
                reading.pm2_5_avg ?? null,
                reading.pm10_avg ?? null,
                reading.temperature ?? null,
                reading.humidity ?? null,
                reading.sampleCount,
                reading
            ];

            const result = await client.query(insertQuery, values);

            if (result.rows.length > 0) {
                insertedRows.push(result.rows[0]);
            }
        }

        await client.query(
            `
            INSERT INTO device_sync_state (device_id, last_uploaded_timestamp, updated_at)
            VALUES (
                $1,
                (
                    SELECT MAX(window_end)
                    FROM sensor_readings
                    WHERE device_id = $1
                ),
                NOW()
            )
            ON CONFLICT (device_id)
            DO UPDATE SET
                last_uploaded_timestamp = (
                    SELECT MAX(window_end)
                    FROM sensor_readings
                    WHERE device_id = $1
                ),
                updated_at = NOW();
            `,
            [internalDeviceId]
        );

        if (insertedRows.length > 0) {
            await evaluateAlertsForDevice(client, internalDeviceId);
        }

        await client.query(
            `
            UPDATE devices
            SET status = 'online',
                last_seen_at = NOW()
            WHERE id = $1;
            `,
            [internalDeviceId]
        );

        await client.query('COMMIT');

        return {
            deviceId,
            receivedCount: readings.length,
            insertedCount: insertedRows.length,
            duplicateCount: readings.length - insertedRows.length
        };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

module.exports = {
  ingestBatch
};
