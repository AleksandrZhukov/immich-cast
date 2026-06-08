<script lang="ts">
  import type { WeatherDailyRow, WeatherPoint } from '../lib/api';
  import { thousands } from '../lib/format';

  const { series, daily } = $props<{ series: WeatherPoint[]; daily: WeatherDailyRow[] }>();

  const PAD = { top: 16, right: 12, bottom: 24, left: 36 };
  const H = 160;

  let tempEl = $state<HTMLDivElement | null>(null);
  let aqiEl = $state<HTMLDivElement | null>(null);
  let tempW = $state(600);
  let aqiW = $state(600);

  $effect(() => {
    if (!tempEl) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) tempW = e.contentRect.width;
    });
    ro.observe(tempEl);
    return () => ro.disconnect();
  });

  $effect(() => {
    if (!aqiEl) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) aqiW = e.contentRect.width;
    });
    ro.observe(aqiEl);
    return () => ro.disconnect();
  });

  const tempInnerW = $derived(Math.max(100, tempW - PAD.left - PAD.right));
  const aqiInnerW = $derived(Math.max(100, aqiW - PAD.left - PAD.right));
  const innerH = H - PAD.top - PAD.bottom;

  const tempMin = $derived(series.length > 0 ? Math.min(...series.map((p: WeatherPoint) => p.temperature)) : 0);
  const tempMax = $derived(series.length > 0 ? Math.max(...series.map((p: WeatherPoint) => p.temperature)) : 30);
  const tempRange = $derived(Math.max(1, tempMax - tempMin));

  const aqiMax = $derived(series.length > 0 ? Math.max(50, ...series.map((p: WeatherPoint) => p.aqi)) : 50);

  function tx(i: number, innerW: number): number {
    if (series.length <= 1) return PAD.left;
    return PAD.left + (i / (series.length - 1)) * innerW;
  }
  function ty(temp: number): number {
    const t = (temp - tempMin) / tempRange;
    return PAD.top + innerH - t * innerH;
  }
  function ay(aqi: number): number {
    const t = aqi / aqiMax;
    return PAD.top + innerH - t * innerH;
  }

  const tempPath = $derived.by(() => {
    if (!series.length) return '';
    return series
      .map((p: WeatherPoint, i: number) => `${i === 0 ? 'M' : 'L'} ${tx(i, tempInnerW)} ${ty(p.temperature)}`)
      .join(' ');
  });
  const tempArea = $derived.by(() => {
    if (!series.length) return '';
    const head = series
      .map((p: WeatherPoint, i: number) => `${i === 0 ? 'M' : 'L'} ${tx(i, tempInnerW)} ${ty(p.temperature)}`)
      .join(' ');
    return `${head} L ${tx(series.length - 1, tempInnerW)} ${PAD.top + innerH} L ${tx(0, tempInnerW)} ${PAD.top + innerH} Z`;
  });

  const aqiPath = $derived.by(() => {
    if (!series.length) return '';
    return series
      .map((p: WeatherPoint, i: number) => `${i === 0 ? 'M' : 'L'} ${tx(i, aqiInnerW)} ${ay(p.aqi)}`)
      .join(' ');
  });

  // AQI category bands (relative to aqiMax for shading)
  const AQI_BANDS = [
    { from: 0, to: 50, color: 'rgba(134, 239, 172, 0.10)' }, // green
    { from: 50, to: 100, color: 'rgba(253, 224, 71, 0.10)' }, // yellow
    { from: 100, to: 150, color: 'rgba(253, 186, 116, 0.10)' }, // orange
    { from: 150, to: 200, color: 'rgba(252, 165, 165, 0.12)' }, // red
    { from: 200, to: 9999, color: 'rgba(216, 180, 254, 0.14)' }, // purple
  ];

  function aqiCategoryColor(v: number): string {
    if (v <= 50) return '#86efac';
    if (v <= 100) return '#fde68a';
    if (v <= 150) return '#fdba74';
    if (v <= 200) return '#fca5a5';
    return '#d8b4fe';
  }

  function aqiBandRect(from: number, to: number, innerW: number) {
    const yTop = ay(Math.min(to, aqiMax));
    const yBot = ay(from);
    return { y: yTop, h: Math.max(0, yBot - yTop), w: innerW };
  }

  const ticks = $derived.by(() => {
    const n = Math.min(6, series.length);
    const out: { i: number; label: string }[] = [];
    for (let k = 0; k < n; k++) {
      const i = Math.round((k / Math.max(1, n - 1)) * (series.length - 1));
      const ts = series[i]?.ts ?? '';
      out.push({ i, label: ts.slice(5, 10) });
    }
    return out;
  });

  let tempHover = $state<number | null>(null);
  let aqiHover = $state<number | null>(null);

  function onTempMove(e: MouseEvent) {
    if (!series.length) return;
    const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
    const px = e.clientX - rect.left;
    const idx = Math.round(((px - PAD.left) / tempInnerW) * (series.length - 1));
    tempHover = Math.max(0, Math.min(series.length - 1, idx));
  }
  function onAqiMove(e: MouseEvent) {
    if (!series.length) return;
    const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
    const px = e.clientX - rect.left;
    const idx = Math.round(((px - PAD.left) / aqiInnerW) * (series.length - 1));
    aqiHover = Math.max(0, Math.min(series.length - 1, idx));
  }

  function iconUrl(icon: string): string {
    return `https://www.iqair.com/assets/svg/weather/ic-weather-${icon}.svg`;
  }

  const daysWithData = $derived(daily.filter((d: WeatherDailyRow) => d.samples > 0));
