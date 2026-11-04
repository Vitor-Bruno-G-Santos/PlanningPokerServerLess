<script setup lang="ts">
import type { PokerStats } from '@/composables/usePokerStats';

interface Props {
  stats: PokerStats;
  revealed: boolean;
}

defineProps<Props>();
</script>

<template>
  <section
    v-if="revealed"
    class="results-card visible"
  >
    <div class="results-header">
      <div class="results-title-group">
        <span class="results-tag">RESULTADO DA ESTIMATIVA</span>
        <h2 class="results-heading">DISTRIBUIÇÃO DE VOTOS &amp; MÉDIA</h2>
      </div>
      <span class="vote-counter-badge all-voted">
        {{ stats.totalVoted }} VOTOS COMPUTADOS
      </span>
    </div>

    <div class="results-grid">
      <!-- Gráfico de Colunas Verticais de cada voto -->
      <div
        v-if="stats.distribution.length > 0"
        class="columns-chart"
      >
        <div
          v-for="item in stats.distribution"
          :key="item.value"
          class="column-item"
        >
          <div class="column-count">
            {{ item.count }} {{ item.count === 1 ? 'voto' : 'votos' }}
            <span class="column-percent">({{ item.percentage }}%)</span>
          </div>

          <div class="column-track">
            <div
              class="column-fill"
              :class="{ majority: item.isMajority }"
              :style="{ height: `${Math.max(item.percentage, 8)}%` }"
            />
          </div>

          <div
            class="column-card-chip"
            :class="{ majority: item.isMajority }"
            :title="`Votado por: ${item.voters.join(', ')}`"
          >
            {{ item.value }}
          </div>
        </div>
      </div>

      <div
        v-else
        class="empty-chart-box"
      >
        Nenhum voto registrado nesta rodada.
      </div>

      <!-- Média da Task (Valor grande arredondado + Valor menor exato entre parênteses embaixo; sem mediana, sem min/max) -->
      <div class="average-box">
        <span class="average-label">MÉDIA DA TASK</span>
        <div class="average-value-group">
          <span class="average-value-rounded">
            {{ stats.roundedAverage }}
          </span>
          <span
            v-if="stats.exactAverage !== '—'"
            class="average-value-exact"
          >
            ({{ stats.exactAverage }})
          </span>
        </div>
        <span class="average-sub">Pontos de História</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.results-card {
  width: 100%;
  max-width: 880px;
  background: var(--surface-card);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-lg);
  padding: 12px 20px;
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  gap: 10px;
  animation: slideDownFade 0.25s ease;
  flex-shrink: 0;
}

@keyframes slideDownFade {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.results-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px dashed var(--border-dashed);
  padding-bottom: 8px;
  gap: 12px;
  flex-wrap: wrap;
}

.results-title-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.results-tag {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  color: var(--secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.results-heading {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-primary);
}

.vote-counter-badge {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  background: var(--success-soft);
  border: 1px solid var(--success);
  color: var(--success);
}

.results-grid {
  display: grid;
  grid-template-columns: 1fr 220px;
  gap: var(--space-L);
  align-items: stretch;
}

.columns-chart {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 20px;
  min-height: 118px;
  padding: 10px 16px 8px;
  background: var(--surface-subtle);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-md);
  flex-wrap: wrap;
}

.empty-chart-box {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 118px;
  padding: 10px;
  background: var(--surface-subtle);
  border: 1px dashed var(--border-dashed);
  border-radius: var(--radius-md);
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-muted);
}

.column-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  min-width: 48px;
}

.column-count {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  color: var(--text-secondary);
  text-align: center;
  line-height: 1.2;
}

.column-percent {
  display: block;
  font-size: 9px;
  color: var(--text-muted);
}

.column-track {
  width: 34px;
  height: 54px;
  background: var(--surface-card);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: flex-end;
  padding: 2px;
  overflow: hidden;
}

.column-fill {
  width: 100%;
  border-radius: 2px;
  background: var(--secondary);
  transition: height 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}

.column-fill.majority {
  background: var(--btn-primary-bg);
}

.column-card-chip {
  width: 34px;
  height: 36px;
  border-radius: var(--radius-sm);
  background: var(--surface-card);
  border: 1.5px solid var(--border-card);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  box-shadow: 0 2px 4px rgba(27, 42, 74, 0.06);
}

.column-card-chip.majority {
  border-color: var(--card-active-border);
  background: var(--secondary-soft);
}

.average-box {
  background: var(--surface-subtle);
  border: 1.5px dashed var(--border-dashed);
  border-radius: var(--radius-md);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 4px;
}

.average-label {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.average-value-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  margin: 1px 0;
}

.average-value-rounded {
  font-family: var(--font-display);
  font-size: 36px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
}

.average-value-exact {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted);
  line-height: 1.2;
}

.average-sub {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-muted);
}

@media (max-width: 900px) {
  .results-grid {
    grid-template-columns: 1fr;
  }
}
</style>
