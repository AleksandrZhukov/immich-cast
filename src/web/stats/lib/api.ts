import axios from 'redaxios';
import type {
  Summary,
  DailyPoint,
  CaptureCell,
  CaptureSpread,
  DailyByOwner,
  CastEventRow,
  WeatherPoint,
  WeatherDailyRow,
  MemoryDeckStats as MemoryDeck,
} from '../../../types';

export type {
  Summary,
  DailyPoint,
  CaptureCell,
  CaptureSpread,
  DailyByOwner,
  CastEventRow,
  WeatherPoint,
  WeatherDailyRow,
  MemoryDeck,
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
  weather: (range: { from: Date; to: Date }, points = 200) =>
    axios.get<WeatherPoint[]>('/api/stats/weather', { params: { ...rangeQuery(range), points } }).then((r) => r.data),
  weatherDaily: (range: { from: Date; to: Date }) =>
    axios.get<WeatherDailyRow[]>('/api/stats/weather-daily', { params: rangeQuery(range) }).then((r) => r.data),
};
