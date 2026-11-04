import type { RoomState, VoteValue } from '@shared/types';

const PLAYER_ID_KEY = 'pp_player_id';
const TAB_ID_KEY = 'pp_tab_id';
const PLAYER_NAME_KEY = 'pp_player_name';
const PLAYER_SPECTATOR_KEY = 'pp_player_spectator';
const HOST_STATE_PREFIX = 'pp_host_raw_state:';
const HOST_TOKEN_PREFIX = 'pp_host_token:';
const HOST_ACTIVE_TAB_PREFIX = 'pp_host_active_tab:';
const OWN_VOTE_PREFIX = 'pp_own_vote:';
const CUSTOM_DECKS_KEY = 'pp_custom_decks';

export interface CustomDeck {
  id: string;
  name: string;
  cards: VoteValue[];
  updatedAt: number;
}

const HOST_TAB_LOCK_TTL_MS = 4500;
const HOST_ROOM_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

interface HostTabLock {
  tabId: string;
  updatedAt: number;
}

/**
 * Identificador unico da aba atual (sobrevive a F5, mas muda em novas abas).
 */
export function getOrCreateTabId(): string {
  const existing = sessionStorage.getItem(TAB_ID_KEY);
  if (existing && existing.trim().length > 0) {
    return existing;
  }
  const newTabId = crypto.randomUUID();
  sessionStorage.setItem(TAB_ID_KEY, newTabId);
  return newTabId;
}

/**
 * Gera ou recupera o UUID persistido no sessionStorage desta aba.
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

/**
 * Resolve o playerId para uma sala especifica:
 * - Se esta aba for o Host legitimo (mesmo apos fechar e reabrir o navegador),
 *   restaura o hostId original salvo no localStorage.
 * - Se outra aba deste mesmo navegador ja estiver ativa como Host, garante um
 *   UUID exclusivo de jogador para permitir testes multi-aba sem colisao.
 */
export function resolvePlayerIdForRoom(roomId: string): string {
  const normalized = roomId.toUpperCase();
  const hostState = loadHostRoomState(normalized);
  const hostToken = loadHostToken(normalized);

  if (hostState && hostToken && canTabClaimHost(normalized)) {
    sessionStorage.setItem(PLAYER_ID_KEY, hostState.hostId);
    return hostState.hostId;
  }

  const currentId = getOrCreatePlayerId();
  if (hostState && currentId === hostState.hostId) {
    // Aba duplicada enquanto a aba principal do Host ja esta aberta: gera novo ID de Player
    const freshPlayerId = crypto.randomUUID();
    sessionStorage.setItem(PLAYER_ID_KEY, freshPlayerId);
    return freshPlayerId;
  }

  return currentId;
}

export function getSavedPlayerName(roomId?: string): string {
  const sessionName = sessionStorage.getItem(PLAYER_NAME_KEY);
  if (sessionName && sessionName.trim().length > 0) {
    return sessionName;
  }

  if (roomId) {
    const normalized = roomId.toUpperCase();
    if (canTabClaimHost(normalized)) {
      const hostState = loadHostRoomState(normalized);
      const hostPlayer = hostState ? hostState.players[hostState.hostId] : null;
      if (hostPlayer?.name) {
        sessionStorage.setItem(PLAYER_NAME_KEY, hostPlayer.name);
        return hostPlayer.name;
      }
    }
  }

  const localName = localStorage.getItem(PLAYER_NAME_KEY);
  return localName ?? '';
}

export function savePlayerName(name: string): void {
  const clean = name.trim();
  sessionStorage.setItem(PLAYER_NAME_KEY, clean);
  localStorage.setItem(PLAYER_NAME_KEY, clean);
}

export function getSavedSpectatorFlag(): boolean {
  return sessionStorage.getItem(PLAYER_SPECTATOR_KEY) === 'true';
}

