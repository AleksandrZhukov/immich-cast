<script lang="ts">
  import { onMount } from 'svelte';
  import type {
    CaptureSpread,
    CastEventRow,
    DailyByOwner,
    DailyPoint,
    MemoryDeck,
    Summary,
    WeatherDailyRow,
    WeatherPoint,
  } from './lib/api';
  import { api } from './lib/api';
  import StatCard from './components/StatCard.svelte';
  import RangePicker, { type RangeKey } from './components/RangePicker.svelte';
  import CaptureSpreadView from './components/CaptureSpread.svelte';
  import DailyChart from './components/DailyChart.svelte';
  import OwnerDailyChart from './components/OwnerDailyChart.svelte';
  import CaptureYearBars from './components/CaptureYearBars.svelte';
  import MemoryDeckPanel from './components/MemoryDeckPanel.svelte';
  import CastEventsLog from './components/CastEventsLog.svelte';
  import WeatherPanel from './components/WeatherPanel.svelte';

  let rangeKey = $state<RangeKey>('30d');
  let summary = $state<Summary | null>(null);
  let daily = $state<DailyPoint[]>([]);
  let dailyByOwner = $state<DailyByOwner | null>(null);
  let captureSpread = $state<CaptureSpread | null>(null);
  let castEvents = $state<CastEventRow[]>([]);
  let memoryDeck = $state<MemoryDeck | null>(null);
  let weatherSeries = $state<WeatherPoint[]>([]);
  let weatherDaily = $state<WeatherDailyRow[]>([]);
  let loading = $state(true);
  let loadError = $state<string | null>(null);
  let knownDays = $state<string[]>([]);

  const activeDays = $derived(daily.filter((d) => d.served > 0).length);

  async function rangeFor(key: RangeKey): Promise<{ from: Date; to: Date }> {
    const to = new Date();
    if (key === '7d') return { from: new Date(to.getTime() - 6 * 86_400_000), to };
    if (key === '30d') return { from: new Date(to.getTime() - 29 * 86_400_000), to };
    if (key === '90d') return { from: new Date(to.getTime() - 89 * 86_400_000), to };
    if (key === '1y') return { from: new Date(to.getTime() - 364 * 86_400_000), to };
    if (knownDays.length > 0) return { from: new Date(knownDays[0]), to };
    return { from: new Date(to.getTime() - 364 * 86_400_000), to };
  }

  async function load() {
    loading = true;
    loadError = null;
    try {
      const range = await rangeFor(rangeKey);
      const [s, d, dbo, sp, ce, md, ws, wd] = await Promise.all([
        api.summary(range),
        api.daily(range),
        api.dailyByOwner(range),
        api.captureSpread(range),
        api.castEvents(range),
        api.memoryDeck(),
        api.weather(range),
        api.weatherDaily(range),
      ]);
      summary = s;
      daily = d;
      dailyByOwner = dbo;
      captureSpread = sp;
      castEvents = ce;
      memoryDeck = md;
      weatherSeries = ws;
      weatherDaily = wd;
    } catch (e) {
      // One failed endpoint rejected Promise.all and left the dashboard stuck
      // on "Loading…" forever. Surface the error and clear the spinner.
      console.error('Error loading stats:', e);
      loadError = e instanceof Error ? e.message : 'Failed to load stats';
    } finally {
      loading = false;
    }
  }

  onMount(async () => {
    knownDays = await api.knownDays();
    await load();
  });

  function setRange(k: RangeKey) {
    rangeKey = k;
    load();
  }

  function refresh() {
    load();
  }
</script>

