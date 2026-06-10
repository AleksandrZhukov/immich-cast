import 'dotenv/config';
import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const hourSchema = z.coerce.number().int().min(0).max(23);

export function parseOwnersApiKeys(raw: string | undefined): Record<string, string> {
  const map: Record<string, string> = {};
  if (!raw) return map;
  for (const entry of raw.split(',')) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const [uuid, key] = trimmed.split('=').map((s) => s.trim());
    if (!uuid || !key) {
      throw new Error(`Malformed IMMICH_OWNERS_API_KEYS entry: "${entry}"`);
    }
    map[uuid] = key;
  }
  return map;
}

const ownersApiKeys = z
  .string()
  .optional()
  .transform((val, ctx) => {
    try {
      return parseOwnersApiKeys(val);
    } catch (e) {
      ctx.addIssue({ code: 'custom', message: e instanceof Error ? e.message : 'Malformed IMMICH_OWNERS_API_KEYS' });
      return z.NEVER;
    }
  });

const raw = createEnv({
  server: {
    IMMICH_API_URL: z.url(),
    IMMICH_API_KEY: z.string().min(1),
    IMMICH_OWNERS_API_KEYS: ownersApiKeys,
    CHROMECAST_IP: z.ipv4(),
    CAST_URL: z.url(),
    START_HOUR: hourSchema,
    END_HOUR: hourSchema,
    PORT: z.coerce.number().int().positive().default(2284),
    SLIDE_INTERVAL: z.coerce.number().int().positive().default(30000),
    WEATHER_ENABLED: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
    WEATHER_REFRESH_INTERVAL: z.coerce.number().int().positive().default(60000),
    IQAIR_CITY_ID: z.string().optional(),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});

if (raw.END_HOUR <= raw.START_HOUR) {
  throw new Error(`Invalid hours: END_HOUR (${raw.END_HOUR}) must be greater than START_HOUR (${raw.START_HOUR})`);
}

export const env = {
  immich: {
    apiUrl: raw.IMMICH_API_URL,
    apiKey: raw.IMMICH_API_KEY,
    ownersApiKeys: raw.IMMICH_OWNERS_API_KEYS,
  },
  cast: {
    ip: raw.CHROMECAST_IP,
    url: raw.CAST_URL,
    appId: '5CB45E5A', // Default Chromecast app ID
    startHour: raw.START_HOUR,
    endHour: raw.END_HOUR,
  },
  weather: {
    cityId: raw.IQAIR_CITY_ID,
  },
  server: {
    port: raw.PORT,
  },
  client: {
    slideInterval: raw.SLIDE_INTERVAL,
    weatherEnabled: raw.WEATHER_ENABLED,
    weatherRefreshInterval: raw.WEATHER_REFRESH_INTERVAL,
  },
};
