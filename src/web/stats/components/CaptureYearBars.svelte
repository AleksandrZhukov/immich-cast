<script lang="ts">
  import { thousands } from '../lib/format';

  const { data } = $props<{ data: Array<{ year: number; count: number }> }>();

  const maxCount = $derived(Math.max(1, ...data.map((d: { count: number }) => d.count)));
  const currentYear = new Date().getFullYear();
</script>

<div class="flex items-end gap-1.5 min-h-[180px]">
  {#each data as item, i}
    {@const heightPct = (item.count / maxCount) * 100}
    {@const isCurrent = item.year === currentYear}
    <div class="flex-1 flex flex-col items-center gap-2 group">
      <div class="mono text-xs text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity">
        {thousands(item.count)}
      </div>
      <div class="w-full flex items-end" style="height: 140px">
        <div
          class="w-full rounded-t-md transition-colors"
          style="
            height: {heightPct}%;
            background: linear-gradient(180deg, {isCurrent ? '#c4b5fd' : '#7dd3fc'} 0%, {isCurrent
            ? 'rgba(196,181,253,0.3)'
            : 'rgba(125,211,252,0.3)'} 100%);
            animation: growUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
            animation-delay: {i * 50}ms;
            transform-origin: bottom;
          "
        ></div>
      </div>
      <div class="mono text-xs {isCurrent ? 'text-accent-violet' : 'text-zinc-500'}">{item.year}</div>
    </div>
  {/each}

  {#if !data.length}
    <div class="text-sm text-zinc-500 italic w-full text-center">No capture data yet.</div>
  {/if}
</div>

<style>
  @keyframes growUp {
    from {
      transform: scaleY(0);
      opacity: 0;
    }
    to {
      transform: scaleY(1);
      opacity: 1;
    }
  }
</style>
