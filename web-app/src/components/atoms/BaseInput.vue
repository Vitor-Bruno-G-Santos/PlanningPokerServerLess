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
}

withDefaults(defineProps<Props>(), {
  label: '',
  placeholder: '',
  id: undefined,
  maxlength: 80,
  disabled: false,
  autofocus: false,
  error: '',
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
      class="text-xs font-medium uppercase tracking-wider text-slate-400"
    >
      {{ label }}
    </label>
    <input
      :id="id"
      type="text"
      :value="modelValue"
      :placeholder="placeholder"
      :maxlength="maxlength"
      :disabled="disabled"
      :autofocus="autofocus"
      class="w-full rounded-xl bg-slate-900/90 border border-slate-700/80 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-colors focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-50"
      @input="onInput"
      @keydown.enter="emit('enter')"
    />
    <p v-if="error" class="text-xs text-rose-400">{{ error }}</p>
  </div>
</template>