export function saveSpectatorFlag(isSpectator: boolean): void {
  sessionStorage.setItem(PLAYER_SPECTATOR_KEY, String(isSpectator));
}

const JOINED_ROOM_PREFIX = 'poker_joined_room_';

export function hasJoinedRoom(roomId: string): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(`${JOINED_ROOM_PREFIX}${roomId.toUpperCase()}`) === 'true';
}

export function markJoinedRoom(roomId: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(`${JOINED_ROOM_PREFIX}${roomId.toUpperCase()}`, 'true');
}

/**
 * Salva ou gera o token secreto do Host no localStorage para autenticar no Durable Object.
 */
export function getOrCreateHostToken(roomId: string): string {
  const key = `${HOST_TOKEN_PREFIX}${roomId.toUpperCase()}`;
  const existing = localStorage.getItem(key);
  if (existing && existing.trim().length >= 16) {
    return existing;
  }
  const token = `${crypto.randomUUID()}-${crypto.randomUUID()}`;
  localStorage.setItem(key, token);
  return token;
}

export function loadHostToken(roomId: string): string | null {
  const key = `${HOST_TOKEN_PREFIX}${roomId.toUpperCase()}`;
  return localStorage.getItem(key);
}

/**
 * Salva o estado bruto completo da sala (com votos abertos) no localStorage do Host,
 * permitindo recuperar a sala mesmo se o Host fechar a aba ou o navegador inteiro.
 */
export function saveHostRoomState(roomId: string, state: RoomState): void {
  const key = `${HOST_STATE_PREFIX}${roomId.toUpperCase()}`;
  localStorage.setItem(key, JSON.stringify(state));
}

/**
 * Carrega o estado bruto da sala salvo no localStorage.
 */
export function loadHostRoomState(roomId: string): RoomState | null {
  const key = `${HOST_STATE_PREFIX}${roomId.toUpperCase()}`;
  const raw = localStorage.getItem(key);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as RoomState;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

export function clearHostRoomState(roomId: string): void {
  const upper = roomId.toUpperCase();
  localStorage.removeItem(`${HOST_STATE_PREFIX}${upper}`);
  localStorage.removeItem(`${HOST_TOKEN_PREFIX}${upper}`);
  localStorage.removeItem(`${HOST_ACTIVE_TAB_PREFIX}${upper}`);
}

/**
 * Verifica se esta aba pode assumir o papel de Host da sala:
 * - Exige que o estado bruto e o hostToken existam no localStorage deste navegador.
 * - Garante que nao haja outra aba deste mesmo navegador ja ativa como Host agora.
 */
export function canTabClaimHost(roomId: string): boolean {
  const upper = roomId.toUpperCase();
  const state = loadHostRoomState(upper);
  const token = loadHostToken(upper);
  if (!state || !token) {
    return false;
  }

  const myTabId = getOrCreateTabId();
  const lockKey = `${HOST_ACTIVE_TAB_PREFIX}${upper}`;
  const rawLock = localStorage.getItem(lockKey);

  if (!rawLock) {
    return true;
  }

  try {
    const lock = JSON.parse(rawLock) as HostTabLock;
    if (lock.tabId === myTabId) {
      return true;
    }
    const isExpired = Date.now() - lock.updatedAt > HOST_TAB_LOCK_TTL_MS;
    return isExpired;
  } catch {
    return true;
  }
}

/**
 * Registra/renova o lock de aba ativa do Host para a sala.
 */
export function claimHostTabLock(roomId: string): void {
  const upper = roomId.toUpperCase();
  const lockKey = `${HOST_ACTIVE_TAB_PREFIX}${upper}`;
  const payload: HostTabLock = {
    tabId: getOrCreateTabId(),
    updatedAt: Date.now(),
  };
  localStorage.setItem(lockKey, JSON.stringify(payload));
}

/**
 * Libera o lock da aba do Host ao fechar a aba/navegador ou sair da sala.
 */
export function releaseHostTabLock(roomId: string): void {
  const upper = roomId.toUpperCase();
  const lockKey = `${HOST_ACTIVE_TAB_PREFIX}${upper}`;
  const rawLock = localStorage.getItem(lockKey);
  if (!rawLock) return;

  try {
    const lock = JSON.parse(rawLock) as HostTabLock;
    if (lock.tabId === getOrCreateTabId()) {
      localStorage.removeItem(lockKey);
    }
  } catch {
    localStorage.removeItem(lockKey);
  }
}

/**
 * Lista todas as salas recentes em que este navegador e o Host,
 * limpando automaticamente salas antigas (> 7 dias).
 */
export function listSavedHostRooms(): RoomState[] {
  const rooms: RoomState[] = [];
  const now = Date.now();

  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(HOST_STATE_PREFIX)) continue;

    const roomId = key.slice(HOST_STATE_PREFIX.length);
    const state = loadHostRoomState(roomId);
    const token = loadHostToken(roomId);

    if (!state || !token) {
      continue;
    }

    if (now - (state.updatedAt || 0) > HOST_ROOM_MAX_AGE_MS) {
      clearHostRoomState(roomId);
      continue;
    }

    rooms.push(state);
  }

  return rooms.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

