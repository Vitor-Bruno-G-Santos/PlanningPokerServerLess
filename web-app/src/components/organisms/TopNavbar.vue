<script setup lang="ts">
import { ref } from 'vue';
import type { ConnectionStatus } from '@/composables/usePokerRoom';
import { useTheme } from '@/composables/useTheme';
import AppLogo from '@/components/atoms/AppLogo.vue';

interface Props {
  roomId: string;
  playerName: string;
  isHost: boolean;
  isSpectator: boolean;
  connectionStatus: ConnectionStatus;
  hostOnline: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  toggleSpectator: [];
  manageDecks: [];
  leaveRoom: [];
  closeRoom: [];
}>();

const { theme, toggleTheme } = useTheme();

const copied = ref(false);
const isMobileMenuOpen = ref(false);
const isCloseRoomModalOpen = ref(false);
const isLeaveRoomModalOpen = ref(false);

async function copyInviteLink() {
  const inviteUrl = `${window.location.origin}/room/${encodeURIComponent(props.roomId)}`;
  try {
    await navigator.clipboard.writeText(inviteUrl);
  } catch {
    // Fallback caso clipboard API nao esteja disponivel
  }
  copied.value = true;
  setTimeout(() => {
    copied.value = false;
  }, 1800);
}

function handleMobileManageDecks() {
  isMobileMenuOpen.value = false;
  emit('manageDecks');
}

function handleMobileToggleSpectator() {
  isMobileMenuOpen.value = false;
  emit('toggleSpectator');
}

function handleMobileOpenCloseModal() {
  isMobileMenuOpen.value = false;
  isCloseRoomModalOpen.value = true;
}

function handleMobileOpenLeaveModal() {
  isMobileMenuOpen.value = false;
  isLeaveRoomModalOpen.value = true;
}

function confirmCloseRoom() {
  isCloseRoomModalOpen.value = false;
  emit('closeRoom');
}

function confirmLeaveRoom() {
  isLeaveRoomModalOpen.value = false;
  emit('leaveRoom');
}
</script>

