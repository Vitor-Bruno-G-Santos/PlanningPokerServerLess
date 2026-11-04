<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { DEFAULT_DECK, type VoteValue } from '@shared/types';

interface Props {
  selectedVote: VoteValue | null;
  deck?: VoteValue[];
  isHost?: boolean;
  disabled?: boolean;
  isSpectator?: boolean;
  sidebarCollapsed?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  deck: () => [...DEFAULT_DECK],
  isHost: false,
  disabled: false,
  isSpectator: false,
  sidebarCollapsed: false,
});

const emit = defineEmits<{
  selectVote: [vote: VoteValue];
  updateDeck: [cards: VoteValue[]];
}>();

const activeDeck = computed(() =>
  props.deck && props.deck.length > 0 ? props.deck : [...DEFAULT_DECK]
);

const isMobileExpanded = ref(false);
const handDockRef = ref<HTMLElement | null>(null);

function isMobileOrTouch(): boolean {
  return (
    window.matchMedia('(hover: none), (pointer: coarse)').matches ||
    window.innerWidth <= 900
  );
}

function handleHandDockClick(event: MouseEvent) {
  if (!isMobileOrTouch()) return;
  const target = event.target as HTMLElement | null;
  if (target?.closest('.hand-poker-card')) return;
  isMobileExpanded.value = !isMobileExpanded.value;
}

function handleCardClick(card: VoteValue, event: MouseEvent) {
  event.stopPropagation();
  if (props.disabled) return;

  // No celular/touch: primeiro toque sobe a mão de cartas se estiver abaixada
  if (isMobileOrTouch() && !isMobileExpanded.value) {
    isMobileExpanded.value = true;
    return;
  }

  emit('selectVote', card);
}

function handleDocumentClick(event: MouseEvent) {
  if (!isMobileOrTouch()) return;
  const target = event.target as Node | null;
  if (handDockRef.value && target && !handDockRef.value.contains(target)) {
    isMobileExpanded.value = false;
  }
}

function getFanStyle(index: number, total: number): Record<string, string> {
  if (total <= 1) return { '--rot': '0deg', '--lift': '0px' };
  const mid = (total - 1) / 2;
  const offset = index - mid;
  const rot = (offset * 1.15).toFixed(2);
  const lift = Math.round(Math.abs(offset) * 1.4);
  return {
    '--rot': `${rot}deg`,
    '--lift': `${lift}px`,
  };
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick);
});

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick);
});
</script>

<template>
  <div
    class="hand-dock-wrapper"
    :class="{
      'spectator-hidden': isSpectator,
      'sidebar-collapsed': sidebarCollapsed,
    }"
  >
    <div
      ref="handDockRef"
      class="hand-dock"
      :class="{ 'is-expanded': isMobileExpanded }"
      aria-label="Sua mão de cartas de votação"
      @click="handleHandDockClick"
    >
      <div class="hand-cards-row">
        <button
          v-for="(card, index) in activeDeck"
          :key="card"
          type="button"
          class="hand-poker-card"
          :class="{
            selected: selectedVote === card,
            'is-disabled': disabled,
          }"
          :style="getFanStyle(index, activeDeck.length)"
          :disabled="disabled"
          @click="handleCardClick(card, $event)"
        >
          <span class="mini-corner tl">{{ card }}</span>
          <span>{{ card }}</span>
          <span class="mini-corner br">{{ card }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hand-dock-wrapper {
  position: fixed;
  left: 340px;
  right: 0;
  bottom: 0;
  z-index: 35;
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
  transition: left 0.24s cubic-bezier(0.22, 1, 0.36, 1);
}

.hand-dock-wrapper.sidebar-collapsed {
  left: 52px;
}

.hand-dock-wrapper.spectator-hidden {
  display: none;
}

.hand-dock {
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 24px 0;
  cursor: pointer;
  max-width: 100%;
}

.hand-cards-row {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 8px 16px 0;
  transform: translateY(50%);
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.hand-poker-card {
  width: 78px;
  height: 114px;
  background: var(--surface-card);
  border: 2px solid var(--border-card);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-hand);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  cursor: pointer;
  margin: 0 -6px;
  flex-shrink: 0;
  transform-origin: bottom center;
  transform: rotate(var(--rot, 0deg)) translateY(var(--lift, 0px));
  transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1),
    border-color 0.18s ease,
    background-color 0.18s ease,
    box-shadow 0.22s ease;
  user-select: none;
}

