<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import LobbyTemplate from '@/components/templates/LobbyTemplate.vue';
import AppLogo from '@/components/atoms/AppLogo.vue';
import BaseButton from '@/components/atoms/BaseButton.vue';
import BaseInput from '@/components/atoms/BaseInput.vue';
import DeckManagerPanel, {
  type DeckModalMode,
} from '@/components/organisms/DeckManagerPanel.vue';
import { useTheme } from '@/composables/useTheme';
import {
  claimHostTabLock,
  clearHostRoomState,
  generateRoomCode,
  getOrCreateHostToken,
  getOrCreatePlayerId,
  getSavedPlayerName,
  getSavedSpectatorFlag,
  listSavedHostRooms,
  loadCustomDecks,
  saveHostRoomState,
  savePlayerName,
  saveSpectatorFlag,
  type CustomDeck,
} from '@/utils/storage';
import {
  DECK_PRESETS,
  DEFAULT_DECK,
  type RoomState,
  type StoryTask,
  type VoteValue,
} from '@shared/types';

const router = useRouter();
const { theme, toggleTheme } = useTheme();

const hostName = ref(getSavedPlayerName());
const sessionName = ref('Sprint 42: Checkout Pix');
const initialTasksText = ref(
  'US-104: Checkout Pix com QR Code dinâmico\nUS-105: Webhook de confirmação de pagamento\nUS-106: Conciliação automática no painel'
);

const customDecks = ref<CustomDeck[]>(loadCustomDecks());
const selectedDeckId = ref<string>(
  customDecks.value[0]?.id ?? DECK_PRESETS[0].id
);
const previewHighlightedCard = ref<VoteValue>('2');

const isDeckModalOpen = ref(false);
const deckModalMode = ref<DeckModalMode>('create');

function openCreateDeckModal() {
  deckModalMode.value = 'create';
  isDeckModalOpen.value = true;
}

function openManageDecksModal() {
  deckModalMode.value = 'manage';
  isDeckModalOpen.value = true;
}

const joinName = ref(getSavedPlayerName());
const roomCodeInput = ref('');
const joinAsSpectator = ref(getSavedSpectatorFlag());
const createError = ref('');
const joinError = ref('');

const savedHostRooms = ref<RoomState[]>([]);

const allAvailableDecks = computed(() => {
  const customItems = customDecks.value.map((d) => ({
    id: d.id,
    name: d.name,
    cards: d.cards,
    isCustom: true,
  }));
  const presetItems = DECK_PRESETS.map((p) => ({
    id: p.id,
    name: p.label.split(' (')[0],
    cards: [...p.cards],
    isCustom: false,
  }));
  return [...customItems, ...presetItems];
});

const activeSelectedDeck = computed(() => {
  return (
    allAvailableDecks.value.find((d) => d.id === selectedDeckId.value) ??
    allAvailableDecks.value[0] ?? {
      id: 'fibonacci',
      name: 'Fibonacci',
      cards: [...DEFAULT_DECK],
      isCustom: false,
    }
  );
});

const parsedTasksCount = computed(() => {
  return initialTasksText.value
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0).length;
});

function refreshSavedHostRooms() {
  savedHostRooms.value = listSavedHostRooms();
}

function handleDecksUpdated(updated: CustomDeck[]) {
  customDecks.value = updated;
  if (!allAvailableDecks.value.some((d) => d.id === selectedDeckId.value)) {
    selectedDeckId.value = allAvailableDecks.value[0]?.id ?? 'fibonacci';
  }
}

function handleSelectDeckFromManager(payload: {
  id: string;
  name: string;
  cards: VoteValue[];
}) {
  customDecks.value = loadCustomDecks();
  selectedDeckId.value = payload.id;
}

onMounted(() => {
  refreshSavedHostRooms();
  customDecks.value = loadCustomDecks();
});

