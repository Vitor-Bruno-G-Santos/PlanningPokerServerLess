import { computed, onUnmounted, ref, watch } from 'vue';
import {
  DEFAULT_DECK,
  maskRoomState,
  parseDeckString,
  type ClientActionPayload,
  type ClientToRelayMessage,
  type RelayToClientMessage,
  type Role,
  type RoomState,
  type StoryTask,
  type VoteValue,
} from '@shared/types';
import {
  getOrCreatePlayerId,
  getSavedPlayerName,
  getSavedSpectatorFlag,
  isStoredHostForRoom,
  loadHostRoomState,
  loadOwnVote,
  saveHostRoomState,
  saveOwnVote,
  savePlayerName,
  saveSpectatorFlag,
} from '@/utils/storage';

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export interface UsePokerRoomOptions {
  roomId: string;
  initialRole?: Role;
}

function computeTaskEstimate(state: RoomState): string | null {
  const activeVoters = Object.values(state.players).filter(
    (p) => !p.isSpectator && p.vote !== null
  );
  if (activeVoters.length === 0) return null;

  const numericVotes = activeVoters
    .map((p) => Number(p.vote))
    .filter((n) => !Number.isNaN(n));

  if (numericVotes.length > 0) {
    const sum = numericVotes.reduce((acc, n) => acc + n, 0);
    const avg = sum / numericVotes.length;
    return avg.toFixed(1).replace(/\.0$/, '');
  }

  // Para baralhos nao-numericos (ex: T-Shirt PP, P, M, G), retorna a moda (voto mais frequente)
  const counts = new Map<string, number>();
  let bestVote = activeVoters[0].vote!;
  let bestCount = 0;
  for (const p of activeVoters) {
    const v = p.vote!;
    const c = (counts.get(v) ?? 0) + 1;
    counts.set(v, c);
    if (c > bestCount) {
      bestCount = c;
      bestVote = v;
    }
  }
  return bestVote;
}