.hand-poker-card .mini-corner {
  position: absolute;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  color: var(--text-muted);
}

.hand-poker-card .mini-corner.tl {
  top: 6px;
  left: 7px;
}

.hand-poker-card .mini-corner.br {
  bottom: 6px;
  right: 7px;
  transform: rotate(180deg);
}

.hand-poker-card.is-disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

/* Desktop (mouse): sobe ao passar o mouse */
@media (hover: hover) and (pointer: fine) and (min-width: 901px) {
  .hand-dock:hover .hand-cards-row,
  .hand-dock:focus-within .hand-cards-row {
    transform: translateY(-10px);
  }

  .hand-dock:hover .hand-poker-card,
  .hand-dock:focus-within .hand-poker-card {
    margin: 0 3px;
    transform: rotate(0deg) translateY(0);
  }

  .hand-poker-card:not(.is-disabled):hover {
    transform: translateY(-18px) scale(1.05) !important;
    border-color: var(--secondary);
    z-index: 10;
  }
}

.hand-poker-card.selected {
  background: var(--btn-primary-bg);
  color: var(--btn-primary-text);
  border-color: var(--card-active-border);
  transform: translateY(-24px) scale(1.06) !important;
  z-index: 12;
  box-shadow: 0 12px 24px rgba(27, 42, 74, 0.25);
}

.hand-poker-card.selected .mini-corner {
  color: var(--secondary);
}

/* Mobile e telas menores (<= 900px): todas as cartas visíveis tanto recolhidas quanto abertas */
@media (max-width: 900px) {
  .hand-dock-wrapper {
    left: 52px;
    right: 0;
  }

  .hand-dock {
    width: 100%;
    padding: 6px 6px 0;
  }

  /* Estado recolhido no mobile: cartas compactas em leque para caberem todas na largura da tela */
  .hand-cards-row {
    width: 100%;
    padding: 6px 6px 0;
    transform: translateY(48%);
  }

  .hand-poker-card {
    width: 42px;
    height: 66px;
    font-size: 16px;
    margin: 0 -6px;
  }

  .hand-poker-card .mini-corner {
    font-size: 8px;
  }

  .hand-poker-card .mini-corner.tl {
    top: 3px;
    left: 4px;
  }

  .hand-poker-card .mini-corner.br {
    bottom: 3px;
    right: 4px;
  }

  .hand-poker-card.selected {
    transform: translateY(-14px) scale(1.05) !important;
  }

  /* Estado expandido ao tocar no mobile: abre todas as cartas organizadas em grade visível sem cortar nenhuma */
  .hand-dock.is-expanded .hand-cards-row {
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
    background: var(--surface-card);
    border-top: 2px solid var(--border-card);
    border-left: 1px solid var(--border-card);
    border-right: 1px solid var(--border-card);
    border-radius: 16px 16px 0 0;
    padding: 14px 10px 16px;
    box-shadow: var(--shadow-modal);
    transform: translateY(0);
  }

  .hand-dock.is-expanded .hand-poker-card {
    width: 52px;
    height: 76px;
    font-size: 19px;
    margin: 0 !important;
    transform: rotate(0deg) translateY(0) !important;
  }

  .hand-dock.is-expanded .hand-poker-card.selected {
    transform: translateY(-6px) scale(1.04) !important;
  }
}
</style>
