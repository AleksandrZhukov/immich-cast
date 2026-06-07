<script lang="ts">
  import type { DailyPoint } from '../lib/api';
  import { thousands } from '../lib/format';

  const { data } = $props<{ data: DailyPoint[] }>();

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
  const maxVal = $derived(Math.max(1, ...data.map((d: DailyPoint) => d.served)));

  function x(i: number): number {
    if (data.length <= 1) return PAD.left;
    return PAD.left + (i / (data.length - 1)) * innerW;
  }
  function y(v: number): number {
    return PAD.top + innerH - (v / maxVal) * innerH;
  }

  const servedPath = $derived.by(() => {
    if (!data.length) return '';
    return data.map((d: DailyPoint, i: number) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d.served)}`).join(' ');
  });

  const servedArea = $derived.by(() => {
    if (!data.length) return '';
    const head = data
      .map((d: DailyPoint, i: number) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d.served)}`)
      .join(' ');
    return `${head} L ${x(data.length - 1)} ${y(0)} L ${x(0)} ${y(0)} Z`;
  });

  const memoryPath = $derived.by(() => {
    if (!data.length) return '';
    return data.map((d: DailyPoint, i: number) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d.memory)}`).join(' ');
  });

  const ticks = $derived.by(() => {
    const n = Math.min(6, data.length);
    const out: { i: number; label: string }[] = [];
    for (let k = 0; k < n; k++) {
      const i = Math.round((k / Math.max(1, n - 1)) * (data.length - 1));
      const d = data[i]?.date ?? '';
      out.push({ i, label: d.slice(5) });
    }
    return out;
  });

  let hover = $state<{ i: number; x: number; y: number } | null>(null);

  function onMove(e: MouseEvent) {
    if (!data.length) return;
    const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
    const px = e.clientX - rect.left;
    const idx = Math.round(((px - PAD.left) / innerW) * (data.length - 1));
    const clamped = Math.max(0, Math.min(data.length - 1, idx));
    hover = { i: clamped, x: x(clamped), y: y(data[clamped].served) };
  }
</script>

<div bind:this={containerEl} class="relative w-full">
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <svg width={w} height={h} viewBox="0 0 {w} {h}" onmousemove={onMove} onmouseleave={() => (hover = null)}>
    <defs>
      <linearGradient id="dailyArea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#7dd3fc" stop-opacity="0.4" />
        <stop offset="100%" stop-color="#7dd3fc" stop-opacity="0" />
      </linearGradient>
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

    <path d={servedArea} fill="url(#dailyArea)" style="animation: fadeUp 0.7s ease-out both;" />
    <path d={servedPath} stroke="#7dd3fc" stroke-width="2" fill="none" stroke-linejoin="round" />
    <path d={memoryPath} stroke="#fbbf24" stroke-width="1.5" fill="none" stroke-dasharray="3 3" stroke-linejoin="round" />

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

    {#if hover}
      <line x1={hover.x} y1={PAD.top} x2={hover.x} y2={PAD.top + innerH} stroke="rgba(125,211,252,0.4)" stroke-width="1" />
      <circle cx={hover.x} cy={hover.y} r="4" fill="#7dd3fc" />
    {/if}
  </svg>

  {#if hover}
    <div
      class="absolute pointer-events-none panel px-3 py-2 text-xs"
      style="left: {hover.x}px; top: 0; transform: translateX(-50%);"
    >
      <div class="mono text-zinc-300">{data[hover.i].date}</div>
      <div class="mono text-accent">{thousands(data[hover.i].served)} served</div>
      {#if data[hover.i].memory > 0}
        <div class="mono text-accent-amber">{thousands(data[hover.i].memory)} memory</div>
      {/if}
    </div>
  {/if}

  <div class="mt-2 flex items-center gap-4 text-xs text-zinc-500">
    <div class="flex items-center gap-1.5">
      <span class="w-3 h-0.5 bg-sky-300"></span>
      <span>served</span>
    </div>
    <div class="flex items-center gap-1.5">
      <span class="w-3 h-0.5 border-t border-dashed border-amber-400"></span>
      <span>memory</span>
    </div>
  </div>
</div>
