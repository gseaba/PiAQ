import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AirQualityCard, VocCard } from './AirQualityCard';
import { POLLUTANTS } from '../constants';

describe('AirQualityCard', () => {
  it('renders formatted values and metric metadata', () => {
    render(<AirQualityCard pollutant={POLLUTANTS.pm25} value={12.3456} />);

    expect(screen.getByText('PM2.5')).toBeInTheDocument();
    expect(screen.getByText('12.35')).toBeInTheDocument();
    expect(screen.getByText('µg/m³')).toBeInTheDocument();
  });

  it('shows unhealthy status when above moderate threshold', () => {
    render(<AirQualityCard pollutant={POLLUTANTS.pm25} value={60} />);
    expect(screen.getByText('Unhealthy')).toBeInTheDocument();
  });

  it('shows good status at the good threshold boundary', () => {
    render(<AirQualityCard pollutant={POLLUTANTS.pm25} value={12} />);
    expect(screen.getByText('Good')).toBeInTheDocument();
  });

  it('shows moderate status between good and moderate thresholds', () => {
    render(<AirQualityCard pollutant={POLLUTANTS.pm25} value={20} />);
    expect(screen.getByText('Moderate')).toBeInTheDocument();
  });

  it('shows unhealthy status at unhealthy threshold boundary', () => {
    render(<AirQualityCard pollutant={POLLUTANTS.pm25} value={55} />);
    expect(screen.getByText('Unhealthy')).toBeInTheDocument();
  });

  it('keeps unhealthy label for hazardous values in compact card status', () => {
    render(<AirQualityCard pollutant={POLLUTANTS.pm25} value={180} />);
    expect(screen.getByText('Unhealthy')).toBeInTheDocument();
  });

  it('renders the specialized VOC wrapper card', () => {
    render(<VocCard value={321.987} />);
    expect(screen.getByText('VOC')).toBeInTheDocument();
    expect(screen.getByText('321.99')).toBeInTheDocument();
  });
});
