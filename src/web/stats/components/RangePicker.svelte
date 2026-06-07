<script lang="ts">
  export type RangeKey = '7d' | '30d' | '90d' | '1y' | 'all';

  const {
    value,
    onChange,
  } = $props<{
    value: RangeKey;
    onChange: (key: RangeKey) => void;
  }>();

  const options: { key: RangeKey; label: string }[] = [
    { key: '7d', label: '7d' },
    { key: '30d', label: '30d' },
    { key: '90d', label: '90d' },
    { key: '1y', label: '1y' },
    { key: 'all', label: 'all' },
  ];
</script>

<div class="inline-flex items-center gap-0.5 p-1 rounded-full border border-white/8 bg-white/[0.02] backdrop-blur">
  {#each options as opt}
    <button
      class="mono px-3 py-1 text-xs rounded-full transition-colors {value === opt.key
        ? 'bg-sky-400/20 text-accent'
        : 'text-zinc-400 hover:text-zinc-200'}"
      onclick={() => onChange(opt.key)}
    >
      {opt.label}
    </button>
  {/each}
</div>
