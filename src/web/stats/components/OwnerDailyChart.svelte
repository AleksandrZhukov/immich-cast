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

  const maxVal = $derived(
    Math.max(
      1,
      ...data.owners.flatMap((o: { ownerId: string }) =>
        data.days.map((d: { byOwner: Record<string, number> }) => d.byOwner[o.ownerId] ?? 0),
      ),
    ),
  );

  const totalAll = $derived(data.owners.reduce((s: number, o: { total: number }) => s + o.total, 0));

  function x(i: number): number {
    if (data.days.length <= 1) return PAD.left;
    return PAD.left + (i / (data.days.length - 1)) * innerW;
  }
  function y(v: number): number {
    return PAD.top + innerH - (v / maxVal) * innerH;
  }

  type Series = {
    ownerId: string;
    ownerName: string;
    color: string;
    total: number;
    linePath: string;
    areaPath: string;
    values: number[];
  };

  const series = $derived.by(() => {
    const out: Series[] = [];
    for (let oi = 0; oi < data.owners.length; oi++) {
      const owner = data.owners[oi];
      const values: number[] = data.days.map(
        (d: { byOwner: Record<string, number> }) => d.byOwner[owner.ownerId] ?? 0,
      );
      const line = values
        .map((v: number, i: number) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)}`)
        .join(' ');
      const area =
        line +
        ` L ${x(values.length - 1)} ${y(0)} L ${x(0)} ${y(0)} Z`;
      out.push({
        ownerId: owner.ownerId,
        ownerName: owner.ownerName,
        color: ownerColor(oi),
        total: owner.total,
        linePath: line,
        areaPath: area,
        values,
      });
    }
    return out;
  });

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

  function gradientId(ownerId: string): string {
    return `owner-${ownerId.replace(/[^a-z0-9]/gi, '')}`;
  }
</script>

<div bind:this={containerEl} class="relative w-full">
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <svg width={w} height={h} viewBox="0 0 {w} {h}" onmousemove={onMove} onmouseleave={() => (hoverIdx = null)}>
    <defs>
      {#each series as s}
        <linearGradient id={gradientId(s.ownerId)} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color={s.color} stop-opacity="0.25" />
          <stop offset="100%" stop-color={s.color} stop-opacity="0" />
        </linearGradient>
      {/each}
    </defs>

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
        {Math.round(maxVal * f)}
      </text>
    {/each}

    {#each series as s, i}
      <path
        d={s.areaPath}
        fill="url(#{gradientId(s.ownerId)})"
        style="animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) both; animation-delay: {i * 80}ms;"
      />
      <path
        d={s.linePath}
        stroke={s.color}
        stroke-width="2"
        fill="none"
        stroke-linejoin="round"
        stroke-linecap="round"
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
      {#each series as s}
        <circle cx={x(hoverIdx)} cy={y(s.values[hoverIdx])} r="3.5" fill={s.color} />
      {/each}
    {/if}
  </svg>

  {#if hoverIdx !== null && data.days[hoverIdx]}
    {@const day = data.days[hoverIdx]}
    <div
      class="absolute pointer-events-none tooltip px-3 py-2 text-xs min-w-[180px]"
      style="left: {Math.min(w - 200, Math.max(0, x(hoverIdx) - 90))}px; top: 0;"
    >
      <div class="mono text-zinc-300 mb-2">{day.date}</div>
      <div class="flex flex-col gap-1">
        {#each series as s}
          {@const v = day.byOwner[s.ownerId] ?? 0}
          <div class="flex items-center gap-2">
            <span class="size-2 rounded-full shrink-0" style="background: {s.color}"></span>
            <span class="text-zinc-400 truncate">{s.ownerName}</span>
            <span class="mono text-zinc-200 ml-auto">{thousands(v)}</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  {#if series.length > 0}
    <div class="mt-4 flex flex-col gap-2">
      {#each series as s, i}
        {@const pct = totalAll > 0 ? (s.total / totalAll) * 100 : 0}
        <div class="flex items-center gap-3 text-xs fade-up" style="animation-delay: {i * 40}ms">
          <span class="size-2.5 rounded-full shrink-0" style="background: {s.color}"></span>
          <span class="text-zinc-300 truncate">{s.ownerName}</span>
          <div class="flex-1 h-1 rounded-full bg-white/[0.04] overflow-hidden">
            <div class="h-full rounded-full" style="width: {pct}%; background: {s.color}"></div>
          </div>
          <span class="mono text-zinc-400 w-12 text-right">{thousands(s.total)}</span>
          <span class="mono text-zinc-500 w-12 text-right">{pct.toFixed(1)}%</span>
        </div>
      {/each}
    </div>
  {:else}
    <div class="mt-4 text-sm text-zinc-500 italic">No data yet.</div>
  {/if}
</div>
