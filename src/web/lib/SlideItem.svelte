<script lang="ts">
  import dayjs from 'dayjs';
  import axios from 'redaxios';

  const { imageId } = $props<{ imageId: string }>();

  let imageInfo = $state<{ asset: { fileCreatedAt: string }; location: { formatedLocation: string } | null }>();
  let isPortrait = $state(false);

  function onLoadImage(e) {
    isPortrait = e.target.naturalHeight > e.target.naturalWidth;

    if (!imageInfo) {
      axios
        .get(`/api/images/${imageId}/info`)
        .then((res) => {
          imageInfo = res.data;
        })
        .catch((error) => {
          console.error(`Error load image info for ${imageId}:`, error);
        });
    }
  }
</script>

<div class="w-screen h-screen flex-shrink-0 relative">
  <img
    class="w-full h-full {isPortrait ? 'object-contain' : 'object-cover'}"
    src={`/api/images/${imageId}`}
    alt={`Image ${imageId}`}
    loading="lazy"
    onload={onLoadImage}
  />

  {#if imageInfo}
    <div class="absolute bottom-0 left-0 right-0 text-white flex items-end justify-between text-xl font-light gap-2">
      {#if imageInfo.location}
        <div class="bg-black/35 px-2 py-1 rounded-tr-lg backdrop-blur-[2px]">
          {imageInfo.location?.formatedLocation}
        </div>
      {:else}
        <div></div>
      {/if}
      <div class="bg-black/35 px-2 py-1 rounded-tl-lg backdrop-blur-[2px] flex-shrink-0">
        {dayjs(imageInfo.asset.fileCreatedAt).format('DD MMM YYYY')}
      </div>
    </div>
  {/if}
</div>
