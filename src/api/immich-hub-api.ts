import axios from 'axios';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { api } from './immich-api';

interface Asset {
  id: string;

  [key: string]: any;
}

export const immichHubApi = Fastify();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Health check endpoint for Docker
immichHubApi.get('/health', async (_, res) => {
  return res.send({ status: 'ok' });
});

// Serve static files from the public directory
immichHubApi.register(fastifyStatic, {
  root: path.resolve(__dirname, '../../dist'),
  prefix: '/',
});

// Geocoding rate limiting
let lastGeoRequestTime = 0;
const GEO_REQUEST_INTERVAL = 500; // 500ms between requests

// Number of images to fetch in batch
const BATCH_SIZE = 5;

// Add type definitions for request parameters
interface RequestParams {
  id: string;

  [key: string]: string;
}

// Fetches random images
const fetchRandomImages = async (size = BATCH_SIZE): Promise<Asset[]> => {
  try {
    const searchResult = await api.post('/search/random', {
      isVisible: true,
      size,
      type: 'IMAGE',
      takenAfter: '2017-01-01',
    });
    return searchResult.data;
  } catch (error) {
    console.error('Error fetching random images:', error);
    return [];
  }
};

const getFormatedLocation = (location: { address: any; display_name: string }) => {
  if (!location) return '';

  let formatted = '';
  const address = location.address;

  if (address) {
    const parts = [];

    if (address.amenity) {
      parts.push(address.amenity);

      if (address.village) {
        parts.push(address.village);
      } else if (address.town) {
        parts.push(address.town);
      } else if (address.city) {
        parts.push(address.city);
      }

      if (address.country) {
        parts.push(address.country);
      }
    } else if (address.tourism) {
      parts.push(address.tourism);

      if (address.country) {
        parts.push(address.country);
      }
    } else if (address.locality) {
      parts.push(address.locality);

      if (address.country) {
        parts.push(address.country);
      }
    } else {
      if (address.road) {
        parts.push(address.road);
      }

      if (address.neighbourhood) {
        parts.push(address.neighbourhood);
      } else if (address.village) {
        parts.push(address.village);
      } else if (address.town) {
        parts.push(address.town);
      } else if (address.city) {
        parts.push(address.city);
      }

      if (address.country) {
        parts.push(address.country);
      }
    }

    formatted = parts.join(', ');
  } else {
    // Fallback to display_name if address details not available
    formatted = location.display_name || '';
  }

  return formatted;
};

// Get location data from coordinates with rate limiting
const reverseGeocode = async (lat: number, lon: number) => {
  try {
    // Rate limiting
    const now = Date.now();
    const timeToWait = Math.max(0, lastGeoRequestTime + GEO_REQUEST_INTERVAL - now);

    if (timeToWait > 0) {
      await new Promise((resolve) => setTimeout(resolve, timeToWait));
    }

    // Make the request
    const response = await axios.get(`https://nominatim.openstreetmap.org/reverse`, {
      params: {
        format: 'jsonv2',
        addressdetails: 1,
        lat,
        lon,
        'accept-language': 'en',
      },
      headers: {
        accept: '*/*',
        'accept-language': 'en-CA,en;q=0.9,ru;q=0.8,en-US;q=0.7,ca;q=0.6',
        referer: 'https://nominatim.openstreetmap.org/ui/reverse.html?lat=46.300086111111&lon=35.306272222222&zoom=18',
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
      },
    });

    // Update last request time
    lastGeoRequestTime = Date.now();

    const location = response.data;

    const formatedLocation = getFormatedLocation(location);

    return { ...location, formatedLocation };
  } catch (error) {
    console.error('Error with reverse geocoding:', error);
    return null;
  }
};

// Fetch detailed info for an asset
const fetchAssetInfo = async (id: string) => {
  try {
    // Fetch asset info
    const assetResp = await api.get(`/assets/${id}`);
    const assetData = assetResp.data;
    let location = null;

    // Get location data if coordinates exist
    if (assetData.exifInfo?.latitude && assetData.exifInfo?.longitude) {
      location = await reverseGeocode(assetData.exifInfo.latitude, assetData.exifInfo.longitude);
    }

    return { asset: assetData, location };
  } catch (error) {
    console.error(`Error fetching asset info for ${id}:`, error);
    return { asset: null, location: null };
  }
};

// Routes
immichHubApi.get('/api/images', async (_, res) => {
  const assets = await fetchRandomImages();
  return res.send(assets);
});

immichHubApi.get('/api/images/:id', async (request, res) => {
  try {
    const { id } = request.params as RequestParams;
    const assetData = await api.get(`/assets/${id}/thumbnail?size=preview`, {
      responseType: 'arraybuffer',
    });
    const buffer = Buffer.from(assetData.data);

    res
      .header('Content-Type', 'image/webp') // May need to adapt based on the asset type
      .header('Content-Length', buffer.length)
      .send(buffer);
  } catch (error) {
    console.error(`Error fetching image ${request.params}:`, error);
    res.status(500).send({ error: 'Failed to fetch image' });
  }
});

immichHubApi.get('/api/images/:id/info', async (request, res) => {
  try {
    const { id } = request.params as RequestParams;
    const assetInfo = await fetchAssetInfo(id);
    res.send(assetInfo);
  } catch (error) {
    console.error(`Error fetching asset info for ${request.params}:`, error);
    res.status(500).send({ error: 'Failed to fetch asset info' });
  }
});

immichHubApi.get('/api/config', async (request, res) => {
  const config = {
    slideInterval: process.env.SLIDE_INTERVAL,
  };
  res.send(config);
});
