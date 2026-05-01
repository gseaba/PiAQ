import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AlertsBanner } from './AlertsBanner';

vi.mock('../services/airQualityService', () => ({
  getDeviceAlerts: vi.fn(),
}));

import { getDeviceAlerts } from '../services/airQualityService';

describe('AlertsBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('renders top active alert and supports dismiss', async () => {
    vi.mocked(getDeviceAlerts).mockResolvedValue([
      {
        id: 'a1',
        metricName: 'co2',
        thresholdValue: 1000,
        comparisonOperator: '>',
        startedAt: '2026-01-01T00:00:00.000Z',
        endedAt: null,
        peakValue: 1200,
        status: 'active',
        message: 'CO2 too high',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ]);

    render(<AlertsBanner deviceId="device-1" />);

    expect(await screen.findByText('CO2 too high')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss alert' }));

    await waitFor(() => {
      expect(screen.queryByText('CO2 too high')).not.toBeInTheDocument();
    });
  });
});
