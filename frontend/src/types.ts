export interface AirQualityData {
  timestamp: string;
  aqi: number;
  pm25: number;
  pm10: number;
  co: number;
  so2: number;
  no2: number;
  o3: number;
  co2: number;
  voc: number;
  temp: number;
  humidity: number;
}

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
