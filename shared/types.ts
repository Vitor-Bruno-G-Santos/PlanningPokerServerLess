export type Role = 'host' | 'player';

/**
 * Representa o valor de uma carta do baralho.
 * Pode ser qualquer string configurada pelo Host (Fibonacci, T-Shirt sizes, etc.).
 */
export type VoteValue = string;

export const DEFAULT_DECK: readonly VoteValue[] = [
  '0',
  '1',
  '2',
  '3',
  '5',
  '8',
  '13',
  '21',
  '34',
  '55',
  '89',
  '?',
  '☕',
] as const;

export interface DeckPreset {
  id: string;
  label: string;
  cards: VoteValue[];
}

export const DECK_PRESETS: readonly DeckPreset[] = [
  {
    id: 'fibonacci',
    label: 'Fibonacci (0 a 89, ?, ☕)',
    cards: ['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?', '☕'],
  },
  {
    id: 'modified_fibonacci',
    label: 'Scrum / Modificado (0, ½, 1, 2, 3, 5, 8, 13, 20, 40, 100, ?, ☕)',
    cards: ['0', '0.5', '1', '2', '3', '5', '8', '13', '20', '40', '100', '?', '☕'],
  },
  {
    id: 'tshirt',
    label: 'T-Shirt Sizes (PP, P, M, G, GG, XG, ?, ☕)',
    cards: ['PP', 'P', 'M', 'G', 'GG', 'XG', '?', '☕'],
  },
  {
    id: 'powers_of_2',
    label: 'Potências de 2 (1, 2, 4, 8, 16, 32, 64, ?, ☕)',
    cards: ['1', '2', '4', '8', '16', '32', '64', '?', '☕'],
  },
] as const;

/**
 * Faz o parse de uma string separada por virgula ou espaco em um array de cartas unicas.
 */
export function parseDeckString(raw: string): VoteValue[] {
  const seen = new Set<string>();
  const result: VoteValue[] = [];
  for (const token of raw.split(/[,\n]+/)) {
    const clean = token.trim().slice(0, 8);
    if (clean && !seen.has(clean)) {
      seen.add(clean);
      result.push(clean);
    }
  }
  return result.length > 0 ? result : [...DEFAULT_DECK];
}

export type TaskStatus = 'pending' | 'voting' | 'completed';

export interface StoryTask {
  id: string;
  title: string;
  status: TaskStatus;
  finalEstimate: string | null;
  votes?: Record<string, VoteValue>;
}

export interface Player {
  id: string;
  name: string;
  isSpectator: boolean;
  isHost: boolean;
  connected: boolean;
  hasVoted: boolean;
  /**
   * No estado bruto do Host (sessionStorage) ou quando revealed === true,
   * contem o valor real do voto (ou null se nao votou).
   * No estado publico mascarado (quando revealed === false), e sempre null
   * para proteger o sigilo do voto na rede.
   */
  vote: VoteValue | null;
}

export interface RoomState {
  roomId: string;
  storyTitle: string;
  activeTaskId: string | null;
  tasks: StoryTask[];
  deck: VoteValue[];
  revealed: boolean;
  hostId: string;
  updatedAt: number;
  players: Record<string, Player>;
}

/**
 * Acoes enviadas pelos jogadores para o Host processar (via Durable Object).
 */
export type ClientActionPayload =
  | {
      action: 'JOIN';
      playerId: string;
      name: string;
      isSpectator?: boolean;
    }
  | {
      action: 'CAST_VOTE';
      playerId: string;
      vote: VoteValue | null;
    }
  | {
      action: 'TOGGLE_SPECTATOR';
      playerId: string;
      isSpectator: boolean;
    }
  | {
      action: 'UPDATE_NAME';
      playerId: string;
      name: string;
    }
  | {
      action: 'LEAVE';
      playerId: string;
    };

/**
 * Mensagens enviadas do Cliente (Player ou Host) para o Durable Object.
 */
export type ClientToRelayMessage =
  | {
      type: 'CLIENT_ACTION';
      payload: ClientActionPayload;
    }
  | {
      type: 'HOST_BROADCAST';
      state: RoomState;
    }
  | {
      type: 'PING';
    };

/**
 * Mensagens enviadas do Durable Object para os Clientes conectados.
 */
export type RelayToClientMessage =
  | {
      type: 'CLIENT_ACTION';
      payload: ClientActionPayload;
    }
  | {
      type: 'STATE_SYNC';
      state: RoomState;
    }
  | {
      type: 'HOST_RECONNECTED';
    }
  | {
      type: 'HOST_DISCONNECTED';
    }
  | {
      type: 'PLAYER_DISCONNECTED';
      playerId: string;
    }
  | {
      type: 'PONG';
    }
  | {
      type: 'ERROR';
      message: string;
    };

/**
 * Helper puro que transforma o estado bruto do Host em estado publico mascarado.
 * Quando revealed === false, remove o valor de `vote` de todos os jogadores,
 * mantendo apenas `hasVoted: boolean` para a UI exibir a carta virada na mesa.
 */
export function maskRoomState(rawState: RoomState): RoomState {
  if (rawState.revealed) {
    return rawState;
  }

  const maskedPlayers: Record<string, Player> = {};
  for (const [id, player] of Object.entries(rawState.players)) {
    maskedPlayers[id] = {
      ...player,
      hasVoted: player.vote !== null,
      vote: null,
    };
  }

  return {
    ...rawState,
    players: maskedPlayers,
  };
}
