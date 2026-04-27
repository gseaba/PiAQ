import { AirQualityData } from '../types';
import { generateMockData } from '../utils/mockData';
import { sessionCacheFetch } from './sessionCache';

const TTL_MS = 5 * 60 * 1000;
const CACHE_PREFIX = 'piaq:airQuality:history:v1:';

/**
 * Cached for 5 minutes in sessionStorage to prevent repeated/polling calls from queuing.
 * Swap the fetcher body to call your server when ready.
 */
export const getAirQualityHistory = async (
  hours: number,
  opts?: { forceRefresh?: boolean }
): Promise<AirQualityData[]> => {
  const key = `${CACHE_PREFIX}${hours}`;

  return sessionCacheFetch(
    key,
    TTL_MS,
    async () => {
      // TODO: replace with real server call, e.g.
      // const res = await fetch(`/api/air-quality?hours=${hours}`);
      // if (!res.ok) throw new Error('Failed to fetch air quality history');
      // return (await res.json()) as AirQualityData[];

      return generateMockData(hours);
    },
    opts
  );
};
