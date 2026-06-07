<script lang="ts">
  import type { MemoryDeck } from '../lib/api';
  import { thousands } from '../lib/format';

  const { data } = $props<{ data: MemoryDeck }>();

  const yearRows = $derived.by(() => {
    return Object.entries(data.byYear)
      .map(([y, count]) => ({ yearsAgo: Number(y), shown: count as number }))
      .sort((a, b) => a.yearsAgo - b.yearsAgo);
  });

  const progress = $derived(data.total > 0 ? data.shown / data.total : 0);
</script>

<div class="flex flex-col gap-5">
  <div class="grid grid-cols-3 gap-4">
    <div>
      <div class="text-xs uppercase tracking-wider text-zinc-500">Deck</div>
      <div class="mono text-2xl text-accent-amber mt-1">{thousands(data.total)}</div>
      <div class="text-xs text-zinc-500 mt-0.5">cards</div>
    </div>
    <div>
      <div class="text-xs uppercase tracking-wider text-zinc-500">Shown</div>
      <div class="mono text-2xl text-zinc-100 mt-1">{thousands(data.shown)}</div>
      <div class="text-xs text-zinc-500 mt-0.5">{(progress * 100).toFixed(0)}% through cycle</div>
    </div>
    <div>
      <div class="text-xs uppercase tracking-wider text-zinc-500">Shuffles</div>
      <div class="mono text-2xl text-accent-violet mt-1">{thousands(data.shuffles)}</div>
      <div class="text-xs text-zinc-500 mt-0.5">since startup</div>
    </div>
  </div>

  <div>
    <div class="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
      <div
        class="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-300"
        style="width: {progress * 100}%; animation: fadeUp 0.8s ease-out both;"
      ></div>
    </div>
    <div class="mono text-xs text-zinc-500 mt-1.5">
      {thousands(data.remaining)} cards remaining before next shuffle
    </div>
  </div>

  {#if yearRows.length > 0}
    <div>
      <div class="text-xs uppercase tracking-wider text-zinc-500 mb-3">Shown this cycle, by years-ago</div>
      <div class="flex flex-col gap-2.5">
        {#each yearRows as row, i}
          {@const maxYearShown = Math.max(1, ...yearRows.map((r) => r.shown))}
          {@const widthPct = (row.shown / maxYearShown) * 100}
          <div class="flex items-center gap-3 fade-up" style="animation-delay: {i * 40}ms">
            <div class="mono text-xs text-zinc-400 w-14 shrink-0">
              {row.yearsAgo}y ago
            </div>
            <div class="flex-1 h-1.5 rounded-full bg-white/[0.03] overflow-hidden">
              <div
                class="h-full rounded-full bg-amber-400/70"
                style="width: {widthPct}%; animation: fadeUp 0.8s ease-out both; animation-delay: {i *
                  40}ms;"
              ></div>
            </div>
            <div class="mono text-xs text-zinc-400 w-10 text-right">{thousands(row.shown)}</div>
          </div>
        {/each}
      </div>
    </div>
  {:else}
    <div class="text-sm text-zinc-500 italic">No memory cards have been dealt yet.</div>
  {/if}
</div>
