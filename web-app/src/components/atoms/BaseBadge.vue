<script setup lang="ts">
interface Props {
  tone?: 'neutral' | 'indigo' | 'emerald' | 'amber' | 'rose';
  dot?: boolean;
}

withDefaults(defineProps<Props>(), {
  tone: 'neutral',
  dot: false,
});
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
    :class="[
      tone === 'neutral'
        ? 'bg-slate-800/80 text-slate-300 border-slate-700'
        : '',
      tone === 'indigo'
        ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
        : '',
      tone === 'emerald'
        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
        : '',
      tone === 'amber'
        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
        : '',
      tone === 'rose'
        ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
        : '',
    ]"
  >
    <span
      v-if="dot"
      class="w-1.5 h-1.5 rounded-full"
      :class="[
        tone === 'neutral' ? 'bg-slate-400' : '',
        tone === 'indigo' ? 'bg-indigo-400' : '',
        tone === 'emerald' ? 'bg-emerald-400' : '',
        tone === 'amber' ? 'bg-amber-400' : '',
        tone === 'rose' ? 'bg-rose-400' : '',
      ]"
    />
    <slot />
  </span>
</template>
