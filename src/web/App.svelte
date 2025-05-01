<script lang="ts">
  import ImageSlider from './lib/ImageSlider.svelte';
  import Clock from './lib/Clock.svelte';
  import Weather from './lib/Weather.svelte';
  import axios from 'redaxios';

  let config = $state<{ slideInterval: number; weatherEnabled: boolean; weatherRefreshInterval: number }>({
    slideInterval: 10000,
    weatherEnabled: false,
    weatherRefreshInterval: 60000,
  });

  async function fetchConfig() {
    try {
      const response = await axios.get('/api/config');
      config = { ...config, ...response.data };
    } catch (error) {
      console.error('Failed to fetch config:', error);
    }
  }

  fetchConfig();
</script>

<main>
  <div
    class="absolute top-2 left-2 z-10 flex gap-4 items-center bg-black/35 text-white backdrop-blur-[2px] px-2 py-1 rounded-md text-shadow-md text-shadow-black/15"
  >
    <Clock />
    {#if config.weatherEnabled}
      <Weather refreshInterval={config.weatherRefreshInterval} />
    {/if}
  </div>
  <ImageSlider slideInterval={config.slideInterval} />
</main>
