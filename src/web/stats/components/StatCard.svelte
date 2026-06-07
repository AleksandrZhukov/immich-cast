<script lang="ts">
  import { compact, thousands } from '../lib/format';

  const {
    label,
    value,
    accent = 'sky',
    hint,
    delay = 0,
  } = $props<{
    label: string;
    value: number;
    accent?: 'sky' | 'violet' | 'amber';
    hint?: string;
    delay?: number;
  }>();

  let displayed = $state(0);

  $effect(() => {
    const target = value;
    let raf = 0;
    const start = performance.now();
    const dur = 900;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      displayed = Math.round(eased * target);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });

  const accentClass = $derived(
    ({
      sky: 'text-accent',
      violet: 'text-accent-violet',
      amber: 'text-accent-amber',
    })[accent as 'sky' | 'violet' | 'amber'],
  );
</script>

<div class="panel px-5 py-4 fade-up" style="animation-delay: {delay}ms">
  <div class="text-xs uppercase tracking-wider text-zinc-500 font-medium">{label}</div>
  <div class="mt-2 flex items-baseline gap-2">
    <span class="mono text-3xl font-semibold {accentClass}">{compact(displayed)}</span>
    {#if value >= 1000}
      <span class="mono text-xs text-zinc-500">{thousands(value)}</span>
    {/if}
  </div>
  {#if hint}
    <div class="mt-1 text-xs text-zinc-500">{hint}</div>
  {/if}
</div>
