<script lang="ts">
  import dayjs from 'dayjs';
  import axios from 'redaxios';
  import { type ImageInfo } from './types';

  const { image, class: className, isPortrait } = $props<{ image: ImageInfo; class?: string; isPortrait?: boolean }>();

  let imageLocation = $state<string | null>();
  let isArchived = $state(false);

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

  const archiveImage = async () => {
    try {
      await axios.post(`/api/images/${image.id}/archive`);
      isArchived = true;
    } catch (e) {
      console.error(e);
    }
  };

  const getAvatarBg = (color: string) => {
    switch (color) {
      case 'gray':
        return 'bg-gray-500';
      case 'yellow':
        return 'bg-yellow-500';
      case 'blue':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((i) => i[0])
      .join('');
</script>

<div class="{className || ''} flex-shrink-0 relative {isArchived ? 'opacity-30' : ''}">
  <img
    class="w-full h-full {isPortrait ? 'object-contain' : 'object-cover'}"
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
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div
      class=" flex-shrink-0 bg-black/35 px-2 py-1 rounded-tl-lg backdrop-blur-[2px] flex flex-col"
      onclick={archiveImage}
    >
      {#if image.yearsAgo}
        <div class="flex items-baseline justify-center gap-1">
          <span class="text-4xl">{image.yearsAgo}</span>
          <span class="text-sm">{image.yearsAgo === 1 ? 'year' : 'years'} ago</span>
        </div>
      {/if}
      {dayjs(image.fileCreatedAt).format('DD MMM YYYY')}
    </div>
  </div>
</div>
