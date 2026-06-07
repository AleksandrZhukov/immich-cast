<script lang="ts">
  import { ownerColor, thousands } from '../lib/format';

  const { data } = $props<{
    data: Array<{ ownerId: string; ownerName: string; count: number }>;
  }>();

  const total = $derived(data.reduce((s: number, o: { count: number }) => s + o.count, 0));
  const maxCount = $derived(Math.max(1, ...data.map((o: { count: number }) => o.count)));
</script>

<div class="flex flex-col gap-3">
  {#each data as owner, i}
    {@const pct = total > 0 ? (owner.count / total) * 100 : 0}
    {@const widthPct = (owner.count / maxCount) * 100}
    {@const color = ownerColor(owner.ownerId)}
    <div class="fade-up" style="animation-delay: {i * 60}ms">
      <div class="flex items-baseline justify-between text-sm mb-1">
        <div class="flex items-center gap-2">
          <span class="size-2 rounded-full" style="background: {color}"></span>
          <span class="text-zinc-300">{owner.ownerName}</span>
        </div>
        <div class="mono text-xs text-zinc-500">
          <span class="text-zinc-300">{thousands(owner.count)}</span>
          <span class="ml-1">{pct.toFixed(1)}%</span>
        </div>
      </div>
      <div class="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
        <div
          class="h-full rounded-full"
          style="width: {widthPct}%; background: linear-gradient(90deg, {color} 0%, {color}80 100%); animation: fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) both; animation-delay: {i *
            60}ms"
        ></div>
      </div>
    </div>
  {/each}

  {#if !data.length}
    <div class="text-sm text-zinc-500 italic">No data yet.</div>
  {/if}
</div>
