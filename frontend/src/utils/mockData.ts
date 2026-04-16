import { AirQualityData } from '../types';
import { subHours, formatISO } from 'date-fns';

export const generateMockData = (hours: number = 24): AirQualityData[] => {
  const data: AirQualityData[] = [];
  const now = new Date();

  for (let i = hours; i >= 0; i--) {
    const timestamp = formatISO(subHours(now, i));
    
    // Generate somewhat realistic trends
    const hourOfDay = subHours(now, i).getHours();
    const isRushHour = (hourOfDay >= 7 && hourOfDay <= 9) || (hourOfDay >= 16 && hourOfDay <= 19);
    const trafficMultiplier = isRushHour ? 1.5 : 1.0;

    data.push({
      timestamp,
      aqi: Math.floor(40 + Math.random() * 40 * trafficMultiplier),
      pm25: Math.floor(8 + Math.random() * 15 * trafficMultiplier),
      pm10: Math.floor(20 + Math.random() * 30 * trafficMultiplier),
      co: Number((0.5 + Math.random() * 2 * trafficMultiplier).toFixed(1)),
      so2: Math.floor(2 + Math.random() * 10),
      no2: Math.floor(10 + Math.random() * 40 * trafficMultiplier),
      o3: Math.floor(20 + Math.random() * 30),
      co2: Math.floor(400 + Math.random() * 200),
      voc: Math.floor(100 + Math.random() * 300),
      temp: Number((20 + Math.random() * 5).toFixed(1)),
      humidity: Math.floor(40 + Math.random() * 20),
    });
  }

  return data;
};
