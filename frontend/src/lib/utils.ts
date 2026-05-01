import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatNumber = (value?: number | null, digits = 2): string => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '--';
  return value.toFixed(digits);
};

type TimezoneSetting = 'local' | 'UTC';

export const formatTimestamp = (
  iso: string,
  opts?: { timezone?: TimezoneSetting; includeDate?: boolean; includeSeconds?: boolean }
): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const { timezone = 'local', includeDate = false, includeSeconds = false } = opts || {};
  const formatOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  };
  if (includeSeconds) formatOptions.second = '2-digit';
  if (includeDate) {
    formatOptions.month = 'short';
    formatOptions.day = 'numeric';
  }
  if (timezone !== 'local') formatOptions.timeZone = timezone;
  return new Intl.DateTimeFormat('en-US', formatOptions).format(date);
};
