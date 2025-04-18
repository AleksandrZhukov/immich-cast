<script lang="ts">
  import ImageSlider from './lib/ImageSlider.svelte';
  import Clock from './lib/Clock.svelte';
  import axios from 'redaxios';

  let config = $state<{ slideInterval: number }>({ slideInterval: 10000 });

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
  <Clock />
  <ImageSlider slideInterval={config.slideInterval} />
</main>
