const express = require('express');
const cors = require('cors');

const devicesRoutes = require('./routes/devices.routes');
const ingestRoutes = require('./routes/ingest.routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'PiAQ backend is running'
  });
});

app.use('/devices', devicesRoutes);
app.use('/ingest', ingestRoutes);

app.use(errorHandler);

module.exports = app;