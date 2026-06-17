<script lang="ts">
  import dayjs from 'dayjs';
  import axios from 'redaxios';
  import { type ImageInfo } from './types';

  const {
    image,
    class: className,
    isPortrait,
    isActive = false,
    isHidden = false,
    duration = 30000,
    onActionRequest,
  } = $props<{
    image: ImageInfo;
    class?: string;
    isPortrait?: boolean;
    isActive?: boolean;
    isHidden?: boolean;
    duration?: number;
    onActionRequest?: (image: ImageInfo) => void;
  }>();

  let imageLocation = $state<string | null>();

  const LONG_PRESS_MS = 700;
  const MOVE_CANCEL_PX = 10;

  let pressProgress = $state(0);
  let pressTimer: ReturnType<typeof setTimeout> | null = null;
  let pressRaf = 0;
  let pressStart = { x: 0, y: 0 };

  function startPress(x: number, y: number) {
    if (isHidden || !isActive) return;
    pressStart = { x, y };
    const startedAt = performance.now();
    const tick = () => {
      pressProgress = Math.min(1, (performance.now() - startedAt) / LONG_PRESS_MS);
      if (pressProgress < 1) pressRaf = requestAnimationFrame(tick);
    };
    pressRaf = requestAnimationFrame(tick);
    pressTimer = setTimeout(() => {
      cancelPress();
      onActionRequest?.(image);
    }, LONG_PRESS_MS);
  }

  function movePress(x: number, y: number) {
    if (!pressTimer) return;
    const dx = x - pressStart.x;
    const dy = y - pressStart.y;
    if (dx * dx + dy * dy > MOVE_CANCEL_PX * MOVE_CANCEL_PX) cancelPress();
  }

  function cancelPress() {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
    if (pressRaf) {
      cancelAnimationFrame(pressRaf);
      pressRaf = 0;
    }
    pressProgress = 0;
  }

  function onTouchStart(e: TouchEvent) {
    startPress(e.touches[0].clientX, e.touches[0].clientY);
  }
  function onTouchMove(e: TouchEvent) {
    movePress(e.touches[0].clientX, e.touches[0].clientY);
  }
  function onPointerDownMouse(e: MouseEvent) {
    if (e.button !== 0) return;
    startPress(e.clientX, e.clientY);
  }
  function onPointerMoveMouse(e: MouseEvent) {
    movePress(e.clientX, e.clientY);
  }

  // Ken Burns: pick a target zoom + pan once per slide. Translate is clamped to
  // (endScale-1)/2 so the panned image still covers the frame without edges.
  const endScale = 1.18 + Math.random() * 0.12;
  const maxTranslate = (endScale - 1) * 50 * 0.8;
  const endX = (Math.random() - 0.5) * 2 * maxTranslate;
  const endY = (Math.random() - 0.5) * 2 * maxTranslate;

  let panActive = $state(false);

  $effect(() => {
    if (isActive && !panActive) {
      requestAnimationFrame(() => {
        panActive = true;
      });
    }
  });

  function onLoadImage() {
    if (!imageLocation && image.latitude && image.longitude) {
      axios
        .get(`/api/location?latitude=${image.latitude}&longitude=${image.longitude}`)
        .then((res) => {
          imageLocation = res.data;
        })
        .catch((error) => {
          console.error(`Error load image location for ${image.id}:`, error);
        });
    }
  }

  const AVATAR_BG: Record<string, string> = {
    primary: 'bg-sky-500',
    pink: 'bg-pink-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
    gray: 'bg-gray-500',
    amber: 'bg-amber-500',
  };
  const getAvatarBg = (color: string) => AVATAR_BG[color] ?? 'bg-gray-500';

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((i) => i[0])
      .slice(0, 2)
      .join('');
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="{className || ''} flex-shrink-0 relative overflow-hidden {isHidden ? 'opacity-30' : ''}"
  ontouchstart={onTouchStart}
  ontouchmove={onTouchMove}
  ontouchend={cancelPress}
  ontouchcancel={cancelPress}
  onmousedown={onPointerDownMouse}
  onmousemove={onPointerMoveMouse}
  onmouseup={cancelPress}
  onmouseleave={cancelPress}
>
  <img
    class="w-full h-full {isPortrait ? 'object-contain' : 'object-cover'}"
    style="
      transform: {panActive ? `scale(${endScale}) translate(${endX}%, ${endY}%)` : 'scale(1)'};
      transition: transform {duration + 2000}ms ease-out;
      will-change: transform;
    "
    src={`/api/images/${image.id}`}
    alt={`Image ${image.id}`}
    loading="lazy"
    onload={onLoadImage}
  />

  <div class="absolute top-2 right-2">
    <div
      class={`text-lg size-10 rounded-full flex items-center justify-center select-none ${getAvatarBg(image.ownerAvatarColor)}`}
    >
      {getInitials(image.ownerName)}
    </div>
  </div>
  <div
    class="absolute bottom-0 left-0 right-0 text-white flex items-end justify-between text-xl font-light gap-2 text-shadow-md text-shadow-black/15"
  >
    {#if imageLocation}
      <div class="bg-black/35 px-2 py-1 rounded-tr-lg backdrop-blur-[2px]">
        {imageLocation}
      </div>
    {:else}
      <div></div>
    {/if}
    <div class="flex-shrink-0 bg-black/35 px-2 py-1 rounded-tl-lg backdrop-blur-[2px] flex flex-col">
      {#if image.yearsAgo}
        <div class="flex items-baseline justify-center gap-1">
          <span class="text-4xl">{image.yearsAgo}</span>
          <span class="text-sm">{image.yearsAgo === 1 ? 'year' : 'years'} ago</span>
        </div>
      {/if}
      {dayjs(image.fileCreatedAt).format('DD MMM YYYY')}
    </div>
  </div>

  {#if pressProgress > 0.15}
    <div class="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
      <div
        class="bg-black/60 backdrop-blur-sm text-white text-sm font-light px-4 py-2 rounded-full flex items-center gap-2"
        style="opacity: {pressProgress}"
      >
        <svg class="size-4" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="white" stroke-opacity="0.3" stroke-width="3" />
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="white"
            stroke-width="3"
            stroke-linecap="round"
            stroke-dasharray="62.83"
            stroke-dashoffset={62.83 * (1 - pressProgress)}
            transform="rotate(-90 12 12)"
          />
        </svg>
        Hold for options…
      </div>
    </div>
  {/if}
</div>
