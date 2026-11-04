<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Player, VoteValue } from '@shared/types';

interface Props {
  storyTitle: string;
  isHost: boolean;
  revealed: boolean;
  totalVoted: number;
  totalActivePlayers: number;
  activePlayers?: Player[];
  deck?: VoteValue[];
}

const props = withDefaults(defineProps<Props>(), {
  activePlayers: () => [],
  deck: () => [],
});

const emit = defineEmits<{
  revealVotes: [];
  startNewRound: [forceRevoteCurrent: boolean];
  manageDecks: [];
}>();

const isIncompleteModalOpen = ref(false);

const parsedTask = computed(() => {
  const match = props.storyTitle.match(/^([A-Za-z]+-\d+|#\d+)\s*[:\-–]\s*(.+)$/);
  if (match) {
    return {
      code: match[1].toUpperCase(),
      cleanTitle: match[2],
    };
  }
  return {
    code: null,
    cleanTitle: props.storyTitle,
  };
});

const pendingPlayerNames = computed(() => {
  return props.activePlayers
    .filter((p) => !p.hasVoted)
    .map((p) => p.name);
});

const deckSummary = computed(() => {
  if (!props.deck || props.deck.length === 0) {
    return 'Sistema de Voto Padrão';
  }
  return `Baralho da sala (${props.deck.join(', ')})`;
});

function handleRevealClick() {
  if (!props.isHost) return;
  if (props.totalVoted < props.totalActivePlayers) {
    isIncompleteModalOpen.value = true;
    return;
  }
  emit('revealVotes');
}

function confirmForceReveal() {
  isIncompleteModalOpen.value = false;
  emit('revealVotes');
}
</script>

<template>
  <section class="active-task-card">
    <div class="active-task-info">
      <div class="active-task-meta">
        <span class="active-task-tag">
          TASK EM VOTAÇÃO{{ parsedTask.code ? ` // ${parsedTask.code}` : '' }}
        </span>
        <span
          class="vote-counter-badge"
          :class="{
            'all-voted':
              totalActivePlayers > 0 && totalVoted === totalActivePlayers,
          }"
        >
          {{ totalVoted }} DE {{ totalActivePlayers }} VOTARAM
        </span>
      </div>

      <h1 class="active-task-title">
        {{ parsedTask.cleanTitle }}
      </h1>

      <div class="active-task-deck-row">
        <p class="active-task-desc">
          {{ deckSummary }}
        </p>
        <button
          v-if="isHost"
          type="button"
          class="btn-ds btn-outline btn-xs"
          @click="emit('manageDecks')"
        >
          GERENCIAR BARALHOS
        </button>
      </div>
    </div>

    <!-- Ações do Host: REVELAR CARTAS ou VOTAR NOVAMENTE / PRÓXIMA TASK -->
    <div
      v-if="isHost"
      class="active-task-actions"
    >
      <button
        v-if="!revealed"
        type="button"
        class="btn-ds btn-primary btn-lg"
        @click="handleRevealClick"
      >
        REVELAR CARTAS
      </button>

      <template v-else>
        <button
          type="button"
          class="btn-ds btn-outline"
          @click="emit('startNewRound', true)"
        >
          VOTAR NOVAMENTE ESTA TASK
        </button>
        <button
          type="button"
          class="btn-ds btn-primary"
          @click="emit('startNewRound', false)"
        >
          PRÓXIMA TASK
        </button>
      </template>
    </div>

    <!-- Status somente leitura na visão do Player -->
    <div
      v-else
      class="player-round-status"
    >
      <span class="player-round-status-tag">
        {{ revealed ? 'CARTAS REVELADAS' : 'STATUS DA RODADA' }}
      </span>
      <span class="player-round-status-main">
        {{ revealed ? 'AGUARDANDO PRÓXIMA TASK' : 'AGUARDANDO HOST REVELAR' }}
      </span>
    </div>
  </section>

  <!-- MODAL DE AVISO: REVELAR CARTAS SEM QUE TODOS TENHAM VOTADO -->
  <div
    v-if="isIncompleteModalOpen"
    class="modal-backdrop open"
    @click.self="isIncompleteModalOpen = false"
  >
    <div
      class="modal-dialog warning-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="warn-modal-title"
    >
      <span class="modal-tag warning">VOTAÇÃO EM ANDAMENTO</span>
      <h3
        id="warn-modal-title"
        class="modal-title"
      >
        NEM TODOS VOTARAM AINDA
      </h3>
      <p class="modal-desc">
        Apenas <strong>{{ totalVoted }} de {{ totalActivePlayers }} participantes</strong> escolheram uma carta.
        <template v-if="pendingPlayerNames.length > 0">
          <strong>{{ pendingPlayerNames.join(', ') }}</strong> ainda
          {{ pendingPlayerNames.length === 1 ? 'não finalizou' : 'não finalizaram' }} o voto.
        </template>
        <br /><br />
        Deseja realmente revelar as cartas antes que todos terminem a votação?
      </p>
      <div class="modal-actions">
        <button
          type="button"
          class="btn-ds btn-outline"
          @click="isIncompleteModalOpen = false"
        >
          AGUARDAR VOTOS
        </button>
        <button
          type="button"
          class="btn-ds btn-primary"
          @click="confirmForceReveal"
        >
          SIM, REVELAR AGORA
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.active-task-card {
  width: 100%;
  max-width: 880px;
  background: var(--surface-card);
  border: 2px solid var(--card-active-border);
  border-radius: var(--radius-lg);
  padding: 12px 20px;
  box-shadow: var(--shadow-card);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-M);
  text-align: left;
  flex-shrink: 0;
}

.active-task-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1;
}

.active-task-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.active-task-tag {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  color: var(--secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.vote-counter-badge {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  background: var(--surface-subtle);
  border: 1px solid var(--border-card);
  color: var(--text-secondary);
}

.vote-counter-badge.all-voted {
  background: var(--success-soft);
  border-color: var(--success);
  color: var(--success);
}

.active-task-title {
  font-family: var(--font-display);
  font-size: 19px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
  letter-spacing: 0.01em;
  word-break: break-word;
}

.active-task-deck-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.active-task-desc {
  font-size: 13px;
  color: var(--text-secondary);
}

.btn-xs {
  padding: 4px 10px;
  font-size: 11px;
}

.active-task-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.player-round-status {
  background: var(--surface-subtle);
  border: 1px dashed var(--border-dashed);
  border-radius: var(--radius-md);
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
  flex-shrink: 0;
  text-align: right;
}

.player-round-status-tag {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--secondary);
}

.player-round-status-main {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 700;
  color: var(--text-primary);
  text-transform: uppercase;
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

.btn-lg {
  padding: 12px 22px;
  font-size: 13px;
  font-weight: 700;
}

.btn-primary {
  background: var(--btn-primary-bg);
  color: var(--btn-primary-text);
  border-color: var(--btn-primary-bg);
}
.btn-primary:hover {
  opacity: 0.92;
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

.modal-dialog.warning-modal {
  border-color: var(--warning-border);
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

.modal-tag.warning {
  background: var(--warning-soft);
  color: var(--warning);
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
  .active-task-card {
    flex-direction: column;
    align-items: stretch;
  }
  .active-task-actions {
    justify-content: stretch;
  }
  .active-task-actions .btn-ds {
    flex: 1;
  }
  .player-round-status {
    align-items: flex-start;
    text-align: left;
  }
}
</style>
