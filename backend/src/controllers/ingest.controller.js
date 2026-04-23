const ingestService = require('../services/ingest.service');

async function ingestBatch(req, res, next) {
    try {
        const { deviceId, readings } = req.body;

        const result = await ingestService.ingestBatch({
            deviceId,
            readings
        });

        res.status(201).json({
            message: 'Batch ingested successfully',
            ...result
        });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    ingestBatch
};