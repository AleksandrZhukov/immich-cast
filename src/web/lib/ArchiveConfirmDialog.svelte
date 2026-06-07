<script lang="ts">
  const {
    open,
    onConfirm,
    onCancel,
  } = $props<{
    open: boolean;
    onConfirm: () => void;
    onCancel: () => void;
  }>();
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    role="presentation"
    onclick={onCancel}
    ontouchstart={(e) => e.stopPropagation()}
    ontouchmove={(e) => e.stopPropagation()}
  >
    <div
      class="bg-white/95 text-black rounded-2xl px-6 py-5 max-w-xs text-center shadow-2xl"
      role="dialog"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
    >
      <div class="text-xl font-medium mb-1">Archive this photo?</div>
      <div class="text-sm text-gray-600 mb-5">It will be hidden from the slideshow.</div>
      <div class="flex gap-3 justify-center">
        <button
          class="px-5 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-base font-medium"
          onclick={onCancel}
        >
          Cancel
        </button>
        <button
          class="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-base font-medium"
          onclick={onConfirm}
        >
          Archive
        </button>
      </div>
    </div>
  </div>
{/if}
