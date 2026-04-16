import { GoogleGenAI } from "@google/genai";
import { AirQualityData, Insight } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const getAirQualityInsights = async (currentData: AirQualityData): Promise<Insight[]> => {
  try {
    const prompt = `
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

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (!text) return [];
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Error fetching insights:", error);
    return [
      {
        id: 'error',
        type: 'alert',
        message: 'Unable to generate AI insights at this time. Please check your connection.',
        severity: 'low'
      }
    ];
  }
};
