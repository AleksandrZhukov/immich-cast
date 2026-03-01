<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import axios from 'redaxios';
  import type { WeatherResponse } from './types';

  const { refreshInterval } = $props<{ refreshInterval: number }>();

  let weather = $state<WeatherResponse | null>(null);
  let intervalId: ReturnType<typeof setInterval>;

  async function fetchWeather() {
    try {
      const response = await axios.get<WeatherResponse>('/api/weather');
      weather = response.data;
    } catch (err) {
      console.log('Error fetching weather:', err);
    }
  }

  onMount(() => {
    fetchWeather();
    intervalId = setInterval(fetchWeather, refreshInterval);
  });

  onDestroy(() => {
    clearInterval(intervalId);
  });

  onDestroy(() => {
    clearInterval(intervalId);
  });

  const getAirQualityColor = (aqi: number) => {
    if (aqi <= 50) {
      return 'text-white';
    } else if (aqi <= 100) {
      return 'text-yellow-400';
    } else {
      return 'text-red-400';
    }
  };

  const getWindSpeedColor = (speed: number) => {
    if (speed <= 15) {
      return 'text-white';
    } else if (speed <= 20) {
      return 'text-yellow-400';
    } else if (speed <= 25) {
      return 'text-orange-400';
    } else if (speed <= 30) {
      return 'text-orange-500';
    } else if (speed <= 40) {
      return 'text-red-400';
    } else {
      return 'text-red-600';
    }
  };
</script>

{#if weather}
  <div class="text-white font-light text-center flex flex-col items-center">
    <div class="text-5xl flex items-center">
      <img class="size-16 -m-0.5 drop-shadow-sm drop-shadow-black/25" src={weather.iconUrl} alt={weather.icon} />
      <div>{weather.temperature}&deg;C</div>
    </div>
    <div class="flex items-center gap-2">
      <div>
        <span class={`text-2xl ${getAirQualityColor(weather.aqi)}`}>{weather.aqi}</span>
        <span class="text-sm">AQI</span>
      </div>
      <div class="flex items-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="size-4.5 drop-shadow-sm drop-shadow-black/25 origin-[8px_8px]"
          viewBox="0 0 16 16"
          style={`transform: rotate(${weather.wind.direction}deg)`}
        >
          <path
            d="M13.2 1.25c.44-.19.66-.28.8-.24.11.04.2.13.24.24.04.13-.05.35-.25.78L8.55 14.32c-.18.39-.26.58-.38.64a.38.38 0 0 1-.34 0c-.12-.06-.2-.25-.38-.64L2.01 2.03c-.2-.43-.3-.65-.25-.78A.4.4 0 0 1 2 1.01c.14-.04.36.05.8.24l4.96 2.16.18.07h.12c.05 0 .1-.03.18-.07l4.97-2.16z"
            fill="#fff"
            stroke="#fff"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <span class={`text-2xl ${getWindSpeedColor(weather.wind.speed)}`}>
          {weather.wind.speed}
          <span class="text-sm">km/h</span>
        </span>
      </div>
    </div>
  </div>
{/if}
