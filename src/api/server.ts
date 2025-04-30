import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './config/env';
import { validateToken } from './services/immich';
import { registerRoutes } from './routes';
import { startMonitoring } from './cast/monitor';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const server = Fastify();

server.register(fastifyStatic, {
  root: path.resolve(__dirname, '../../dist'),
  prefix: '/',
});

registerRoutes(server);

const start = async () => {
  try {
    await validateToken();

    try {
      await server.listen({ port: env.server.port, host: '0.0.0.0' });
      startMonitoring();
      console.log(`Server running on port ${env.server.port}`);
    } catch (err) {
      console.error(`Failed to start server on port ${env.server.port}. The port may already be in use.`);
      console.error(`Please stop any other processes using port ${env.server.port} and try again.`);
      server.log.error(err);
      process.exit(1);
    }
  } catch (err) {
    console.error('Server error:', err);
    server.log.error(err);
    process.exit(1);
  }
};

start();
