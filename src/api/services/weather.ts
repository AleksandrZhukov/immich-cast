import axios from 'axios';
import { env } from '../config/env';

const CITY_ID = env.weather.cityId;

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
  const iconMap = {
    'clear-sky': 'ic-w-01-clear-sky',
    'new-clouds': 'ic-w-02-new-clouds',
    'scattered-showers': 'ic-w-03-scattered-showers',
    'scattered-clouds': 'ic-w-04-scattered-clouds',
    cloudy: 'ic-w-05-cloudy',
    rain: 'ic-w-06-rain',
    thunderstorms: 'ic-w-07-thunderstorms',
    snow: 'ic-w-08-snow',
    mist: 'ic-w-09-mist',
    'night-clear-sky': 'ic-w-10-night-clear-sky',
    'night-few-clouds': 'ic-w-11-night-few-clouds',
    'night-rain': 'ic-w-12-night-rain',
  } as Record<string, string>;

  const iconName = iconMap[icon] || iconMap['clear-sky'];
  return `https://www.iqair.com/dl/web/weather/${iconName}-full.svg`;
}

export const getCurrentWeather = async () => {
  if (!CITY_ID) return null;

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
};