</script>

{#if series.length === 0 && daysWithData.length === 0}
  <div class="text-sm text-zinc-500 italic">No weather samples recorded yet.</div>
{:else}
  <div class="flex flex-col gap-6">
    <div bind:this={tempEl} class="relative w-full">
      <div class="flex items-baseline justify-between mb-2">
        <div class="text-sm text-zinc-400">Temperature</div>
        <div class="mono text-xs text-zinc-500">
          {tempMin.toFixed(1)}°C – {tempMax.toFixed(1)}°C
        </div>
      </div>
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <svg
        width={tempW}
        height={H}
        viewBox="0 0 {tempW} {H}"
        onmousemove={onTempMove}
        onmouseleave={() => (tempHover = null)}
      >
        <defs>
          <linearGradient id="tempAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#7dd3fc" stop-opacity="0.35" />
            <stop offset="100%" stop-color="#7dd3fc" stop-opacity="0" />
          </linearGradient>
        </defs>
        {#each [0, 0.5, 1] as f}
          <line
            x1={PAD.left}
            y1={PAD.top + innerH * (1 - f)}
            x2={PAD.left + tempInnerW}
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
            {(tempMin + tempRange * f).toFixed(0)}°
          </text>
        {/each}
        <path d={tempArea} fill="url(#tempAreaGrad)" style="animation: fadeUp 0.7s ease-out both;" />
        <path d={tempPath} stroke="#7dd3fc" stroke-width="2" fill="none" stroke-linejoin="round" />
        {#each ticks as t}
          <text
            x={tx(t.i, tempInnerW)}
            y={H - 8}
            text-anchor="middle"
            fill="#52525b"
            font-size="9"
            font-family="JetBrains Mono"
          >
            {t.label}
          </text>
        {/each}
        {#if tempHover !== null}
          <line
            x1={tx(tempHover, tempInnerW)}
            y1={PAD.top}
            x2={tx(tempHover, tempInnerW)}
            y2={PAD.top + innerH}
            stroke="rgba(255,255,255,0.2)"
          />
          <circle cx={tx(tempHover, tempInnerW)} cy={ty(series[tempHover].temperature)} r="3.5" fill="#7dd3fc" />
        {/if}
      </svg>
      {#if tempHover !== null}
        <div
          class="absolute pointer-events-none tooltip px-3 py-2 text-xs"
          style="left: {Math.min(tempW - 160, Math.max(0, tx(tempHover, tempInnerW) - 80))}px; top: 30px;"
        >
          <div class="mono text-zinc-300">{new Date(series[tempHover].ts).toLocaleString()}</div>
          <div class="mono text-accent mt-0.5">{series[tempHover].temperature.toFixed(1)}°C</div>
        </div>
      {/if}
    </div>

    <div bind:this={aqiEl} class="relative w-full">
      <div class="flex items-baseline justify-between mb-2">
        <div class="text-sm text-zinc-400">Air quality (AQI)</div>
        <div class="mono text-xs text-zinc-500">peak {aqiMax}</div>
      </div>
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <svg
        width={aqiW}
        height={H}
        viewBox="0 0 {aqiW} {H}"
        onmousemove={onAqiMove}
        onmouseleave={() => (aqiHover = null)}
      >
        {#each AQI_BANDS as band}
          {@const r = aqiBandRect(band.from, band.to, aqiInnerW)}
          {#if r.h > 0}
            <rect x={PAD.left} y={r.y} width={r.w} height={r.h} fill={band.color} />
          {/if}
        {/each}
        {#each [0, 50, 100, 150, 200].filter((v) => v <= aqiMax) as v}
          <line
            x1={PAD.left}
            y1={ay(v)}
            x2={PAD.left + aqiInnerW}
            y2={ay(v)}
            stroke="rgba(255,255,255,0.05)"
            stroke-dasharray="2 3"
          />
          <text
            x={PAD.left - 6}
            y={ay(v) + 3}
            text-anchor="end"
            fill="#52525b"
            font-size="9"
            font-family="JetBrains Mono"
          >
            {v}
          </text>
        {/each}
        <path
          d={aqiPath}
          stroke="#e4e4e7"
          stroke-width="1.75"
          fill="none"
          stroke-linejoin="round"
          style="animation: fadeUp 0.7s ease-out both;"
        />
        {#each ticks as t}
          <text
            x={tx(t.i, aqiInnerW)}
            y={H - 8}
            text-anchor="middle"
            fill="#52525b"
            font-size="9"
            font-family="JetBrains Mono"
          >
            {t.label}
          </text>
        {/each}
        {#if aqiHover !== null}
          <line
            x1={tx(aqiHover, aqiInnerW)}
            y1={PAD.top}
            x2={tx(aqiHover, aqiInnerW)}
            y2={PAD.top + innerH}
            stroke="rgba(255,255,255,0.2)"
          />
          <circle
            cx={tx(aqiHover, aqiInnerW)}
            cy={ay(series[aqiHover].aqi)}
            r="3.5"
            fill={aqiCategoryColor(series[aqiHover].aqi)}
          />
        {/if}
      </svg>
      {#if aqiHover !== null}
        <div
          class="absolute pointer-events-none tooltip px-3 py-2 text-xs"
          style="left: {Math.min(aqiW - 160, Math.max(0, tx(aqiHover, aqiInnerW) - 80))}px; top: 30px;"
        >
          <div class="mono text-zinc-300">{new Date(series[aqiHover].ts).toLocaleString()}</div>
          <div class="mono mt-0.5" style="color: {aqiCategoryColor(series[aqiHover].aqi)}">
            AQI {thousands(series[aqiHover].aqi)}
          </div>
        </div>
      {/if}
    </div>

    {#if daysWithData.length > 0}
      <div>
        <div class="text-sm text-zinc-400 mb-3">Daily conditions</div>
        <div class="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-14 lg:grid-cols-15 gap-2">
          {#each daysWithData as d, i (d.date)}
            <div
              class="rounded-lg border border-white/[0.05] bg-white/[0.02] px-2 py-2 flex flex-col items-center gap-1 fade-up"
              style="animation-delay: {Math.min(i, 30) * 25}ms"
            >
              <div class="mono text-[10px] text-zinc-500">{d.date.slice(5)}</div>
              {#if d.dominantIcon}
                <img src={iconUrl(d.dominantIcon)} alt={d.dominantIcon} class="size-7" />
              {:else}
                <div class="size-7"></div>
              {/if}
              <div class="mono text-[11px] text-zinc-300">
                {d.tempMax !== null ? `${d.tempMax.toFixed(0)}°` : '—'}
              </div>
              <div class="mono text-[10px] text-zinc-500">
                {d.tempMin !== null ? `${d.tempMin.toFixed(0)}°` : '—'}
              </div>
              {#if d.aqiAvg !== null}
                <div
                  class="mono text-[10px] mt-0.5 px-1.5 rounded-full"
                  style="background: {aqiCategoryColor(d.aqiAvg)}26; color: {aqiCategoryColor(d.aqiAvg)};"
                >
                  {Math.round(d.aqiAvg)}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
{/if}
