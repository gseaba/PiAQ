const pool = require('../config/db');

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

module.exports = {
    registerDevice
};