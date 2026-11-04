<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'emerald';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
  fullWidth?: boolean;
}

withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
  loading: false,
  type: 'button',
  fullWidth: false,
});
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    class="inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 cursor-pointer select-none focus:outline-none disabled:opacity-50 disabled:pointer-events-none active:scale-[0.99]"
    style="font-family: var(--font-mono); border-radius: var(--radius-md);"
    :class="[
      fullWidth ? 'w-full' : '',
      size === 'sm' ? 'px-3 py-1.5 text-xs' : '',
      size === 'md' ? 'px-4 py-2.5 text-xs tracking-wide uppercase' : '',
      size === 'lg' ? 'px-6 py-3.5 text-sm tracking-wide uppercase font-bold' : '',
      variant === 'primary' ? 'btn-ds-primary' : '',
      variant === 'secondary' || variant === 'emerald' ? 'btn-ds-secondary' : '',
      variant === 'outline' ? 'btn-ds-outline' : '',
      variant === 'ghost' ? 'btn-ds-ghost' : '',
      variant === 'danger' ? 'bg-rose-600 hover:bg-rose-500 text-white' : '',
    ]"
  >
    <span
      v-if="loading"
      class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
    />
    <slot />
  </button>
</template>

<style scoped>
.btn-ds-primary {
  background-color: var(--btn-primary-bg);
  color: var(--btn-primary-text);
  border: 1px solid var(--btn-primary-bg);
}
.btn-ds-primary:hover {
  opacity: 0.92;
}

.btn-ds-secondary {
  background-color: var(--btn-secondary-bg);
  color: var(--btn-secondary-text);
  border: 1px solid var(--btn-secondary-bg);
  font-weight: 700;
}
.btn-ds-secondary:hover {
  opacity: 0.9;
}

.btn-ds-outline {
  background-color: var(--surface-card);
  color: var(--text-primary);
  border: 1px solid var(--border-card);
}
.btn-ds-outline:hover {
  border-color: var(--secondary);
  background-color: var(--surface-subtle);
}

.btn-ds-ghost {
  background-color: transparent;
  color: var(--text-secondary);
}
.btn-ds-ghost:hover {
  background-color: var(--surface-subtle);
  color: var(--text-primary);
}
</style>
