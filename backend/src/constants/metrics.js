const SUPPORTED_METRICS = [
    'co2',
    'voc',
    'pm1_0',
    'pm2_5',
    'pm10',
    'temperature',
    'humidity'
];

const HISTORY_METRICS = {
    co2: {
        sourceColumn: 'co2_avg',
        maxColumn: 'co2_max'
    },
    voc: {
        sourceColumn: 'voc_avg',
        maxColumn: 'voc_max'
    },
    pm1_0: {
        sourceColumn: 'pm1_0_avg',
        maxColumn: 'pm1_0_avg'
    },
    pm2_5: {
        sourceColumn: 'pm2_5_avg',
        maxColumn: 'pm2_5_avg'
    },
    pm10: {
        sourceColumn: 'pm10_avg',
        maxColumn: 'pm10_avg'
    },
    temperature: {
        sourceColumn: 'temperature',
        maxColumn: 'temperature'
    },
    humidity: {
        sourceColumn: 'humidity',
        maxColumn: 'humidity'
    }
};

const ALERT_METRIC_CONFIG = {
    co2: {
        readingColumn: 'co2_max',
        fallbackColumn: 'co2_avg',
        label: 'CO2'
    },
    voc: {
        readingColumn: 'voc_max',
        fallbackColumn: 'voc_avg',
        label: 'VOC'
    },
    pm1_0: {
        readingColumn: 'pm1_0_avg',
        label: 'PM1.0'
    },
    pm2_5: {
        readingColumn: 'pm2_5_avg',
        label: 'PM2.5'
    },
    pm10: {
        readingColumn: 'pm10_avg',
        label: 'PM10'
    },
    temperature: {
        readingColumn: 'temperature',
        label: 'Temperature'
    },
    humidity: {
        readingColumn: 'humidity',
        label: 'Humidity'
    }
};

module.exports = {
    SUPPORTED_METRICS,
    HISTORY_METRICS,
    ALERT_METRIC_CONFIG
};
