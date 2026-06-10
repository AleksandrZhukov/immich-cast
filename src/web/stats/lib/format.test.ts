import { describe, expect, test } from 'bun:test';
import { compact } from './format';

describe('compact', () => {
  test.each([
    [0, '0'],
    [42, '42'],
    [999, '999'],
    [1000, '1.0k'],
    [1500, '1.5k'],
    // 9999 rounds up to "10.0k" — documented/accepted behavior at this boundary.
    [9999, '10.0k'],
    [10000, '10k'],
    [12345, '12k'],
    [999999, '1000k'],
    [1_000_000, '1.0M'],
    [2_500_000, '2.5M'],
  ])('compact(%i) === %s', (input, expected) => {
    expect(compact(input)).toBe(expected);
  });
});
