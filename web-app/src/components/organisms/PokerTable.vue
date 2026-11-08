<script setup lang="ts">
import { computed } from 'vue';
import type { Player } from '@shared/types';

interface Props {
  players: Player[];
  currentPlayerId: string;
  revealed: boolean;
  isHost: boolean;
  isAnonymous?: boolean;
  totalVoted?: number;
  totalActivePlayers?: number;
  hasNextPendingTask?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isAnonymous: false,
  totalVoted: 0,
  totalActivePlayers: 0,
  hasNextPendingTask: false,
});

/**
 * Regra de negócio: somente participantes ativos na votação aparecem na tela.
 * Quem estiver observando (isSpectator) NÃO aparece com nome nem ícone.
 */
const activeVoters = computed(() =>
  props.players.filter((player) => !player.isSpectator)
);

function getSlotTag(player: Player): {
  label: string;
  isSelf: boolean;
  isHostBadge: boolean;
} | null {
  const isSelf = player.id === props.currentPlayerId;
  if (props.isAnonymous) {
    return isSelf ? { label: 'VOCÊ', isSelf: true, isHostBadge: false } : null;
  }
  if (isSelf && player.isHost) {
    return { label: 'VOCÊ • HOST', isSelf: true, isHostBadge: false };
  }
  if (isSelf) {
    return { label: 'VOCÊ • PLAYER', isSelf: true, isHostBadge: false };
  }
  if (player.isHost) {
    return { label: 'HOST', isSelf: false, isHostBadge: true };
  }
  return null;
}

function getCardStateClass(player: Player): string {
  if (props.revealed) {
    return player.hasVoted && player.vote !== null ? 'revealed' : 'waiting';
  }
  return player.hasVoted ? 'voted-hidden' : 'waiting';
}
</script>

<template>
  <section class="participants-section">
    <div class="participants-header">
      <span class="participants-title">
        PARTICIPANTES VOTANDO ATIVOS ({{ activeVoters.length }})
      </span>
      <span class="participants-rule-note">
        Espectadores permanecem ocultos da votação
      </span>
    </div>

    <div
      v-if="activeVoters.length === 0"
      class="empty-voters-box"
    >
      Nenhum participante ativo na votação no momento. Desative o modo espectador no topo para votar.
    </div>

    <div
      v-else
      class="voters-grid"
    >
      <div
        v-for="voter in activeVoters"
        :key="voter.id"
        class="voter-slot"
        :class="{
          'is-self': voter.id === currentPlayerId,
          'is-host-peer': !isAnonymous && voter.isHost && voter.id !== currentPlayerId,
          'is-disconnected': !voter.connected,
        }"
      >
        <span
          v-if="getSlotTag(voter)"
          class="voter-you-tag"
          :class="{ 'host-badge': getSlotTag(voter)?.isHostBadge }"
        >
          {{ getSlotTag(voter)?.label }}
        </span>

        <!-- Carta do Participante -->
        <div
          class="stage-poker-card"
          :class="getCardStateClass(voter)"
        >
          <template v-if="revealed && voter.hasVoted && voter.vote !== null">
            <span class="card-corner tl">{{ voter.vote }}</span>
            <span>{{ voter.vote }}</span>
            <span class="card-corner br">{{ voter.vote }}</span>
          </template>
          <template v-else-if="!revealed && voter.hasVoted">
            <span class="card-back-pattern">&lt;♠&gt;</span>
          </template>
          <template v-else>
            <span>...</span>
          </template>
        </div>

        <!-- Identificação do Participante (oculta em salas anônimas) -->
        <div
          v-if="!isAnonymous"
          class="voter-identity"
        >
          <div class="voter-name-row">
            <span
              class="voter-name"
              :title="voter.name"
            >{{ voter.name }}</span>
          </div>
          <span
            class="voter-status"
            :class="{ done: voter.hasVoted && voter.connected, disconnected: !voter.connected }"
          >
            <template v-if="!voter.connected">
              {{ voter.hasVoted ? 'VOTOU (OFFLINE)' : 'RECONECTANDO...' }}
            </template>
            <template v-else-if="voter.hasVoted">VOTOU</template>
            <template v-else-if="revealed">NÃO VOTOU</template>
            <template v-else>PENSANDO...</template>
          </span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.participants-section {
  width: 100%;
  max-width: 880px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.participants-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.participants-title {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-secondary);
}

.participants-rule-note {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-muted);
  background: var(--surface-card);
  border: 1px dashed var(--border-dashed);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
}

.empty-voters-box {
  width: 100%;
  padding: 28px 20px;
  background: var(--surface-card);
  border: 1.5px dashed var(--border-dashed);
  border-radius: var(--radius-lg);
  text-align: center;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-muted);
}

.voters-grid {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 20px;
}

.voter-slot {
  width: 122px;
  background: var(--surface-card);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-lg);
  padding: 10px 10px 8px;
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  transition: transform 0.18s ease, border-color 0.18s ease;
  position: relative;
}

.voter-slot.is-self {
  border: 2px solid var(--card-active-border);
}

.voter-slot.is-host-peer {
  border: 1.5px solid var(--secondary);
}

.voter-slot.is-disconnected {
  opacity: 0.55;
  filter: grayscale(0.35);
  border-style: dashed;
}

.voter-you-tag {
  position: absolute;
  top: -9px;
  background: var(--btn-primary-bg);
  color: var(--btn-primary-text);
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
}

.voter-you-tag.host-badge {
  background: var(--secondary);
  color: #1B2A4A;
}

.stage-poker-card {
  width: 60px;
  height: 82px;
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 24px;
  transition: all 0.25s cubic-bezier(0.22, 1, 0.36, 1);
  user-select: none;
}

.stage-poker-card.waiting {
  background: var(--surface-subtle);
  border: 2px dashed var(--border-dashed);
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 13px;
}

.stage-poker-card.voted-hidden {
  background: var(--btn-primary-bg);
  color: var(--btn-primary-text);
  border: 2px solid var(--card-active-border);
  box-shadow: inset 0 0 0 4px var(--surface-card);
}

.stage-poker-card.voted-hidden .card-back-pattern {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  opacity: 0.9;
}

.stage-poker-card.revealed {
  background: var(--surface-card);
  color: var(--text-primary);
  border: 2px solid var(--card-active-border);
  box-shadow: 0 4px 10px rgba(27, 42, 74, 0.08);
}

.card-corner {
  position: absolute;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  color: var(--text-muted);
  line-height: 1;
}

.card-corner.tl {
  top: 6px;
  left: 7px;
}

.card-corner.br {
  bottom: 6px;
  right: 7px;
  transform: rotate(180deg);
}

.voter-identity {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  width: 100%;
  text-align: center;
}

.voter-name-row {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.voter-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.voter-status {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}

.voter-status.done {
  color: var(--success);
}

.voter-status.disconnected {
  color: var(--text-muted);
  font-style: italic;
}
</style>
