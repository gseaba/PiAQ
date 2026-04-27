const express = require('express');
const { body, param, query } = require('express-validator');

const devicesController = require('../controllers/devices.controller');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

const SUPPORTED_METRICS = [
    'co2',
    'voc',
    'pm1_0',
    'pm2_5',
    'pm10',
    'temperature',
    'humidity'
];

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

module.exports = router;
