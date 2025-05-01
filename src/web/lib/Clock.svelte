<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import dayjs from 'dayjs';

  let time = new Date();

  const updateTime = () => {
    time = new Date();
  };

  let interval: ReturnType<typeof setInterval>;

  onMount(() => {
    interval = setInterval(updateTime, 1000);
  });

  onDestroy(() => {
    clearInterval(interval);
  });
</script>

<div class="text-white font-light text-center">
  <div class="text-xl">{dayjs(time).format('DD MMM YYYY')}</div>
  <div class="text-7xl">{dayjs(time).format('HH:mm')}</div>
</div>
