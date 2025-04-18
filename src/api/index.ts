import 'dotenv/config';
import { api } from './immich-api';
import { immichHubApi } from './immich-hub-api';
import { startMonitoring } from './googleCastMonitoring';

// Start the server
const start = async () => {
  try {
    // Validate connection to Immich
    await api.post('/auth/validateToken');

    // Use PORT from environment variable or default to 2284
    const port = process.env.PORT || 2284;

    try {
      await immichHubApi.listen({ port: parseInt(port.toString()), host: '0.0.0.0' });
      startMonitoring();
      console.log(`Server running on port ${port}`);
    } catch (err) {
      console.error(`Failed to start server on port ${port}. The port may already be in use.`);
      console.error(`Please stop any other processes using port ${port} and try again.`);
      immichHubApi.log.error(err);
      process.exit(1);
    }
  } catch (err) {
    console.error('Server error:', err);
    immichHubApi.log.error(err);
    process.exit(1);
  }
};

start();