<div class="min-h-screen w-full">
  <div class="max-w-7xl mx-auto px-6 py-8">
    <header class="flex items-center justify-between mb-8 fade-up">
      <div>
        <div class="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-widest">
          <span class="size-1.5 rounded-full bg-sky-400 animate-pulse"></span>
          Immich Cast
        </div>
        <h1
          class="text-4xl font-light mt-1 bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-400 bg-clip-text text-transparent"
        >
          Slideshow stats
        </h1>
      </div>
      <div class="flex items-center gap-3">
        <button
          onclick={refresh}
          class="mono text-xs text-zinc-500 hover:text-zinc-200 transition-colors px-3 py-1 rounded-full border border-white/[0.06] hover:border-white/[0.15]"
          aria-label="Refresh"
        >
          ↻ refresh
        </button>
        <RangePicker value={rangeKey} onChange={setRange} />
      </div>
    </header>

    {#if loading && !summary}
      <div class="text-zinc-500 mono text-sm">Loading…</div>
    {:else if loadError && !summary}
      <div class="text-rose-400 mono text-sm">Failed to load stats: {loadError}</div>
    {:else if summary}
      <section class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        <StatCard label="Slides served" value={summary.totalServed} accent="sky" delay={0} />
        <StatCard
          label="Unique photos"
          value={summary.uniqueImages}
          accent="sky"
          hint={summary.uniqueImages > 0 && summary.totalServed > summary.uniqueImages
            ? `${(summary.totalServed / summary.uniqueImages).toFixed(2)}× avg shows`
            : undefined}
          delay={80}
        />
        <StatCard
          label="Memory photos"
          value={summary.memoryServed}
          accent="amber"
          hint={summary.totalServed > 0
            ? `${((summary.memoryServed / summary.totalServed) * 100).toFixed(1)}% of served`
            : undefined}
          delay={160}
        />
        <StatCard label="Unique owners" value={summary.uniqueOwners} accent="violet" delay={240} />
        <StatCard
          label="Active days"
          value={activeDays}
          accent="sky"
          hint={knownDays[0] ? `data since ${knownDays[0]}` : 'no data yet'}
          delay={320}
        />
      </section>

      {#if captureSpread && captureSpread.cells.length > 0}
        <section class="panel p-6 mb-8 fade-up" style="animation-delay: 320ms">
          <div class="flex items-baseline justify-between mb-1">
            <h2 class="text-lg font-medium">Photos by capture date</h2>
            <div class="mono text-xs text-zinc-500">
              {captureSpread.minYear}–{captureSpread.maxYear} · {captureSpread.cells.length} days of photos
            </div>
          </div>
          <p class="text-xs text-zinc-500 mb-4">
            Each bar is a day in the photo's capture year. Taller bars = shown more.
            <span class="text-accent">Sky</span> = regular slides,
            <span class="text-accent-amber">amber</span> = shown as "on this day" memory.
          </p>
          <CaptureSpreadView data={captureSpread} />
        </section>
      {/if}

      <section class="panel p-6 mb-4 fade-up" style="animation-delay: 400ms">
        <h2 class="text-lg font-medium mb-1">Slides served per day</h2>
        <p class="text-xs text-zinc-500 mb-4">Across the selected range.</p>
        {#if daily.length > 0}
          <DailyChart data={daily} />
        {:else}
          <div class="text-sm text-zinc-500 italic">No data in this range.</div>
        {/if}
      </section>

      <section class="panel p-6 mb-8 fade-up" style="animation-delay: 480ms">
        <h2 class="text-lg font-medium mb-1">Share by owner over time</h2>
        <p class="text-xs text-zinc-500 mb-4">Stacked daily share — who's dominating the slideshow.</p>
        {#if dailyByOwner && dailyByOwner.owners.length > 0}
          <OwnerDailyChart data={dailyByOwner} />
        {:else}
          <div class="text-sm text-zinc-500 italic">No owner data in this range.</div>
        {/if}
      </section>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        {#if memoryDeck}
          <section class="panel p-6 fade-up" style="animation-delay: 560ms">
            <h2 class="text-lg font-medium mb-1 flex items-center gap-2">
              <span>Memory deck</span>
              <span class="size-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            </h2>
            <p class="text-xs text-zinc-500 mb-4">Current "on this day" cards loaded into memory.</p>
            <MemoryDeckPanel data={memoryDeck} />
          </section>
        {/if}

        <section class="panel p-6 fade-up" style="animation-delay: 640ms">
          <h2 class="text-lg font-medium mb-1">By capture year</h2>
          <p class="text-xs text-zinc-500 mb-4">When were the photos shown actually taken?</p>
          <CaptureYearBars data={summary.perCaptureYear} />
        </section>
      </div>

      <section class="panel p-6 mb-4 fade-up" style="animation-delay: 720ms">
        <h2 class="text-lg font-medium mb-1">Cast monitor</h2>
        <p class="text-xs text-zinc-500 mb-4">Recent events from the Chromecast watcher.</p>
        <CastEventsLog data={castEvents} />
      </section>

      <section class="panel p-6 fade-up" style="animation-delay: 800ms">
        <h2 class="text-lg font-medium mb-1">Weather &amp; air quality</h2>
        <p class="text-xs text-zinc-500 mb-4">
          Sampled once per slideshow weather poll. AQI bands shade the Air Quality category zones.
        </p>
        <WeatherPanel series={weatherSeries} daily={weatherDaily} />
      </section>

      <footer class="mt-8 mono text-xs text-zinc-600 text-center">immich-cast · stats v1</footer>
    {/if}
  </div>
</div>
