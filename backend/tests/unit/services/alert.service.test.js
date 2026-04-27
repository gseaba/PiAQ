const test = require('node:test');
const assert = require('node:assert/strict');

const { loadFresh } = require('../../helpers/module-loader');

function createReading(overrides = {}) {
    return {
        window_start: '2026-04-23T10:00:00.000Z',
        window_end: '2026-04-23T10:05:00.000Z',
        co2_avg: 900,
        co2_max: 900,
        ...overrides
    };
}

test('buildAlertRowsForRule creates an active alert for a long-running violation and keeps the peak value updated', () => {
    const service = loadFresh('src/services/alert.service.js');

    const alertRows = service.buildAlertRowsForRule(
        {
            id: 1,
            metric_name: 'co2',
            operator: '>=',
            threshold_value: 1000,
            duration_seconds: 300
        },
        [
            createReading({
                window_start: '2026-04-23T10:00:00.000Z',
                window_end: '2026-04-23T10:05:00.000Z',
                co2_max: 1100
            }),
            createReading({
                window_start: '2026-04-23T10:05:00.000Z',
                window_end: '2026-04-23T10:10:00.000Z',
                co2_max: 1300
            })
        ]
    );

    assert.deepEqual(alertRows, [
        {
            ruleId: 1,
            metricName: 'co2',
            thresholdValue: 1000,
            comparisonOperator: '>=',
            startedAt: '2026-04-23T10:00:00.000Z',
            endedAt: null,
            peakValue: 1300,
            status: 'active',
            message: 'CO2 >= 1000 for 300 seconds'
        }
    ]);
});

test('buildAlertRowsForRule resolves an alert once readings return to normal', () => {
    const service = loadFresh('src/services/alert.service.js');

    const alertRows = service.buildAlertRowsForRule(
        {
            id: 2,
            metric_name: 'co2',
            operator: '>=',
            threshold_value: 1000,
            duration_seconds: 0
        },
        [
            createReading({
                window_start: '2026-04-23T10:00:00.000Z',
                window_end: '2026-04-23T10:05:00.000Z',
                co2_max: 1100
            }),
            createReading({
                window_start: '2026-04-23T10:05:00.000Z',
                window_end: '2026-04-23T10:10:00.000Z',
                co2_max: 900
            })
        ]
    );

    assert.deepEqual(alertRows, [
        {
            ruleId: 2,
            metricName: 'co2',
            thresholdValue: 1000,
            comparisonOperator: '>=',
            startedAt: '2026-04-23T10:00:00.000Z',
            endedAt: '2026-04-23T10:05:00.000Z',
            peakValue: 1100,
            status: 'resolved',
            message: 'CO2 >= 1000'
        }
    ]);
});

test('buildAlertRowsForRule does not create an alert until the rule duration is satisfied', () => {
    const service = loadFresh('src/services/alert.service.js');

    const alertRows = service.buildAlertRowsForRule(
        {
            id: 3,
            metric_name: 'co2',
            operator: '>=',
            threshold_value: 1000,
            duration_seconds: 600
        },
        [
            createReading({
                window_start: '2026-04-23T10:00:00.000Z',
                window_end: '2026-04-23T10:05:00.000Z',
                co2_max: 1100
            })
        ]
    );

    assert.deepEqual(alertRows, []);
});
