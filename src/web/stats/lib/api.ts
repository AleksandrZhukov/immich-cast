import axios from 'redaxios';

export type Summary = {
  totalServed: number;
  memoryServed: number;
  uniqueImages: number;
  uniqueOwners: number;
  rangeDays: number;
  perOwner: Array<{ ownerId: string; ownerName: string; count: number }>;
  perCaptureYear: Array<{ year: number; count: number }>;
};

export type DailyPoint = { date: string; served: number; memory: number };

export type CaptureCell = { year: number; doy: number; count: number };

export type CaptureSpread = { minYear: number; maxYear: number; cells: CaptureCell[] };

export type DailyByOwner = {
  owners: Array<{ ownerId: string; ownerName: string; total: number }>;
  days: Array<{ date: string; byOwner: Record<string, number> }>;
};

export type CastEventRow = { ts: string; kind: string; detail?: string };

export type MemoryDeck = {
  total: number;
  shown: number;
  remaining: number;
  shuffles: number;
  byYear: Record<string, number>;
};

function rangeQuery(range: { from: Date; to: Date }) {
  return { from: range.from.toISOString(), to: range.to.toISOString() };
}

export const api = {
  summary: (range: { from: Date; to: Date }) =>
    axios.get<Summary>('/api/stats/summary', { params: rangeQuery(range) }).then((r) => r.data),
  daily: (range: { from: Date; to: Date }) =>
    axios.get<DailyPoint[]>('/api/stats/daily', { params: rangeQuery(range) }).then((r) => r.data),
  dailyByOwner: (range: { from: Date; to: Date }) =>
    axios.get<DailyByOwner>('/api/stats/daily-by-owner', { params: rangeQuery(range) }).then((r) => r.data),
  captureSpread: (range: { from: Date; to: Date }) =>
    axios.get<CaptureSpread>('/api/stats/capture-spread', { params: rangeQuery(range) }).then((r) => r.data),
  castEvents: (range: { from: Date; to: Date }) =>
    axios.get<CastEventRow[]>('/api/stats/cast-events', { params: rangeQuery(range) }).then((r) => r.data),
  memoryDeck: () => axios.get<MemoryDeck>('/api/stats/memory-deck').then((r) => r.data),
  knownDays: () => axios.get<string[]>('/api/stats/known-days').then((r) => r.data),
};
