import type { RoomState, VoteValue } from '@shared/types';

const PLAYER_ID_KEY = 'pp_player_id';
const PLAYER_NAME_KEY = 'pp_player_name';
const PLAYER_SPECTATOR_KEY = 'pp_player_spectator';
const HOST_STATE_PREFIX = 'pp_host_raw_state:';
const OWN_VOTE_PREFIX = 'pp_own_vote:';

/**
 * Gera ou recupera o UUID persistido no sessionStorage desta aba.
 * Garante resiliencia a F5 sem duplicar o jogador na mesa.
 */
export function getOrCreatePlayerId(): string {
  const existing = sessionStorage.getItem(PLAYER_ID_KEY);
  if (existing && existing.trim().length > 0) {
    return existing;
  }
  const newId = crypto.randomUUID();
  sessionStorage.setItem(PLAYER_ID_KEY, newId);
  return newId;
}

export function getSavedPlayerName(): string {
  return sessionStorage.getItem(PLAYER_NAME_KEY) ?? '';
}

export function savePlayerName(name: string): void {
  sessionStorage.setItem(PLAYER_NAME_KEY, name.trim());
}

export function getSavedSpectatorFlag(): boolean {
  return sessionStorage.getItem(PLAYER_SPECTATOR_KEY) === 'true';
}

export function saveSpectatorFlag(isSpectator: boolean): void {
  sessionStorage.setItem(PLAYER_SPECTATOR_KEY, String(isSpectator));
}

/**
 * Salva o estado bruto completo da sala (com votos abertos) no sessionStorage do Host.
 */
export function saveHostRoomState(roomId: string, state: RoomState): void {
  const key = `${HOST_STATE_PREFIX}${roomId.toUpperCase()}`;
  sessionStorage.setItem(key, JSON.stringify(state));
}

/**
 * Carrega o estado bruto da sala caso esta aba seja o Host (ex: apos F5).
 */
export function loadHostRoomState(roomId: string): RoomState | null {
  const key = `${HOST_STATE_PREFIX}${roomId.toUpperCase()}`;
  const raw = sessionStorage.getItem(key);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as RoomState;
  } catch {
    sessionStorage.removeItem(key);
    return null;
  }
}

export function clearHostRoomState(roomId: string): void {
  const key = `${HOST_STATE_PREFIX}${roomId.toUpperCase()}`;
  sessionStorage.removeItem(key);
}

/**
 * Verifica se esta aba possui o estado bruto de Host para a sala informada.
 */
export function isStoredHostForRoom(roomId: string, playerId: string): boolean {
  const state = loadHostRoomState(roomId);
  return state !== null && state.hostId === playerId;
}

/**
 * Persiste o voto local do proprio jogador para manter a carta selecionada no dock apos F5,
 * mesmo enquanto o estado publico da sala estiver mascarado (vote: null).
 */
export function saveOwnVote(roomId: string, vote: VoteValue | null): void {
  const key = `${OWN_VOTE_PREFIX}${roomId.toUpperCase()}`;
  if (vote === null) {
    sessionStorage.removeItem(key);
  } else {
    sessionStorage.setItem(key, vote);
  }
}

export function loadOwnVote(roomId: string): VoteValue | null {
  const key = `${OWN_VOTE_PREFIX}${roomId.toUpperCase()}`;
  return (sessionStorage.getItem(key) as VoteValue | null) ?? null;
}

/**
 * Gera um codigo curto legivel de sala (ex: "A7K9X2").
 */
export function generateRoomCode(length = 6): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const randomBytes = new Uint8Array(length);
  crypto.getRandomValues(randomBytes);
  return Array.from(randomBytes, (b) => alphabet[b % alphabet.length]).join('');
}