<template>
  <header class="top-bar">
    <div class="brand-group">
      <button
        type="button"
        class="logo-lockup cursor-pointer text-left"
        title="Voltar ao Lobby"
        @click="isHost ? (isCloseRoomModalOpen = true) : (isLeaveRoomModalOpen = true)"
      >
        <AppLogo size="sm" />
      </button>

      <div class="brand-divider desktop-only" />

      <!-- Código da Sala + Botão Convidar (Desktop) -->
      <div class="room-invite-group desktop-only">
        <div class="flex items-center gap-1.5">
          <span class="room-code-label">SALA:</span>
          <span class="room-code-value">#{{ roomId }}</span>
        </div>
        <button
          type="button"
          class="btn-ds btn-secondary-solid btn-sm"
          @click="copyInviteLink"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          <span>{{ copied ? `COPIADO! (#${roomId})` : 'CONVIDAR' }}</span>
        </button>
      </div>
    </div>

    <!-- Ações do Header no Desktop -->
    <div class="header-actions desktop-only">
      <!-- Botão Gerenciar Baralhos (Host) -->
      <button
        v-if="isHost"
        type="button"
        class="btn-ds btn-outline"
        @click="emit('manageDecks')"
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect x="3" y="4" width="12" height="16" rx="2" />
          <path d="M15 8h4a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-8" />
        </svg>
        <span>GERENCIAR BARALHOS</span>
      </button>

      <!-- Botão Virar Espectador -->
      <button
        type="button"
        class="btn-ds btn-outline"
        :class="{ 'active-toggle': isSpectator }"
        @click="emit('toggleSpectator')"
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        <span>{{ isSpectator ? 'VOLTAR A VOTAR' : 'VIRAR ESPECTADOR' }}</span>
      </button>

      <!-- Botão Encerrar Sala (Host) -->
      <button
        v-if="isHost"
        type="button"
        class="btn-ds btn-danger-outline"
        @click="isCloseRoomModalOpen = true"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
          <line x1="12" y1="2" x2="12" y2="12" />
        </svg>
        <span>ENCERRAR SALA</span>
      </button>

      <!-- Botão Sair da Sala (Player) -->
      <button
        v-else
        type="button"
        class="btn-ds btn-danger-outline"
        @click="isLeaveRoomModalOpen = true"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        <span>SAIR DA SALA</span>
      </button>

      <!-- Alternar Tema (Light / Dark) com ícones SVG de Lua e Sol seguindo as cores do site -->
      <button
        type="button"
        class="btn-ds btn-primary btn-sm"
        @click="toggleTheme"
      >
        <template v-if="theme === 'dark'">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
          <span>LIGHT</span>
        </template>
        <template v-else>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
          <span>DARK</span>
        </template>
      </button>
    </div>

    <!-- Botão Menu Sanduíche (Exclusivo Mobile) -->
    <button
      type="button"
      class="mobile-menu-btn"
      :aria-expanded="isMobileMenuOpen"
      aria-label="Abrir menu da sala"
      @click="isMobileMenuOpen = !isMobileMenuOpen"
    >
      <svg
        v-if="!isMobileMenuOpen"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
      <svg
        v-else
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  </header>

  <!-- MENU SANDUÍCHE DROPDOWN (MOBILE) -->
  <div
    v-if="isMobileMenuOpen"
    class="mobile-menu-backdrop"
    @click.self="isMobileMenuOpen = false"
  >
    <nav
      class="mobile-menu-drawer"
      aria-label="Menu da sala"
    >
      <!-- Linha 1: Código da Sala + Convidar -->
      <div class="mobile-invite-box">
        <div class="flex flex-col">
          <span class="room-code-label">CÓDIGO DA SALA</span>
          <span class="room-code-value">#{{ roomId }}</span>
        </div>
        <button
          type="button"
          class="btn-ds btn-secondary-solid btn-sm"
          @click="copyInviteLink"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          <span>{{ copied ? `COPIADO!` : 'CONVIDAR' }}</span>
        </button>
      </div>

      <!-- Linha 2: Gerenciar Baralhos (Host) -->
      <button
        v-if="isHost"
        type="button"
        class="btn-ds btn-outline mobile-menu-item"
        @click="handleMobileManageDecks"
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect x="3" y="4" width="12" height="16" rx="2" />
          <path d="M15 8h4a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-8" />
        </svg>
        <span>GERENCIAR BARALHOS</span>
      </button>

      <!-- Linha 3: Virar Espectador -->
      <button
        type="button"
        class="btn-ds btn-outline mobile-menu-item"
        :class="{ 'active-toggle': isSpectator }"
        @click="handleMobileToggleSpectator"
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        <span>{{ isSpectator ? 'VOLTAR A VOTAR' : 'VIRAR ESPECTADOR' }}</span>
      </button>

      <!-- Linha 4: Alternar Tema (Light / Dark) -->
      <button
        type="button"
        class="btn-ds btn-primary mobile-menu-item"
        @click="toggleTheme"
      >
        <template v-if="theme === 'dark'">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
          <span>TEMA: LIGHT</span>
        </template>
        <template v-else>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
          <span>TEMA: DARK</span>
        </template>
      </button>

      <!-- Linha 5: Encerrar Sala (Host) ou Sair da Sala (Player) -->
      <button
        v-if="isHost"
        type="button"
        class="btn-ds btn-danger-outline mobile-menu-item"
        @click="handleMobileOpenCloseModal"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
          <line x1="12" y1="2" x2="12" y2="12" />
        </svg>
        <span>ENCERRAR SALA</span>
      </button>

      <button
        v-else
        type="button"
        class="btn-ds btn-danger-outline mobile-menu-item"
        @click="handleMobileOpenLeaveModal"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        <span>SAIR DA SALA</span>
      </button>
    </nav>
  </div>

  <!-- MODAL DE CONFIRMAÇÃO DE ENCERRAR SALA (HOST) -->
  <div
    v-if="isCloseRoomModalOpen"
    class="modal-backdrop open"
    @click.self="isCloseRoomModalOpen = false"
  >
    <div
      class="modal-dialog danger-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="close-modal-title"
    >
      <span class="modal-tag danger">AÇÃO IRREVERSÍVEL</span>
      <h3 id="close-modal-title" class="modal-title">
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

  <!-- MODAL DE CONFIRMAÇÃO PARA SAIR DA SALA (PLAYER) -->
  <div
    v-if="isLeaveRoomModalOpen"
    class="modal-backdrop open"
    @click.self="isLeaveRoomModalOpen = false"
  >
    <div
      class="modal-dialog danger-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="leave-modal-title"
    >
      <span class="modal-tag danger">SAIR DA SESSÃO</span>
      <h3 id="leave-modal-title" class="modal-title">
        TEM CERTEZA QUE DESEJA SAIR DA SALA?
      </h3>
      <p class="modal-desc">
        Você será desconectado da sala <strong>#{{ roomId }}</strong>. Caso queira voltar depois, basta informar o código da sala no Lobby.
      </p>
      <div class="modal-actions">
        <button
          type="button"
          class="btn-ds btn-outline"
          @click="isLeaveRoomModalOpen = false"
        >
          PERMANECER NA SALA
        </button>
        <button
          type="button"
          class="btn-ds btn-danger-solid"
          @click="confirmLeaveRoom"
        >
          SIM, SAIR DA SALA
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.top-bar {
  width: 100%;
  background: var(--surface-card);
  border-bottom: 1px solid var(--border-card);
  padding: 9px var(--space-XL);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-M);
  position: sticky;
  top: 0;
  z-index: 50;
  box-shadow: 0 2px 10px rgba(15, 18, 22, 0.03);
  flex-shrink: 0;
}

