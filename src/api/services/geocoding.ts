import axios from 'axios';

const GEO_REQUEST_INTERVAL = 1000;
const GEO_CACHE_MAX = 1000;

// Nominatim's usage policy requires caching results. Key on lat/lon rounded to
// 4 decimals (~11m) so nearby photos share a lookup. Map insertion order gives
// us a cheap LRU: re-insert on read, evict the oldest on overflow.
const geoCache = new Map<string, string>();

function cacheGet(key: string): string | undefined {
  const value = geoCache.get(key);
  if (value === undefined) return undefined;
  geoCache.delete(key);
  geoCache.set(key, value);
  return value;
}

function cacheSet(key: string, value: string): void {
  geoCache.delete(key);
  geoCache.set(key, value);
  if (geoCache.size > GEO_CACHE_MAX) {
    const oldest = geoCache.keys().next().value;
    if (oldest !== undefined) geoCache.delete(oldest);
  }
}

// Serialize requests through a promise chain and space each one ≥1s apart. The
// old timestamp check raced under concurrent calls — several could read the
// same lastGeoRequestTime and fire together. The chain guarantees ordering.
let geoQueue: Promise<unknown> = Promise.resolve();
let lastRequestEnd = 0;

function enqueueGeoRequest<T>(fn: () => Promise<T>): Promise<T> {
  const result = geoQueue.then(async () => {
    const wait = Math.max(0, lastRequestEnd + GEO_REQUEST_INTERVAL - Date.now());
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    try {
      return await fn();
    } finally {
      lastRequestEnd = Date.now();
    }
  });
  // Keep the chain alive even if this request rejects.
  geoQueue = result.catch(() => {});
  return result;
}

type GeocodeAddress = {
  county: string;
  city: string;
  city_district: string;
  construction: string;
  continent: string;
  country: string;
  country_code: string;
  house_number: string;
  neighbourhood: string;
  postcode: string;
  public_building: string;
  state: string;
  suburb: string;
  amenity?: string;
  village?: string;
  town?: string;
  tourism?: string;
  locality?: string;
  road?: string;
};

type NominatimResponse = {
  address: GeocodeAddress;
  boundingbox: string[];
  class: string;
  display_name: string;
  importance: number;
  lat: string;
  licence: string;
  lon: string;
  osm_id: string;
  osm_type: string;
  place_id: string;
  svg: string;
  type: string;
  extratags: any;
};

export const getFormatedLocation = (location: NominatimResponse) => {
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
      }

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
    }

    formatted = parts.join(', ');
  } else {
    // Fallback to display_name if address details not available
    formatted = location.display_name || '';
  }

  return formatted;
};

export const reverseGeocode = async (lat: number | undefined, lon: number | undefined): Promise<string | null> => {
  if (!lat || !lon) return null;

  const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  const cached = cacheGet(key);
  if (cached !== undefined) return cached;

  try {
    const formatted = await enqueueGeoRequest(async () => {
      const response = await axios.get<NominatimResponse>(`https://nominatim.openstreetmap.org/reverse`, {
        params: {
          format: 'jsonv2',
          addressdetails: 1,
          lat,
          lon,
          'accept-language': 'en',
        },
        headers: {
          'User-Agent': 'ImmichCast/1.0',
        },
      });
      return getFormatedLocation(response.data);
    });

    cacheSet(key, formatted);
    return formatted;
  } catch (error) {
    // Don't cache transient failures so a blip doesn't poison the location.
    console.error('Error with reverse geocoding:', error);
    return null;
  }
};
