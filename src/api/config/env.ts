import 'dotenv/config';

const requiredEnvVars = {
  IMMICH_API_URL: process.env.IMMICH_API_URL,
  IMMICH_HUB_API_KEY: process.env.IMMICH_HUB_API_KEY,
  CHROMECAST_IP: process.env.CHROMECAST_IP,
  CAST_URL: process.env.CAST_URL,
  START_HOUR: process.env.START_HOUR,
  END_HOUR: process.env.END_HOUR,
};

const missingVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

const startHour = Number(process.env.START_HOUR);
const endHour = Number(process.env.END_HOUR);

if (startHour < 0 || endHour > 23 || endHour < startHour) {
  throw new Error('Invalid START_HOUR or END_HOUR environment variable');
}

export const env = {
  immich: {
    apiUrl: process.env.IMMICH_API_URL!,
    apiKey: process.env.IMMICH_HUB_API_KEY!,
  },
  cast: {
    ip: process.env.CHROMECAST_IP!,
    url: process.env.CAST_URL!,
    appId: '5CB45E5A', // Default Chromecast app ID
    startHour,
    endHour,
  },
  server: {
    port: Number(process.env.PORT) || 2284,
  },
  client: {
    slideInterval: Number(process.env.SLIDE_INTERVAL) || 30000,
  },
};
