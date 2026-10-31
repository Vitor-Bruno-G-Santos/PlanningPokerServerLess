<script setup lang="ts">
interface Props {
  label: string;
  value: string | number;
  sublabel?: string;
  highlight?: boolean;
}

withDefaults(defineProps<Props>(), {
  sublabel: '',
  highlight: false,
});
</script>

<template>
  <div
    class="rounded-2xl border p-4 flex flex-col justify-between transition-colors"
    :class="[
      highlight
        ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
        : 'bg-slate-900/80 border-slate-800 text-slate-100',
    ]"
  >
    <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">
      {{ label }}
    </span>
    <div class="my-1 text-2xl sm:text-3xl font-extrabold tracking-tight">
      {{ value }}
    </div>
    <span v-if="sublabel" class="text-xs text-slate-400">
      {{ sublabel }}
    </span>
  </div>
</template>
