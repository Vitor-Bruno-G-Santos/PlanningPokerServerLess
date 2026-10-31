<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  DECK_PRESETS,
  DEFAULT_DECK,
  parseDeckString,
  type VoteValue,
} from '@shared/types';
import PlayingCard from '@/components/atoms/PlayingCard.vue';
import BaseButton from '@/components/atoms/BaseButton.vue';

interface Props {
  selectedVote: VoteValue | null;
  deck?: VoteValue[];
  isHost?: boolean;
  disabled?: boolean;
  isSpectator?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  deck: () => [...DEFAULT_DECK],
  isHost: false,
  disabled: false,
  isSpectator: false,
});

const emit = defineEmits<{
  selectVote: [vote: VoteValue];
  updateDeck: [cards: VoteValue[]];
}>();

const activeDeck = computed(() =>
  props.deck && props.deck.length > 0 ? props.deck : [...DEFAULT_DECK]
);

const editingDeck = ref(false);
const draftDeckInput = ref(activeDeck.value.join(', '));
const newSingleCard = ref('');

watch(
  activeDeck,
  (val) => {
    if (!editingDeck.value) {
      draftDeckInput.value = val.join(', ');
    }
  },
  { deep: true }
);

const draftCardsPreview = computed(() => parseDeckString(draftDeckInput.value));

function openDeckEditor() {
  draftDeckInput.value = activeDeck.value.join(', ');
  editingDeck.value = true;
}

function applyPreset(cards: VoteValue[]) {
  draftDeckInput.value = cards.join(', ');
}

function addChipCard() {
  const clean = newSingleCard.value.trim().slice(0, 8);
  if (!clean) return;
  const current = draftCardsPreview.value;
  if (!current.includes(clean)) {
    draftDeckInput.value = [...current, clean].join(', ');
  }
  newSingleCard.value = '';
}

function removeChipCard(cardToRemove: VoteValue) {
  const filtered = draftCardsPreview.value.filter((c) => c !== cardToRemove);
  if (filtered.length > 0) {
    draftDeckInput.value = filtered.join(', ');
  }
}

function saveDeckChanges() {
  const parsed = parseDeckString(draftDeckInput.value);
  emit('updateDeck', parsed);
  editingDeck.value = false;
}
</script>

<template>
  <section
    class="w-full rounded-2xl border border-slate-800/90 bg-slate-900/80 backdrop-blur-md px-4 py-4 shadow-xl flex flex-col gap-4"
  >
    <!-- Painel de Edicao do Baralho (Exclusivo do Host quando aberto) -->
    <div
      v-if="isHost && editingDeck"
      class="rounded-xl bg-slate-950/90 border border-indigo-500/40 p-4 flex flex-col gap-3.5"
    >
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex flex-col">
          <span class="text-xs font-bold uppercase tracking-wider text-indigo-400">
            Configurar Baralho da Sala
          </span>
          <span class="text-xs text-slate-400">
            Escolha um preset rápido, clique nas cartas para remover ou digite valores separados por vírgula.
          </span>
        </div>

        <div class="flex items-center gap-2">
          <BaseButton size="sm" variant="primary" @click="saveDeckChanges">
            Salvar Baralho ({{ draftCardsPreview.length }} cartas)
          </BaseButton>
          <BaseButton size="sm" variant="ghost" @click="editingDeck = false">
            Cancelar
          </BaseButton>
        </div>
      </div>

      <!-- Presets Rapidos -->
      <div class="flex flex-wrap items-center gap-1.5">
        <span class="text-[11px] font-semibold text-slate-400 mr-1">Presets:</span>
        <button
          v-for="preset in DECK_PRESETS"
          :key="preset.id"
          type="button"
          class="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600/30 text-slate-200 border border-slate-700 hover:border-indigo-500/50 transition-colors cursor-pointer"
          @click="applyPreset(preset.cards)"
        >
          {{ preset.label.split(' (')[0] }}
        </button>
      </div>

      <!-- Chips interativos das cartas atuais + Adicionar carta avulsa -->
      <div class="flex flex-wrap items-center gap-1.5">
        <span
          v-for="card in draftCardsPreview"
          :key="card"
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/70 border border-indigo-500/40 text-xs font-bold text-indigo-200"
        >
          {{ card }}
          <button
            v-if="draftCardsPreview.length > 1"
            type="button"
            class="text-indigo-400 hover:text-rose-400 cursor-pointer leading-none"
            title="Remover carta"
            @click="removeChipCard(card)"
          >
            ×
          </button>
        </span>

        <form class="inline-flex items-center gap-1" @submit.prevent="addChipCard">
          <input
            v-model="newSingleCard"
            type="text"
            maxlength="8"
            placeholder="+ carta"
            class="w-20 rounded-lg bg-slate-900 border border-slate-700 px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            class="text-xs px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 font-semibold cursor-pointer"
          >
            Add
          </button>
        </form>
      </div>

      <!-- Edicao livre em texto separado por virgula -->
      <div class="flex flex-col gap-1">
        <label class="text-[11px] font-medium text-slate-400">
          Lista separada por vírgula:
        </label>
        <input
          v-model="draftDeckInput"
          type="text"
          class="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
          placeholder="0, 1, 2, 3, 5, 8, 13, 21, ?, ☕"
          @keydown.enter.prevent="saveDeckChanges"
        />
      </div>
    </div>

    <!-- Mensagem Modo Espectador -->
    <div
      v-if="isSpectator"
      class="flex items-center justify-between gap-2 py-1 text-sm text-slate-400 px-2"
    >
      <span>
        Você está no <strong class="text-slate-200">Modo Espectador</strong>. Desative-o no topo para votar.
      </span>
      <button
        v-if="isHost && !editingDeck"
        type="button"
        class="text-xs font-semibold text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
        @click="openDeckEditor"
      >
        Editar Cartas do Baralho
      </button>
    </div>

    <!-- Dock Normal de Cartas -->
    <div v-else class="flex flex-col items-center gap-3">
      <div class="flex flex-wrap items-center justify-between w-full px-2 gap-2">
        <div class="flex items-center gap-3">
          <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Escolha sua carta ({{ activeDeck.length }} opções)
          </span>
          <button
            v-if="isHost && !editingDeck"
            type="button"
            class="text-xs font-semibold text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
            @click="openDeckEditor"
          >
            Editar Cartas
          </button>
        </div>

        <span v-if="selectedVote" class="text-xs text-indigo-300 font-medium">
          Sua carta selecionada: <strong class="text-white">{{ selectedVote }}</strong>
          (clique novamente para limpar)
        </span>
      </div>

      <div
        class="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 pt-2 pb-1"
      >
        <PlayingCard
          v-for="card in activeDeck"
          :key="card"
          :value="card"
          :face-up="true"
          :selected="selectedVote === card"
          :disabled="disabled"
          interactive
          size="md"
          @select="emit('selectVote', $event)"
        />
      </div>
    </div>
  </section>
</template>
