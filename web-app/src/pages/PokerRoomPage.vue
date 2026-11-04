<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { DEFAULT_DECK } from '@shared/types';
import { usePokerRoom } from '@/composables/usePokerRoom';
import { usePokerStats } from '@/composables/usePokerStats';
import GameRoomTemplate from '@/components/templates/GameRoomTemplate.vue';
import TopNavbar from '@/components/organisms/TopNavbar.vue';
import StoryHeader from '@/components/molecules/StoryHeader.vue';
import PokerTable from '@/components/organisms/PokerTable.vue';
import ResultsPanel from '@/components/organisms/ResultsPanel.vue';
import CardDeckDock from '@/components/organisms/CardDeckDock.vue';
import TaskListPanel from '@/components/organisms/TaskListPanel.vue';
import JoinRoomModal from '@/components/organisms/JoinRoomModal.vue';

const route = useRoute();
const router = useRouter();

const roomIdParam = String(route.params.roomId || 'DEFAULT').toUpperCase();

// Remove qualquer ?role=host da URL para evitar compartilhamento acidental ou tentativa de uso via query string
if (route.query.role !== undefined) {
  router.replace({
    name: 'room',
    params: { roomId: roomIdParam },
    query: {},
  });
}

const {
  roomId,
  playerId,
  playerName,
  isSpectator,
  isHost,
  myVote,
  roomState,
  connectionStatus,
  hostOnline,
  roomClosed,
  lastError,
  needsNamePrompt,
  connect,
  joinRoom,
  castVote,
  toggleSpectator,
  updateStoryTitle,
  updateDeck,
  addTask,
  selectTask,
  removeTask,
  revealVotes,
  startNewRound,
  closeRoom,
} = usePokerRoom({
  roomId: roomIdParam,
});

watch(roomClosed, (closed) => {
  if (closed) {
    router.push({ name: 'lobby' });
  }
});

const { playersList, stats } = usePokerStats(roomState);

const hasNextPendingTask = computed(() => {
  const tasks = roomState.value?.tasks ?? [];
  return tasks.some(
    (t) => t.status === 'pending' && t.id !== roomState.value?.activeTaskId
  );
});

onMounted(() => {
  if (!needsNamePrompt.value) {
    connect();
  }
});

function handleModalSubmit(payload: { name: string; isSpectator: boolean }) {
  joinRoom(payload.name, payload.isSpectator);
}

function handleLeaveRoom() {
  router.push({ name: 'lobby' });
}

function handleCloseRoom() {
  closeRoom();
  router.push({ name: 'lobby' });
}
</script>

<template>
  <GameRoomTemplate>
    <template #navbar>
      <TopNavbar
        :room-id="roomId"
        :player-name="playerName"
        :is-host="isHost"
        :is-spectator="isSpectator"
        :connection-status="connectionStatus"
        :host-online="hostOnline"
        @toggle-spectator="toggleSpectator"
        @leave-room="handleLeaveRoom"
        @close-room="handleCloseRoom"
      />
    </template>

    <template #header>
      <div class="flex flex-col gap-3">
        <!-- Alerta caso o Host desconecte temporariamente -->
        <div
          v-if="!hostOnline && !isHost"
          class="rounded-xl bg-amber-500/15 border border-amber-500/40 px-4 py-2.5 text-xs text-amber-200 flex items-center justify-between"
        >
          <span>
            O Host da sala está reconectando (ex: recarregou a página). A mesa sincronizará automaticamente assim que ele voltar.
          </span>
        </div>

        <div
          v-if="lastError"
          class="rounded-xl bg-rose-500/15 border border-rose-500/40 px-4 py-2.5 text-xs text-rose-200"
        >
          {{ lastError }}
        </div>

        <StoryHeader
          :story-title="roomState?.storyTitle ?? 'Carregando sala...'"
          :is-host="isHost"
          :revealed="roomState?.revealed ?? false"
          @update-title="updateStoryTitle"
        />
      </div>
    </template>

    <template #table>
      <PokerTable
        :players="playersList"
        :current-player-id="playerId"
        :revealed="roomState?.revealed ?? false"
        :is-host="isHost"
        :total-voted="stats.totalVoted"
        :total-active-players="stats.totalActivePlayers"
        :has-next-pending-task="hasNextPendingTask"
        @reveal-votes="revealVotes"
        @start-new-round="startNewRound"
      />
    </template>

    <template #results>
      <ResultsPanel
        :stats="stats"
        :revealed="roomState?.revealed ?? false"
      />
    </template>

    <template #dock>
      <CardDeckDock
        :selected-vote="myVote"
        :deck="roomState?.deck ?? [...DEFAULT_DECK]"
        :is-host="isHost"
        :disabled="(roomState?.revealed ?? false) || (!hostOnline && !isHost)"
        :is-spectator="isSpectator"
        @select-vote="castVote"
        @update-deck="updateDeck"
      />
    </template>

    <template #sidebar>
      <TaskListPanel
        :tasks="roomState?.tasks ?? []"
        :active-task-id="roomState?.activeTaskId ?? null"
        :is-host="isHost"
        @add-task="addTask"
        @select-task="selectTask"
        @remove-task="removeTask"
      />
    </template>

    <template #modals>
      <JoinRoomModal
        :open="needsNamePrompt"
        :room-id="roomId"
        :initial-name="playerName"
        @submit="handleModalSubmit"
      />
    </template>
  </GameRoomTemplate>
</template>
