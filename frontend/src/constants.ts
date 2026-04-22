import { PollutantInfo } from './types';

export const POLLUTANTS: Record<string, PollutantInfo> = {
  pm25: {
    name: 'PM2.5',
    label: 'Particulate Matter < 2.5µm',
    unit: 'µg/m³',
    min: 0,
    max: 150,
    iconName: 'Wind',
    thresholds: { good: 12, moderate: 35, unhealthy: 55, hazardous: 150 },
  },
  pm10: {
    name: 'PM10',
    label: 'Particulate Matter < 10µm',
    unit: 'µg/m³',
    min: 0,
    max: 200,
    iconName: 'Waves',
    thresholds: { good: 54, moderate: 154, unhealthy: 254, hazardous: 354 },
  },
  co: {
    name: 'CO',
    label: 'Carbon Monoxide',
    unit: 'ppm',
    min: 0,
    max: 50,
    iconName: 'Cloud',
    thresholds: { good: 4.4, moderate: 9.4, unhealthy: 12.4, hazardous: 30.4 },
  },
  so2: {
    name: 'SO2',
    label: 'Sulfur Dioxide',
    unit: 'ppb',
    min: 0,
    max: 200,
    iconName: 'FlaskConical',
    thresholds: { good: 35, moderate: 75, unhealthy: 185, hazardous: 304 },
  },
  no2: {
    name: 'NO2',
    label: 'Nitrogen Dioxide',
    unit: 'ppb',
    min: 0,
    max: 200,
    iconName: 'Factory',
    thresholds: { good: 53, moderate: 100, unhealthy: 360, hazardous: 649 },
  },
  o3: {
    name: 'O3',
    label: 'Ozone',
    unit: 'ppb',
    min: 0,
    max: 200,
    iconName: 'Sun',
    thresholds: { good: 54, moderate: 70, unhealthy: 85, hazardous: 105 },
  },
  co2: {
    name: 'CO2',
    label: 'Carbon Dioxide',
    unit: 'ppm',
    min: 400,
    max: 2000,
    iconName: 'Leaf',
    thresholds: { good: 800, moderate: 1000, unhealthy: 1500, hazardous: 2000 },
  },
  voc: {
    name: 'VOC',
    label: 'Volatile Organic Compounds',
    unit: 'ppb',
    min: 0,
    max: 1000,
    iconName: 'Zap',
    thresholds: { good: 200, moderate: 500, unhealthy: 1000, hazardous: 2000 },
  },
};

export const AQI_LEVELS = [
  { label: 'Good', color: '#10b981', min: 0, max: 50 },
  { label: 'Moderate', color: '#f59e0b', min: 51, max: 100 },
  { label: 'Unhealthy for Sensitive Groups', color: '#f97316', min: 101, max: 150 },
  { label: 'Unhealthy', color: '#ef4444', min: 151, max: 200 },
  { label: 'Very Unhealthy', color: '#8b5cf6', min: 201, max: 300 },
  { label: 'Hazardous', color: '#7f1d1d', min: 301, max: 500 },
];

export const getAqiLevel = (aqi: number) => {
  return AQI_LEVELS.find((l) => aqi >= l.min && aqi <= l.max) || AQI_LEVELS[AQI_LEVELS.length - 1];
};
