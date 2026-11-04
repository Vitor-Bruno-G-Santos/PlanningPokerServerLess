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
  currentRoomCards?: VoteValue[];
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'create',
  selectedDeckId: '',
  currentRoomCards: () => [],
});

const emit = defineEmits<{
  close: [];
  selectDeck: [payload: { id: string; name: string; cards: VoteValue[] }];
  decksUpdated: [decks: CustomDeck[]];
}>();

const customDecks = ref<CustomDeck[]>(loadCustomDecks());
const editingDeck = ref<CustomDeck | null>(null);
const creatingInsideManage = ref(false);

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
      creatingInsideManage.value = false;
      resetForm();
    }
  }
);

const isShowingForm = computed(
  () =>
    props.mode === 'create' ||
    editingDeck.value !== null ||
    creatingInsideManage.value
);

const parsedCardsPreview = computed(() => parseDeckString(deckCardsRaw.value));

function isSameCards(a: VoteValue[], b: VoteValue[]): boolean {
  if (!a || !b || a.length !== b.length) return false;
  return a.every((val, idx) => val === b[idx]);
}

function isDeckActive(id: string, cards: VoteValue[]): boolean {
  if (props.selectedDeckId && props.selectedDeckId === id) return true;
  if (props.currentRoomCards && props.currentRoomCards.length > 0) {
    return isSameCards(props.currentRoomCards, cards);
  }
  return false;
}

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

  if (props.mode === 'manage') {
    editingDeck.value = null;
    creatingInsideManage.value = false;
    resetForm();
  } else {
    resetForm();
    emit('close');
  }
}

function startCreateFromManage(initialCards?: VoteValue[], suggestedName = '') {
  editingDeck.value = null;
  creatingInsideManage.value = true;
  deckName.value = suggestedName;
  deckCardsRaw.value = (
    initialCards && initialCards.length > 0 ? initialCards : DEFAULT_DECK
  ).join(', ');
  formError.value = '';
}

function startEditFromManage(deck: CustomDeck) {
  creatingInsideManage.value = false;
  editingDeck.value = deck;
  deckName.value = deck.name;
  deckCardsRaw.value = deck.cards.join(', ');
  formError.value = '';
}

function cancelEditInManage() {
  editingDeck.value = null;
  creatingInsideManage.value = false;
  resetForm();
}

function handleUseDeck(payload: { id: string; name: string; cards: VoteValue[] }) {
  emit('selectDeck', {
    id: payload.id,
    name: payload.name,
    cards: [...payload.cards],
  });
  emit('close');
}

function handleDeleteDeck(id: string) {
  deleteCustomDeck(id);
  refreshDecks();
}

