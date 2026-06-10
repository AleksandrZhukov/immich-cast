import { type FastifyInstance, type FastifyRequest } from 'fastify';
import { getAssetBuffer, archiveAsset } from '../services/immich';
import { reverseGeocode } from '../services/geocoding';
import { fetchSlides, getMemoryDeckStats } from '../services/slides';
import { getCurrentWeather } from '../services/weather';
import { env } from '../config/env';
import { AxiosError } from 'axios';
import {
  getSummary,
  getDaily,
  getDailyByOwner,
  getCaptureSpread,
  getCastEvents,
  getWeatherSeries,
  getWeatherDaily,
  listKnownDays,
} from '../stats/aggregator';

export function parseRange(from?: string, to?: string): { from: Date; to: Date } {
  // Garbage / missing dates fall back to defaults instead of producing
  // Invalid Date (which silently yields an empty range downstream).
  const parse = (s: string | undefined): Date | null => {
    if (!s) return null;
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const toDate = parse(to) ?? new Date();
  const fromDate = parse(from) ?? new Date(toDate.getTime() - 29 * 86_400_000);
  return { from: fromDate, to: toDate };
}

export const registerRoutes = (server: FastifyInstance) => {
  server.register(
    (instance, _, next) => {
      instance.get('/slides', async (_, res) => {
        const slides = await fetchSlides();
        return res.send(slides);
      });

      instance.get('/images/:id', async (request: FastifyRequest<{ Params: { id: string } }>, res) => {
        try {
          const { id } = request.params;
          const buffer = await getAssetBuffer(id);

          // Thumbnails per id are stable, so let the Chromecast (which
          // re-downloads repeats) and any proxy cache them.
          res
            .header('Content-Type', 'image/webp')
            .header('Content-Length', buffer.length)
            .header('Cache-Control', 'public, max-age=86400, immutable')
            .send(buffer);
        } catch (error) {
          console.error(`Error fetching image ${request.params.id}:`, error);
          res.status(500).send({ error: 'Failed to fetch image' });
        }
      });

      instance.post('/images/:id/archive', async (request: FastifyRequest<{ Params: { id: string } }>, res) => {
        try {
          const { id } = request.params;
          const asset = await archiveAsset(id);
          res.send(asset);
        } catch (error) {
          if (error instanceof AxiosError) {
            console.error(`Error archiving image ${request.params.id}:`, error.response?.data);
            return res.status(400).send({ error: error.response?.data });
          }
          res.status(500).send({ error: 'Unknown error' });
        }
      });

      instance.get(
        '/location',
        async (request: FastifyRequest<{ Querystring: { longitude: number; latitude: number } }>, res) => {
          try {
            const { longitude, latitude } = request.query;
            const location = await reverseGeocode(latitude, longitude);
            res.send(location);
          } catch (error) {
            console.error(`Error reverse geocoding (${request.query.latitude}, ${request.query.longitude}):`, error);
            res.status(500).send({ error: 'Failed to reverse geocode' });
          }
        },
      );

      instance.get('/config', async (_, res) => {
        const config = env.client;
        res.send(config);
      });

      instance.get('/weather', async (_, res) => {
        const weather = await getCurrentWeather();
        res.send(weather);
      });

      instance.get(
        '/stats/summary',
        async (request: FastifyRequest<{ Querystring: { from?: string; to?: string } }>, res) => {
          const range = parseRange(request.query.from, request.query.to);
          res.send(await getSummary(range));
        },
      );

      instance.get(
        '/stats/daily',
        async (request: FastifyRequest<{ Querystring: { from?: string; to?: string } }>, res) => {
          const range = parseRange(request.query.from, request.query.to);
          res.send(await getDaily(range));
        },
      );

      instance.get(
        '/stats/daily-by-owner',
        async (request: FastifyRequest<{ Querystring: { from?: string; to?: string } }>, res) => {
          const range = parseRange(request.query.from, request.query.to);
          res.send(await getDailyByOwner(range));
        },
      );

      instance.get(
        '/stats/capture-spread',
        async (request: FastifyRequest<{ Querystring: { from?: string; to?: string } }>, res) => {
          const range = parseRange(request.query.from, request.query.to);
          res.send(await getCaptureSpread(range));
        },
      );

      instance.get(
        '/stats/cast-events',
        async (request: FastifyRequest<{ Querystring: { from?: string; to?: string; limit?: string } }>, res) => {
          const range = parseRange(request.query.from, request.query.to);
          const limit = request.query.limit ? Number(request.query.limit) : 200;
          res.send(await getCastEvents(range, limit));
        },
      );

      instance.get(
        '/stats/weather',
        async (request: FastifyRequest<{ Querystring: { from?: string; to?: string; points?: string } }>, res) => {
          const range = parseRange(request.query.from, request.query.to);
          const points = request.query.points ? Number(request.query.points) : 200;
          res.send(await getWeatherSeries(range, points));
        },
      );

      instance.get(
        '/stats/weather-daily',
        async (request: FastifyRequest<{ Querystring: { from?: string; to?: string } }>, res) => {
          const range = parseRange(request.query.from, request.query.to);
          res.send(await getWeatherDaily(range));
        },
      );

      instance.get('/stats/memory-deck', async (_, res) => {
        res.send(getMemoryDeckStats());
      });

      instance.get('/stats/known-days', async (_, res) => {
        res.send(await listKnownDays());
      });

      next();
    },
    {
      prefix: '/api',
    },
  );
};
