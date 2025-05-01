import { type FastifyInstance, type FastifyRequest } from 'fastify';
import { fetchRandomImages, getAssetBuffer } from '../services/immich';
import { reverseGeocode } from '../services/geocoding';
import { fetchSlides } from '../services/slides';
import { getCurrentWeather } from '../services/weather';
import { env } from '../config/env';

export const registerRoutes = (server: FastifyInstance) => {
  server.register(
    (instance, _, next) => {
      instance.get('/images', async (_, res) => {
        const assets = await fetchRandomImages();
        return res.send(assets);
      });

      instance.get('/slides', async (_, res) => {
        const slides = await fetchSlides();
        return res.send(slides);
      });

      instance.get('/images/:id', async (request: FastifyRequest<{ Params: { id: string } }>, res) => {
        try {
          const { id } = request.params;
          const buffer = await getAssetBuffer(id);

          res.header('Content-Type', 'image/webp').header('Content-Length', buffer.length).send(buffer);
        } catch (error) {
          console.error(`Error fetching image ${request.params}:`, error);
          res.status(500).send({ error: 'Failed to fetch image' });
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
            console.error(`Error fetching asset info for ${request.params}:`, error);
            res.status(500).send({ error: 'Failed to fetch asset info' });
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

      next();
    },
    {
      prefix: '/api',
    },
  );
};
