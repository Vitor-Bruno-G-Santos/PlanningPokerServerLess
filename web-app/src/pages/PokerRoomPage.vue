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
const isCloseRoomModalOpen = ref(false);
const isAddTaskModalOpen = ref(false);
const newTaskDraft = ref('');

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

const isLastTask = computed(() => {
  const tasks = roomState.value?.tasks ?? [];
  if (tasks.length === 0) return true;
  const activeId = roomState.value?.activeTaskId;
  const currentIndex = tasks.findIndex((t) => t.id === activeId);
  if (currentIndex === -1) {
    return tasks.every((t) => t.status === 'completed');
  }
  if (currentIndex === tasks.length - 1) {
    return true;
  }
  const remainingTasks = tasks.slice(currentIndex + 1);
  return !remainingTasks.some((t) => t.status === 'pending');
});

onMounted(() => {
  connect();
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

function confirmCloseRoom() {
  isCloseRoomModalOpen.value = false;
  handleCloseRoom();
}

function handleConfirmAddTask() {
  const clean = newTaskDraft.value.trim();
  if (!clean) return;
  addTask(clean, true);
  newTaskDraft.value = '';
  isAddTaskModalOpen.value = false;
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
          :is-anonymous="roomState?.isAnonymous ?? false"
          :total-voted="stats.totalVoted"
          :total-active-players="stats.totalActivePlayers"
          :active-players="activePlayers"
          :deck="roomState?.deck ?? [...DEFAULT_DECK]"
          :is-last-task="isLastTask"
          @reveal-votes="revealVotes"
          @start-new-round="startNewRound"
          @manage-decks="isDeckManagerOpen = true"
          @close-room="isCloseRoomModalOpen = true"
          @add-task="isAddTaskModalOpen = true"
        />
      </div>
    </template>

    <template #results>
      <ResultsPanel
        :stats="stats"
        :revealed="roomState?.revealed ?? false"
        :is-anonymous="roomState?.isAnonymous ?? false"
      />
    </template>

    <template #table>
      <PokerTable
        :players="playersList"
        :current-player-id="playerId"
        :revealed="roomState?.revealed ?? false"
        :is-host="isHost"
        :is-anonymous="roomState?.isAnonymous ?? false"
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

      <!-- Modal de Confirmação: Encerrar Sala (Host) -->
      <div
        v-if="isCloseRoomModalOpen"
        class="modal-backdrop open"
        @click.self="isCloseRoomModalOpen = false"
      >
        <div
          class="modal-dialog danger-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="page-close-modal-title"
        >
          <span class="modal-tag danger">AÇÃO IRREVERSÍVEL</span>
          <h3
            id="page-close-modal-title"
            class="modal-title"
          >
            TEM CERTEZA QUE DESEJA ENCERRAR A SALA?
          </h3>
          <p class="modal-desc">
            Ao encerrar a sala <strong>#{{ roomId }}</strong>, a sessão será finalizada imediatamente e todos os participantes conectados serão desconectados.
          </p>
          <div class="modal-actions">
            <button
              type="button"
              class="btn-ds btn-outline"
              @click="isCloseRoomModalOpen = false"
            >
              CANCELAR
            </button>
            <button
              type="button"
              class="btn-ds btn-danger-solid"
              @click="confirmCloseRoom"
            >
              SIM, ENCERRAR SALA
            </button>
          </div>
        </div>
      </div>

      <!-- Modal: Adicionar Task (Host) -->
      <div
        v-if="isAddTaskModalOpen"
        class="modal-backdrop open"
        @click.self="isAddTaskModalOpen = false"
      >
        <div
          class="modal-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="page-add-task-modal-title"
        >
          <span class="modal-tag primary">NOVA HISTÓRIA</span>
          <h3
            id="page-add-task-modal-title"
            class="modal-title"
          >
            ADICIONAR TASK PARA VOTAÇÃO
          </h3>
          <p class="modal-desc">
            Insira o nome ou código da história para a equipe estimar nesta rodada.
          </p>
          <form
            class="modal-form"
            @submit.prevent="handleConfirmAddTask"
          >
            <div class="field-group">
              <label
                for="page-add-task-input"
                class="field-label"
              >
                TÍTULO DA TASK
              </label>
              <input
                id="page-add-task-input"
                v-model="newTaskDraft"
                type="text"
                class="field-input"
                placeholder="Ex: US-106: Autenticação de dois fatores (2FA)"
                maxlength="140"
                autofocus
              />
            </div>
            <div class="modal-actions">
              <button
                type="button"
                class="btn-ds btn-outline"
                @click="isAddTaskModalOpen = false"
              >
                CANCELAR
              </button>
              <button
                type="submit"
                class="btn-ds btn-primary"
                :disabled="!newTaskDraft.trim()"
              >
                ADICIONAR E VOTAR
              </button>
            </div>
          </form>
        </div>
      </div>
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

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: var(--surface-overlay);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-M);
  z-index: 100;
}

.modal-dialog {
  width: 100%;
  max-width: 460px;
  background: var(--surface-card);
  border: 2px solid var(--border-card);
  border-radius: var(--radius-lg);
  padding: var(--space-L);
  box-shadow: var(--shadow-modal);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-dialog.danger-modal {
  border-color: var(--danger-border);
}

.modal-tag {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  width: fit-content;
}

.modal-tag.danger {
  background: var(--danger-soft);
  color: var(--danger);
}

.modal-tag.primary {
  background: var(--secondary-soft);
  color: var(--secondary);
}

.modal-title {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-primary);
  line-height: 1.2;
}

.modal-desc {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
}

.field-input {
  background: var(--surface-subtle);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  font-size: 13px;
  color: var(--text-primary);
  font-family: var(--font-body);
}

.field-input:focus {
  outline: none;
  border-color: var(--secondary);
}

.modal-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 8px;
  border-top: 1px dashed var(--border-dashed);
}

.btn-ds {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
  border-radius: var(--radius-md);
  padding: 9px 14px;
  cursor: pointer;
  transition: all 0.16s ease;
  border: 1px solid transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  white-space: nowrap;
  user-select: none;
}

.btn-ds:active {
  transform: translateY(1px);
}

.btn-primary {
  background: var(--btn-primary-bg);
  color: var(--btn-primary-text);
  border-color: var(--btn-primary-bg);
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.92;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-outline {
  background: var(--surface-card);
  color: var(--text-primary);
  border: 1px solid var(--border-card);
}

.btn-outline:hover {
  border-color: var(--secondary);
  background: var(--surface-subtle);
}

.btn-danger-solid {
  background: var(--danger);
  color: #FFFFFF;
  border: 1px solid var(--danger);
}

.btn-danger-solid:hover {
  filter: brightness(0.93);
}
</style>
