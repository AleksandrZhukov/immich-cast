<script>
  import { onMount, onDestroy } from 'svelte';
  import dayjs from 'dayjs';

  let time = new Date();

  const updateTime = () => {
    time = new Date();
  };

  let interval;

  onMount(() => {
    interval = setInterval(updateTime, 1000);
  });

  onDestroy(() => {
    clearInterval(interval);
  });
</script>

<div
  class="absolute top-2 left-2 z-10 bg-black/35 text-white backdrop-blur-[2px] px-3 py-1 rounded-md font-light text-center"
>
  <div class="text-2xl">{dayjs(time).format('DD MMM YYYY')}</div>
  <div class="text-8xl">{dayjs(time).format('HH:mm')}</div>
</div>
