import axios from 'axios';

if (!process.env.IMMICH_API_URL || !process.env.IMMICH_HUB_API_KEY) {
  throw new Error('Missing IMMICH_API_URL or IMMICH_HUB_API_KEY environment variable');
}

export const api = axios.create({
  baseURL: process.env.IMMICH_API_URL,
  headers: {
    Accept: 'application/json',
    'x-api-key': process.env.IMMICH_HUB_API_KEY,
  },
});
