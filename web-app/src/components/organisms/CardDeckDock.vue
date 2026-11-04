<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { DECK_PRESETS, DEFAULT_DECK, type VoteValue } from '@shared/types';
import { loadCustomDecks, type CustomDeck } from '@/utils/storage';
import PlayingCard from '@/components/atoms/PlayingCard.vue';
import BaseButton from '@/components/atoms/BaseButton.vue';
import DeckManagerPanel, {
  type DeckModalMode,
} from '@/components/organisms/DeckManagerPanel.vue';

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

const isDeckModalOpen = ref(false);
const deckModalMode = ref<DeckModalMode>('create');
const customDecks = ref<CustomDeck[]>([]);

onMounted(() => {
  customDecks.value = loadCustomDecks();
});

function openCreateDeckModal() {
  deckModalMode.value = 'create';
  isDeckModalOpen.value = true;
}

function openManageDecksModal() {
  deckModalMode.value = 'manage';
  isDeckModalOpen.value = true;
}

function handleQuickDeckChange(event: Event) {
  const target = event.target as HTMLSelectElement;
  const deckId = target.value;
  if (!deckId) return;

  const custom = customDecks.value.find((d) => d.id === deckId);
  if (custom) {
    emit('updateDeck', custom.cards);
    target.value = '';
    return;
  }

  const preset = DECK_PRESETS.find((p) => p.id === deckId);
  if (preset) {
    emit('updateDeck', [...preset.cards]);
    target.value = '';
  }
}

function handleSelectDeckFromModal(payload: {
  id: string;
  name: string;
  cards: VoteValue[];
}) {
  customDecks.value = loadCustomDecks();
  emit('updateDeck', payload.cards);
  isDeckModalOpen.value = false;
}
</script>

<template>
  <section
    class="w-full rounded-2xl border border-slate-800/90 bg-slate-900/80 backdrop-blur-md px-4 py-4 shadow-xl flex flex-col gap-4"
  >
    <!-- Mensagem Modo Espectador -->
    <div
      v-if="isSpectator"
      class="flex flex-wrap items-center justify-between gap-2 py-1 text-sm text-slate-400 px-2"
    >
      <span>
        Você está no <strong class="text-slate-200">Modo Espectador</strong>. Desative-o no topo para votar.
      </span>

      <div v-if="isHost" class="flex flex-wrap items-center gap-2">
        <select
          class="rounded-xl bg-slate-950 border border-slate-700 px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
          @change="handleQuickDeckChange"
        >
          <option value="">Trocar baralho...</option>
          <optgroup v-if="customDecks.length > 0" label="Meus Baralhos Salvos">
            <option v-for="d in customDecks" :key="d.id" :value="d.id">
              ★ {{ d.name }}
            </option>
          </optgroup>
          <optgroup label="Baralhos Padrão">
            <option v-for="p in DECK_PRESETS" :key="p.id" :value="p.id">
              {{ p.label.split(' (')[0] }}
            </option>
          </optgroup>
        </select>

        <BaseButton
          size="sm"
          variant="secondary"
          @click="openCreateDeckModal"
        >
          + Baralho
        </BaseButton>

        <button
          type="button"
          class="text-xs font-semibold text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
          @click="openManageDecksModal"
        >
          Gerenciar Baralhos
        </button>
      </div>
    </div>

    <!-- Dock Normal de Cartas -->
    <div v-else class="flex flex-col items-center gap-3">
      <div class="flex flex-wrap items-center justify-between w-full px-2 gap-2">
        <div class="flex flex-wrap items-center gap-2.5">
          <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Escolha sua carta ({{ activeDeck.length }} opções)
          </span>

          <template v-if="isHost">
            <select
              class="rounded-xl bg-slate-950 border border-slate-700 px-3 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
              @change="handleQuickDeckChange"
            >
              <option value="">Trocar baralho...</option>
              <optgroup v-if="customDecks.length > 0" label="Meus Baralhos Salvos">
                <option v-for="d in customDecks" :key="d.id" :value="d.id">
                  ★ {{ d.name }}
                </option>
              </optgroup>
              <optgroup label="Baralhos Padrão">
                <option v-for="p in DECK_PRESETS" :key="p.id" :value="p.id">
                  {{ p.label.split(' (')[0] }}
                </option>
              </optgroup>
            </select>

            <BaseButton
              size="sm"
              variant="secondary"
              @click="openCreateDeckModal"
            >
              + Baralho
            </BaseButton>

            <button
              type="button"
              class="text-xs font-semibold text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
              @click="openManageDecksModal"
            >
              Gerenciar Baralhos
            </button>
          </template>
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

    <!-- Modal de Baralho (mode='create' ou mode='manage') -->
    <DeckManagerPanel
      v-if="isHost"
      :open="isDeckModalOpen"
      :mode="deckModalMode"
      @close="isDeckModalOpen = false"
      @select-deck="handleSelectDeckFromModal"
      @decks-updated="customDecks = $event"
    />
  </section>
</template>
