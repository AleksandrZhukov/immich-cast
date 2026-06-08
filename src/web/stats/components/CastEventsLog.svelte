<script lang="ts">
  import type { CastEventRow } from '../lib/api';
  import { timeAgo } from '../lib/format';

  const { data } = $props<{ data: CastEventRow[] }>();

  const counts = $derived.by(() => {
    const c: Record<string, number> = {};
    for (const e of data) c[e.kind] = (c[e.kind] ?? 0) + 1;
    return c;
  });

  const KIND_STYLE: Record<string, { label: string; color: string; bg: string }> = {
    idle_relaunch: { label: 'idle relaunch', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
    outside_hours_stop: { label: 'outside hours stop', color: '#a1a1aa', bg: 'rgba(161,161,170,0.12)' },
    reconnect: { label: 'reconnect', color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
    connected: { label: 'connected', color: '#7dd3fc', bg: 'rgba(125,211,252,0.12)' },
  };

  function styleFor(kind: string) {
    return KIND_STYLE[kind] ?? { label: kind, color: '#a1a1aa', bg: 'rgba(161,161,170,0.12)' };
  }
</script>

<div class="flex flex-col gap-4">
  <div class="flex flex-wrap gap-2">
    {#each Object.entries(counts) as [kind, n]}
      {@const s = styleFor(kind)}
      <div class="mono text-xs px-3 py-1 rounded-full" style="background: {s.bg}; color: {s.color};">
        {s.label} <span class="opacity-70">×{n}</span>
      </div>
    {/each}
  </div>

  {#if data.length}
    <div class="max-h-[320px] overflow-y-auto">
      <ul class="flex flex-col">
        {#each data as e, i}
          {@const s = styleFor(e.kind)}
          <li
            class="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0 fade-up"
            style="animation-delay: {Math.min(i, 20) * 25}ms"
          >
            <span class="size-2 rounded-full shrink-0" style="background: {s.color}"></span>
            <span class="mono text-xs text-zinc-300 w-36 shrink-0" style="color: {s.color}">{s.label}</span>
            <span class="mono text-xs text-zinc-500">{timeAgo(e.ts)}</span>
            <span class="mono text-xs text-zinc-600 ml-auto"
              >{new Date(e.ts).toISOString().slice(0, 19).replace('T', ' ')}</span
            >
          </li>
        {/each}
      </ul>
    </div>
  {:else}
    <div class="text-sm text-zinc-500 italic">No cast events recorded yet.</div>
  {/if}
</div>
