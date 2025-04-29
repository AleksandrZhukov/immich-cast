import axios from 'axios';

let lastGeoRequestTime = 0;
const GEO_REQUEST_INTERVAL = 1000;

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

const getFormatedLocation = (location: NominatimResponse) => {
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

  try {
    const now = Date.now();
    const timeToWait = Math.max(0, lastGeoRequestTime + GEO_REQUEST_INTERVAL - now);

    if (timeToWait > 0) {
      await new Promise((resolve) => setTimeout(resolve, timeToWait));
    }

    const response = await axios.get<NominatimResponse>(`https://nominatim.openstreetmap.org/reverse`, {
      params: {
        format: 'jsonv2',
        addressdetails: 1,
        lat,
        lon,
        'accept-language': 'en',
      },
      headers: {
        'User-Agent': 'ImmichHub/1.0',
      },
    });

    lastGeoRequestTime = Date.now();

    return getFormatedLocation(response.data);
  } catch (error) {
    console.error('Error with reverse geocoding:', error);
    return null;
  }
};
