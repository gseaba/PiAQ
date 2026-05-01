import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HistoricalChart } from './HistoricalChart';
import type { AirQualityData } from '../types';

vi.mock('recharts', () => ({
  AreaChart: ({ children }: any) => <div data-testid="areachart">{children}</div>,
  Area: () => <div data-testid="area" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive">{children}</div>,
}));

describe('HistoricalChart', () => {
  it('renders chart chrome and metadata', () => {
    const data: AirQualityData[] = [
      {
        timestamp: '2026-01-01T00:00:00.000Z',
        aqi: 10,
        pm25: 1,
        pm10: 2,
        co2: 500,
        voc: 100,
        temp: 20,
        humidity: 40,
      },
    ];

    render(
      <HistoricalChart
        data={data}
        dataKey="pm25"
        color="#6366f1"
        label="PM2.5"
        windowLabel="Last 24 hours"
        unit="µg/m³"
        timezone="UTC"
      />
    );

    expect(screen.getByText('PM2.5 Trends')).toBeInTheDocument();
    expect(screen.getByText('Last 24 hours')).toBeInTheDocument();
    expect(screen.getByTestId('areachart')).toBeInTheDocument();
  });

  it('shows no data state when series has no plottable values', () => {
    const data: AirQualityData[] = [];
    render(
      <HistoricalChart
        data={data}
        dataKey="pm25"
        color="#6366f1"
        label="PM2.5"
        windowLabel="Last 24 hours"
        unit="µg/m³"
        timezone="UTC"
      />
    );

    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('uses fallback window label when none is provided', () => {
    const data: AirQualityData[] = [
      {
        timestamp: '2026-01-01T00:00:00.000Z',
        aqi: 10,
        pm25: 1,
        pm10: 2,
        co2: 500,
        voc: 100,
        temp: 20,
        humidity: 40,
      },
    ];
    render(<HistoricalChart data={data} dataKey="co2" color="#f59e0b" label="CO2" timezone="local" />);

    expect(screen.getByText('Last 24 Hours')).toBeInTheDocument();
  });

  it('shows no data state when all selected values are NaN', () => {
    const data: AirQualityData[] = [
      {
        timestamp: '2026-01-01T00:00:00.000Z',
        aqi: 20,
        pm25: Number.NaN,
        pm10: 5,
        co2: 500,
        voc: 110,
        temp: 21,
        humidity: 45,
      },
    ];
    render(
      <HistoricalChart
        data={data}
        dataKey="pm25"
        color="#6366f1"
        label="PM2.5"
        unit="µg/m³"
        timezone="UTC"
      />
    );

    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('renders chart area when selected metric has plottable values', () => {
    const data: AirQualityData[] = [
      {
        timestamp: '2026-01-01T00:00:00.000Z',
        aqi: 30,
        pm25: 8,
        pm10: 15,
        co2: 640,
        voc: 160,
        temp: 22,
        humidity: 48,
      },
    ];
    render(
      <HistoricalChart
        data={data}
        dataKey="co2"
        color="#f59e0b"
        label="CO2"
        unit="ppm"
        timezone="UTC"
      />
    );

    expect(screen.getByTestId('areachart')).toBeInTheDocument();
    expect(screen.queryByText('No data available')).not.toBeInTheDocument();
  });

  it('renders trend title for non-pm metric labels', () => {
    const data: AirQualityData[] = [
      {
        timestamp: '2026-01-01T00:00:00.000Z',
        aqi: 30,
        pm25: 8,
        pm10: 15,
        co2: 640,
        voc: 160,
        temp: 22,
        humidity: 48,
      },
    ];
    render(
      <HistoricalChart
        data={data}
        dataKey="voc"
        color="#8b5cf6"
        label="VOC"
        windowLabel="Last 12 hours"
        unit="ppb"
        timezone="local"
      />
    );

    expect(screen.getByText('VOC Trends')).toBeInTheDocument();
  });
});
