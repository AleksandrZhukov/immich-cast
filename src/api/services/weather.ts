import axios from 'axios';
import { env } from '../config/env';
import { recordWeatherSample } from '../stats/recorder';

const CITY_ID = env.weather.cityId;
const WEATHER_TTL_MS = 60_000;

type WeatherResponse = {
  current: {
    aqi: number;
    humidity: number;
    icon: string;
    pressure: number;
    temperature: number;
    wind: {
      speed: number;
      direction: number;
    };
  };
};

function getWeatherIconUrl(icon: string) {
  return `https://www.iqair.com/assets/svg/weather/ic-weather-${icon}.svg`;
}

type CurrentWeather = {
  aqi: number;
  humidity: number;
  icon: string;
  iconUrl: string;
  pressure: number;
  temperature: number;
  wind: { speed: number; direction: number };
};

async function fetchWeather(): Promise<CurrentWeather> {
  const res = await axios.get<WeatherResponse>(`https://website-api.airvisual.com/v1/cities/${CITY_ID}`, {
    params: {
      units: {
        temperature: 'celsius',
        distance: 'kilometer',
        pressure: 'millibar',
        system: 'metric',
      },
      AQI: 'US',
      language: 'en-CA',
    },
  });

  const weather = res.data.current;

  return {
    aqi: weather.aqi,
    humidity: weather.humidity,
    icon: weather.icon,
    iconUrl: getWeatherIconUrl(weather.icon),
    pressure: weather.pressure,
    temperature: weather.temperature,
    wind: {
      speed: weather.wind.speed,
      direction: weather.wind.direction,
    },
  };
}

let cached: { value: CurrentWeather; expires: number } | null = null;
let inFlight: Promise<CurrentWeather> | null = null;

// The frontend polls /api/weather per device; each request used to hit IQAir
// AND record a stats sample. Cache the upstream response for ~60s (de-duping
// concurrent and rapid polls) and record exactly one sample per real fetch.
export const getCurrentWeather = async (): Promise<CurrentWeather | null> => {
  if (!CITY_ID) return null;

  const now = Date.now();
  if (cached && cached.expires > now) return cached.value;
  if (inFlight) return inFlight;

  inFlight = fetchWeather()
    .then((value) => {
      cached = { value, expires: Date.now() + WEATHER_TTL_MS };
      recordWeatherSample({
        temperature: value.temperature,
        aqi: value.aqi,
        humidity: value.humidity,
        icon: value.icon,
        windSpeed: value.wind.speed,
      });
      return value;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
};
