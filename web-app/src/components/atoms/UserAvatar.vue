<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  name: string;
  isHost?: boolean;
  isSpectator?: boolean;
  connected?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const props = withDefaults(defineProps<Props>(), {
  isHost: false,
  isSpectator: false,
  connected: true,
  size: 'md',
});

const initials = computed(() => {
  const parts = props.name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
});

const colorClasses = computed(() => {
  const palette = [
    'from-indigo-500 to-violet-600',
    'from-emerald-500 to-teal-600',
    'from-sky-500 to-blue-600',
    'from-amber-500 to-orange-600',
    'from-fuchsia-500 to-pink-600',
    'from-cyan-500 to-indigo-600',
  ];
  let hash = 0;
  for (let i = 0; i < props.name.length; i++) {
    hash = props.name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
});
</script>

<template>
  <div class="relative inline-flex items-center justify-center select-none">
    <div
      class="rounded-full bg-gradient-to-br font-bold text-white flex items-center justify-center shadow-md ring-2 ring-slate-900 transition-opacity"
      :class="[
        colorClasses,
        !connected ? 'opacity-40 grayscale' : '',
        size === 'sm' ? 'w-8 h-8 text-xs' : '',
        size === 'md' ? 'w-10 h-10 text-xs' : '',
        size === 'lg' ? 'w-12 h-12 text-sm' : '',
      ]"
    >
      {{ initials }}
    </div>

    <!-- Indicador de presenca online/offline -->
    <span
      class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-slate-950"
      :class="connected ? 'bg-emerald-400' : 'bg-slate-500'"
      :title="connected ? 'Conectado' : 'Desconectado'"
    />

    <!-- Coroa discreta caso seja o Host -->
    <span
      v-if="isHost"
      class="absolute -top-1.5 -right-1.5 bg-amber-500 text-slate-950 text-[10px] font-black px-1 rounded-full shadow"
      title="Host da Sala"
    >
      H
    </span>
  </div>
</template>
