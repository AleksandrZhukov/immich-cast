<script lang="ts">
  import type { CaptureSpread } from '../lib/api';
  import { dayOfYearToDate, formatDate, monthName, thousands } from '../lib/format';

  const { data } = $props<{ data: CaptureSpread }>();

  const ROW_H = 36;
  const ROW_GAP = 4;
  const LABEL_W = 56;
  const TOP_PAD = 24;
  const BOTTOM_PAD = 8;
  const RIGHT_PAD = 8;

  const years = $derived.by(() => {
    const out: number[] = [];
    for (let y = data.maxYear; y >= data.minYear; y--) out.push(y);
    return out;
  });

  const cellsByYear = $derived.by(() => {
    const map = new Map<number, Map<number, number>>();
    for (const c of data.cells) {
      let row = map.get(c.year);
      if (!row) {
        row = new Map();
        map.set(c.year, row);
      }
      row.set(c.doy, (row.get(c.doy) ?? 0) + c.count);
    }
    return map;
  });

  const maxCount = $derived(Math.max(1, ...data.cells.map((c: { count: number }) => c.count)));

  let chartW = $state(900);
  let containerEl: HTMLDivElement;

  $effect(() => {
    if (!containerEl) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) chartW = e.contentRect.width;
    });
    ro.observe(containerEl);
    return () => ro.disconnect();
  });

  const innerW = $derived(Math.max(200, chartW - LABEL_W - RIGHT_PAD));
  const dayW = $derived(innerW / 366);
  const height = $derived(TOP_PAD + years.length * (ROW_H + ROW_GAP) + BOTTOM_PAD);

  function barHeight(count: number): number {
    if (count <= 0) return 0;
    const ratio = count / maxCount;
    return Math.max(2, Math.pow(ratio, 0.7) * ROW_H);
  }

  function barColor(count: number, isMemory: boolean): string {
    const ratio = Math.min(1, count / maxCount);
    if (isMemory) return `rgba(251, 191, 36, ${0.4 + ratio * 0.6})`;
    return `rgba(125, 211, 252, ${0.35 + ratio * 0.65})`;
  }

  function monthTick(monthIdx: number, year: number): number {
    const d = new Date(year, monthIdx, 1);
    const start = new Date(year, 0, 0);
    return Math.floor((d.getTime() - start.getTime()) / 86_400_000);
  }

  let hovered = $state<{ year: number; doy: number; count: number; x: number; y: number } | null>(null);

  function handlePointer(e: MouseEvent, year: number, doy: number, count: number) {
    const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
    hovered = {
      year,
      doy,
      count,
      x: rect.left + rect.width / 2,
      y: rect.top,
    };
  }
</script>

<div bind:this={containerEl} class="relative w-full">
  <svg width={chartW} {height} viewBox="0 0 {chartW} {height}" class="block">
    <!-- month grid -->
    {#each Array(12) as _, m}
      {@const x = LABEL_W + monthTick(m, data.minYear) * dayW}
      <line {x} y1={TOP_PAD - 8} x2={x} y2={height - BOTTOM_PAD} stroke="rgba(255,255,255,0.04)" stroke-width="1" />
      <text {x} y={TOP_PAD - 12} fill="#52525b" font-size="10" font-family="JetBrains Mono">{monthName(m)}</text>
    {/each}

    {#each years as year, rowIdx}
      {@const rowY = TOP_PAD + rowIdx * (ROW_H + ROW_GAP)}
      <text
        x="0"
        y={rowY + ROW_H / 2 + 4}
        fill="#71717a"
        font-size="11"
        font-family="JetBrains Mono"
        class="select-none"
      >
        {year}
      </text>

      <line
        x1={LABEL_W}
        y1={rowY + ROW_H}
        x2={chartW - RIGHT_PAD}
        y2={rowY + ROW_H}
        stroke="rgba(255,255,255,0.04)"
      />

      {#each Array(366) as _, doy}
        {@const count = cellsByYear.get(year)?.get(doy + 1) ?? 0}
        {#if count > 0}
          {@const h = barHeight(count)}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <rect
            x={LABEL_W + doy * dayW}
            y={rowY + ROW_H - h}
            width={Math.max(1.5, dayW - 0.5)}
            height={h}
            fill={barColor(count, false)}
            rx="0.5"
            class="cursor-pointer transition-opacity hover:opacity-100"
            style="animation: fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: {rowIdx * 60 +
              (doy % 50) * 6}ms;"
            onmousemove={(e) => handlePointer(e, year, doy + 1, count)}
            onmouseleave={() => (hovered = null)}
          />
        {/if}
      {/each}
    {/each}
  </svg>

  {#if hovered}
    <div
      class="fixed pointer-events-none z-50 tooltip px-3 py-2 text-xs"
      style="left: {hovered.x}px; top: {hovered.y - 56}px; transform: translateX(-50%);"
    >
      <div class="mono text-zinc-300">{formatDate(dayOfYearToDate(hovered.year, hovered.doy))}</div>
      <div class="mono text-accent mt-0.5">{thousands(hovered.count)} shown</div>
    </div>
  {/if}
</div>
