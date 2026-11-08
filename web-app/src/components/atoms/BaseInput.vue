<script setup lang="ts">
interface Props {
  modelValue: string;
  label?: string;
  placeholder?: string;
  id?: string;
  maxlength?: number;
  disabled?: boolean;
  autofocus?: boolean;
  error?: string;
  mono?: boolean;
  required?: boolean;
}

withDefaults(defineProps<Props>(), {
  label: '',
  placeholder: '',
  id: undefined,
  maxlength: 80,
  disabled: false,
  autofocus: false,
  error: '',
  mono: false,
  required: false,
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
  enter: [];
}>();

function onInput(event: Event) {
  const target = event.target as HTMLInputElement;
  emit('update:modelValue', target.value);
}
</script>

<template>
  <div class="flex flex-col gap-1.5 w-full">
    <label
      v-if="label"
      :for="id"
      class="text-xs font-semibold uppercase tracking-wider"
      style="color: var(--text-secondary);"
    >
      {{ label }}<span
        v-if="required"
        class="ml-1"
        style="color: var(--danger);"
      >*</span>
    </label>
    <input
      :id="id"
      type="text"
      :value="modelValue"
      :placeholder="placeholder"
      :maxlength="maxlength"
      :disabled="disabled"
      :autofocus="autofocus"
      class="ds-input w-full px-3.5 py-2.5 text-sm transition-all focus:outline-none disabled:opacity-50"
      :class="[mono ? 'font-mono text-lg font-bold tracking-[0.22em] uppercase text-center' : '']"
      @input="onInput"
      @keydown.enter="emit('enter')"
    />
    <p
      v-if="error"
      class="text-xs font-medium"
      style="color: var(--danger);"
    >
      {{ error }}
    </p>
  </div>
</template>

<style scoped>
.ds-input {
  background-color: var(--surface-input);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-md);
  color: var(--text-primary);
}
.ds-input::placeholder {
  color: var(--text-muted);
}
.ds-input:focus {
  border-color: var(--secondary);
  box-shadow: 0 0 0 2px var(--secondary-soft);
}
</style>
