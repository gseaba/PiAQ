const pool = require('../config/db');

async function getSystemHealth() {
    const checkedAt = new Date().toISOString();

    try {
        const result = await pool.query(
            `
            SELECT
                NOW() AS database_time,
                current_database() AS database_name
            `
        );

        return {
            httpStatus: 200,
            body: {
                status: 'ok',
                checkedAt,
                api: {
                    status: 'ok'
                },
                database: {
                    status: 'ok',
                    connected: true,
                    name: result.rows[0]?.database_name || null,
                    serverTime: result.rows[0]?.database_time || null
                }
            }
        };
    } catch (error) {
        return {
            httpStatus: 503,
            body: {
                status: 'degraded',
                checkedAt,
                api: {
                    status: 'ok'
                },
                database: {
                    status: 'down',
                    connected: false,
                    name: process.env.DB_NAME || null,
                    error: error.message
                }
            }
        };
    }
}

module.exports = {
    getSystemHealth
};
