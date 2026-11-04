<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
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
import DeckManagerPanel from '@/components/organisms/DeckManagerPanel.vue';
import type { VoteValue } from '@shared/types';

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
  updateDeck,
  addTask,
  selectTask,
  editTask,
  removeTask,
  revealVotes,
  startNewRound,
  closeRoom,
} = usePokerRoom({
  roomId: roomIdParam,
});

const sidebarCollapsed = ref(
  typeof window !== 'undefined' ? window.innerWidth <= 900 : false
);
const isDeckManagerOpen = ref(false);

function handleSelectDeckFromManager(payload: {
  id: string;
  name: string;
  cards: VoteValue[];
}) {
  updateDeck(payload.cards);
  isDeckManagerOpen.value = false;
}

watch(roomClosed, (closed) => {
  if (closed) {
    router.push({ name: 'lobby' });
  }
});

const { playersList, activePlayers, stats } = usePokerStats(roomState);

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
        @manage-decks="isDeckManagerOpen = true"
        @leave-room="handleLeaveRoom"
        @close-room="handleCloseRoom"
      />
    </template>

    <template #sidebar>
      <TaskListPanel
        :tasks="roomState?.tasks ?? []"
        :active-task-id="roomState?.activeTaskId ?? null"
        :is-host="isHost"
        :collapsed="sidebarCollapsed"
        @add-task="addTask"
        @select-task="selectTask"
        @edit-task="editTask"
        @remove-task="removeTask"
        @toggle-collapse="sidebarCollapsed = !sidebarCollapsed"
      />
    </template>

    <template #header>
      <div class="stage-header-stack">
        <!-- Alerta caso o Host desconecte temporariamente -->
        <div
          v-if="!hostOnline && !isHost"
          class="room-banner warning"
        >
          <span>
            O Host da sala está reconectando. A sala sincronizará automaticamente assim que ele voltar.
          </span>
        </div>

        <div
          v-if="lastError"
          class="room-banner danger"
        >
          {{ lastError }}
        </div>

        <StoryHeader
          :story-title="roomState?.storyTitle ?? 'Carregando sala...'"
          :is-host="isHost"
          :revealed="roomState?.revealed ?? false"
          :total-voted="stats.totalVoted"
          :total-active-players="stats.totalActivePlayers"
          :active-players="activePlayers"
          :deck="roomState?.deck ?? [...DEFAULT_DECK]"
          @reveal-votes="revealVotes"
          @start-new-round="startNewRound"
          @manage-decks="isDeckManagerOpen = true"
        />
      </div>
    </template>

    <template #results>
      <ResultsPanel
        :stats="stats"
        :revealed="roomState?.revealed ?? false"
      />
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
      />
    </template>

    <template #dock>
      <CardDeckDock
        :selected-vote="myVote"
        :deck="roomState?.deck ?? [...DEFAULT_DECK]"
        :is-host="isHost"
        :disabled="(roomState?.revealed ?? false) || (!hostOnline && !isHost)"
        :is-spectator="isSpectator"
        :sidebar-collapsed="sidebarCollapsed"
        @select-vote="castVote"
        @update-deck="updateDeck"
      />
    </template>

    <template #modals>
      <JoinRoomModal
        :open="needsNamePrompt"
        :room-id="roomId"
        :initial-name="playerName"
        @submit="handleModalSubmit"
      />

      <DeckManagerPanel
        v-if="isHost"
        :open="isDeckManagerOpen"
        mode="manage"
        :current-room-cards="roomState?.deck ?? [...DEFAULT_DECK]"
        @close="isDeckManagerOpen = false"
        @select-deck="handleSelectDeckFromManager"
      />
    </template>
  </GameRoomTemplate>
</template>

<style scoped>
.stage-header-stack {
  width: 100%;
  max-width: 880px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.room-banner {
  width: 100%;
  border-radius: var(--radius-md);
  padding: 10px 14px;
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
}

.room-banner.warning {
  background: var(--warning-soft);
  border: 1px solid var(--warning-border);
  color: var(--warning);
}

.room-banner.danger {
  background: var(--danger-soft);
  border: 1px solid var(--danger-border);
  color: var(--danger);
}
</style>