function handleCreateRoom() {
  const cleanName = hostName.value.trim();
  if (!cleanName) {
    createError.value = 'Informe seu nome para criar a sala como Host.';
    return;
  }
  createError.value = '';

  const roomId = generateRoomCode(6);
  const playerId = getOrCreatePlayerId();
  savePlayerName(cleanName);
  saveSpectatorFlag(false);

  const lines = initialTasksText.value
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const defaultTitle = sessionName.value.trim() || 'US-01: Definir estimativa da história';
  const taskTitles = lines.length > 0 ? lines : [defaultTitle];

  const tasks: StoryTask[] = taskTitles.map((title, idx) => ({
    id: crypto.randomUUID(),
    title,
    status: idx === 0 ? 'voting' : 'pending',
    finalEstimate: null,
  }));

  const firstTask = tasks[0];
  const deck = [...activeSelectedDeck.value.cards];

  const initialRoomState: RoomState = {
    roomId,
    storyTitle: firstTask.title,
    activeTaskId: firstTask.id,
    tasks,
    deck,
    revealed: false,
    hostId: playerId,
    updatedAt: Date.now(),
    players: {
      [playerId]: {
        id: playerId,
        name: cleanName,
        isSpectator: false,
        isHost: true,
        connected: true,
        hasVoted: false,
        vote: null,
      },
    },
  };

  getOrCreateHostToken(roomId);
  saveHostRoomState(roomId, initialRoomState);
  claimHostTabLock(roomId);

  router.push({
    name: 'room',
    params: { roomId },
  });
}

function handleResumeHostRoom(roomId: string) {
  claimHostTabLock(roomId);
  router.push({
    name: 'room',
    params: { roomId },
  });
}

function handleDeleteSavedRoom(roomId: string) {
  clearHostRoomState(roomId);
  refreshSavedHostRooms();
}

function handleJoinRoom() {
  const cleanCode = roomCodeInput.value.trim().toUpperCase();
  const cleanName = joinName.value.trim();

  if (!cleanCode) {
    joinError.value = 'Digite o código da sala.';
    return;
  }
  if (!cleanName) {
    joinError.value = 'Digite seu nome para entrar.';
    return;
  }

  joinError.value = '';
  savePlayerName(cleanName);
  saveSpectatorFlag(joinAsSpectator.value);

  router.push({
    name: 'room',
    params: { roomId: cleanCode },
  });
}
</script>

