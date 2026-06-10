import { readFile, readdir } from 'node:fs/promises';
import * as path from 'node:path';
import { DATA_DIR, type Event } from './recorder';

export type DateRange = { from: Date; to: Date };

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function* daysInRange({ from, to }: DateRange): Generator<string> {
  const cur = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  while (cur <= end) {
    yield isoDate(cur);
    cur.setDate(cur.getDate() + 1);
  }
}

async function readDay(dayKey: string): Promise<Event[]> {
  const file = path.join(DATA_DIR, `events-${dayKey}.jsonl`);
  try {
    const content = await readFile(file, 'utf8');
    const events: Event[] = [];
    for (const line of content.split('\n')) {
      if (!line) continue;
      try {
        events.push(JSON.parse(line) as Event);
      } catch {
        // skip malformed lines
      }
    }
    return events;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }
}

async function readRange(range: DateRange): Promise<Event[]> {
  const out: Event[] = [];
  for (const day of daysInRange(range)) {
    out.push(...(await readDay(day)));
  }
  return out;
}

export async function listKnownDays(): Promise<string[]> {
  try {
    const entries = await readdir(DATA_DIR);
    return entries
      .filter((f) => f.startsWith('events-') && f.endsWith('.jsonl'))
      .map((f) => f.replace(/^events-/, '').replace(/\.jsonl$/, ''))
      .sort();
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }
}

export type Summary = {
  totalServed: number;
  memoryServed: number;
  uniqueImages: number;
  uniqueOwners: number;
  rangeDays: number;
  perOwner: Array<{ ownerId: string; ownerName: string; count: number }>;
  perCaptureYear: Array<{ year: number; count: number }>;
};

export async function getSummary(range: DateRange): Promise<Summary> {
  const events = await readRange(range);
  const served = events.filter((e) => e.type === 'slide_served');

  const owners = new Map<string, { name: string; count: number }>();
  const captureYears = new Map<number, number>();
  const imageIds = new Set<string>();
  let memory = 0;

  for (const e of served) {
    if (e.type !== 'slide_served') continue;
    imageIds.add(e.imageId);
    if (e.isMemory) memory++;
    const owner = owners.get(e.ownerId);
    if (owner) owner.count++;
    else owners.set(e.ownerId, { name: e.ownerName, count: 1 });
    if (e.capturedAt) {
      const year = new Date(e.capturedAt).getFullYear();
      if (!Number.isNaN(year)) captureYears.set(year, (captureYears.get(year) ?? 0) + 1);
    }
  }

  let rangeDays = 0;
  for (const _ of daysInRange(range)) rangeDays++;

  return {
    totalServed: served.length,
    memoryServed: memory,
    uniqueImages: imageIds.size,
    uniqueOwners: owners.size,
    rangeDays,
    perOwner: [...owners.entries()]
      .map(([ownerId, v]) => ({ ownerId, ownerName: v.name, count: v.count }))
      .sort((a, b) => b.count - a.count),
    perCaptureYear: [...captureYears.entries()]
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => a.year - b.year),
  };
}

export type DailyPoint = { date: string; served: number; memory: number };

export async function getDaily(range: DateRange): Promise<DailyPoint[]> {
  const out: DailyPoint[] = [];
  for (const day of daysInRange(range)) {
    const events = await readDay(day);
    let served = 0;
    let memory = 0;
    for (const e of events) {
      if (e.type === 'slide_served') {
        served++;
        if (e.isMemory) memory++;
      }
    }
    out.push({ date: day, served, memory });
  }
  return out;
}

export type CaptureCell = { year: number; doy: number; count: number; memoryCount: number };

export async function getCaptureSpread(range: DateRange): Promise<{
  minYear: number;
  maxYear: number;
  cells: CaptureCell[];
}> {
  const events = await readRange(range);
  const buckets = new Map<string, { count: number; memory: number }>();
  let minYear = Infinity;
  let maxYear = -Infinity;

  for (const e of events) {
    if (e.type !== 'slide_served' || !e.capturedAt) continue;
    const d = new Date(e.capturedAt);
    if (Number.isNaN(d.getTime())) continue;
    const year = d.getFullYear();
    const doy = dayOfYear(d);
    const key = `${year}:${doy}`;
    const cur = buckets.get(key) ?? { count: 0, memory: 0 };
    cur.count++;
    if (e.isMemory) cur.memory++;
    buckets.set(key, cur);
    if (year < minYear) minYear = year;
    if (year > maxYear) maxYear = year;
  }

  const cells: CaptureCell[] = [];
  for (const [key, v] of buckets) {
    const [y, d] = key.split(':').map(Number);
    cells.push({ year: y, doy: d, count: v.count, memoryCount: v.memory });
  }

  return {
    minYear: minYear === Infinity ? new Date().getFullYear() : minYear,
    maxYear: maxYear === -Infinity ? new Date().getFullYear() : maxYear,
    cells,
  };
}

