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
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto"
      @click.self="emit('close')"
    >
      <section
        class="w-full max-w-lg rounded-2xl p-6 flex flex-col gap-5 my-auto"
        style="
          background-color: var(--surface-card);
          border: 1px solid var(--border-card);
          color: var(--text-primary);
          box-shadow: var(--shadow-card);
        "
      >
        <!-- Header do Modal -->
        <div
          class="flex items-start justify-between gap-3 border-b border-dashed pb-4"
          style="border-color: var(--border-dashed);"
        >
          <div class="flex flex-col gap-1">
            <span
              class="text-[11px] font-semibold uppercase tracking-widest"
              style="font-family: var(--font-mono); color: var(--secondary);"
            >
              <template v-if="mode === 'create'">
                NOVO BARALHO PERSONALIZADO
              </template>
              <template v-else-if="editingDeck">
                EDITAR BARALHO SALVO
              </template>
              <template v-else>
                BIBLIOTECA DO NAVEGADOR
              </template>
            </span>
            <h2
              class="text-xl font-bold uppercase tracking-wide"
              style="font-family: var(--font-display);"
            >
              <template v-if="mode === 'create'">
                CRIAR BARALHO
              </template>
              <template v-else-if="editingDeck">
                EDITANDO "{{ editingDeck.name }}"
              </template>
              <template v-else>
                GERENCIAR BARALHOS SALVOS
              </template>
            </h2>
            <p class="text-xs" style="color: var(--text-secondary);">
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

          <BaseButton
            type="button"
            variant="outline"
            size="sm"
            @click="emit('close')"
          >
            ✕
          </BaseButton>
        </div>

        <!-- MODO 1: CRIAR NOVO BARALHO -->
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

          <div class="flex flex-col gap-1.5">
            <span
              class="text-[11px] font-semibold uppercase tracking-wider"
              style="color: var(--text-secondary);"
            >
              Basear em um modelo (opcional)
            </span>
            <div class="flex flex-wrap gap-1.5">
              <BaseButton
                v-for="preset in DECK_PRESETS"
                :key="preset.id"
                type="button"
                variant="outline"
                size="sm"
                @click="applyTemplateCards(preset.cards)"
              >
                {{ preset.label.split(' (')[0] }}
              </BaseButton>
            </div>
          </div>

          <!-- Preview visual de cartas + adicionar carta individual -->
          <div class="flex flex-col gap-2">
            <span
              class="text-[11px] font-semibold uppercase tracking-wider"
              style="color: var(--text-secondary);"
            >
              Cartas ({{ parsedCardsPreview.length }} — clique no × para remover)
            </span>

            <div
              class="flex flex-wrap items-center gap-1.5 p-3 rounded-lg min-h-[52px]"
              style="
                background-color: var(--surface-subtle);
                border: 1px solid var(--border-card);
              "
            >
              <span
                v-for="card in parsedCardsPreview"
                :key="card"
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold"
                style="
                  font-family: var(--font-mono);
                  background-color: var(--surface-card);
                  border: 1px solid var(--secondary);
                  color: var(--text-primary);
                "
              >
                {{ card }}
                <button
                  v-if="parsedCardsPreview.length > 1"
                  type="button"
                  class="hover:text-rose-500 cursor-pointer leading-none"
                  style="color: var(--secondary);"
                  title="Remover carta"
                  @click="removeCardFromPreview(card)"
                >
                  ×
                </button>
              </span>

              <div class="inline-flex items-center gap-1.5 ml-1">
                <input
                  v-model="singleCardInput"
                  type="text"
                  maxlength="8"
                  placeholder="+ carta"
                  class="w-20 rounded px-2 py-1 text-xs focus:outline-none"
                  style="
                    background-color: var(--surface-input);
                    border: 1px solid var(--border-card);
                    color: var(--text-primary);
                  "
                  @keydown.enter.prevent="addSingleCard"
                />
                <BaseButton
                  type="button"
                  variant="outline"
                  size="sm"
                  @click="addSingleCard"
                >
                  Add
                </BaseButton>
              </div>
            </div>
          </div>

          <!-- Edicao direta por virgula -->
          <div class="flex flex-col gap-1">
            <label
              for="custom-deck-raw-input"
              class="text-[11px] font-semibold uppercase tracking-wider"
              style="color: var(--text-secondary);"
            >
              Ou digite as cartas separadas por vírgula
            </label>
            <input
              id="custom-deck-raw-input"
              v-model="deckCardsRaw"
              type="text"
              class="w-full rounded-lg px-3.5 py-2 text-xs font-mono focus:outline-none"
              style="
                background-color: var(--surface-input);
                border: 1px solid var(--border-card);
                color: var(--text-primary);
              "
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

        <!-- MODO 2: GERENCIAR BARALHOS SALVOS -->
        <div v-else class="flex flex-col gap-4">
          <div
            v-if="customDecks.length === 0"
            class="rounded-xl border border-dashed p-8 flex flex-col items-center justify-center text-center gap-2"
            style="
              border-color: var(--border-dashed);
              background-color: var(--surface-subtle);
            "
          >
            <span class="text-sm font-semibold">
              Você ainda não tem baralhos salvos
            </span>
            <p class="text-xs max-w-xs" style="color: var(--text-secondary);">
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
              class="rounded-xl p-4 flex flex-col gap-2.5"
              :style="{
                backgroundColor: 'var(--surface-subtle)',
                border:
                  selectedDeckId === deck.id
                    ? '2px solid var(--card-active-border)'
                    : '1px solid var(--border-card)',
              }"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="text-sm font-bold truncate">
                    {{ deck.name }}
                  </span>
                  <span
                    class="text-[11px] shrink-0"
                    style="font-family: var(--font-mono); color: var(--text-secondary);"
                  >
                    ({{ deck.cards.length }} cartas)
                  </span>
                </div>

                <div class="flex items-center gap-1.5 shrink-0">
                  <BaseButton
                    type="button"
                    :variant="selectedDeckId === deck.id ? 'primary' : 'outline'"
                    size="sm"
                    @click="handleUseDeck(deck)"
                  >
                    {{ selectedDeckId === deck.id ? 'Selecionado' : 'Selecionar' }}
                  </BaseButton>
                  <BaseButton
                    type="button"
                    variant="outline"
                    size="sm"
                    @click="startEditFromManage(deck)"
                  >
                    Editar
                  </BaseButton>
                  <BaseButton
                    type="button"
                    variant="outline"
                    size="sm"
                    @click="handleDeleteDeck(deck.id)"
                  >
                    Excluir
                  </BaseButton>
                </div>
              </div>

              <div class="flex flex-wrap gap-1">
                <span
                  v-for="card in deck.cards"
                  :key="card"
                  class="px-2 py-0.5 rounded text-[11px] font-mono"
                  style="
                    background-color: var(--surface-card);
                    border: 1px solid var(--border-card);
                    color: var(--text-secondary);
                  "
                >
                  {{ card }}
                </span>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-end pt-1">
            <BaseButton
              type="button"
              variant="outline"
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
