const express = require('express');
const { body } = require('express-validator');

const devicesController = require('../controllers/devices.controller');
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

module.exports = router;