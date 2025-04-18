<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import axios from 'redaxios';
  import SlideItem from './SlideItem.svelte';

  const { slideInterval = 10000 } = $props();
  const LOAD_THRESHOLD = 2;
  const MAX_IMAGES = 15;

  let images = $state<string[]>([]);
  let currentIndex = $state(0);
  let isLoading = $state(true);
  let isTransitioning = $state(false);
  let isFetchingMore = $state(false);

  let touchStartX = $state(0);
  let touchEndX = $state(0);
  let isDragging = $state(false);
  let dragOffset = $state(0);

  let intervalId: number;
  let mounted = false;

  async function fetchImages(append = false) {
    if (isFetchingMore) return;

    try {
      isFetchingMore = true;
      const response = await axios.get('/api/images');

      if (response.data && response.data.length > 0) {
        const newImageIds = response.data.map((image: any) => image.id as string);

        if (append) {
          const uniqueNewIds = newImageIds.filter((id: string) => !images.includes(id));
          if (uniqueNewIds.length > 0) {
            const combined = [...images, ...uniqueNewIds];
            images = combined.slice(-MAX_IMAGES);

            const removedCount = combined.length - images.length;
            currentIndex = Math.max(0, currentIndex - removedCount);
          }
        } else {
          images = [...newImageIds];
        }
      }
    } catch (error) {
      console.error('Error fetching images:', error);
    } finally {
      isFetchingMore = false;
      if (!append) {
        isLoading = false;
      }
    }
  }

  function nextSlide(isAuto = false) {
    if (images.length === 0 || isTransitioning) return;

    isTransitioning = true;

    currentIndex = currentIndex + 1;

    if (images.length - currentIndex <= LOAD_THRESHOLD) {
      fetchImages(true);
    }

    setTimeout(() => {
      isTransitioning = false;
    }, 300);

    if (!isAuto) {
      startSlideInterval();
    }
  }

  function prevSlide() {
    if (images.length === 0 || isTransitioning || currentIndex === 0) return;

    isTransitioning = true;

    currentIndex = currentIndex - 1;

    setTimeout(() => {
      isTransitioning = false;
    }, 300);

    startSlideInterval();
  }

  function startSlideInterval() {
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(() => nextSlide(true), slideInterval) as unknown as number;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowLeft') {
      prevSlide();
    } else if (event.key === 'ArrowRight') {
      nextSlide();
    }
  }

  function handleTouchStart(e: TouchEvent) {
    if (isTransitioning || images.length <= 1) return;

    touchStartX = e.touches[0].clientX;
    touchEndX = touchStartX; // Reset end position
    isDragging = true;
    dragOffset = 0;

    if (intervalId) {
      clearInterval(intervalId);
      intervalId = 0;
    }
  }

  function handleTouchMove(e: TouchEvent) {
    if (!isDragging) return;

    touchEndX = e.touches[0].clientX;
    dragOffset = touchEndX - touchStartX;
  }

  function handleTouchEnd() {
    if (!isDragging) return;

    isDragging = false;
    const swipeDistance = touchEndX - touchStartX;
    const threshold = window.innerWidth * 0.15;

    if (swipeDistance > threshold) {
      dragOffset = 0;
      prevSlide();
    } else if (swipeDistance < -threshold) {
      dragOffset = 0;
      nextSlide();
    } else {
      dragOffset = 0;
      setTimeout(() => {
        isTransitioning = false;
      }, 250);
    }
    startSlideInterval();
  }

  onMount(async () => {
    mounted = true;
    await fetchImages();
    startSlideInterval();

    window.addEventListener('keydown', handleKeydown);
  });

  onDestroy(() => {
    window.removeEventListener('keydown', handleKeydown);
    if (intervalId) clearInterval(intervalId);
    mounted = false;
  });

  $effect(() => {
    if (mounted) {
      startSlideInterval();
    }
  });

  function getSlideOpacity(index: number) {
    if (!isDragging) return index === currentIndex ? 1 : 0;

    const direction = dragOffset < 0 ? 1 : -1;
    const targetIndex = currentIndex + direction;

    if (index === currentIndex) {
      return 1 - Math.min(Math.abs(dragOffset / window.innerWidth), 1);
    } else if (index === targetIndex) {
      return Math.min(Math.abs(dragOffset / window.innerWidth), 1);
    }

    return 0;
  }

  function getSlideScale(index: number) {
    const minScale = 0.93;

    if (!isDragging) return index === currentIndex ? 1 : minScale;

    const progress = Math.min(Math.abs(dragOffset / window.innerWidth), 1);
    const direction = dragOffset < 0 ? 1 : -1;
    const targetIndex = currentIndex + direction;

    if (index === currentIndex) {
      return 1 - progress * (1 - minScale);
    } else if (index === targetIndex) {
      return minScale + progress * (1 - minScale);
    }

    return minScale;
  }
</script>

<div class="h-screen w-screen relative overflow-hidden">
  {#if isLoading}
    <div class="flex justify-center items-center h-full w-full">
      <div class="text-2xl">Loading...</div>
    </div>
  {:else if images.length === 0}
    <div class="flex justify-center items-center h-full w-full">
      <div class="text-2xl">No images available</div>
    </div>
  {:else}
    <div
      class="relative h-full w-full overflow-hidden touch-pan-y"
      ontouchstart={handleTouchStart}
      ontouchmove={handleTouchMove}
      ontouchend={handleTouchEnd}
      ontouchcancel={handleTouchEnd}
    >
      {#each images as imageId, index (imageId)}
        <div
          class="absolute h-full w-full ease-in-out will-change-auto"
          style="
  opacity: {getSlideOpacity(index)};
  z-index: {index === currentIndex ? 1 : 0};
  scale: {getSlideScale(index)};
  left: {Math.abs(currentIndex - index) <= 2 ? 0 : 2 * window.innerWidth}px;
  transition: {isDragging ? 'none' : 'opacity 0.7s, scale 0.7s '};
"
        >
          <SlideItem {imageId} />
        </div>
      {/each}

      {#if isFetchingMore}
        <div class="absolute top-4 right-4 bg-black/35 backdrop-blur-[2px] text-white px-2 py-1 rounded-full text-sm">
          Loading more...
        </div>
      {/if}
    </div>
  {/if}
</div>
