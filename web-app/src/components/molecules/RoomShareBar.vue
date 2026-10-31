<script setup lang="ts">
import { ref } from 'vue';
import BaseButton from '@/components/atoms/BaseButton.vue';

interface Props {
  roomId: string;
}

const props = defineProps<Props>();
const copied = ref(false);

async function copyInviteLink() {
  const url = `${window.location.origin}/room/${props.roomId}`;
  try {
    await navigator.clipboard.writeText(url);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch {
    // Fallback silencioso
  }
}
</script>

<template>
  <div class="inline-flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-1.5">
    <div class="flex items-center gap-1.5">
      <span class="text-xs text-slate-400">Sala:</span>
      <code class="text-xs font-mono font-bold text-indigo-300 tracking-wider">
        {{ roomId }}
      </code>
    </div>
    <BaseButton size="sm" variant="secondary" @click="copyInviteLink">
      {{ copied ? 'Link Copiado!' : 'Convidar' }}
    </BaseButton>
  </div>
</template>
