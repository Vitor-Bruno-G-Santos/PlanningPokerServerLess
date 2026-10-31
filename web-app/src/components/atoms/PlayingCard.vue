<script setup lang="ts">
import type { VoteValue } from '@shared/types';

interface Props {
  value?: VoteValue | null;
  /**
   * Define se a carta na mesa mostra a face com o numero (`true`)
   * ou o verso geometrico (`false`). No dock de selecao, é sempre `true`.
   */
  faceUp?: boolean;
  /**
   * Indica se o jogador ja depositou voto na mesa (quando `faceUp === false`).
   */
  hasVoted?: boolean;
  /**
   * Destaca a carta selecionada no dock do jogador.
   */
  selected?: boolean;
  disabled?: boolean;
  interactive?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

withDefaults(defineProps<Props>(), {
  value: null,
  faceUp: true,
  hasVoted: false,
  selected: false,
  disabled: false,
  interactive: false,
  size: 'md',
});

const emit = defineEmits<{
  select: [value: VoteValue];
}>();
</script>

<template>
  <div
    class="perspective-1000 select-none"
    :class="[
      size === 'sm' ? 'w-12 h-17' : '',
      size === 'md' ? 'w-14 h-20' : '',
      size === 'lg' ? 'w-16 h-24' : '',
      interactive && !disabled ? 'cursor-pointer group' : '',
      disabled ? 'opacity-45 pointer-events-none' : '',
    ]"
    @click="interactive && !disabled && value ? emit('select', value) : undefined"
  >
    <!-- Slot vazio na mesa (jogador ainda nao votou) -->
    <div
      v-if="!faceUp && !hasVoted"
      class="w-full h-full rounded-xl border-2 border-dashed border-slate-700/70 bg-slate-900/40 flex items-center justify-center transition-all duration-300"
    >
      <span class="w-2 h-2 rounded-full bg-slate-700" />
    </div>

    <!-- Container 3D com Flip entre Verso (voto secreto depositado) e Frente (revelado ou carta do dock) -->
    <div
      v-else
      class="relative w-full h-full transition-transform duration-500 transform-3d"
      :class="[
        !faceUp ? 'rotate-y-180' : '',
        interactive && selected
          ? '-translate-y-3 scale-105'
          : interactive
            ? 'group-hover:-translate-y-1.5'
            : '',
      ]"
    >
      <!-- FRENTE DA CARTA (Valor Fibonacci) -->
      <div
        class="absolute inset-0 w-full h-full rounded-xl backface-hidden flex flex-col items-center justify-between p-1.5 border shadow-lg transition-colors"
        :class="[
          selected
            ? 'bg-gradient-to-b from-indigo-500 to-indigo-700 border-indigo-300 text-white shadow-indigo-500/30 ring-2 ring-indigo-400/60'
            : 'bg-gradient-to-b from-slate-800 to-slate-900 border-slate-600/80 text-slate-100 hover:border-indigo-400/70',
        ]"
      >
        <span class="self-start text-[10px] font-bold leading-none opacity-70">
          {{ value ?? '?' }}
        </span>
        <span
          class="font-extrabold tracking-tight"
          :class="[
            size === 'sm' ? 'text-base' : '',
            size === 'md' ? 'text-lg' : '',
            size === 'lg' ? 'text-xl' : '',
          ]"
        >
          {{ value ?? '?' }}
        </span>
        <span class="self-end text-[10px] font-bold leading-none opacity-70 rotate-180">
          {{ value ?? '?' }}
        </span>
      </div>

      <!-- VERSO DA CARTA (Voto depositado e mascarado na mesa) -->
      <div
        class="absolute inset-0 w-full h-full rounded-xl backface-hidden rotate-y-180 border-2 border-indigo-400/80 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 shadow-lg shadow-indigo-950/60 flex items-center justify-center p-1.5"
      >
        <div
          class="w-full h-full rounded-lg border border-indigo-300/30 bg-[radial-gradient(#ffffff22_1px,transparent_1px)] [background-size:6px_6px] flex items-center justify-center"
        >
          <div class="w-4 h-4 rounded-full bg-indigo-300/25 border border-indigo-200/50" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.perspective-1000 {
  perspective: 1000px;
}
.transform-3d {
  transform-style: preserve-3d;
}
.backface-hidden {
  backface-visibility: hidden;
}
.rotate-y-180 {
  transform: rotateY(180deg);
}
</style>
