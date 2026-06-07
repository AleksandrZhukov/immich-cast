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

export type CaptureCell = { year: number; doy: number; count: number };

export async function getCaptureSpread(range: DateRange): Promise<{
  minYear: number;
  maxYear: number;
  cells: CaptureCell[];
}> {
  const events = await readRange(range);
  const buckets = new Map<string, number>();
  let minYear = Infinity;
  let maxYear = -Infinity;

  for (const e of events) {
    if (e.type !== 'slide_served' || !e.capturedAt) continue;
    const d = new Date(e.capturedAt);
    if (Number.isNaN(d.getTime())) continue;
    const year = d.getFullYear();
    const doy = dayOfYear(d);
    const key = `${year}:${doy}`;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
    if (year < minYear) minYear = year;
    if (year > maxYear) maxYear = year;
  }

  const cells: CaptureCell[] = [];
  for (const [key, count] of buckets) {
    const [y, d] = key.split(':').map(Number);
    cells.push({ year: y, doy: d, count });
  }

  return {
    minYear: minYear === Infinity ? new Date().getFullYear() : minYear,
    maxYear: maxYear === -Infinity ? new Date().getFullYear() : maxYear,
    cells,
  };
}

function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  return Math.floor(diff / 86_400_000);
}

export type CastEventRow = {
  ts: string;
  kind: string;
  detail?: string;
};

export async function getCastEvents(range: DateRange, limit = 200): Promise<CastEventRow[]> {
  const events = await readRange(range);
  const out: CastEventRow[] = [];
  for (const e of events) {
    if (e.type === 'cast_event') out.push({ ts: e.ts, kind: e.kind, detail: e.detail });
  }
  return out.slice(-limit).reverse();
}
