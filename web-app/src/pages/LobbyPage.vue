<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import LobbyTemplate from '@/components/templates/LobbyTemplate.vue';
import BaseButton from '@/components/atoms/BaseButton.vue';
import BaseInput from '@/components/atoms/BaseInput.vue';
import BaseBadge from '@/components/atoms/BaseBadge.vue';
import {
  claimHostTabLock,
  clearHostRoomState,
  generateRoomCode,
  getOrCreateHostToken,
  getOrCreatePlayerId,
  getSavedPlayerName,
  listSavedHostRooms,
  saveHostRoomState,
  savePlayerName,
  saveSpectatorFlag,
} from '@/utils/storage';
import {
  DECK_PRESETS,
  DEFAULT_DECK,
  parseDeckString,
  type RoomState,
  type StoryTask,
} from '@shared/types';

const router = useRouter();

const hostName = ref(getSavedPlayerName());
const initialTasksText = ref(
  'US-01: Autenticação OAuth\nUS-02: Tela de Dashboard\nUS-03: Exportação de Relatório'
);
const customDeckInput = ref(DEFAULT_DECK.join(', '));
const selectedPresetId = ref('fibonacci');

const joinName = ref(getSavedPlayerName());
const roomCodeInput = ref('');
const createError = ref('');
const joinError = ref('');

const savedHostRooms = ref<RoomState[]>([]);

function refreshSavedHostRooms() {
  savedHostRooms.value = listSavedHostRooms();
}

onMounted(() => {
  refreshSavedHostRooms();
});

function handlePresetChange(presetId: string) {
  selectedPresetId.value = presetId;
  const preset = DECK_PRESETS.find((p) => p.id === presetId);
  if (preset) {
    customDeckInput.value = preset.cards.join(', ');
  }
}

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

  const taskTitles =
    lines.length > 0 ? lines : ['US-01: Definir estimativa da história'];

  const tasks: StoryTask[] = taskTitles.map((title, idx) => ({
    id: crypto.randomUUID(),
    title,
    status: idx === 0 ? 'voting' : 'pending',
    finalEstimate: null,
  }));

  const firstTask = tasks[0];
  const deck = parseDeckString(customDeckInput.value);

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

  router.push({
    name: 'room',
    params: { roomId: cleanCode },
  });
}
</script>

