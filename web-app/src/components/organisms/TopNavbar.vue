<script setup lang="ts">
import type { ConnectionStatus } from '@/composables/usePokerRoom';
import BaseBadge from '@/components/atoms/BaseBadge.vue';
import BaseButton from '@/components/atoms/BaseButton.vue';
import RoomShareBar from '@/components/molecules/RoomShareBar.vue';

interface Props {
  roomId: string;
  playerName: string;
  isHost: boolean;
  isSpectator: boolean;
  connectionStatus: ConnectionStatus;
  hostOnline: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  toggleSpectator: [];
  leaveRoom: [];
  closeRoom: [];
}>();
</script>

<template>
  <header
    class="w-full border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md sticky top-0 z-30"
  >
    <div
      class="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3"
    >
      <!-- Logo & Titulo -->
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="flex items-center gap-2.5 text-left group cursor-pointer"
          @click="emit('leaveRoom')"
        >
          <div
            class="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-600/30 font-black text-white text-sm"
          >
            PP
          </div>
          <div class="hidden sm:flex flex-col">
            <span class="text-sm font-extrabold tracking-tight text-white">
              Planning Poker
            </span>
            <span class="text-[10px] text-slate-400">
              Host Source-of-Truth
            </span>
          </div>
        </button>

        <RoomShareBar :room-id="roomId" />
      </div>

      <!-- Status da Conexao & Controles do Jogador -->
      <div class="flex items-center gap-2.5">
        <BaseBadge
          :tone="
            connectionStatus === 'connected' && hostOnline
              ? 'emerald'
              : connectionStatus === 'connecting' || connectionStatus === 'reconnecting'
                ? 'amber'
                : 'rose'
          "
          dot
        >
          <template v-if="connectionStatus === 'connected' && hostOnline">
            Online
          </template>
          <template v-else-if="!hostOnline">
            Aguardando Host...
          </template>
          <template v-else-if="connectionStatus === 'reconnecting'">
            Reconectando...
          </template>
          <template v-else>
            Conectando...
          </template>
        </BaseBadge>

        <BaseBadge v-if="isHost" tone="amber">
          Host da Sala
        </BaseBadge>

        <BaseButton
          size="sm"
          :variant="isSpectator ? 'primary' : 'secondary'"
          @click="emit('toggleSpectator')"
        >
          {{ isSpectator ? 'Modo Espectador (Ativo)' : 'Virar Espectador' }}
        </BaseButton>

        <BaseButton
          v-if="isHost"
          size="sm"
          variant="danger"
          @click="emit('closeRoom')"
        >
          Encerrar Sala
        </BaseButton>
      </div>
    </div>
  </header>
</template>