/**
 * Persiste o voto local do proprio jogador (localStorage + sessionStorage)
 * para manter a carta selecionada apos F5 ou reabertura do navegador.
 */
export function saveOwnVote(roomId: string, playerId: string, vote: VoteValue | null): void {
  const key = `${OWN_VOTE_PREFIX}${roomId.toUpperCase()}:${playerId}`;
  if (vote === null) {
    localStorage.removeItem(key);
  } else {
    localStorage.setItem(key, vote);
  }
}

export function loadOwnVote(roomId: string, playerId: string): VoteValue | null {
  const key = `${OWN_VOTE_PREFIX}${roomId.toUpperCase()}:${playerId}`;
  return (localStorage.getItem(key) as VoteValue | null) ?? null;
}

/**
 * Carrega os baralhos personalizados criados e nomeados pelo usuario no localStorage.
 */
export function loadCustomDecks(): CustomDeck[] {
  const raw = localStorage.getItem(CUSTOM_DECKS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as CustomDeck[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (d) =>
        d &&
        typeof d.id === 'string' &&
        typeof d.name === 'string' &&
        Array.isArray(d.cards) &&
        d.cards.length > 0
    );
  } catch {
    localStorage.removeItem(CUSTOM_DECKS_KEY);
    return [];
  }
}

/**
 * Salva (cria ou atualiza) um baralho personalizado nomeado no localStorage.
 */
export function saveCustomDeck(
  name: string,
  cards: VoteValue[],
  existingId?: string
): CustomDeck {
  const decks = loadCustomDecks();
  const cleanName = name.trim() || 'Meu Baralho';
  const now = Date.now();

  if (existingId) {
    const idx = decks.findIndex((d) => d.id === existingId);
    if (idx !== -1) {
      decks[idx] = {
        ...decks[idx],
        name: cleanName,
        cards,
        updatedAt: now,
      };
      localStorage.setItem(CUSTOM_DECKS_KEY, JSON.stringify(decks));
      return decks[idx];
    }
  }

  const newDeck: CustomDeck = {
    id: `custom_${crypto.randomUUID()}`,
    name: cleanName,
    cards,
    updatedAt: now,
  };

  decks.unshift(newDeck);
  localStorage.setItem(CUSTOM_DECKS_KEY, JSON.stringify(decks));
  return newDeck;
}

/**
 * Remove um baralho personalizado do localStorage.
 */
export function deleteCustomDeck(id: string): void {
  const decks = loadCustomDecks().filter((d) => d.id !== id);
  localStorage.setItem(CUSTOM_DECKS_KEY, JSON.stringify(decks));
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
