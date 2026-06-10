import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import * as path from 'node:path';
import { DATA_DIR } from './recorder';
import { dayOfYear, downsample, getSummary, getWeatherDaily, getWeatherSeries } from './aggregator';

describe('dayOfYear', () => {
  test('Jan 1 is day 1', () => {
    expect(dayOfYear(new Date(2023, 0, 1))).toBe(1);
  });

  test('Dec 31 of a non-leap year is 365', () => {
    expect(dayOfYear(new Date(2023, 11, 31))).toBe(365);
  });

  test('Dec 31 of a leap year is 366', () => {
    expect(dayOfYear(new Date(2024, 11, 31))).toBe(366);
  });

  // The old ms-division math was off by one after spring-forward in DST zones.
  // The UTC-based version makes consecutive calendar days differ by exactly 1
  // through the DST boundary (US spring-forward was 2025-03-09).
  test('consecutive days differ by 1 across the DST boundary', () => {
    for (let d = 7; d <= 12; d++) {
      const a = dayOfYear(new Date(2025, 2, d));
      const b = dayOfYear(new Date(2025, 2, d + 1));
      expect(b - a).toBe(1);
    }
  });
});

describe('downsample', () => {
  const arr = (n: number) => Array.from({ length: n }, (_, i) => i);

  test('returns input unchanged when within maxPoints', () => {
    const a = arr(5);
    expect(downsample(a, 10)).toBe(a);
    expect(downsample(a, 5)).toBe(a);
  });

  test('returns exactly maxPoints when downsampling', () => {
    expect(downsample(arr(1000), 200).length).toBe(200);
  });

  test('always includes first and last with no duplicated tail', () => {
    const out = downsample(arr(1000), 200);
    expect(out[0]).toBe(0);
    expect(out[out.length - 1]).toBe(999);
    expect(out[out.length - 1]).not.toBe(out[out.length - 2]);
  });

  test('maxPoints of 1 yields the last sample only', () => {
    expect(downsample(arr(10), 1)).toEqual([9]);
  });

  test('maxPoints <= 0 yields empty', () => {
    expect(downsample(arr(10), 0)).toEqual([]);
  });
});

describe('fs-backed aggregators', () => {
  // Fixtures live under DATA_DIR (gitignored) on far-past dates that cannot
  // collide with real recorded data; removed after the suite.
  const dayWithSlides = '1991-06-10';
  const dayWithWeather = '1991-06-11';
  const emptyDay = '1991-06-12';
  const files = [dayWithSlides, dayWithWeather].map((d) => path.join(DATA_DIR, `events-${d}.jsonl`));

  beforeAll(async () => {
    await mkdir(DATA_DIR, { recursive: true });

    const slideLines = [
      JSON.stringify({ type: 'slide_served', ts: `${dayWithSlides}T10:00:00.000Z`, imageId: 'i1', ownerId: 'o1', ownerName: 'Alice', capturedAt: '2020-05-01T00:00:00.000Z', isMemory: false }),
      JSON.stringify({ type: 'slide_served', ts: `${dayWithSlides}T10:01:00.000Z`, imageId: 'i2', ownerId: 'o1', ownerName: 'Alice', capturedAt: '2020-06-01T00:00:00.000Z', isMemory: true }),
      '{ this is not valid json',
      JSON.stringify({ type: 'slide_served', ts: `${dayWithSlides}T10:02:00.000Z`, imageId: 'i1', ownerId: 'o1', ownerName: 'Alice', capturedAt: '2020-07-01T00:00:00.000Z', isMemory: false }),
      JSON.stringify({ type: 'slide_served', ts: `${dayWithSlides}T10:03:00.000Z`, imageId: 'i3', ownerId: 'o2', ownerName: 'Bob', capturedAt: '2019-01-01T00:00:00.000Z', isMemory: false }),
      '',
    ];
    await writeFile(path.join(DATA_DIR, `events-${dayWithSlides}.jsonl`), slideLines.join('\n') + '\n', 'utf8');

    const weatherLines = [
      JSON.stringify({ type: 'weather_sample', ts: `${dayWithWeather}T08:00:00.000Z`, temperature: 10, aqi: 30, humidity: 50, icon: 'sun', windSpeed: 1 }),
      JSON.stringify({ type: 'weather_sample', ts: `${dayWithWeather}T20:00:00.000Z`, temperature: 20, aqi: 50, humidity: 60, icon: 'cloud', windSpeed: 2 }),
    ];
    await writeFile(path.join(DATA_DIR, `events-${dayWithWeather}.jsonl`), weatherLines.join('\n') + '\n', 'utf8');
  });

  afterAll(async () => {
    await Promise.all(files.map((f) => rm(f, { force: true })));
  });

  test('getSummary skips malformed lines and counts owners/years/uniques', async () => {
    const range = { from: new Date(1991, 5, 10), to: new Date(1991, 5, 10) };
    const summary = await getSummary(range);

    expect(summary.totalServed).toBe(4); // malformed + blank lines skipped
    expect(summary.memoryServed).toBe(1);
    expect(summary.uniqueImages).toBe(3); // i1 counted once
    expect(summary.uniqueOwners).toBe(2);
    expect(summary.perOwner).toEqual([
      { ownerId: 'o1', ownerName: 'Alice', count: 3 },
      { ownerId: 'o2', ownerName: 'Bob', count: 1 },
    ]);
    expect(summary.perCaptureYear).toEqual([
      { year: 2019, count: 1 },
      { year: 2020, count: 3 },
    ]);
  });

  test('getWeatherDaily aggregates a day with samples and nulls a sample-free day', async () => {
    const range = { from: new Date(1991, 5, 11), to: new Date(1991, 5, 12) };
    const rows = await getWeatherDaily(range);
    expect(rows.length).toBe(2);

    const withSamples = rows.find((r) => r.date === dayWithWeather)!;
    expect(withSamples.samples).toBe(2);
    expect(withSamples.tempMin).toBe(10);
    expect(withSamples.tempMax).toBe(20);
    expect(withSamples.tempAvg).toBe(15);
    expect(withSamples.aqiAvg).toBe(40);
    expect(withSamples.aqiMax).toBe(50);

    const empty = rows.find((r) => r.date === emptyDay)!;
    expect(empty.samples).toBe(0);
    expect(empty.tempMin).toBeNull();
    expect(empty.tempMax).toBeNull();
    expect(empty.tempAvg).toBeNull();
    expect(empty.aqiAvg).toBeNull();
    expect(empty.aqiMax).toBeNull();
    expect(empty.dominantIcon).toBeNull();
  });

  test('getWeatherSeries returns all samples when under the cap', async () => {
    const range = { from: new Date(1991, 5, 11), to: new Date(1991, 5, 11) };
    const series = await getWeatherSeries(range, 200);
    expect(series.length).toBe(2);
    expect(series.map((s) => s.temperature)).toEqual([10, 20]);
  });
});
