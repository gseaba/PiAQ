import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sessionCacheClearAll } from './sessionCache';

const { generateContentMock } = vi.hoisted(() => ({
  generateContentMock: vi.fn(),
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      generateContent: generateContentMock,
    },
  })),
}));

import { getAirQualityInsights } from './geminiService';

const sampleData = {
  timestamp: '2026-02-01T00:00:00.000Z',
  aqi: 72,
  pm25: 18,
  pm10: 25,
  co2: 650,
  voc: 110,
  temp: 23,
  humidity: 45,
};

describe('geminiService outbound POST-style calls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    sessionCacheClearAll();
  });

  it('calls Gemini generateContent with expected payload and parses JSON insights', async () => {
    generateContentMock.mockResolvedValueOnce({
      text: JSON.stringify([
        { id: 'i1', type: 'health', message: 'Open windows for ventilation.', severity: 'medium' },
      ]),
    });

    const insights = await getAirQualityInsights(sampleData, { forceRefresh: true });

    expect(generateContentMock).toHaveBeenCalledTimes(1);
    const call = generateContentMock.mock.calls[0][0];
    expect(call.model).toBe('gemini-3-flash-preview');
    expect(call.config).toEqual({ responseMimeType: 'application/json' });
    expect(call.contents).toContain('AQI: 72');
    expect(call.contents).toContain('PM2.5: 18');
    expect(insights).toEqual([
      { id: 'i1', type: 'health', message: 'Open windows for ventilation.', severity: 'medium' },
    ]);
  });

  it('returns empty list when provider returns no text body', async () => {
    generateContentMock.mockResolvedValueOnce({ text: '' });

    const insights = await getAirQualityInsights(
      { ...sampleData, timestamp: '2026-02-01T00:06:00.000Z' },
      { forceRefresh: true }
    );

    expect(insights).toEqual([]);
  });

  it('reuses cached result for same 5-minute bucket unless forceRefresh is set', async () => {
    generateContentMock.mockResolvedValue({
      text: JSON.stringify([{ id: 'c1', type: 'action', message: 'Keep filters clean.', severity: 'low' }]),
    });

    const first = await getAirQualityInsights(
      { ...sampleData, timestamp: '2026-02-01T00:10:01.000Z' },
      { forceRefresh: false }
    );
    const second = await getAirQualityInsights(
      { ...sampleData, timestamp: '2026-02-01T00:10:59.000Z' },
      { forceRefresh: false }
    );
    await getAirQualityInsights(
      { ...sampleData, timestamp: '2026-02-01T00:10:59.000Z' },
      { forceRefresh: true }
    );

    expect(first).toEqual(second);
    expect(generateContentMock).toHaveBeenCalledTimes(2);
  });

  it('returns fallback insight when Gemini request fails', async () => {
    generateContentMock.mockRejectedValueOnce(new Error('network failed'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const insights = await getAirQualityInsights(
      { ...sampleData, timestamp: '2026-02-01T00:20:00.000Z' },
      { forceRefresh: true }
    );

    expect(insights).toEqual([
      {
        id: 'error',
        type: 'alert',
        message: 'Unable to generate AI insights at this time. Please check your connection.',
        severity: 'low',
      },
    ]);

    errorSpy.mockRestore();
  });

  it('returns fallback insight when provider returns invalid JSON', async () => {
    generateContentMock.mockResolvedValueOnce({ text: '{invalid-json' });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const insights = await getAirQualityInsights(
      { ...sampleData, timestamp: '2026-02-01T00:25:00.000Z' },
      { forceRefresh: true }
    );

    expect(insights[0]).toMatchObject({
      id: 'error',
      type: 'alert',
    });
    errorSpy.mockRestore();
  });

  it('calls provider again for a different 5-minute time bucket', async () => {
    generateContentMock.mockResolvedValue({
      text: JSON.stringify([{ id: 't1', type: 'health', message: 'Track trends', severity: 'low' }]),
    });

    await getAirQualityInsights(
      { ...sampleData, timestamp: '2026-02-01T00:00:30.000Z' },
      { forceRefresh: false }
    );
    await getAirQualityInsights(
      { ...sampleData, timestamp: '2026-02-01T00:06:00.000Z' },
      { forceRefresh: false }
    );

    expect(generateContentMock).toHaveBeenCalledTimes(2);
  });
});
