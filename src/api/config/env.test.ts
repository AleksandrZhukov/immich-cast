import { describe, expect, test } from 'bun:test';
import { hourSchema, parseOwnersApiKeys } from './env';

describe('hourSchema', () => {
  test('rejects non-numeric strings loudly (the old NaN slip-through)', () => {
    expect(hourSchema.safeParse('abc').success).toBe(false);
  });

  test('coerces valid numeric strings', () => {
    expect(hourSchema.parse('7')).toBe(7);
    expect(hourSchema.parse('0')).toBe(0);
    expect(hourSchema.parse('23')).toBe(23);
  });

  test('rejects out-of-range and non-integer hours', () => {
    expect(hourSchema.safeParse('-1').success).toBe(false);
    expect(hourSchema.safeParse('24').success).toBe(false);
    expect(hourSchema.safeParse('7.5').success).toBe(false);
  });
});

describe('parseOwnersApiKeys', () => {
  test('returns empty map for undefined/empty', () => {
    expect(parseOwnersApiKeys(undefined)).toEqual({});
    expect(parseOwnersApiKeys('')).toEqual({});
  });

  test('parses a single pair', () => {
    expect(parseOwnersApiKeys('uuid1=key1')).toEqual({ uuid1: 'key1' });
  });

  test('trims whitespace around commas and equals signs', () => {
    expect(parseOwnersApiKeys('  uuid1 = key1 ,  uuid2=key2  ')).toEqual({ uuid1: 'key1', uuid2: 'key2' });
  });

  test('skips empty entries from trailing commas', () => {
    expect(parseOwnersApiKeys('uuid1=key1,')).toEqual({ uuid1: 'key1' });
  });

  test('throws on entries missing the key', () => {
    expect(() => parseOwnersApiKeys('uuid1')).toThrow(/Malformed/);
    expect(() => parseOwnersApiKeys('uuid1=')).toThrow(/Malformed/);
  });

  test('throws on entries missing the uuid', () => {
    expect(() => parseOwnersApiKeys('=key1')).toThrow(/Malformed/);
  });
});