export function usePokerRoom(options: UsePokerRoomOptions) {
  const normalizedRoomId = options.roomId.toUpperCase();
  const playerId = getOrCreatePlayerId();
  const playerName = ref<string>(getSavedPlayerName());
  const isSpectator = ref<boolean>(getSavedSpectatorFlag());
  const myVote = ref<VoteValue | null>(loadOwnVote(normalizedRoomId));

  // Determina se esta aba e o Host (ou porque criou a sala agora, ou porque reidratou no F5)
  const isHost = ref<boolean>(
    options.initialRole === 'host' || isStoredHostForRoom(normalizedRoomId, playerId)
  );

  // Estado bruto (exclusivo do Host, contem votos abertos antes do reveal)
  const hostRawState = ref<RoomState | null>(null);

  // Estado publico (usado pelos Players; para o Host, espelha o estado mascarado/revelado)
  const publicRoomState = ref<RoomState | null>(null);

  const connectionStatus = ref<ConnectionStatus>('disconnected');
  const hostOnline = ref<boolean>(true);
  const lastError = ref<string | null>(null);

  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let pingInterval: ReturnType<typeof setInterval> | null = null;
  let isUnmounted = false;
  let reconnectAttempts = 0;

  /**
   * Inicializa ou reidrata o estado bruto do Host no sessionStorage.
   */
  function initOrHydrateHostState(hostDisplayName: string, spectator = false): RoomState {
    const hydrated = loadHostRoomState(normalizedRoomId);
    if (hydrated && hydrated.hostId === playerId) {
      if (!Array.isArray(hydrated.tasks) || hydrated.tasks.length === 0) {
        const defaultTask: StoryTask = {
          id: crypto.randomUUID(),
          title: hydrated.storyTitle || 'US-01: Definir estimativa da história',
          status: hydrated.revealed ? 'completed' : 'voting',
          finalEstimate: null,
        };
        hydrated.tasks = [defaultTask];
        hydrated.activeTaskId = defaultTask.id;
      }

      if (!Array.isArray(hydrated.deck) || hydrated.deck.length === 0) {
        hydrated.deck = [...DEFAULT_DECK];
      }

      if (hydrated.players[playerId]) {
        hydrated.players[playerId].connected = true;
        if (hostDisplayName) {
          hydrated.players[playerId].name = hostDisplayName;
        }
      } else {
        hydrated.players[playerId] = {
          id: playerId,
          name: hostDisplayName || 'Host',
          isSpectator: spectator,
          isHost: true,
          connected: true,
          hasVoted: myVote.value !== null,
          vote: myVote.value,
        };
      }
      hydrated.updatedAt = Date.now();
      hostRawState.value = hydrated;
      publicRoomState.value = maskRoomState(hydrated);
      saveHostRoomState(normalizedRoomId, hydrated);
      return hydrated;
    }

    const firstTask: StoryTask = {
      id: crypto.randomUUID(),
      title: 'US-01: Definir estimativa da história',
      status: 'voting',
      finalEstimate: null,
    };

    const freshState: RoomState = {
      roomId: normalizedRoomId,
      storyTitle: firstTask.title,
      activeTaskId: firstTask.id,
      tasks: [firstTask],
      deck: [...DEFAULT_DECK],
      revealed: false,
      hostId: playerId,
      updatedAt: Date.now(),
      players: {
        [playerId]: {
          id: playerId,
          name: hostDisplayName || 'Host',
          isSpectator: spectator,
          isHost: true,
          connected: true,
          hasVoted: false,
          vote: null,
        },
      },
    };

    hostRawState.value = freshState;
    publicRoomState.value = maskRoomState(freshState);
    saveHostRoomState(normalizedRoomId, freshState);
    return freshState;
  }

  function buildWebSocketUrl(role: Role): string {
    const baseEnv = import.meta.env.VITE_WS_URL;
    let baseUrl: string;

    if (baseEnv && baseEnv.trim().length > 0) {
      baseUrl = baseEnv.replace(/\/+$/, '');
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname || 'localhost';
      baseUrl = `${protocol}//${host}:8787`;
    }

    const params = new URLSearchParams({
      role,
      playerId,
    });

    return `${baseUrl}/ws/${encodeURIComponent(normalizedRoomId)}?${params.toString()}`;
  }

  function sendRawMessage(msg: ClientToRelayMessage): boolean {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    ws.send(JSON.stringify(msg));
    return true;
  }

  function resetAllPlayerVotes(state: RoomState): void {
    for (const player of Object.values(state.players)) {
      player.vote = null;
      player.hasVoted = false;
    }
    myVote.value = null;
    saveOwnVote(normalizedRoomId, null);
  }

  function syncAndBroadcastHostState(): void {
    if (!isHost.value || !hostRawState.value) {
      return;
    }
    hostRawState.value.updatedAt = Date.now();
    saveHostRoomState(normalizedRoomId, hostRawState.value);

    const masked = maskRoomState(hostRawState.value);
    publicRoomState.value = masked;

    sendRawMessage({
      type: 'HOST_BROADCAST',
      state: masked,
    });
  }

  watch(
    hostRawState,
    (newState) => {
      if (isHost.value && newState) {
        saveHostRoomState(normalizedRoomId, newState);
        publicRoomState.value = maskRoomState(newState);
      }
    },
    { deep: true }
  );

  function applyClientActionOnHost(payload: ClientActionPayload): void {
    if (!isHost.value || !hostRawState.value) {
      return;
    }

    const state = hostRawState.value;

    switch (payload.action) {
      case 'JOIN': {
        const existing = state.players[payload.playerId];
        const cleanName = payload.name.trim() || 'Participante';
        state.players[payload.playerId] = {
          id: payload.playerId,
          name: cleanName,
          isSpectator: payload.isSpectator ?? existing?.isSpectator ?? false,
          isHost: payload.playerId === state.hostId,
          connected: true,
          hasVoted: existing ? existing.vote !== null : false,
          vote: existing ? existing.vote : null,
        };
        break;
      }

      case 'CAST_VOTE': {
        const player = state.players[payload.playerId];
        if (!player || player.isSpectator) {
          return;
        }
        // Valida se a carta existe no baralho atual (ou se e null para limpar voto)
        if (payload.vote !== null && !state.deck.includes(payload.vote)) {
          return;
        }
        player.vote = payload.vote;
        player.hasVoted = payload.vote !== null;
        player.connected = true;
        break;
      }

      case 'TOGGLE_SPECTATOR': {
        const player = state.players[payload.playerId];
        if (!player) return;
        player.isSpectator = payload.isSpectator;
        if (payload.isSpectator) {
          player.vote = null;
          player.hasVoted = false;
        }
        break;
      }

      case 'UPDATE_NAME': {
        const player = state.players[payload.playerId];
        if (!player) return;
        const cleanName = payload.name.trim();
        if (cleanName) {
          player.name = cleanName;
        }
        break;
      }

      case 'LEAVE': {
        if (payload.playerId !== state.hostId) {
          delete state.players[payload.playerId];
        }
        break;
      }
    }

    syncAndBroadcastHostState();
  }

  function dispatchPlayerAction(payload: ClientActionPayload): void {
    if (isHost.value) {
      applyClientActionOnHost(payload);
    } else {
      sendRawMessage({
        type: 'CLIENT_ACTION',
        payload,
      });
    }
  }

  function handleIncomingMessage(event: MessageEvent): void {
    if (typeof event.data !== 'string') return;

    let msg: RelayToClientMessage;
    try {
      msg = JSON.parse(event.data) as RelayToClientMessage;
    } catch {
      return;
    }

    switch (msg.type) {
      case 'STATE_SYNC': {
        hostOnline.value = true;
        lastError.value = null;
        publicRoomState.value = msg.state;

        // Se o baralho mudou e o voto local nao faz mais parte do baralho, limpa
        if (myVote.value !== null && Array.isArray(msg.state.deck) && !msg.state.deck.includes(myVote.value)) {
          myVote.value = null;
          saveOwnVote(normalizedRoomId, null);
        }

        const meInRoom = msg.state.players[playerId];
        if (meInRoom && !meInRoom.hasVoted && !msg.state.revealed) {
          myVote.value = null;
          saveOwnVote(normalizedRoomId, null);
        } else if (meInRoom && msg.state.revealed && meInRoom.vote !== null) {
          myVote.value = meInRoom.vote;
        }
        break;
      }

      case 'CLIENT_ACTION': {
        if (isHost.value) {
          applyClientActionOnHost(msg.payload);
        }
        break;
      }

      case 'PLAYER_DISCONNECTED': {
        if (isHost.value && hostRawState.value) {
          const target = hostRawState.value.players[msg.playerId];
          if (target) {
            target.connected = false;
            syncAndBroadcastHostState();
          }
        }
        break;
      }

      case 'HOST_RECONNECTED': {
        hostOnline.value = true;
        lastError.value = null;
        if (!isHost.value && playerName.value) {
          dispatchPlayerAction({
            action: 'JOIN',
            playerId,
            name: playerName.value,
            isSpectator: isSpectator.value,
          });
          if (myVote.value !== null && !isSpectator.value) {
            dispatchPlayerAction({
              action: 'CAST_VOTE',
              playerId,
              vote: myVote.value,
            });
          }
        }
        break;
      }

      case 'HOST_DISCONNECTED': {
        hostOnline.value = false;
        break;
      }

      case 'ERROR': {
        lastError.value = msg.message;
        break;
      }

      case 'PONG':
        break;
    }
  }

  function connect(): void {
    if (isUnmounted) return;
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const role: Role = isHost.value ? 'host' : 'player';
    connectionStatus.value = reconnectAttempts > 0 ? 'reconnecting' : 'connecting';

    if (isHost.value && !hostRawState.value) {
      initOrHydrateHostState(playerName.value || 'Host', isSpectator.value);
    }

    const socketUrl = buildWebSocketUrl(role);
    ws = new WebSocket(socketUrl);

    ws.onopen = () => {
      reconnectAttempts = 0;
      connectionStatus.value = 'connected';
      lastError.value = null;

      if (isHost.value) {
        hostOnline.value = true;
        syncAndBroadcastHostState();
      } else if (playerName.value) {
        dispatchPlayerAction({
          action: 'JOIN',
          playerId,
          name: playerName.value,
          isSpectator: isSpectator.value,
        });
        if (myVote.value !== null && !isSpectator.value) {
          dispatchPlayerAction({
            action: 'CAST_VOTE',
            playerId,
            vote: myVote.value,
          });
        }
      }

      if (pingInterval) clearInterval(pingInterval);
      pingInterval = setInterval(() => {
        sendRawMessage({ type: 'PING' });
      }, 25000);
    };

    ws.onmessage = handleIncomingMessage;

    ws.onclose = () => {
      connectionStatus.value = 'disconnected';
      if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
      }
      if (!isUnmounted) {
        const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts), 8000);
        reconnectAttempts++;
        reconnectTimer = setTimeout(() => {
          connect();
        }, delay);
      }
    };

    ws.onerror = () => {
      // onclose sera disparado em seguida
    };
  }

  function disconnect(): void {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
    }
    if (ws) {
      ws.onclose = null;
      ws.close();
      ws = null;
    }
    connectionStatus.value = 'disconnected';
  }

  function joinRoom(name: string, spectator = false): void {
    const clean = name.trim();
    if (!clean) return;

    playerName.value = clean;
    isSpectator.value = spectator;
    savePlayerName(clean);
    saveSpectatorFlag(spectator);

    if (isHost.value && !hostRawState.value) {
      initOrHydrateHostState(clean, spectator);
    }

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      connect();
    } else {
      dispatchPlayerAction({
        action: 'JOIN',
        playerId,
        name: clean,
        isSpectator: spectator,
      });
    }
  }

  function castVote(vote: VoteValue | null): void {
    if (isSpectator.value) return;
    const nextVote = myVote.value === vote ? null : vote;
    myVote.value = nextVote;
    saveOwnVote(normalizedRoomId, nextVote);

    dispatchPlayerAction({
      action: 'CAST_VOTE',
      playerId,
      vote: nextVote,
    });
  }

  function toggleSpectator(): void {
    const next = !isSpectator.value;
    isSpectator.value = next;
    saveSpectatorFlag(next);
    if (next) {
      myVote.value = null;
      saveOwnVote(normalizedRoomId, null);
    }
    dispatchPlayerAction({
      action: 'TOGGLE_SPECTATOR',
      playerId,
      isSpectator: next,
    });
  }

  function updateStoryTitle(newTitle: string): void {
    if (!isHost.value || !hostRawState.value) return;
    const clean = newTitle.trim() || 'História sem título';
    hostRawState.value.storyTitle = clean;

    const activeTask = hostRawState.value.tasks.find(
      (t) => t.id === hostRawState.value?.activeTaskId
    );
    if (activeTask) {
      activeTask.title = clean;
    }
    syncAndBroadcastHostState();
  }

  /**
   * Atualiza o baralho de cartas da sala (exclusivo do Host).
   * Remove votos ativos que nao existam no novo baralho.
   */
  function updateDeck(cardsOrRawString: VoteValue[] | string): void {
    if (!isHost.value || !hostRawState.value) return;
    const nextDeck =
      typeof cardsOrRawString === 'string'
        ? parseDeckString(cardsOrRawString)
        : parseDeckString(cardsOrRawString.join(','));

    if (nextDeck.length === 0) return;

    const state = hostRawState.value;
    state.deck = nextDeck;

    // Se algum jogador ja tinha votado numa carta que foi removida do baralho, limpa o voto dele
    for (const player of Object.values(state.players)) {
      if (player.vote !== null && !nextDeck.includes(player.vote)) {
        player.vote = null;
        player.hasVoted = false;
      }
    }

    if (myVote.value !== null && !nextDeck.includes(myVote.value)) {
      myVote.value = null;
      saveOwnVote(normalizedRoomId, null);
    }

    syncAndBroadcastHostState();
  }

  function addTask(title: string): void {
    if (!isHost.value || !hostRawState.value) return;
    const clean = title.trim();
    if (!clean) return;

    const newTask: StoryTask = {
      id: crypto.randomUUID(),
      title: clean,
      status: 'pending',
      finalEstimate: null,
    };

    hostRawState.value.tasks.push(newTask);

    if (!hostRawState.value.activeTaskId) {
      selectTask(newTask.id);
      return;
    }

    syncAndBroadcastHostState();
  }

  function selectTask(taskId: string): void {
    if (!isHost.value || !hostRawState.value) return;
    const state = hostRawState.value;
    const target = state.tasks.find((t) => t.id === taskId);
    if (!target) return;

    for (const t of state.tasks) {
      if (t.id !== taskId && t.status === 'voting') {
        t.status = t.finalEstimate ? 'completed' : 'pending';
      }
    }

    state.activeTaskId = target.id;
    state.storyTitle = target.title;

    target.status = 'voting';
    state.revealed = false;
    resetAllPlayerVotes(state);
    syncAndBroadcastHostState();
  }

  function removeTask(taskId: string): void {
    if (!isHost.value || !hostRawState.value) return;
    const state = hostRawState.value;
    const idx = state.tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) return;

    const wasActive = state.activeTaskId === taskId;
    state.tasks.splice(idx, 1);

    if (wasActive) {
      const nextTask =
        state.tasks.find((t) => t.status === 'pending') ?? state.tasks[0] ?? null;
      if (nextTask) {
        selectTask(nextTask.id);
        return;
      } else {
        state.activeTaskId = null;
        state.storyTitle = 'Adicione ou selecione uma task na lista';
        state.revealed = false;
        resetAllPlayerVotes(state);
      }
    }

    syncAndBroadcastHostState();
  }

  function revealVotes(): void {
    if (!isHost.value || !hostRawState.value) return;
    const state = hostRawState.value;
    state.revealed = true;

    const activeTask = state.tasks.find((t) => t.id === state.activeTaskId);
    if (activeTask) {
      activeTask.status = 'completed';
      activeTask.finalEstimate = computeTaskEstimate(state);
      const snapshotVotes: Record<string, VoteValue> = {};
      for (const p of Object.values(state.players)) {
        if (!p.isSpectator && p.vote !== null) {
          snapshotVotes[p.id] = p.vote;
        }
      }
      activeTask.votes = snapshotVotes;
    }

    syncAndBroadcastHostState();
  }

  function startNewRound(forceRevoteCurrent = false): void {
    if (!isHost.value || !hostRawState.value) return;
    const state = hostRawState.value;

    if (!forceRevoteCurrent) {
      const nextPending = state.tasks.find(
        (t) => t.status === 'pending' && t.id !== state.activeTaskId
      );
      if (nextPending) {
        selectTask(nextPending.id);
        return;
      }
    }

    const activeTask = state.tasks.find((t) => t.id === state.activeTaskId);
    if (activeTask) {
      activeTask.status = 'voting';
      activeTask.finalEstimate = null;
    }

    state.revealed = false;
    resetAllPlayerVotes(state);
    syncAndBroadcastHostState();
  }

  const currentPlayer = computed(() => {
    return publicRoomState.value?.players[playerId] ?? null;
  });

  const needsNamePrompt = computed(() => {
    return !playerName.value || playerName.value.trim().length === 0;
  });

  onUnmounted(() => {
    isUnmounted = true;
    disconnect();
  });

  return {
    roomId: normalizedRoomId,
    playerId,
    playerName,
    isSpectator,
    isHost,
    myVote,
    roomState: publicRoomState,
    currentPlayer,
    connectionStatus,
    hostOnline,
    lastError,
    needsNamePrompt,
    connect,
    disconnect,
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
  };
}
