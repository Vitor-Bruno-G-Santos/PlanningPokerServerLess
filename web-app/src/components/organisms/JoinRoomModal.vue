<script setup lang="ts">
import { ref } from 'vue';

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
    error.value = 'Informe seu nome para entrar na sala.';
    return;
  }
  error.value = '';
  emit('submit', { name: trimmed, isSpectator: isSpectator.value });
}
</script>

<template>
  <div
    v-if="open"
    class="modal-backdrop"
  >
    <div
      class="modal-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="join-modal-title"
    >
      <div class="modal-header-block">
        <span class="modal-tag">SALA #{{ roomId }}</span>
        <h2
          id="join-modal-title"
          class="modal-title"
        >
          COMO VOCÊ QUER SER CHAMADO?
        </h2>
        <p class="modal-desc">
          Identifique-se para participar das estimativas da sprint.
        </p>
      </div>

      <form
        class="modal-form"
        @submit.prevent="handleSubmit"
      >
        <div class="field-group">
          <label
            for="join-player-name"
            class="field-label"
          >
            SEU NOME NA SALA
          </label>
          <input
            id="join-player-name"
            v-model="name"
            type="text"
            class="field-input"
            placeholder="Ex: Vitor Bruno"
            maxlength="40"
            autofocus
          />
          <span
            v-if="error"
            class="field-error"
          >
            {{ error }}
          </span>
        </div>

        <label class="spectator-check">
          <input
            v-model="isSpectator"
            type="checkbox"
          />
          <span>Entrar apenas como espectador (não vota e não aparece na mesa)</span>
        </label>

        <button
          type="submit"
          class="btn-ds btn-primary"
        >
          ENTRAR NA SALA
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: var(--surface-overlay);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-M);
  z-index: 110;
}

.modal-dialog {
  width: 100%;
  max-width: 440px;
  background: var(--surface-card);
  border: 2px solid var(--border-card);
  border-radius: var(--radius-lg);
  padding: var(--space-L);
  box-shadow: var(--shadow-modal);
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.modal-header-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.modal-tag {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  background: var(--secondary-soft);
  color: var(--secondary);
  width: fit-content;
}

.modal-title {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-primary);
  line-height: 1.2;
}

.modal-desc {
  font-size: 13px;
  color: var(--text-secondary);
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
}

.field-input {
  width: 100%;
  background: var(--surface-input);
  border: 1.5px solid var(--border-card);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--text-primary);
  outline: none;
}

.field-input:focus {
  border-color: var(--secondary);
}

.field-error {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--danger);
}

.spectator-check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;
}

.btn-ds {
  width: 100%;
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 700;
  border-radius: var(--radius-md);
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.16s ease;
  border: 1px solid var(--btn-primary-bg);
  background: var(--btn-primary-bg);
  color: var(--btn-primary-text);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.btn-ds:hover {
  opacity: 0.92;
}
</style>
