<script setup lang="ts">
import { computed } from 'vue';
import type { Player } from '@shared/types';
import BaseButton from '@/components/atoms/BaseButton.vue';
import PlayerSeat from '@/components/molecules/PlayerSeat.vue';

interface Props {
  players: Player[];
  currentPlayerId: string;
  revealed: boolean;
  isHost: boolean;
  totalVoted: number;
  totalActivePlayers: number;
  hasNextPendingTask?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  hasNextPendingTask: false,
});

const emit = defineEmits<{
  revealVotes: [];
  startNewRound: [forceRevoteCurrent: boolean];
}>();

/**
 * Distribui os jogadores entre o lado superior e inferior da mesa oval.
 */
const topSeats = computed(() =>
  props.players.filter((_, index) => index % 2 === 0)
);

const bottomSeats = computed(() =>
  props.players.filter((_, index) => index % 2 === 1)
);
</script>

<template>
  <div class="w-full flex flex-col items-center justify-center gap-6 py-4">
    <!-- Fileira Superior de Assentos -->
    <div class="flex flex-wrap items-center justify-center gap-3 sm:gap-5 min-h-[140px]">
      <PlayerSeat
        v-for="player in topSeats"
        :key="player.id"
        :player="player"
        :revealed="revealed"
        :is-current-user="player.id === currentPlayerId"
      />
    </div>

    <!-- Centro da Mesa Oval -->
    <div
      class="relative w-full max-w-2xl min-h-[170px] rounded-[64px] border-2 border-slate-800 bg-gradient-to-b from-slate-900/95 via-slate-900 to-slate-950 shadow-2xl shadow-indigo-950/30 px-6 py-6 flex flex-col items-center justify-center text-center gap-3"
    >
      <div
        class="absolute inset-2 rounded-[56px] border border-indigo-500/15 pointer-events-none"
      />

      <!-- Indicador de Contagem de Votos -->
      <div class="flex flex-col items-center gap-1">
        <span class="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Status da Rodada
        </span>
        <p v-if="!revealed" class="text-sm sm:text-base font-bold text-slate-200">
          {{ totalVoted }} de {{ totalActivePlayers }}
          {{ totalActivePlayers === 1 ? 'participante votou' : 'participantes votaram' }}
        </p>
        <p v-else class="text-sm sm:text-base font-bold text-emerald-400">
          Cartas na mesa reveladas!
        </p>
      </div>

      <!-- Barra de Progresso antes do Reveal -->
      <div
        v-if="!revealed && totalActivePlayers > 0"
        class="w-48 h-2 rounded-full bg-slate-800 overflow-hidden"
      >
        <div
          class="h-full bg-indigo-500 transition-all duration-300"
          :style="{
            width: `${Math.round((totalVoted / totalActivePlayers) * 100)}%`,
          }"
        />
      </div>

      <!-- Controles exclusivos do Host no centro da mesa -->
      <div v-if="isHost" class="mt-2 flex flex-wrap items-center justify-center gap-2.5">
        <BaseButton
          v-if="!revealed"
          variant="primary"
          size="md"
          :disabled="totalVoted === 0"
          @click="emit('revealVotes')"
        >
          Revelar Cartas ({{ totalVoted }})
        </BaseButton>
        <template v-else>
          <BaseButton
            v-if="hasNextPendingTask"
            variant="emerald"
            size="md"
            @click="emit('startNewRound', false)"
          >
            Próxima Task →
          </BaseButton>
          <BaseButton
            variant="secondary"
            size="md"
            @click="emit('startNewRound', true)"
          >
            Revotar Esta Task
          </BaseButton>
        </template>
      </div>

      <!-- Mensagem para jogadores comuns -->
      <p v-else class="text-xs text-slate-400">
        <template v-if="!revealed">
          Escolha sua carta abaixo. O Host revelará quando todos votarem.
        </template>
        <template v-else>
          Aguardando o Host selecionar a próxima task ou iniciar nova rodada.
        </template>
      </p>
    </div>

    <!-- Fileira Inferior de Assentos -->
    <div
      v-if="bottomSeats.length > 0"
      class="flex flex-wrap items-center justify-center gap-3 sm:gap-5 min-h-[140px]"
    >
      <PlayerSeat
        v-for="player in bottomSeats"
        :key="player.id"
        :player="player"
        :revealed="revealed"
        :is-current-user="player.id === currentPlayerId"
      />
    </div>
  </div>
</template>
