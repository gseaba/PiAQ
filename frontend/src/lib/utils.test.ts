import { describe, expect, it } from 'vitest';
import { formatNumber, formatTimestamp } from './utils';

describe('utils formatting', () => {
  it('formats numbers to 2 decimals by default', () => {
    expect(formatNumber(12)).toBe('12.00');
    expect(formatNumber(12.3456)).toBe('12.35');
    expect(formatNumber(null)).toBe('--');
  });

  it('formats timestamps for UTC and local paths', () => {
    const iso = '2026-01-01T12:34:56.000Z';
    const utc = formatTimestamp(iso, { timezone: 'UTC', includeSeconds: true });
    const local = formatTimestamp(iso, { timezone: 'local' });

    expect(utc).toMatch(/12:34:56/);
    expect(local).toMatch(/^\d{2}:\d{2}/);
  });

  it('formats numbers with custom precision digits', () => {
    expect(formatNumber(3.14159, 3)).toBe('3.142');
  });

  it('returns placeholder for NaN values', () => {
    expect(formatNumber(Number.NaN)).toBe('--');
  });

  it('returns empty string for invalid timestamps', () => {
    expect(formatTimestamp('not-a-date', { timezone: 'UTC' })).toBe('');
  });

  it('formats timestamps including date when requested', () => {
    const formatted = formatTimestamp('2026-01-01T12:00:00.000Z', { timezone: 'UTC', includeDate: true });
    expect(formatted).toContain('Jan');
  });

  it('formats timestamps with local defaults when options are omitted', () => {
    const formatted = formatTimestamp('2026-01-01T12:34:00.000Z');
    expect(formatted).toMatch(/^\d{2}:\d{2}/);
  });
});
