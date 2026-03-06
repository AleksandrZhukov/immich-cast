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
  return `https://www.iqair.com/assets/svg/weather/ic-weather-${icon}.svg`;
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
