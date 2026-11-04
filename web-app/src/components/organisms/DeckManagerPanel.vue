<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  DECK_PRESETS,
  DEFAULT_DECK,
  parseDeckString,
  type VoteValue,
} from '@shared/types';
import {
  deleteCustomDeck,
  loadCustomDecks,
  saveCustomDeck,
  type CustomDeck,
} from '@/utils/storage';
import BaseButton from '@/components/atoms/BaseButton.vue';
import BaseInput from '@/components/atoms/BaseInput.vue';

export type DeckModalMode = 'create' | 'manage';

interface Props {
  open: boolean;
  mode?: DeckModalMode;
  selectedDeckId?: string;
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'create',
  selectedDeckId: '',
});

const emit = defineEmits<{
  close: [];
  selectDeck: [payload: { id: string; name: string; cards: VoteValue[] }];
  decksUpdated: [decks: CustomDeck[]];
}>();

const customDecks = ref<CustomDeck[]>(loadCustomDecks());
const editingDeck = ref<CustomDeck | null>(null);

const deckName = ref('');
const deckCardsRaw = ref(DEFAULT_DECK.join(', '));
const singleCardInput = ref('');
const formError = ref('');

watch(
  () => [props.open, props.mode],
  ([isOpen]) => {
    if (isOpen) {
      customDecks.value = loadCustomDecks();
      editingDeck.value = null;
      resetForm();
    }
  }
);

const isShowingForm = computed(
  () => props.mode === 'create' || editingDeck.value !== null
);

const parsedCardsPreview = computed(() => parseDeckString(deckCardsRaw.value));

function refreshDecks() {
  customDecks.value = loadCustomDecks();
  emit('decksUpdated', customDecks.value);
}

function applyTemplateCards(cards: VoteValue[]) {
  deckCardsRaw.value = cards.join(', ');
}

function addSingleCard() {
  const clean = singleCardInput.value.trim().slice(0, 8);
  if (!clean) return;
  const current = parsedCardsPreview.value;
  if (!current.includes(clean)) {
    deckCardsRaw.value = [...current, clean].join(', ');
  }
  singleCardInput.value = '';
}

function removeCardFromPreview(card: VoteValue) {
  const next = parsedCardsPreview.value.filter((c) => c !== card);
  if (next.length > 0) {
    deckCardsRaw.value = next.join(', ');
  }
}

function handleSaveDeck() {
  const cleanName = deckName.value.trim();
  if (!cleanName) {
    formError.value = 'Dê um nome para o seu baralho (ex: Sprint Backend).';
    return;
  }

  const cards = parsedCardsPreview.value;
  if (cards.length === 0) {
    formError.value = 'Adicione pelo menos uma carta ao baralho.';
    return;
  }

  formError.value = '';
  const saved = saveCustomDeck(
    cleanName,
    cards,
    editingDeck.value?.id ?? undefined
  );
  refreshDecks();
  emit('selectDeck', {
    id: saved.id,
    name: saved.name,
    cards: saved.cards,
  });

  if (props.mode === 'manage' && editingDeck.value) {
    editingDeck.value = null;
    resetForm();
  } else {
    resetForm();
    emit('close');
  }
}

function startEditFromManage(deck: CustomDeck) {
  editingDeck.value = deck;
  deckName.value = deck.name;
  deckCardsRaw.value = deck.cards.join(', ');
  formError.value = '';
}

function cancelEditInManage() {
  editingDeck.value = null;
  resetForm();
}

function handleUseDeck(deck: CustomDeck) {
  emit('selectDeck', {
    id: deck.id,
    name: deck.name,
    cards: deck.cards,
  });
  emit('close');
}

function handleDeleteDeck(id: string) {
  deleteCustomDeck(id);
  refreshDecks();
}

