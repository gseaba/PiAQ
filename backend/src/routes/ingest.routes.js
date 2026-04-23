const express = require('express');
const { body } = require('express-validator');

const ingestController = require('../controllers/ingest.controller');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

router.post(
    '/batch',
    [
        body('deviceId')
            .trim()
            .notEmpty()
            .withMessage('deviceId is required'),

        body('readings')
            .isArray({ min: 1 })
            .withMessage('readings must be a non-empty array'),

        body('readings.*.windowStart')
            .notEmpty()
            .withMessage('windowStart is required')
            .isISO8601()
            .withMessage('windowStart must be a valid ISO8601 timestamp'),

        body('readings.*.windowEnd')
            .notEmpty()
            .withMessage('windowEnd is required')
            .isISO8601()
            .withMessage('windowEnd must be a valid ISO8601 timestamp'),

        body('readings.*.sampleCount')
            .notEmpty()
            .withMessage('sampleCount is required')
            .isInt({ min: 1 })
            .withMessage('sampleCount must be an integer greater than 0'),

        body('readings.*.co2_avg').optional().isFloat({ min: 0 }).withMessage('co2_avg must be a non-negative number'),
        body('readings.*.co2_max').optional().isFloat({ min: 0 }).withMessage('co2_max must be a non-negative number'),
        body('readings.*.voc_avg').optional().isFloat({ min: 0 }).withMessage('voc_avg must be a non-negative number'),
        body('readings.*.voc_max').optional().isFloat({ min: 0 }).withMessage('voc_max must be a non-negative number'),
        body('readings.*.pm1_0_avg').optional().isFloat({ min: 0 }).withMessage('pm1_0_avg must be a non-negative number'),
        body('readings.*.pm2_5_avg').optional().isFloat({ min: 0 }).withMessage('pm2_5_avg must be a non-negative number'),
        body('readings.*.pm10_avg').optional().isFloat({ min: 0 }).withMessage('pm10_avg must be a non-negative number')
    ],
    validateRequest,
    ingestController.ingestBatch
);

module.exports = router;