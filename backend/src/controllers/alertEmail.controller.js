const alertEmailService = require('../services/alertEmail.service');

async function getAlertEmailSettings(req, res, next) {
    try {
        const { deviceId } = req.params;
        const settings = await alertEmailService.getAlertEmailSettings(deviceId);

        res.status(200).json({
            deviceId,
            settings
        });
    } catch (error) {
        next(error);
    }
}

async function updateAlertEmailSettings(req, res, next) {
    try {
        const { deviceId } = req.params;
        const { enabled, repeatIntervalMinutes } = req.body;
        const settings = await alertEmailService.updateAlertEmailSettings({
            deviceId,
            enabled,
            repeatIntervalMinutes
        });

        res.status(200).json({
            message: 'Alert email settings updated successfully',
            deviceId,
            settings
        });
    } catch (error) {
        next(error);
    }
}

async function requestAlertEmailConfirmation(req, res, next) {
    try {
        const { deviceId } = req.params;
        const { email } = req.body;
        const confirmation = await alertEmailService.requestAlertEmailConfirmation({
            deviceId,
            email
        });

        res.status(202).json({
            message: 'Confirmation email sent',
            deviceId,
            ...confirmation
        });
    } catch (error) {
        next(error);
    }
}

async function confirmAlertEmail(req, res, next) {
    try {
        const { deviceId } = req.params;
        const token = req.body?.token || req.query?.token;
        const settings = await alertEmailService.confirmAlertEmail({
            deviceId,
            token
        });

        if (req.method === 'GET') {
            res.status(200).send(`
                <!doctype html>
                <html lang="en">
                    <head>
                        <meta charset="utf-8" />
                        <title>PiAQ alert email confirmed</title>
                    </head>
                    <body style="font-family: Arial, sans-serif; padding: 32px;">
                        <h1>Alert email confirmed</h1>
                        <p>PiAQ alert emails are now enabled.</p>
                    </body>
                </html>
            `);
            return;
        }

        res.status(200).json({
            message: 'Alert email confirmed',
            deviceId,
            settings
        });
    } catch (error) {
        next(error);
    }
}

async function sendTestAlertEmail(req, res, next) {
    try {
        const { deviceId } = req.params;
        const result = await alertEmailService.sendTestAlertEmail({ deviceId });

        res.status(202).json({
            message: 'Test alert email sent',
            deviceId,
            ...result
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    confirmAlertEmail,
    getAlertEmailSettings,
    requestAlertEmailConfirmation,
    sendTestAlertEmail,
    updateAlertEmailSettings
};