<template>
  <LobbyTemplate>
    <div class="w-full flex flex-col gap-8">
      <!-- Top Bar -->
      <header
        class="w-full pb-6 flex flex-wrap items-center justify-between gap-4 border-b border-dashed"
        style="border-color: var(--border-dashed);"
      >
        <div class="flex flex-wrap items-center gap-6">
          <AppLogo size="md" />

          <div
            class="hidden sm:block w-px h-9"
            style="background-color: var(--border-card);"
          />

          <div class="flex items-center gap-2.5">
            <h1
              class="text-lg sm:text-2xl font-bold uppercase tracking-wide"
              style="font-family: var(--font-display);"
            >
              LOBBY
              <span
                class="font-semibold"
                style="color: var(--secondary);"
              >
                // CRIAR OU ENTRAR EM SALA
              </span>
            </h1>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <BaseButton
            type="button"
            variant="primary"
            size="md"
            @click="toggleTheme"
          >
            <template v-if="theme === 'dark'">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
              <span>VER LIGHT MODE</span>
            </template>
            <template v-else>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
              <span>VER DARK MODE</span>
            </template>
          </BaseButton>
        </div>
      </header>

      <!-- Main Split Grid: Criar Sala vs Entrar em Sala + Salas Salvas -->
      <div class="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <!-- Left Card (7 cols): Criar Sala como Host -->
        <section
          class="lg:col-span-7 rounded-2xl p-6 sm:p-7 flex flex-col justify-between gap-6"
          style="
            background-color: var(--surface-card);
            border: 2px solid var(--card-active-border);
            box-shadow: var(--shadow-card);
          "
        >
          <div class="flex flex-col gap-5">
            <div
              class="pb-4 border-b border-dashed flex flex-col gap-1"
              style="border-color: var(--border-dashed);"
            >
              <span
                class="text-[11px] font-semibold uppercase tracking-widest"
                style="font-family: var(--font-mono); color: var(--secondary);"
              >
                01 // NOVA SESSÃO (FACILITADOR)
              </span>
              <h2
                class="text-2xl font-bold uppercase tracking-wide"
                style="font-family: var(--font-display);"
              >
                CRIAR SALA COMO HOST
              </h2>
              <p
                class="text-xs sm:text-sm"
                style="color: var(--text-secondary);"
              >
                Configure o sistema de voto e a lista de histórias da sprint.
              </p>
            </div>

            <form
              id="create-room-form"
              class="flex flex-col gap-4"
              @submit.prevent="handleCreateRoom"
            >
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <BaseInput
                  id="create-host-name"
                  v-model="hostName"
                  label="Seu Nome (Host)"
                  placeholder="Ex: Vitor Bruno"
                  :error="createError"
                />

                <BaseInput
                  id="create-session-name"
                  v-model="sessionName"
                  label="Nome da Sprint / Sessão"
                  placeholder="Ex: Sprint 42: Checkout Pix"
                />
              </div>

              <!-- Sistema de Voto (Baralho da Sala) -->
              <div class="flex flex-col gap-2">
                <div class="flex items-center justify-between">
                  <label
                    for="select-room-deck"
                    class="text-xs font-semibold uppercase tracking-wider"
                    style="color: var(--text-secondary);"
                  >
                    Sistema de Voto (Baralho da Sala)
                  </label>
                  <button
                    type="button"
                    class="text-[11px] font-semibold uppercase tracking-wider cursor-pointer hover:underline"
                    style="font-family: var(--font-mono); color: var(--secondary);"
                    @click="openManageDecksModal"
                  >
                    Gerenciar Baralhos
                  </button>
                </div>

                <div class="flex items-center gap-2">
                  <select
                    id="select-room-deck"
                    v-model="selectedDeckId"
                    class="ds-select flex-1 min-w-0 px-3.5 py-2.5 text-sm cursor-pointer focus:outline-none"
                  >
                    <optgroup
                      v-if="customDecks.length > 0"
                      label="Meus Baralhos Salvos"
                    >
                      <option
                        v-for="deck in customDecks"
                        :key="deck.id"
                        :value="deck.id"
                      >
                        ★ {{ deck.name }} ({{ deck.cards.join(', ') }})
                      </option>
                    </optgroup>
                    <optgroup label="Baralhos Padrão">
                      <option
                        v-for="preset in DECK_PRESETS"
                        :key="preset.id"
                        :value="preset.id"
                      >
                        Sistema de Voto ({{ preset.label }})
                      </option>
                    </optgroup>
                  </select>

                  <BaseButton
                    type="button"
                    variant="outline"
                    size="md"
                    @click="openCreateDeckModal"
                  >
                    + Baralho
                  </BaseButton>
                </div>

                <!-- Mini Poker Cards Preview -->
                <div
                  class="rounded-lg p-3 flex flex-col gap-2 mt-1"
                  style="
                    background-color: var(--surface-subtle);
                    border: 1px solid var(--border-card);
                  "
                >
                  <div
                    class="flex items-center justify-between text-[11px]"
                    style="font-family: var(--font-mono); color: var(--text-secondary);"
                  >
                    <span>
                      CARTAS ATIVAS NO BARALHO ({{ activeSelectedDeck.cards.length }} CARTAS)
                    </span>
                    <span>{{ activeSelectedDeck.name }}</span>
                  </div>

                  <div class="ds-cards-scroll flex items-center gap-1.5 overflow-x-auto pt-1 pb-2">
                    <button
                      v-for="card in activeSelectedDeck.cards"
                      :key="card"
                      type="button"
                      class="mini-poker-card shrink-0 cursor-pointer transition-transform"
                      :class="{
                        active: previewHighlightedCard === card,
                      }"
                      @click="previewHighlightedCard = card"
                    >
                      <span class="c-top">{{ card }}</span>
                      <span>{{ card }}</span>
                      <span class="c-bot">{{ card }}</span>
                    </button>

                    <!-- Carta virada (Back face preview) -->
                    <div
                      class="mini-poker-card back shrink-0"
                      title="Verso da carta"
                    >
                      &lt;♠&gt;
                    </div>
                  </div>
                </div>
              </div>

              <!-- Lista de Tasks para Votacao -->
              <div class="flex flex-col gap-1.5">
                <div class="flex items-center justify-between">
                  <label
                    for="create-tasks-list"
                    class="text-xs font-semibold uppercase tracking-wider"
                    style="color: var(--text-secondary);"
                  >
                    Lista de Tasks para Votação (1 por linha)
                  </label>
                  <span
                    class="text-[11px] uppercase"
                    style="font-family: var(--font-mono); color: var(--text-muted);"
                  >
                    {{ parsedTasksCount }}
                    {{ parsedTasksCount === 1 ? 'HISTÓRIA' : 'HISTÓRIAS' }}
                  </span>
                </div>
                <textarea
                  id="create-tasks-list"
                  v-model="initialTasksText"
                  rows="3"
                  placeholder="US-104: Checkout Pix com QR Code dinâmico&#10;US-105: Webhook de confirmação de pagamento"
                  class="ds-textarea w-full px-3.5 py-2.5 text-xs focus:outline-none resize-none"
                />
              </div>
            </form>
          </div>

          <div class="pt-2">
            <BaseButton
              type="submit"
              form="create-room-form"
              variant="primary"
              size="lg"
              full-width
            >
              Criar Sala Agora
            </BaseButton>
          </div>
        </section>

        <!-- Right Column (5 cols): Entrar em uma Sala + Sessões Recentes -->
        <div class="lg:col-span-5 flex flex-col gap-6 justify-between">
          <!-- Card 2: Entrar em uma Sala -->
          <section
            class="rounded-2xl p-6 sm:p-7 flex flex-col justify-between gap-6 flex-1"
            style="
              background-color: var(--surface-card);
              border: 1px solid var(--border-card);
              box-shadow: var(--shadow-card);
            "
          >
            <div class="flex flex-col gap-5">
              <div
                class="pb-4 border-b border-dashed flex flex-col gap-1"
                style="border-color: var(--border-dashed);"
              >
                <span
                  class="text-[11px] font-semibold uppercase tracking-widest"
                  style="font-family: var(--font-mono); color: var(--secondary);"
                >
                  02 // PARTICIPAR DA MESA
                </span>
                <h2
                  class="text-2xl font-bold uppercase tracking-wide"
                  style="font-family: var(--font-display);"
                >
                  ENTRAR EM UMA SALA
                </h2>
                <p
                  class="text-xs sm:text-sm"
                  style="color: var(--text-secondary);"
                >
                  Informe o código compartilhado pelo Facilitador.
                </p>
              </div>

              <form
                id="join-room-form"
                class="flex flex-col gap-4"
                @submit.prevent="handleJoinRoom"
              >
                <BaseInput
                  id="join-room-code"
                  v-model="roomCodeInput"
                  label="Código da Sala (6 caracteres)"
                  placeholder="A7K9X2"
                  :maxlength="12"
                  mono
                />

                <BaseInput
                  id="join-player-name-lobby"
                  v-model="joinName"
                  label="Seu Nome na Mesa"
                  placeholder="Ex: Gustavo Villa"
                  :error="joinError"
                />

                <!-- Toggle Espectador -->
                <button
                  type="button"
                  class="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs cursor-pointer transition-colors"
                  style="
                    background-color: var(--surface-subtle);
                    border: 1px solid var(--border-card);
                    color: var(--text-secondary);
                  "
                  @click="joinAsSpectator = !joinAsSpectator"
                >
                  <span>Entrar apenas como espectador (não vota)</span>
                  <span
                    class="w-9 h-5 rounded-full p-0.5 flex items-center transition-colors"
                    :style="{
                      backgroundColor: joinAsSpectator
                        ? 'var(--secondary)'
                        : 'var(--border-card)',
                      justifyContent: joinAsSpectator ? 'flex-end' : 'flex-start',
                    }"
                  >
                    <span
                      class="w-4 h-4 rounded-full"
                      style="background-color: var(--color-primary);"
                    />
                  </span>
                </button>
              </form>
            </div>

            <div class="pt-2">
              <BaseButton
                type="submit"
                form="join-room-form"
                variant="secondary"
                size="lg"
                full-width
              >
                Entrar na Sala
              </BaseButton>
            </div>
          </section>

          <!-- Card 3: Sessoes Recentes no Navegador (Host) -->
          <section
            class="rounded-2xl p-5 sm:p-6 flex flex-col gap-3"
            style="
              background-color: var(--surface-card);
              border: 1px solid var(--border-card);
              box-shadow: var(--shadow-card);
            "
          >
            <div class="flex items-center justify-between">
              <span
                class="text-[11px] font-semibold uppercase tracking-widest"
                style="font-family: var(--font-mono); color: var(--secondary);"
              >
                03 // SESSÕES RECENTES NO NAVEGADOR (HOST)
              </span>
              <span
                class="text-[11px]"
                style="font-family: var(--font-mono); color: var(--text-secondary);"
              >
                {{ savedHostRooms.length }}
                {{ savedHostRooms.length === 1 ? 'sala salva' : 'salas salvas' }}
              </span>
            </div>

            <div
              v-if="savedHostRooms.length === 0"
              class="rounded-lg px-4 py-3 text-xs"
              style="
                background-color: var(--surface-subtle);
                border: 1px solid var(--border-card);
                color: var(--text-secondary);
              "
            >
              Nenhuma sala de Host salva neste navegador. Quando você criar uma sala, ela ficará disponível aqui para retomada rápida.
            </div>

            <div v-else class="flex flex-col gap-2.5 max-h-44 overflow-y-auto">
              <div
                v-for="room in savedHostRooms"
                :key="room.roomId"
                class="flex items-center justify-between gap-3 rounded-lg px-3.5 py-2.5"
                style="
                  background-color: var(--surface-subtle);
                  border: 1px solid var(--border-card);
                "
              >
                <div class="flex flex-col min-w-0 gap-0.5">
                  <div class="flex items-center gap-2">
                    <span
                      class="px-1.5 py-0.5 rounded text-xs font-bold"
                      style="
                        font-family: var(--font-mono);
                        background-color: var(--secondary-soft);
                        border: 1px solid var(--secondary);
                        color: var(--text-primary);
                      "
                    >
                      #{{ room.roomId }}
                    </span>
                    <span
                      class="text-[11px]"
                      style="font-family: var(--font-mono); color: var(--text-secondary);"
                    >
                      • {{ room.tasks?.length || 0 }} tasks
                    </span>
                  </div>
                  <span
                    class="text-xs truncate"
                    style="color: var(--text-secondary);"
                  >
                    {{ room.storyTitle }}
                  </span>
                </div>

                <div class="flex items-center gap-1.5 shrink-0">
                  <BaseButton
                    size="sm"
                    variant="outline"
                    @click="handleResumeHostRoom(room.roomId)"
                  >
                    Retomar
                  </BaseButton>
                  <button
                    type="button"
                    title="Remover sala salva"
                    class="px-2 py-1 rounded text-xs cursor-pointer transition-colors hover:text-rose-400"
                    style="
                      background-color: var(--surface-card);
                      border: 1px solid var(--border-card);
                      color: var(--text-muted);
                    "
                    @click="handleDeleteSavedRoom(room.roomId)"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <!-- Modal de Baralho -->
      <DeckManagerPanel
        :open="isDeckModalOpen"
        :mode="deckModalMode"
        :selected-deck-id="selectedDeckId"
        @close="isDeckModalOpen = false"
        @select-deck="handleSelectDeckFromManager"
        @decks-updated="handleDecksUpdated"
      />
    </div>
  </LobbyTemplate>
