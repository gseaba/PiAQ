export interface AirQualityData {
  timestamp: string;
  aqi: number;
  pm25: number;
  pm10: number;
  co2: number;
  voc: number;
  temp: number;
  humidity: number;
}

export type DeviceAlert = {
  id: number | string;
  metricName: string;
  thresholdValue: number | null;
  comparisonOperator: string | null;
  startedAt: string;
  endedAt: string | null;
  peakValue: number | null;
  status: 'active' | 'resolved' | string;
  message: string;
  createdAt: string;
};

export interface PollutantInfo {
  name: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  iconName: string;
  thresholds: {
    good: number;
    moderate: number;
    unhealthy: number;
    hazardous: number;
  };
}

export interface Insight {
  id: string;
  type: 'health' | 'action' | 'alert';
  message: string;
  severity: 'low' | 'medium' | 'high';
}
