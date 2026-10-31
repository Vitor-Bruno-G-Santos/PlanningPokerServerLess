<script setup lang="ts">
import type { Player } from '@shared/types';
import PlayingCard from '@/components/atoms/PlayingCard.vue';
import UserAvatar from '@/components/atoms/UserAvatar.vue';

interface Props {
  player: Player;
  revealed: boolean;
  isCurrentUser?: boolean;
}

withDefaults(defineProps<Props>(), {
  isCurrentUser: false,
});
</script>

<template>
  <div
    class="flex flex-col items-center gap-2 p-2.5 rounded-2xl transition-all duration-200 min-w-[96px]"
    :class="[
      isCurrentUser
        ? 'bg-indigo-950/35 ring-1 ring-indigo-500/40'
        : 'bg-slate-900/40',
    ]"
  >
    <!-- Carta do jogador ou icone de espectador -->
    <div class="h-20 flex items-center justify-center">
      <div
        v-if="player.isSpectator"
        class="w-14 h-20 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-col items-center justify-center gap-1 text-slate-400"
        title="Espectador"
      >
        <span class="text-xs font-semibold uppercase tracking-wider">Olhando</span>
      </div>
      <PlayingCard
        v-else
        size="md"
        :value="player.vote"
        :has-voted="player.hasVoted"
        :face-up="revealed && player.vote !== null"
      />
    </div>

    <!-- Avatar + Nome + Tag Você -->
    <div class="flex flex-col items-center gap-1">
      <UserAvatar
        size="sm"
        :name="player.name"
        :is-host="player.isHost"
        :is-spectator="player.isSpectator"
        :connected="player.connected"
      />
      <div class="flex items-center gap-1 max-w-[110px]">
        <span
          class="text-xs font-semibold truncate"
          :class="player.connected ? 'text-slate-200' : 'text-slate-500 line-through'"
          :title="player.name"
        >
          {{ player.name }}
        </span>
        <span
          v-if="isCurrentUser"
          class="text-[10px] font-bold uppercase px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300"
        >
          você
        </span>
      </div>
    </div>
  </div>
</template>
