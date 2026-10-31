<script setup lang="ts">
import { ref, watch } from 'vue';
import BaseButton from '@/components/atoms/BaseButton.vue';
import BaseBadge from '@/components/atoms/BaseBadge.vue';

interface Props {
  storyTitle: string;
  isHost: boolean;
  revealed: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  updateTitle: [newTitle: string];
}>();

const editing = ref(false);
const draftTitle = ref(props.storyTitle);

watch(
  () => props.storyTitle,
  (val) => {
    if (!editing.value) {
      draftTitle.value = val;
    }
  }
);

function startEdit() {
  if (!props.isHost) return;
  draftTitle.value = props.storyTitle;
  editing.value = true;
}

function saveEdit() {
  editing.value = false;
  if (draftTitle.value.trim() && draftTitle.value.trim() !== props.storyTitle) {
    emit('updateTitle', draftTitle.value.trim());
  }
}
</script>

<template>
  <div
    class="w-full rounded-2xl bg-slate-900/75 border border-slate-800 px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
  >
    <div class="flex flex-col gap-1 min-w-0 flex-1">
      <div class="flex items-center gap-2">
        <span class="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
          História em Votação
        </span>
        <BaseBadge :tone="revealed ? 'emerald' : 'indigo'" dot>
          {{ revealed ? 'Votos Revelados' : 'Votação Aberta' }}
        </BaseBadge>
      </div>

      <div v-if="editing" class="flex items-center gap-2 mt-1">
        <input
          v-model="draftTitle"
          type="text"
          maxlength="100"
          class="flex-1 rounded-lg bg-slate-950 border border-indigo-500 px-3 py-1.5 text-sm text-white focus:outline-none"
          placeholder="Ex: US-104 Refatorar checkout"
          @keydown.enter="saveEdit"
          @keydown.esc="editing = false"
        />
        <BaseButton size="sm" variant="primary" @click="saveEdit">
          Salvar
        </BaseButton>
        <BaseButton size="sm" variant="ghost" @click="editing = false">
          Cancelar
        </BaseButton>
      </div>

      <div v-else class="flex items-center gap-2 min-w-0">
        <h2 class="text-base sm:text-lg font-bold text-slate-100 truncate">
          {{ storyTitle }}
        </h2>
        <button
          v-if="isHost"
          type="button"
          class="text-xs text-slate-400 hover:text-indigo-300 underline cursor-pointer shrink-0"
          @click="startEdit"
        >
          Editar
        </button>
      </div>
    </div>
  </div>
</template>
