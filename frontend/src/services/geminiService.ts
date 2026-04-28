import { GoogleGenAI } from "@google/genai";
import { AirQualityData, Insight } from "../types";
import { sessionCacheFetch } from "./sessionCache";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const REFRESH_MS = 5 * 60 * 1000;
const CACHE_PREFIX = "piaq:gemini:airQualityInsights:v1:";

const getTimeBucket = (timestamp: string): string => {
  const ms = Date.parse(timestamp);
  if (Number.isNaN(ms)) return "unknown";
  return Math.floor(ms / REFRESH_MS).toString();
};

const makeCacheKey = (currentData: AirQualityData): string => {
  // One cached response per 5-minute bucket (per tab/session).
  // This prevents frequent sensor updates from triggering expensive AI calls.
  return `${CACHE_PREFIX}${getTimeBucket(currentData.timestamp)}`;
};

const buildPrompt = (currentData: AirQualityData) => `
  As an expert environmental health scientist, analyze the following air quality data and provide 3 actionable insights or health recommendations.
  
  Current Data:
  - AQI: ${currentData.aqi}
  - PM2.5: ${currentData.pm25} µg/m³
  - CO: ${currentData.co} ppm
  - CO2: ${currentData.co2} ppm
  - Humidity: ${currentData.humidity}%
  - Temperature: ${currentData.temp}°C
  
  Return the response as a JSON array of objects with the following structure:
  {
    "id": "unique-id",
    "type": "health" | "action" | "alert",
    "message": "the insight message",
    "severity": "low" | "medium" | "high"
  }
`;

export const getAirQualityInsights = async (
  currentData: AirQualityData,
  opts?: { forceRefresh?: boolean }
): Promise<Insight[]> => {
  const cacheKey = makeCacheKey(currentData);

  return sessionCacheFetch(
    cacheKey,
    REFRESH_MS,
    async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: buildPrompt(currentData),
        config: {
          responseMimeType: "application/json",
        },
      });

      const text = response.text;
      if (!text) return [];
      return JSON.parse(text) as Insight[];
    },
    opts
  ).catch((error) => {
    console.error("Error fetching insights:", error);
    return [
      {
        id: "error",
        type: "alert",
        message: "Unable to generate AI insights at this time. Please check your connection.",
        severity: "low",
      },
    ];
  });
};