export function dayOfYear(d: Date): number {
  // Compute from local Y/M/D via UTC so every day is exactly 24h. Subtracting
  // raw timestamps (d.getTime() - startOfYear) is off by one in DST timezones
  // (deploy TZ is America/Edmonton) for dates after spring-forward, because
  // that day is only 23h long.
  return (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 0)) / 86_400_000;
}

export type DailyByOwner = {
  owners: Array<{ ownerId: string; ownerName: string; total: number }>;
  days: Array<{ date: string; byOwner: Record<string, number> }>;
};

export async function getDailyByOwner(range: DateRange): Promise<DailyByOwner> {
  const ownerNames = new Map<string, string>();
  const ownerTotals = new Map<string, number>();
  const days: DailyByOwner['days'] = [];

  for (const day of daysInRange(range)) {
    const events = await readDay(day);
    const byOwner: Record<string, number> = {};
    for (const e of events) {
      if (e.type !== 'slide_served') continue;
      ownerNames.set(e.ownerId, e.ownerName);
      ownerTotals.set(e.ownerId, (ownerTotals.get(e.ownerId) ?? 0) + 1);
      byOwner[e.ownerId] = (byOwner[e.ownerId] ?? 0) + 1;
    }
    days.push({ date: day, byOwner });
  }

  const owners = [...ownerTotals.entries()]
    .map(([id, total]) => ({ ownerId: id, ownerName: ownerNames.get(id) || 'Unknown', total }))
    .sort((a, b) => b.total - a.total);

  return { owners, days };
}

export type CastEventRow = {
  ts: string;
  kind: string;
  detail?: string;
};

export type WeatherPoint = {
  ts: string;
  temperature: number;
  aqi: number;
  humidity: number;
  icon: string;
  windSpeed: number;
};

export async function getWeatherSeries(range: DateRange, maxPoints = 200): Promise<WeatherPoint[]> {
  const events = await readRange(range);
  const samples: WeatherPoint[] = [];
  for (const e of events) {
    if (e.type === 'weather_sample') {
      samples.push({
        ts: e.ts,
        temperature: e.temperature,
        aqi: e.aqi,
        humidity: e.humidity,
        icon: e.icon,
        windSpeed: e.windSpeed,
      });
    }
  }
  return downsample(samples, maxPoints);
}

/**
 * Evenly pick at most `maxPoints` samples from `samples`. Returns exactly
 * `maxPoints` items when downsampling is needed, always including the first
 * and last sample with no duplicates — the old logic emitted `maxPoints + 1`
 * points and could repeat the final sample.
 */
export function downsample<T>(samples: T[], maxPoints: number): T[] {
  if (maxPoints <= 0) return [];
  if (samples.length <= maxPoints) return samples;
  if (maxPoints === 1) return [samples[samples.length - 1]];
  const out: T[] = [];
  const stride = (samples.length - 1) / (maxPoints - 1);
  for (let i = 0; i < maxPoints; i++) out.push(samples[Math.round(i * stride)]);
  return out;
}

export type WeatherDailyRow = {
  date: string;
  tempMin: number | null;
  tempMax: number | null;
  tempAvg: number | null;
  aqiAvg: number | null;
  aqiMax: number | null;
  dominantIcon: string | null;
  samples: number;
};

export async function getWeatherDaily(range: DateRange): Promise<WeatherDailyRow[]> {
  const out: WeatherDailyRow[] = [];
  for (const day of daysInRange(range)) {
    const events = await readDay(day);
    let tempMin = Infinity;
    let tempMax = -Infinity;
    let tempSum = 0;
    let aqiSum = 0;
    let aqiMax = -Infinity;
    let count = 0;
    const iconCounts = new Map<string, number>();
    for (const e of events) {
      if (e.type !== 'weather_sample') continue;
      count++;
      tempMin = Math.min(tempMin, e.temperature);
      tempMax = Math.max(tempMax, e.temperature);
      tempSum += e.temperature;
      aqiSum += e.aqi;
      aqiMax = Math.max(aqiMax, e.aqi);
      iconCounts.set(e.icon, (iconCounts.get(e.icon) ?? 0) + 1);
    }
    let dominantIcon: string | null = null;
    let best = 0;
    for (const [icon, n] of iconCounts) {
      if (n > best) {
        best = n;
        dominantIcon = icon;
      }
    }
    out.push({
      date: day,
      tempMin: count > 0 ? tempMin : null,
      tempMax: count > 0 ? tempMax : null,
      tempAvg: count > 0 ? tempSum / count : null,
      aqiAvg: count > 0 ? aqiSum / count : null,
      aqiMax: count > 0 ? aqiMax : null,
      dominantIcon,
      samples: count,
    });
  }
  return out;
}

export async function getCastEvents(range: DateRange, limit = 200): Promise<CastEventRow[]> {
  const events = await readRange(range);
  const out: CastEventRow[] = [];
  for (const e of events) {
    if (e.type === 'cast_event') out.push({ ts: e.ts, kind: e.kind, detail: e.detail });
  }
  return out.slice(-limit).reverse();
}
