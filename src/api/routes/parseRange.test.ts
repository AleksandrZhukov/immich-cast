import { describe, expect, test } from 'bun:test';
import { parseRange } from './index';

const DAY = 86_400_000;

describe('parseRange', () => {
  test('defaults to a 29-day window ending now when both args are missing', () => {
    const before = Date.now();
    const { from, to } = parseRange();
    const after = Date.now();
    expect(to.getTime()).toBeGreaterThanOrEqual(before);
    expect(to.getTime()).toBeLessThanOrEqual(after);
    // 29 days before `to` (a 30-day inclusive window).
    expect(to.getTime() - from.getTime()).toBe(29 * DAY);
  });

  test('honors explicit valid from/to', () => {
    const { from, to } = parseRange('2024-01-01', '2024-01-31');
    expect(from.toISOString().slice(0, 10)).toBe('2024-01-01');
    expect(to.toISOString().slice(0, 10)).toBe('2024-01-31');
  });

  test('garbage date strings fall back to defaults rather than Invalid Date', () => {
    const { from, to } = parseRange('not-a-date', 'also-garbage');
    expect(Number.isNaN(from.getTime())).toBe(false);
    expect(Number.isNaN(to.getTime())).toBe(false);
    expect(to.getTime() - from.getTime()).toBe(29 * DAY);
  });

  test('garbage from with valid to anchors the default window to `to`', () => {
    const { from, to } = parseRange('garbage', '2024-06-30');
    expect(to.toISOString().slice(0, 10)).toBe('2024-06-30');
    expect(to.getTime() - from.getTime()).toBe(29 * DAY);
  });

  test('from > to is returned as-is (no auto-swap; downstream yields empty)', () => {
    const { from, to } = parseRange('2024-12-31', '2024-01-01');
    expect(from.getTime()).toBeGreaterThan(to.getTime());
  });
});
