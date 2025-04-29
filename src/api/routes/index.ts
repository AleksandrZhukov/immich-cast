import { type FastifyInstance, type FastifyRequest } from 'fastify';
import { fetchRandomImages, immichApi } from '../services/immich';
import { reverseGeocode } from '../services/geocoding';
import { fetchSlides } from '../services/slides';
import { env } from '../config/env';

export const registerRoutes = (server: FastifyInstance) => {
  server.get('/api/images', async (_, res) => {
    const assets = await fetchRandomImages();
    return res.send(assets);
  });

  server.get('/api/slides', async (_, res) => {
    const slides = await fetchSlides();
    return res.send(slides);
  });

  server.get('/api/images/:id', async (request, res) => {
    try {
      const { id } = request.params as { id: string };
      const assetData = await immichApi.get(`/assets/${id}/thumbnail?size=preview`, {
        responseType: 'arraybuffer',
      });
      const buffer = Buffer.from(assetData.data);

      res.header('Content-Type', 'image/webp').header('Content-Length', buffer.length).send(buffer);
    } catch (error) {
      console.error(`Error fetching image ${request.params}:`, error);
      res.status(500).send({ error: 'Failed to fetch image' });
    }
  });

  server.get(
    '/api/location',
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

  server.get('/api/config', async (_, res) => {
    const config = {
      slideInterval: env.client.slideInterval,
    };
    res.send(config);
  });
};