.brand-group {
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
}

.logo-lockup {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: var(--text-primary);
}

.brand-divider {
  width: 1px;
  height: 30px;
  background: var(--border-card);
}

.room-invite-group {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--surface-subtle);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-md);
  padding: 4px 6px 4px 12px;
}

.room-code-label {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--text-secondary);
  letter-spacing: 0.05em;
}

.room-code-value {
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.1em;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.mobile-menu-btn {
  display: none;
  width: 38px;
  height: 38px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-card);
  background: var(--surface-subtle);
  color: var(--text-primary);
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.16s ease;
}

.mobile-menu-btn:hover {
  border-color: var(--secondary);
  background: var(--secondary-soft);
}

.mobile-menu-backdrop {
  position: fixed;
  inset: 0;
  top: 62px;
  background: var(--surface-overlay);
  backdrop-filter: blur(2px);
  z-index: 48;
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
  padding: 10px 14px;
}

.mobile-menu-drawer {
  width: 100%;
  max-width: 320px;
  background: var(--surface-card);
  border: 2px solid var(--border-card);
  border-radius: var(--radius-lg);
  padding: 14px;
  box-shadow: var(--shadow-modal);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mobile-invite-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  background: var(--surface-subtle);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-md);
  padding: 8px 10px;
}

.mobile-menu-item {
  width: 100%;
  justify-content: flex-start;
  padding: 11px 14px;
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

.btn-sm {
  padding: 6px 10px;
  font-size: 11px;
}

.btn-primary {
  background: var(--btn-primary-bg);
  color: var(--btn-primary-text);
  border-color: var(--btn-primary-bg);
}
.btn-primary:hover {
  opacity: 0.92;
}

.btn-secondary-solid {
  background: var(--btn-secondary-bg);
  color: var(--btn-secondary-text);
  border-color: var(--btn-secondary-bg);
  font-weight: 700;
}
.btn-secondary-solid:hover {
  filter: brightness(0.96);
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

.btn-outline.active-toggle {
  background: var(--secondary-soft);
  border-color: var(--secondary);
  color: var(--text-primary);
}

.btn-danger-outline {
  background: var(--surface-card);
  color: var(--danger);
  border: 1px solid var(--danger-border);
}
.btn-danger-outline:hover {
  background: var(--danger-soft);
  border-color: var(--danger);
}

.btn-danger-solid {
  background: var(--danger);
  color: #FFFFFF;
  border: 1px solid var(--danger);
}
.btn-danger-solid:hover {
  filter: brightness(0.93);
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: var(--surface-overlay);
  backdrop-filter: blur(2px);
  display: none;
  align-items: center;
  justify-content: center;
  padding: var(--space-M);
  z-index: 100;
}

.modal-backdrop.open {
  display: flex;
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

.modal-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 8px;
  border-top: 1px dashed var(--border-dashed);
}

@media (max-width: 900px) {
  .top-bar {
    padding: 10px var(--space-M);
  }

  .desktop-only {
    display: none !important;
  }

  .mobile-menu-btn {
    display: inline-flex;
  }
}
</style>
