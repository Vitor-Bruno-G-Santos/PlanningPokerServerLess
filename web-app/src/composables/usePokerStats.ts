import { computed, type Ref } from 'vue';
import type { Player, RoomState, VoteValue } from '@shared/types';

export interface VoteDistributionItem {
  value: VoteValue;
  count: number;
  percentage: number;
  voters: string[];
  isMajority: boolean;
}

export interface PokerStats {
  totalActivePlayers: number;
  totalVoted: number;
  participationPercent: number;
  average: number | null;
  formattedAverage: string;
  roundedAverage: string;
  exactAverage: string;
  median: number | null;
  minVote: number | null;
  maxVote: number | null;
  isConsensus: boolean;
  consensusValue: VoteValue | null;
  distribution: VoteDistributionItem[];
  coffeeCount: number;
  unsureCount: number;
}

function isNumericVote(vote: VoteValue | null): boolean {
  if (!vote || vote === '?' || vote === '☕') {
    return false;
  }
  return !Number.isNaN(Number(vote));
}

export function usePokerStats(roomState: Ref<RoomState | null>) {
  const playersList = computed<Player[]>(() => {
    if (!roomState.value) return [];
    return Object.values(roomState.value.players);
  });

  const activePlayers = computed<Player[]>(() =>
    playersList.value.filter((p) => !p.isSpectator)
  );

  const spectators = computed<Player[]>(() =>
    playersList.value.filter((p) => p.isSpectator)
  );

  const stats = computed<PokerStats>(() => {
    const active = activePlayers.value;
    const totalActivePlayers = active.length;
    const votedPlayers = active.filter((p) => p.hasVoted);
    const totalVoted = votedPlayers.length;
    const participationPercent =
      totalActivePlayers > 0
        ? Math.round((totalVoted / totalActivePlayers) * 100)
        : 0;

    // Estatisticas de valores so sao calculadas quando os votos estao revelados
    if (!roomState.value?.revealed) {
      return {
        totalActivePlayers,
        totalVoted,
        participationPercent,
        average: null,
        formattedAverage: '—',
        roundedAverage: '—',
        exactAverage: '',
        median: null,
        minVote: null,
        maxVote: null,
        isConsensus: false,
        consensusValue: null,
        distribution: [],
        coffeeCount: 0,
        unsureCount: 0,
      };
    }

    const revealedVoters = active.filter((p) => p.vote !== null);
    const numericValues: number[] = [];
    const distMap = new Map<VoteValue, string[]>();
    let coffeeCount = 0;
    let unsureCount = 0;

    for (const player of revealedVoters) {
      const vote = player.vote!;
      const currentList = distMap.get(vote) ?? [];
      currentList.push(player.name);
      distMap.set(vote, currentList);

      if (vote === '☕') {
        coffeeCount++;
      } else if (vote === '?') {
        unsureCount++;
      } else if (isNumericVote(vote)) {
        numericValues.push(Number(vote));
      }
    }

    numericValues.sort((a, b) => a - b);

    let average: number | null = null;
    let rawAverage: number | null = null;
    let median: number | null = null;
    let minVote: number | null = null;
    let maxVote: number | null = null;

    if (numericValues.length > 0) {
      const sum = numericValues.reduce((acc, n) => acc + n, 0);
      rawAverage = sum / numericValues.length;
      average = Number(rawAverage.toFixed(1));
      minVote = numericValues[0];
      maxVote = numericValues[numericValues.length - 1];

      const mid = Math.floor(numericValues.length / 2);
      median =
        numericValues.length % 2 !== 0
          ? numericValues[mid]
          : Number(((numericValues[mid - 1] + numericValues[mid]) / 2).toFixed(1));
    }

    const entries = Array.from(distMap.entries());
    const maxCount = entries.length > 0
      ? Math.max(...entries.map(([, v]) => v.length))
      : 0;

    const distribution: VoteDistributionItem[] = entries
      .map(([value, voters]) => ({
        value,
        count: voters.length,
        percentage:
          revealedVoters.length > 0
            ? Math.round((voters.length / revealedVoters.length) * 100)
            : 0,
        voters,
        isMajority: voters.length === maxCount && entries.length > 1,
      }))
      .sort((a, b) => {
        const na = Number(a.value);
        const nb = Number(b.value);
        if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
        if (!Number.isNaN(na)) return -1;
        if (!Number.isNaN(nb)) return 1;
        return String(a.value).localeCompare(String(b.value));
      });

    const isConsensus =
      revealedVoters.length > 1 && distribution.length === 1;
    const consensusValue = isConsensus ? distribution[0].value : null;

    return {
      totalActivePlayers,
      totalVoted,
      participationPercent,
      average,
      formattedAverage: average !== null ? average.toFixed(1).replace(/\.0$/, '') : '—',
      roundedAverage: rawAverage !== null ? String(Math.round(rawAverage)) : '—',
      exactAverage: rawAverage !== null ? rawAverage.toFixed(1) : '',
      median,
      minVote,
      maxVote,
      isConsensus,
      consensusValue,
      distribution,
      coffeeCount,
      unsureCount,
    };
  });

  return {
    playersList,
    activePlayers,
    spectators,
    stats,
  };
}
