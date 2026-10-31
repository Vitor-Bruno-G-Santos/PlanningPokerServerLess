<script setup lang="ts">
import type { PokerStats } from '@/composables/usePokerStats';
import VoteSummaryCard from '@/components/molecules/VoteSummaryCard.vue';
import BaseBadge from '@/components/atoms/BaseBadge.vue';

interface Props {
  stats: PokerStats;
  revealed: boolean;
}

defineProps<Props>();
</script>

<template>
  <aside
    v-if="revealed"
    class="w-full rounded-2xl border border-slate-800 bg-slate-900/75 p-5 flex flex-col gap-5 animate-fade-in"
  >
    <div class="flex items-center justify-between gap-2">
      <h3 class="text-sm font-bold uppercase tracking-wider text-slate-300">
        Resultado da Estimativa
      </h3>
      <BaseBadge v-if="stats.isConsensus" tone="emerald" dot>
        Consenso Unânime ({{ stats.consensusValue }})
      </BaseBadge>
    </div>

    <!-- Cards de Resumo Estatistico -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <VoteSummaryCard
        label="Média"
        :value="stats.formattedAverage"
        sublabel="Pontos Fibonacci"
        :highlight="stats.isConsensus"
      />
      <VoteSummaryCard
        label="Mediana"
        :value="stats.median ?? '—'"
        sublabel="Valor central"
      />
      <VoteSummaryCard
        label="Mín / Máx"
        :value="
          stats.minVote !== null && stats.maxVote !== null
            ? `${stats.minVote} / ${stats.maxVote}`
            : '—'
        "
        sublabel="Amplitude"
      />
      <VoteSummaryCard
        label="Participação"
        :value="`${stats.totalVoted}/${stats.totalActivePlayers}`"
        :sublabel="`${stats.participationPercent}% votaram`"
      />
    </div>

    <!-- Distribuicao por Carta -->
    <div v-if="stats.distribution.length > 0" class="flex flex-col gap-2.5">
      <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">
        Distribuição dos Votos
      </span>

      <div class="flex flex-col gap-2">
        <div
          v-for="item in stats.distribution"
          :key="item.value"
          class="rounded-xl bg-slate-950/60 border border-slate-800/80 p-3 flex flex-col gap-1.5"
        >
          <div class="flex items-center justify-between text-xs">
            <div class="flex items-center gap-2">
              <span
                class="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/40 font-bold text-indigo-300"
              >
                {{ item.value }}
              </span>
              <span class="font-semibold text-slate-200">
                {{ item.count }} {{ item.count === 1 ? 'voto' : 'votos' }}
                ({{ item.percentage }}%)
              </span>
            </div>
            <span class="text-slate-400 truncate max-w-[260px]">
              {{ item.voters.join(', ') }}
            </span>
          </div>

          <div class="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              class="h-full bg-indigo-500 rounded-full transition-all duration-500"
              :style="{ width: `${item.percentage}%` }"
            />
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>
