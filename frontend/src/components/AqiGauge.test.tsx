import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AqiGauge } from './AqiGauge';

describe('AqiGauge', () => {
  it('renders AQI label and formatted value', () => {
    render(<AqiGauge aqi={101.129} />);
    expect(screen.getByText('Air Quality Index')).toBeInTheDocument();
    expect(screen.getByText('101.13')).toBeInTheDocument();
  });

  it('renders Good AQI level for healthy range values', () => {
    render(<AqiGauge aqi={45} />);
    expect(screen.getByText('Good')).toBeInTheDocument();
  });

  it('renders Moderate AQI level for mid-range values', () => {
    render(<AqiGauge aqi={75} />);
    expect(screen.getByText('Moderate')).toBeInTheDocument();
  });

  it('renders Hazardous AQI level for extreme values', () => {
    render(<AqiGauge aqi={550} />);
    expect(screen.getByText('Hazardous')).toBeInTheDocument();
  });
});