function resetForm() {
  deckName.value = '';
  deckCardsRaw.value = DEFAULT_DECK.join(', ');
  singleCardInput.value = '';
  formError.value = '';
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto"
      @click.self="emit('close')"
    >
      <section
        class="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl flex flex-col gap-5 my-auto"
      >
        <!-- Header do Modal -->
        <div
          class="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-4"
        >
          <div class="flex flex-col gap-1">
            <span class="text-xs font-bold uppercase tracking-wider text-indigo-400">
              <template v-if="mode === 'create'">
                Novo Baralho Personalizado
              </template>
              <template v-else-if="editingDeck">
                Editar Baralho Salvo
              </template>
              <template v-else>
                Biblioteca do Navegador
              </template>
            </span>
            <h2 class="text-xl font-bold text-white">
              <template v-if="mode === 'create'">
                Criar Baralho
              </template>
              <template v-else-if="editingDeck">
                Editando "{{ editingDeck.name }}"
              </template>
              <template v-else>
                Gerenciar Baralhos Salvos
              </template>
            </h2>
            <p class="text-xs text-slate-400">
              <template v-if="mode === 'create'">
                Dê um nome e defina as cartas. Ele ficará salvo no seu navegador.
              </template>
              <template v-else-if="editingDeck">
                Altere o nome ou as cartas deste baralho salvo.
              </template>
              <template v-else>
                Visualize, edite ou exclua os baralhos personalizados salvos no seu navegador.
              </template>
            </p>
          </div>

          <button
            type="button"
            class="rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer"
            @click="emit('close')"
          >
            ✕
          </button>
        </div>

        <!-- MODO 1: CRIAR NOVO BARALHO (ou editando um baralho a partir do Gerenciar) -->
        <form
          v-if="isShowingForm"
          class="flex flex-col gap-4"
          @submit.prevent="handleSaveDeck"
        >
          <BaseInput
            id="custom-deck-name"
            v-model="deckName"
            label="Nome do Baralho"
            placeholder="Ex: Fibonacci Curto, Estimativa Horas, T-Shirt Squad..."
            :error="formError"
          />

          <!-- Ponto de partida rapido -->
          <div class="flex flex-col gap-1.5">
            <span class="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Basear em um modelo (opcional)
            </span>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="preset in DECK_PRESETS"
                :key="preset.id"
                type="button"
                class="text-[11px] px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-indigo-600/25 text-slate-300 hover:text-indigo-200 border border-slate-800 hover:border-indigo-500/40 transition-colors cursor-pointer"
                @click="applyTemplateCards(preset.cards)"
              >
                {{ preset.label.split(' (')[0] }}
              </button>
            </div>
          </div>

          <!-- Preview visual de cartas + adicionar carta individual -->
          <div class="flex flex-col gap-2">
            <span class="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Cartas ({{ parsedCardsPreview.length }} — clique no × para remover)
            </span>

            <div
              class="flex flex-wrap items-center gap-1.5 p-3 rounded-xl bg-slate-950/80 border border-slate-800/90 min-h-[52px]"
            >
              <span
                v-for="card in parsedCardsPreview"
                :key="card"
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/80 border border-indigo-500/40 text-xs font-bold text-indigo-200 shadow-sm"
              >
                {{ card }}
                <button
                  v-if="parsedCardsPreview.length > 1"
                  type="button"
                  class="text-indigo-400 hover:text-rose-400 cursor-pointer leading-none"
                  title="Remover carta"
                  @click="removeCardFromPreview(card)"
                >
                  ×
                </button>
              </span>

              <div class="inline-flex items-center gap-1 ml-1">
                <input
                  v-model="singleCardInput"
                  type="text"
                  maxlength="8"
                  placeholder="+ carta"
                  class="w-20 rounded-lg bg-slate-900 border border-slate-700 px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  @keydown.enter.prevent="addSingleCard"
                />
                <button
                  type="button"
                  class="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 font-semibold cursor-pointer"
                  @click="addSingleCard"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          <!-- Edicao direta por virgula -->
          <div class="flex flex-col gap-1">
            <label
              for="custom-deck-raw-input"
              class="text-[11px] font-medium uppercase tracking-wider text-slate-400"
            >
              Ou digite as cartas separadas por vírgula
            </label>
            <input
              id="custom-deck-raw-input"
              v-model="deckCardsRaw"
              type="text"
              class="w-full rounded-xl bg-slate-950/90 border border-slate-700/80 px-3.5 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              placeholder="0, 1, 2, 3, 5, 8, 13, ?, ☕"
            />
          </div>

          <div class="flex items-center justify-end gap-2 pt-2">
            <BaseButton
              v-if="editingDeck"
              type="button"
              variant="ghost"
              size="md"
              @click="cancelEditInManage"
            >
              Voltar para Lista
            </BaseButton>
            <BaseButton
              v-else
              type="button"
              variant="ghost"
              size="md"
              @click="emit('close')"
            >
              Cancelar
            </BaseButton>
            <BaseButton type="submit" variant="primary" size="md">
              {{ editingDeck ? 'Salvar Alterações' : 'Salvar Baralho' }}
            </BaseButton>
          </div>
        </form>

        <!-- MODO 2: GERENCIAR BARALHOS SALVOS (Apenas a lista de baralhos ja salvos) -->
        <div v-else class="flex flex-col gap-4">
          <div
            v-if="customDecks.length === 0"
            class="rounded-xl border border-dashed border-slate-800 bg-slate-950/50 p-8 flex flex-col items-center justify-center text-center gap-2"
          >
            <span class="text-sm font-semibold text-slate-300">
              Você ainda não tem baralhos salvos
            </span>
            <p class="text-xs text-slate-500 max-w-xs">
              Use o botão "+ Baralho" para criar seu primeiro baralho personalizado.
            </p>
          </div>

          <div
            v-else
            class="flex flex-col gap-2.5 max-h-[360px] overflow-y-auto pr-1"
          >
            <div
              v-for="deck in customDecks"
              :key="deck.id"
              class="rounded-xl p-4 border transition-colors flex flex-col gap-2.5"
              :class="
                selectedDeckId === deck.id
                  ? 'bg-indigo-950/40 border-indigo-500/60'
                  : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
              "
            >
              <div class="flex items-start justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="text-sm font-bold text-white truncate">
                    {{ deck.name }}
                  </span>
                  <span class="text-[11px] text-slate-400 shrink-0">
                    ({{ deck.cards.length }} cartas)
                  </span>
                </div>

                <div class="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    class="text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer"
                    :class="
                      selectedDeckId === deck.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 hover:bg-indigo-600/30 text-indigo-300'
                    "
                    @click="handleUseDeck(deck)"
                  >
                    {{ selectedDeckId === deck.id ? 'Selecionado' : 'Selecionar' }}
                  </button>
                  <button
                    type="button"
                    class="text-xs px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 cursor-pointer"
                    @click="startEditFromManage(deck)"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    class="text-xs px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-800 cursor-pointer"
                    title="Excluir baralho"
                    @click="handleDeleteDeck(deck.id)"
                  >
                    Excluir
                  </button>
                </div>
              </div>

              <div class="flex flex-wrap gap-1">
                <span
                  v-for="card in deck.cards"
                  :key="card"
                  class="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300"
                >
                  {{ card }}
                </span>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-end pt-1">
            <BaseButton
              type="button"
              variant="secondary"
              size="sm"
              @click="emit('close')"
            >
              Fechar
            </BaseButton>
          </div>
        </div>
      </section>
    </div>
  </Teleport>
</template>
