<script lang="ts">
  import type { DailyByOwner } from '../lib/api';
  import { ownerColor, thousands } from '../lib/format';

  const { data } = $props<{ data: DailyByOwner }>();

  const PAD = { top: 16, right: 12, bottom: 24, left: 36 };
  let containerEl: HTMLDivElement;
  let w = $state(600);
  const h = 220;

  $effect(() => {
    if (!containerEl) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) w = e.contentRect.width;
    });
    ro.observe(containerEl);
    return () => ro.disconnect();
  });

  const innerW = $derived(Math.max(100, w - PAD.left - PAD.right));
  const innerH = h - PAD.top - PAD.bottom;

  const stackOrder = $derived(data.owners.map((o: { ownerId: string }) => o.ownerId));

  const totalsPerDay = $derived(
    data.days.map((d: { byOwner: Record<string, number> }) =>
      Object.values(d.byOwner).reduce((s, n) => s + n, 0),
    ),
  );

  const maxTotal = $derived(Math.max(1, ...totalsPerDay));

  function x(i: number): number {
    if (data.days.length <= 1) return PAD.left;
    return PAD.left + (i / (data.days.length - 1)) * innerW;
  }
  function y(v: number): number {
    return PAD.top + innerH - (v / maxTotal) * innerH;
  }

  type Band = { ownerId: string; ownerName: string; color: string; total: number; path: string };

  const bands = $derived.by(() => {
    const result: Band[] = [];
    const cumulative = new Array(data.days.length).fill(0);

    for (const ownerId of stackOrder) {
      const owner = data.owners.find((o: { ownerId: string }) => o.ownerId === ownerId);
      if (!owner) continue;
      const top: number[] = [];
      for (let i = 0; i < data.days.length; i++) {
        const v = data.days[i].byOwner[ownerId] ?? 0;
        cumulative[i] += v;
        top.push(cumulative[i]);
      }
      const bottom = cumulative.map((c: number, i: number) => c - (data.days[i].byOwner[ownerId] ?? 0));

      let d = '';
      for (let i = 0; i < top.length; i++) {
        d += `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(top[i])} `;
      }
      for (let i = top.length - 1; i >= 0; i--) {
        d += `L ${x(i)} ${y(bottom[i])} `;
      }
      d += 'Z';

      result.push({
        ownerId,
        ownerName: owner.ownerName,
        color: ownerColor(ownerId),
        total: owner.total,
        path: d,
      });
    }
    return result;
  });

  const totalAll = $derived(data.owners.reduce((s: number, o: { total: number }) => s + o.total, 0));

  const ticks = $derived.by(() => {
    const n = Math.min(6, data.days.length);
    const out: { i: number; label: string }[] = [];
    for (let k = 0; k < n; k++) {
      const i = Math.round((k / Math.max(1, n - 1)) * (data.days.length - 1));
      out.push({ i, label: data.days[i]?.date?.slice(5) ?? '' });
    }
    return out;
  });

  let hoverIdx = $state<number | null>(null);

  function onMove(e: MouseEvent) {
    if (!data.days.length) return;
    const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
    const px = e.clientX - rect.left;
    const idx = Math.round(((px - PAD.left) / innerW) * (data.days.length - 1));
    hoverIdx = Math.max(0, Math.min(data.days.length - 1, idx));
  }
</script>

<div bind:this={containerEl} class="relative w-full">
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <svg width={w} height={h} viewBox="0 0 {w} {h}" onmousemove={onMove} onmouseleave={() => (hoverIdx = null)}>
    {#each [0.25, 0.5, 0.75, 1] as f}
      <line
        x1={PAD.left}
        y1={PAD.top + innerH * (1 - f)}
        x2={PAD.left + innerW}
        y2={PAD.top + innerH * (1 - f)}
        stroke="rgba(255,255,255,0.04)"
      />
      <text
        x={PAD.left - 6}
        y={PAD.top + innerH * (1 - f) + 3}
        text-anchor="end"
        fill="#52525b"
        font-size="9"
        font-family="JetBrains Mono"
      >
        {Math.round(maxTotal * f)}
      </text>
    {/each}

    {#each bands as band, i}
      <path
        d={band.path}
        fill={band.color}
        fill-opacity="0.7"
        stroke={band.color}
        stroke-width="1"
        stroke-opacity="0.9"
        style="animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) both; animation-delay: {i * 80}ms;"
      />
    {/each}

    {#each ticks as t}
      <text
        x={x(t.i)}
        y={h - 8}
        text-anchor="middle"
        fill="#52525b"
        font-size="9"
        font-family="JetBrains Mono"
      >
        {t.label}
      </text>
    {/each}

    {#if hoverIdx !== null}
      <line
        x1={x(hoverIdx)}
        y1={PAD.top}
        x2={x(hoverIdx)}
        y2={PAD.top + innerH}
        stroke="rgba(255,255,255,0.25)"
        stroke-width="1"
      />
    {/if}
  </svg>

  {#if hoverIdx !== null && data.days[hoverIdx]}
    {@const day = data.days[hoverIdx]}
    {@const total = totalsPerDay[hoverIdx]}
    <div
      class="absolute pointer-events-none panel px-3 py-2 text-xs min-w-[180px]"
      style="left: {Math.min(w - 200, Math.max(0, x(hoverIdx) - 90))}px; top: 0;"
    >
      <div class="mono text-zinc-300 mb-1">{day.date}</div>
      <div class="mono text-accent mb-2">{thousands(total)} total</div>
      <div class="flex flex-col gap-1">
        {#each bands as band}
          {@const v = day.byOwner[band.ownerId] ?? 0}
          {#if v > 0}
            <div class="flex items-center gap-2">
              <span class="size-2 rounded-full shrink-0" style="background: {band.color}"></span>
              <span class="text-zinc-400 truncate">{band.ownerName}</span>
              <span class="mono text-zinc-200 ml-auto">{thousands(v)}</span>
            </div>
          {/if}
        {/each}
      </div>
    </div>
  {/if}

  {#if bands.length > 0}
    <div class="mt-4 flex flex-col gap-2">
      {#each bands as band, i}
        {@const pct = totalAll > 0 ? (band.total / totalAll) * 100 : 0}
        <div class="flex items-center gap-3 text-xs fade-up" style="animation-delay: {i * 40}ms">
          <span class="size-2.5 rounded-full shrink-0" style="background: {band.color}"></span>
          <span class="text-zinc-300 truncate">{band.ownerName}</span>
          <div class="flex-1 h-1 rounded-full bg-white/[0.04] overflow-hidden">
            <div
              class="h-full rounded-full"
              style="width: {pct}%; background: {band.color}"
            ></div>
          </div>
          <span class="mono text-zinc-400 w-12 text-right">{thousands(band.total)}</span>
          <span class="mono text-zinc-500 w-12 text-right">{pct.toFixed(1)}%</span>
        </div>
      {/each}
    </div>
  {:else}
    <div class="mt-4 text-sm text-zinc-500 italic">No data yet.</div>
  {/if}
</div>