</template>

<style scoped>
.ds-select,
.ds-textarea {
  background-color: var(--surface-input);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-md);
  color: var(--text-primary);
}

.ds-textarea {
  font-family: var(--font-mono);
  line-height: 1.55;
}

.ds-select:focus,
.ds-textarea:focus {
  border-color: var(--secondary);
  box-shadow: 0 0 0 2px var(--secondary-soft);
}

.mini-poker-card {
  width: 42px;
  height: 56px;
  background-color: var(--card-bg);
  border: 1px solid var(--border-card);
  border-radius: 6px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}

.mini-poker-card .c-top {
  position: absolute;
  top: 3px;
  left: 4px;
  font-family: var(--font-mono);
  font-size: 8px;
  font-weight: 600;
  color: var(--text-secondary);
}

.mini-poker-card .c-bot {
  position: absolute;
  bottom: 3px;
  right: 4px;
  font-family: var(--font-mono);
  font-size: 8px;
  font-weight: 600;
  color: var(--text-secondary);
}

.mini-poker-card.active {
  border: 2px solid var(--card-active-border);
  box-shadow: 0 0 0 2px var(--secondary-soft);
  transform: translateY(-2px);
}

.mini-poker-card.back {
  background-color: #1B253B;
  color: #C5D5EA;
  border-color: #1B253B;
  font-family: var(--font-mono);
  font-size: 10px;
}

.ds-cards-scroll::-webkit-scrollbar {
  height: 6px;
}

.ds-cards-scroll::-webkit-scrollbar-button {
  display: none;
  width: 0;
  height: 0;
}

.ds-cards-scroll::-webkit-scrollbar-track {
  background-color: var(--bg-app);
  border-radius: 999px;
}

.ds-cards-scroll::-webkit-scrollbar-thumb {
  background-color: var(--secondary);
  border-radius: 999px;
}

.ds-cards-scroll::-webkit-scrollbar-thumb:hover {
  background-color: var(--color-primary);
}
</style>
