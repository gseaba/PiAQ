const { ALERT_METRIC_CONFIG } = require('../constants/metrics');

const SUPPORTED_OPERATORS = ['>', '>=', '<', '<=', '='];

function compareMetricValue(operator, readingValue, thresholdValue) {
    switch (operator) {
    case '>':
        return readingValue > thresholdValue;
    case '>=':
        return readingValue >= thresholdValue;
    case '<':
        return readingValue < thresholdValue;
    case '<=':
        return readingValue <= thresholdValue;
    case '=':
        return readingValue === thresholdValue;
    default:
        throw new Error(`Unsupported operator: ${operator}`);
    }
}

function selectMetricValue(rule, reading) {
    const metricConfig = ALERT_METRIC_CONFIG[rule.metric_name];

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

function chooseExtremeValue(operator, currentValue, nextValue) {
    if (currentValue === null) {
        return nextValue;
    }

    if (nextValue === null) {
        return currentValue;
    }

    if (operator === '<' || operator === '<=') {
        return Math.min(currentValue, nextValue);
    }

    return Math.max(currentValue, nextValue);
}

function calculateDurationSeconds(startedAt, endedAt) {
    return Math.max(
        0,
        Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000)
    );
}

function buildAlertMessage(rule) {
    const metricLabel = ALERT_METRIC_CONFIG[rule.metric_name]?.label || rule.metric_name;
    const durationSeconds = Number(rule.duration_seconds || 0);
    const durationSuffix = durationSeconds > 0 ? ` for ${durationSeconds} seconds` : '';

    return `${metricLabel} ${rule.operator} ${Number(rule.threshold_value)}${durationSuffix}`;
}

function pushAlertIfEligible(alertRows, rule, segment, isActive) {
    if (!segment) {
        return;
    }

    const durationSeconds = calculateDurationSeconds(segment.startedAt, segment.endedAt);

    if (durationSeconds < Number(rule.duration_seconds || 0)) {
        return;
    }

    alertRows.push({
        ruleId: rule.id,
        metricName: rule.metric_name,
        thresholdValue: Number(rule.threshold_value),
        comparisonOperator: rule.operator,
        startedAt: segment.startedAt,
        endedAt: isActive ? null : segment.endedAt,
        peakValue: segment.extremeValue,
        status: isActive ? 'active' : 'resolved',
        message: buildAlertMessage(rule)
    });
}

function buildAlertRowsForRule(rule, readings) {
    const alertRows = [];
    let currentSegment = null;

    for (const reading of readings) {
        const metricValue = selectMetricValue(rule, reading);
        const isViolation = metricValue !== null
            && compareMetricValue(rule.operator, metricValue, Number(rule.threshold_value));

        if (isViolation) {
            if (currentSegment && new Date(reading.window_start) <= new Date(currentSegment.endedAt)) {
                currentSegment.endedAt = reading.window_end;
                currentSegment.extremeValue = chooseExtremeValue(
                    rule.operator,
                    currentSegment.extremeValue,
                    metricValue
                );
                continue;
            }

            pushAlertIfEligible(alertRows, rule, currentSegment, false);
            currentSegment = {
                startedAt: reading.window_start,
                endedAt: reading.window_end,
                extremeValue: metricValue
            };
            continue;
        }

        pushAlertIfEligible(alertRows, rule, currentSegment, false);
        currentSegment = null;
    }

    pushAlertIfEligible(alertRows, rule, currentSegment, true);

    return alertRows;
}

async function getEnabledRulesForDevice(client, internalDeviceId) {
    const result = await client.query(
        `
        SELECT
            id,
            device_id,
            metric_name,
            operator,
            threshold_value::float8 AS threshold_value,
            duration_seconds,
            enabled
        FROM alert_rules
        WHERE enabled = TRUE
            AND (device_id = $1 OR device_id IS NULL)
        ORDER BY
            device_id NULLS LAST,
            metric_name ASC,
            threshold_value ASC,
            duration_seconds ASC,
            id ASC
        `,
        [internalDeviceId]
    );

    return result.rows;
}

async function getDeviceReadingsForEvaluation(client, internalDeviceId) {
    const result = await client.query(
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
        ORDER BY window_start ASC, window_end ASC
        `,
        [internalDeviceId]
    );

    return result.rows;
}

async function replaceAlertsForRule(client, internalDeviceId, rule, alertRows) {
    await client.query(
        `
        DELETE FROM alerts
        WHERE device_id = $1
            AND (
                rule_id = $2
                OR (
                    rule_id IS NULL
                    AND metric_name = $3
                    AND comparison_operator = $4
                    AND threshold_value = $5
                )
            )
        `,
        [internalDeviceId, rule.id, rule.metric_name, rule.operator, rule.threshold_value]
    );

    for (const alertRow of alertRows) {
        await client.query(
            `
            INSERT INTO alerts (
                device_id,
                rule_id,
                metric_name,
                threshold_value,
                comparison_operator,
                started_at,
                ended_at,
                peak_value,
                status,
                message
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `,
            [
                internalDeviceId,
                alertRow.ruleId,
                alertRow.metricName,
                alertRow.thresholdValue,
                alertRow.comparisonOperator,
                alertRow.startedAt,
                alertRow.endedAt,
                alertRow.peakValue,
                alertRow.status,
                alertRow.message
            ]
        );
    }
}

async function evaluateAlertsForDevice(client, internalDeviceId) {
    const rules = await getEnabledRulesForDevice(client, internalDeviceId);

    if (rules.length === 0) {
        return {
            evaluatedRuleCount: 0,
            generatedAlertCount: 0
        };
    }

    const readings = await getDeviceReadingsForEvaluation(client, internalDeviceId);
    let generatedAlertCount = 0;

    for (const rule of rules) {
        const alertRows = buildAlertRowsForRule(rule, readings);
        generatedAlertCount += alertRows.length;
        await replaceAlertsForRule(client, internalDeviceId, rule, alertRows);
    }

    return {
        evaluatedRuleCount: rules.length,
        generatedAlertCount
    };
}

module.exports = {
    SUPPORTED_OPERATORS,
    buildAlertRowsForRule,
    evaluateAlertsForDevice
};
