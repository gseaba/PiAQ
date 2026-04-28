const systemService = require('../services/system.service');

async function getSystemHealth(req, res, next) {
    try {
        const health = await systemService.getSystemHealth();
        res.status(health.httpStatus).json(health.body);
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getSystemHealth
};
