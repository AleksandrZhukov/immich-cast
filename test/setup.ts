// Preloaded by bun test (see bunfig.toml). Provides safe defaults for the
// required env vars so importing modules that load src/api/config/env.ts does
// not throw during tests. Real values (from .env) take precedence if present.
const defaults: Record<string, string> = {
  IMMICH_API_URL: 'http://immich.test',
  IMMICH_API_KEY: 'test-key',
  CHROMECAST_IP: '127.0.0.1',
  CAST_URL: 'http://cast.test',
  START_HOUR: '8',
  END_HOUR: '22',
};

for (const [key, value] of Object.entries(defaults)) {
  if (!process.env[key]) process.env[key] = value;
}
