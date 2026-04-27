const express = require('express');
const { body, param, query } = require('express-validator');

const devicesController = require('../controllers/devices.controller');
const { SUPPORTED_METRICS } = require('../constants/metrics');
const { SUPPORTED_OPERATORS } = require('../services/alert.service');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

router.post(
    '/register',
    [
        body('deviceId')
            .trim()
            .notEmpty()
            .withMessage('deviceId is required')
            .isLength({ max: 100 })
            .withMessage('deviceId must be 100 characters or fewer'),
        body('locationLabel')
            .optional()
            .trim()
            .isLength({ max: 150 })
            .withMessage('locationLabel must be 150 characters or fewer')
    ],
    validateRequest,
    devicesController.registerDevice
);

router.get('/', devicesController.listDevices);

router.get(
    '/:deviceId/latest',
    [
        param('deviceId')
            .trim()
            .notEmpty()
            .withMessage('deviceId is required')
    ],
    validateRequest,
    devicesController.getLatestDeviceSummary
);

router.get(
    '/:deviceId/history',
    [
        param('deviceId')
            .trim()
            .notEmpty()
            .withMessage('deviceId is required'),
        query('start')
            .notEmpty()
            .withMessage('start is required')
            .isISO8601()
            .withMessage('start must be a valid ISO8601 timestamp'),
        query('end')
            .notEmpty()
            .withMessage('end is required')
            .isISO8601()
            .withMessage('end must be a valid ISO8601 timestamp'),
        query('bucket')
            .notEmpty()
            .withMessage('bucket is required')
            .matches(/^\d+[mhd]$/)
            .withMessage('bucket must be one of the supported duration formats like 5m, 1h, or 1d'),
        query('metric')
            .optional()
            .isIn(SUPPORTED_METRICS)
            .withMessage(`metric must be one of: ${SUPPORTED_METRICS.join(', ')}`)
            .bail(),
        query('end').custom((endValue, { req }) => {
            if (req.query.start && new Date(req.query.start) >= new Date(endValue)) {
                throw new Error('end must be later than start');
            }

            return true;
        })
    ],
    validateRequest,
    devicesController.getDeviceHistory
);

router.get(
    '/:deviceId/alerts',
    [
        param('deviceId')
            .trim()
            .notEmpty()
            .withMessage('deviceId is required'),
        query('status')
            .optional()
            .isIn(['active', 'resolved'])
            .withMessage('status must be either active or resolved')
    ],
    validateRequest,
    devicesController.getDeviceAlerts
);

router.get(
    '/:deviceId/rules',
    [
        param('deviceId')
            .trim()
            .notEmpty()
            .withMessage('deviceId is required')
    ],
    validateRequest,
    devicesController.getAlertRules
);

router.put(
    '/:deviceId/rules',
    [
        param('deviceId')
            .trim()
            .notEmpty()
            .withMessage('deviceId is required'),
        body('rules')
            .isArray()
            .withMessage('rules must be an array'),
        body('rules.*.metricName')
            .isIn(SUPPORTED_METRICS)
            .withMessage(`metricName must be one of: ${SUPPORTED_METRICS.join(', ')}`),
        body('rules.*.operator')
            .isIn(SUPPORTED_OPERATORS)
            .withMessage(`operator must be one of: ${SUPPORTED_OPERATORS.join(', ')}`),
        body('rules.*.thresholdValue')
            .isFloat()
            .withMessage('thresholdValue must be a number'),
        body('rules.*.durationSeconds')
            .isInt({ min: 0 })
            .withMessage('durationSeconds must be an integer greater than or equal to 0'),
        body('rules.*.enabled')
            .isBoolean()
            .withMessage('enabled must be a boolean'),
        body('rules').custom((rules) => {
            const uniqueKeys = new Set();

            for (const rule of rules) {
                const uniqueKey = [
                    rule.metricName,
                    rule.operator,
                    rule.thresholdValue,
                    rule.durationSeconds
                ].join('|');

                if (uniqueKeys.has(uniqueKey)) {
                    throw new Error('rules must not contain duplicate metric/operator/threshold/duration combinations');
                }

                uniqueKeys.add(uniqueKey);
            }

            return true;
        })
    ],
    validateRequest,
    devicesController.replaceAlertRules
);

module.exports = router;
