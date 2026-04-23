const devicesService = require('../services/devices.service');

async function registerDevice(req, res, next) {
    try {
        const { deviceId, locationLabel } = req.body;

        const device = await devicesService.registerDevice({
            deviceId,
            locationLabel
        });

        res.status(201).json({
            message: 'Device registered successfully',
            device: {
                id: device.id,
                deviceId: device.device_id,
                locationLabel: device.location_label,
                status: device.status,
                registeredAt: device.registered_at,
                lastSeenAt: device.last_seen_at
            }
        });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    registerDevice
};