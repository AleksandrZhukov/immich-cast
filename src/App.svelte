<script lang="ts">
  import axios from 'axios'
  import Counter from './lib/Counter.svelte'
  import ImmichImage from './lib/ImmichImage.svelte'


  let resource = <T>(
    fn: () => Promise<T>,
    initialValue?: T
  ) => {
    const _rune = $state<{ value: T | undefined }>({
      value: initialValue
    });

    const fetchData = async () => {
      try {
        const data = await fn();
        _rune.value = data;
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    // Fetch data initially
    fetchData();

    return { _rune, fetchData };
  };

  // Create the resource for images
  const { _rune: images, fetchData } = resource(
    () => axios.get('/api/images').then(data => data.data.map(i => i.id))
  );

  // Set up polling every 5 seconds
  $effect(() => {
    const interval = setInterval(fetchData, 15000);

    // Clean up the interval when the component is destroyed
    return () => clearInterval(interval);
  });


</script>

<main>
  {#each images.value || [] as image}
    <ImmichImage image={image}/>
  {/each}
  <!--{JSON.stringify(images.value)}-->
  <!--{#if isLoading}-->
  <!--  <p>Loading...</p>-->
  <!--{:else if error}-->
  <!--  <p>Error: {error}</p>-->
  <!--{:else if data.length === 0}-->
  <!--  <p>No images available.</p>-->
  <!--{:else}-->
  <!--  {#each data as image}-->
  <!--    <ImmichImage image={image}/>-->
  <!--  {/each}-->
  <!--{/if}-->
</main>

