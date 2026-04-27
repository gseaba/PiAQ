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
            .withMessage('deviceId is required')
            .isLength({ max: 100 })
            .withMessage('deviceId must be 100 characters or fewer'),

        body('readings')
            .isArray({ min: 1 })
            .withMessage('readings must be a non-empty array')
            .bail()
            .custom((readings) => {
                for (let index = 0; index < readings.length; index += 1) {
                    const reading = readings[index];

                    if (reading.windowStart && reading.windowEnd) {
                        const windowStart = new Date(reading.windowStart);
                        const windowEnd = new Date(reading.windowEnd);

                        if (windowStart >= windowEnd) {
                            throw new Error(`readings[${index}] windowEnd must be later than windowStart`);
                        }
                    }
                }

                return true;
            }),

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
        body('readings.*.pm10_avg').optional().isFloat({ min: 0 }).withMessage('pm10_avg must be a non-negative number'),
        body('readings.*.temperature').optional().isFloat().withMessage('temperature must be a number'),
        body('readings.*.humidity').optional().isFloat({ min: 0, max: 100 }).withMessage('humidity must be a number between 0 and 100')
    ],
    validateRequest,
    ingestController.ingestBatch
);

module.exports = router;