function resetForm() {
  deckName.value = '';
  deckCardsRaw.value = (
    props.currentRoomCards && props.currentRoomCards.length > 0
      ? props.currentRoomCards
      : DEFAULT_DECK
  ).join(', ');
  singleCardInput.value = '';
  formError.value = '';
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-110 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto"
      @click.self="emit('close')"
    >
      <section
        class="w-full max-w-xl rounded-2xl p-6 flex flex-col gap-5 my-auto"
        style="
          background-color: var(--surface-card);
          border: 2px solid var(--border-card);
          color: var(--text-primary);
          box-shadow: var(--shadow-modal);
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
              <template v-if="mode === 'create' || creatingInsideManage">
                NOVO BARALHO PERSONALIZADO
              </template>
              <template v-else-if="editingDeck">
                EDITAR BARALHO SALVO
              </template>
              <template v-else>
                SISTEMA DE VOTO // BIBLIOTECA DE BARALHOS
              </template>
            </span>
            <h2
              class="text-xl font-bold uppercase tracking-wide"
              style="font-family: var(--font-display);"
            >
              <template v-if="mode === 'create' || creatingInsideManage">
                CRIAR BARALHO
              </template>
              <template v-else-if="editingDeck">
                EDITANDO "{{ editingDeck.name }}"
              </template>
              <template v-else>
                GERENCIAR E ESCOLHER BARALHOS
              </template>
            </h2>
            <p class="text-xs" style="color: var(--text-secondary);">
              <template v-if="mode === 'create' || creatingInsideManage">
                Dê um nome e defina as cartas. Ele ficará salvo no seu navegador e já será aplicado.
              </template>
              <template v-else-if="editingDeck">
                Altere o nome ou as cartas deste baralho salvo.
              </template>
              <template v-else>
                Escolha qual baralho usar na sala, crie novos ou edite seus baralhos personalizados.
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

        <!-- MODO 1: CRIAR OU EDITAR BARALHO -->
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
              v-if="mode === 'manage'"
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
              {{ editingDeck ? 'Salvar e Aplicar' : 'Salvar Baralho' }}
            </BaseButton>
          </div>
        </form>

        <!-- MODO 2: GERENCIAR E ESCOLHER BARALHOS -->
        <div v-else class="flex flex-col gap-4 max-h-[68vh] overflow-y-auto pr-1">
          <!-- Cabeçalho de Baralhos Personalizados + Botão Criar -->
          <div class="flex flex-col gap-2.5">
            <div class="flex items-center justify-between gap-2">
              <span
                class="text-xs font-bold uppercase tracking-wider"
                style="font-family: var(--font-mono); color: var(--text-secondary);"
              >
                MEUS BARALHOS PERSONALIZADOS ({{ customDecks.length }})
              </span>
              <BaseButton
                type="button"
                variant="secondary"
                size="sm"
                @click="startCreateFromManage()"
              >
                + Criar Baralho
              </BaseButton>
            </div>

            <div
              v-if="customDecks.length === 0"
              class="rounded-xl border border-dashed p-5 flex flex-col items-center justify-center text-center gap-1.5"
              style="
                border-color: var(--border-dashed);
                background-color: var(--surface-subtle);
              "
            >
              <span class="text-xs font-semibold">
                Nenhum baralho personalizado salvo ainda
              </span>
              <p class="text-[11px] max-w-xs" style="color: var(--text-secondary);">
                Clique em "+ Criar Baralho" acima para montar um baralho com suas próprias cartas.
              </p>
            </div>

            <div
              v-else
              class="flex flex-col gap-2.5"
            >
              <div
                v-for="deck in customDecks"
                :key="deck.id"
                class="rounded-xl p-3.5 flex flex-col gap-2.5"
                :style="{
                  backgroundColor: 'var(--surface-subtle)',
                  border: isDeckActive(deck.id, deck.cards)
                    ? '2px solid var(--card-active-border)'
                    : '1px solid var(--border-card)',
                }"
              >
                <div class="flex items-start justify-between gap-2 flex-wrap">
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
                      :variant="isDeckActive(deck.id, deck.cards) ? 'primary' : 'outline'"
                      size="sm"
                      @click="handleUseDeck(deck)"
                    >
                      {{ isDeckActive(deck.id, deck.cards) ? 'Em Uso' : 'Escolher' }}
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
          </div>

          <!-- Baralhos Padrão do Sistema -->
          <div
            class="flex flex-col gap-2.5 pt-3 border-t border-dashed"
            style="border-color: var(--border-dashed);"
          >
            <span
              class="text-xs font-bold uppercase tracking-wider"
              style="font-family: var(--font-mono); color: var(--text-secondary);"
            >
              BARALHOS PADRÃO DO SISTEMA ({{ DECK_PRESETS.length }})
            </span>

            <div class="flex flex-col gap-2">
              <div
                v-for="preset in DECK_PRESETS"
                :key="preset.id"
                class="rounded-xl p-3.5 flex flex-col gap-2"
                :style="{
                  backgroundColor: 'var(--surface-subtle)',
                  border: isDeckActive(preset.id, preset.cards)
                    ? '2px solid var(--card-active-border)'
                    : '1px solid var(--border-card)',
                }"
              >
                <div class="flex items-center justify-between gap-2 flex-wrap">
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="text-sm font-bold truncate">
                      {{ preset.label.split(' (')[0] }}
                    </span>
                    <span
                      class="text-[11px] shrink-0"
                      style="font-family: var(--font-mono); color: var(--text-secondary);"
                    >
                      ({{ preset.cards.length }} cartas)
                    </span>
                  </div>

                  <div class="flex items-center gap-1.5 shrink-0">
                    <BaseButton
                      type="button"
                      :variant="isDeckActive(preset.id, preset.cards) ? 'primary' : 'outline'"
                      size="sm"
                      @click="
                        handleUseDeck({
                          id: preset.id,
                          name: preset.label.split(' (')[0],
                          cards: [...preset.cards],
                        })
                      "
                    >
                      {{ isDeckActive(preset.id, preset.cards) ? 'Em Uso' : 'Escolher' }}
                    </BaseButton>
                    <BaseButton
                      type="button"
                      variant="outline"
                      size="sm"
                      @click="
                        startCreateFromManage(
                          [...preset.cards],
                          `${preset.label.split(' (')[0]} Custom`
                        )
                      "
                    >
                      Editar Cópia
                    </BaseButton>
                  </div>
                </div>

                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="card in preset.cards"
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
