const test = require('node:test');
const assert = require('node:assert/strict');

const { loadFresh } = require('../../helpers/module-loader');

test('getSystemHealth returns a 200 payload when the database query succeeds', async () => {
    const service = loadFresh('src/services/system.service.js', {
        mocks: {
            'src/config/db.js': {
                query: async () => ({
                    rows: [{
                        database_name: 'piaq',
                        database_time: '2026-04-28T16:00:00.000Z'
                    }]
                })
            }
        }
    });

    const result = await service.getSystemHealth();

    assert.equal(result.httpStatus, 200);
    assert.equal(result.body.status, 'ok');
    assert.equal(result.body.api.status, 'ok');
    assert.deepEqual(result.body.database, {
        status: 'ok',
        connected: true,
        name: 'piaq',
        serverTime: '2026-04-28T16:00:00.000Z'
    });
});

test('getSystemHealth returns a 503 payload when the database query fails', async () => {
    const service = loadFresh('src/services/system.service.js', {
        mocks: {
            'src/config/db.js': {
                query: async () => {
                    throw new Error('connect ECONNREFUSED');
                }
            }
        }
    });

    const result = await service.getSystemHealth();

    assert.equal(result.httpStatus, 503);
    assert.equal(result.body.status, 'degraded');
    assert.equal(result.body.api.status, 'ok');
    assert.equal(result.body.database.status, 'down');
    assert.equal(result.body.database.connected, false);
    assert.equal(result.body.database.error, 'connect ECONNREFUSED');
});