<template>
  <LobbyTemplate>
    <div class="w-full max-w-4xl flex flex-col items-center gap-10">
      <!-- Hero Header -->
      <div class="flex flex-col items-center text-center gap-3 max-w-2xl">
        <BaseBadge tone="indigo" dot>
          Zero Database • WebSocket Hibernation • Host Source-of-Truth
        </BaseBadge>
        <h1
          class="text-3xl sm:text-5xl font-extrabold tracking-tight text-white"
        >
          Planning Poker em Tempo Real
        </h1>
        <p class="text-sm sm:text-base text-slate-400">
          Sem banco de dados tradicional: o navegador do Host mantém a verdade absoluta no
          <code class="text-indigo-300">localStorage</code> e o Cloudflare Durable Object
          transmite apenas votos mascarados.
        </p>
      </div>

      <!-- Salas Recentes do Host (Permite retomar apos fechar o navegador) -->
      <section
        v-if="savedHostRooms.length > 0"
        class="w-full rounded-2xl bg-indigo-950/30 border border-indigo-500/30 p-5 shadow-xl flex flex-col gap-3"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <BaseBadge tone="amber">Host</BaseBadge>
            <h2 class="text-sm font-bold text-white">
              Suas Salas Salvas (Retomar após fechar o navegador)
            </h2>
          </div>
          <span class="text-xs text-slate-400">
            {{ savedHostRooms.length }} {{ savedHostRooms.length === 1 ? 'sala' : 'salas' }}
          </span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div
            v-for="room in savedHostRooms"
            :key="room.roomId"
            class="flex items-center justify-between gap-3 rounded-xl bg-slate-900/90 border border-slate-800 px-4 py-3"
          >
            <div class="flex flex-col min-w-0">
              <div class="flex items-center gap-2">
                <code class="text-xs font-mono font-bold text-indigo-300">
                  {{ room.roomId }}
                </code>
                <span class="text-[11px] text-slate-400">
                  • {{ room.tasks?.length || 0 }} tasks
                </span>
              </div>
              <span class="text-xs text-slate-200 truncate">
                {{ room.storyTitle }}
              </span>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <BaseButton
                size="sm"
                variant="primary"
                @click="handleResumeHostRoom(room.roomId)"
              >
                Retomar Sala
              </BaseButton>
              <button
                type="button"
                title="Remover sala salva"
                class="text-slate-500 hover:text-rose-400 text-xs px-2 py-1 rounded-lg transition-colors cursor-pointer"
                @click="handleDeleteSavedRoom(room.roomId)"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Grid: Criar Sala (Host) vs Entrar em Sala (Player) -->
      <div class="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Card 1: Criar Sala como Host -->
        <section
          class="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 shadow-xl flex flex-col justify-between gap-6"
        >
          <div class="flex flex-col gap-1.5">
            <span class="text-xs font-bold uppercase tracking-wider text-indigo-400">
              Nova Sessão
            </span>
            <h2 class="text-xl font-bold text-white">Criar Sala como Host</h2>
            <p class="text-xs text-slate-400">
              Configure as tasks iniciais e personalize o baralho de cartas da sua equipe.
            </p>
          </div>

          <form
            class="flex flex-col gap-4"
            @submit.prevent="handleCreateRoom"
          >
            <BaseInput
              id="create-host-name"
              v-model="hostName"
              label="Seu Nome (Host)"
              placeholder="Ex: Vitor Bruno"
              :error="createError"
            />

            <!-- Selecao e Edicao do Baralho -->
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-medium uppercase tracking-wider text-slate-400">
                Baralho de Cartas (Presets ou Personalizado)
              </label>
              <div class="flex flex-wrap gap-1.5 mb-1">
                <button
                  v-for="preset in DECK_PRESETS"
                  :key="preset.id"
                  type="button"
                  class="text-[11px] px-2.5 py-1 rounded-lg border transition-colors cursor-pointer"
                  :class="
                    selectedPresetId === preset.id
                      ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200 font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  "
                  @click="handlePresetChange(preset.id)"
                >
                  {{ preset.label.split(' (')[0] }}
                </button>
              </div>
              <input
                v-model="customDeckInput"
                type="text"
                class="w-full rounded-xl bg-slate-900/90 border border-slate-700/80 px-3.5 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                placeholder="0, 1, 2, 3, 5, 8, 13, ?, ☕"
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <label
                for="create-tasks-list"
                class="text-xs font-medium uppercase tracking-wider text-slate-400"
              >
                Lista de Tasks para Votação (1 por linha)
              </label>
              <textarea
                id="create-tasks-list"
                v-model="initialTasksText"
                rows="3"
                placeholder="US-01: Autenticação&#10;US-02: Checkout"
                class="w-full rounded-xl bg-slate-900/90 border border-slate-700/80 px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 transition-colors focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>

            <BaseButton type="submit" variant="primary" size="lg" full-width>
              Criar Sala Agora
            </BaseButton>
          </form>
        </section>

        <!-- Card 2: Entrar em Sala Existente -->
        <section
          class="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 shadow-xl flex flex-col justify-between gap-6"
        >
          <div class="flex flex-col gap-1.5">
            <span class="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Participar
            </span>
            <h2 class="text-xl font-bold text-white">Entrar em uma Sala</h2>
            <p class="text-xs text-slate-400">
              Informe o código compartilhado pelo Host para conectar instantaneamente.
            </p>
          </div>

          <form class="flex flex-col gap-4" @submit.prevent="handleJoinRoom">
            <BaseInput
              id="join-room-code"
              v-model="roomCodeInput"
              label="Código da Sala"
              placeholder="Ex: A7K9X2"
              :maxlength="12"
            />

            <BaseInput
              id="join-player-name-lobby"
              v-model="joinName"
              label="Seu Nome"
              placeholder="Ex: Gustavo"
              :error="joinError"
            />

            <BaseButton type="submit" variant="emerald" size="lg" full-width>
              Entrar na Sala
            </BaseButton>
          </form>
        </section>
      </div>
    </div>
  </LobbyTemplate>
</template>
