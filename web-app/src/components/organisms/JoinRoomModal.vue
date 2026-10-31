<script setup lang="ts">
import { ref } from 'vue';
import BaseButton from '@/components/atoms/BaseButton.vue';
import BaseInput from '@/components/atoms/BaseInput.vue';

interface Props {
  open: boolean;
  roomId: string;
  initialName?: string;
}

const props = withDefaults(defineProps<Props>(), {
  initialName: '',
});

const emit = defineEmits<{
  submit: [payload: { name: string; isSpectator: boolean }];
}>();

const name = ref(props.initialName);
const isSpectator = ref(false);
const error = ref('');

function handleSubmit() {
  const trimmed = name.value.trim();
  if (!trimmed) {
    error.value = 'Informe seu nome para sentar à mesa.';
    return;
  }
  error.value = '';
  emit('submit', { name: trimmed, isSpectator: isSpectator.value });
}
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
  >
    <div
      class="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl flex flex-col gap-5"
    >
      <div class="flex flex-col gap-1">
        <span class="text-xs font-bold uppercase tracking-wider text-indigo-400">
          Sala #{{ roomId }}
        </span>
        <h2 class="text-xl font-bold text-white">
          Como você quer ser chamado?
        </h2>
        <p class="text-xs text-slate-400">
          Seu identificador é salvo no sessionStorage desta aba para suportar F5 sem duplicar.
        </p>
      </div>

      <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
        <BaseInput
          id="join-player-name"
          v-model="name"
          label="Seu Nome"
          placeholder="Ex: Vitor Bruno"
          :error="error"
          autofocus
        />

        <label
          class="flex items-center gap-2.5 text-sm text-slate-300 cursor-pointer select-none"
        >
          <input
            v-model="isSpectator"
            type="checkbox"
            class="w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
          />
          <span>Entrar apenas como espectador (não vota)</span>
        </label>

        <BaseButton type="submit" variant="primary" size="lg" full-width>
          Entrar na Mesa
        </BaseButton>
      </form>
    </div>
  </div>
</template>
