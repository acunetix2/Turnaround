import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatMinutes,
  formatDateTime,
  formatRelative,
} from '../src/lib/format';

describe('formatCurrency', () => {
  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('KES 0');
  });

  it('formats thousands with comma separator', () => {
    expect(formatCurrency(64200)).toBe('KES 64,200');
  });

  it('formats millions', () => {
    expect(formatCurrency(1_500_000)).toBe('KES 1,500,000');
  });

  it('handles negative values', () => {
    expect(formatCurrency(-1000)).toContain('1,000');
  });
});

describe('formatMinutes', () => {
  it('formats zero minutes', () => {
    expect(formatMinutes(0)).toBe('0m');
  });

  it('formats sub-hour durations', () => {
    expect(formatMinutes(45)).toBe('45m');
  });

  it('formats exactly one hour', () => {
    expect(formatMinutes(60)).toBe('1h 0m');
  });

  it('formats hours and minutes', () => {
    expect(formatMinutes(312)).toBe('5h 12m');
  });

  it('formats large durations', () => {
    expect(formatMinutes(1440)).toBe('24h 0m');
  });
});

describe('formatDateTime', () => {
  it('returns a non-empty string for a valid ISO string', () => {
    const result = formatDateTime('2024-08-01T09:00:00.000Z');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('handles invalid date gracefully', () => {
    // Should not throw
    const result = formatDateTime('not-a-date');
    expect(typeof result).toBe('string');
  });
});

describe('formatRelative', () => {
  it('returns a string for recent timestamps', () => {
    const recent = new Date(Date.now() - 60_000).toISOString(); // 1 min ago
    const result = formatRelative(recent);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
