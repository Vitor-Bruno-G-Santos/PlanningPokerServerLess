<script setup lang="ts">
import { computed, ref } from 'vue';
import type { StoryTask } from '@shared/types';
import BaseButton from '@/components/atoms/BaseButton.vue';
import BaseBadge from '@/components/atoms/BaseBadge.vue';

interface Props {
  tasks: StoryTask[];
  activeTaskId: string | null;
  isHost: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  addTask: [title: string];
  selectTask: [taskId: string];
  removeTask: [taskId: string];
}>();

const newTaskTitle = ref('');

function handleAddTask() {
  const clean = newTaskTitle.value.trim();
  if (!clean) return;
  emit('addTask', clean);
  newTaskTitle.value = '';
}

const completedCount = computed(
  () => props.tasks.filter((t) => t.status === 'completed').length
);

const totalPoints = computed(() => {
  let sum = 0;
  for (const t of props.tasks) {
    if (t.finalEstimate) {
      const n = Number(t.finalEstimate);
      if (!Number.isNaN(n)) {
        sum += n;
      }
    }
  }
  return Number(sum.toFixed(1));
});
</script>

<template>
  <aside
    class="w-full rounded-2xl border border-slate-800 bg-slate-900/75 p-4 flex flex-col gap-4 h-fit"
  >
    <!-- Header da Fila de Tasks -->
    <div class="flex items-center justify-between gap-2">
      <div class="flex flex-col">
        <span class="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
          Backlog da Sessão
        </span>
        <h3 class="text-sm font-bold text-slate-100">
          Lista de Tasks ({{ completedCount }}/{{ tasks.length }})
        </h3>
      </div>

      <BaseBadge v-if="totalPoints > 0" tone="emerald">
        Total: {{ totalPoints }} pts
      </BaseBadge>
    </div>

    <!-- Formulario para o Host adicionar novas tasks -->
    <form
      v-if="isHost"
      class="flex items-center gap-2"
      @submit.prevent="handleAddTask"
    >
      <input
        v-model="newTaskTitle"
        type="text"
        maxlength="100"
        placeholder="Nova task (ex: US-02 Login)..."
        class="flex-1 min-w-0 rounded-xl bg-slate-950 border border-slate-700/80 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
      />
      <BaseButton
        type="submit"
        size="sm"
        variant="primary"
        :disabled="!newTaskTitle.trim()"
      >
        + Adicionar
      </BaseButton>
    </form>

    <!-- Lista de Tasks -->
    <div
      v-if="tasks.length === 0"
      class="text-xs text-slate-500 text-center py-6 border border-dashed border-slate-800 rounded-xl"
    >
      Nenhuma task cadastrada na fila.
    </div>

    <ul v-else class="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1">
      <li
        v-for="(task, index) in tasks"
        :key="task.id"
        class="group rounded-xl border p-3 transition-all flex items-start justify-between gap-2.5"
        :class="[
          task.id === activeTaskId
            ? 'bg-indigo-950/45 border-indigo-500/60 shadow-md shadow-indigo-950/40'
            : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700',
          isHost && task.id !== activeTaskId ? 'cursor-pointer' : '',
        ]"
        @click="isHost && task.id !== activeTaskId ? emit('selectTask', task.id) : undefined"
      >
        <div class="flex flex-col gap-1 min-w-0 flex-1">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="text-[10px] font-mono font-bold text-slate-500">
              #{{ index + 1 }}
            </span>

            <span
              v-if="task.id === activeTaskId"
              class="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
            >
              Em Votação
            </span>
            <span
              v-else-if="task.status === 'completed'"
              class="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
            >
              Concluída
            </span>
            <span
              v-else
              class="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400"
            >
              Pendente
            </span>
          </div>

          <p
            class="text-xs font-semibold break-words leading-snug"
            :class="task.id === activeTaskId ? 'text-white' : 'text-slate-200'"
          >
            {{ task.title }}
          </p>

          <!-- Botao explicito para o Host colocar em votacao ou revotar -->
          <div v-if="isHost" class="mt-1 flex items-center gap-2">
            <button
              v-if="task.id !== activeTaskId"
              type="button"
              class="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer"
              @click.stop="emit('selectTask', task.id)"
            >
              {{ task.status === 'completed' ? 'Revotar esta task' : 'Votar agora →' }}
            </button>
            <button
              v-if="tasks.length > 1"
              type="button"
              class="text-[11px] text-slate-500 hover:text-rose-400 cursor-pointer ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
              title="Remover task"
              @click.stop="emit('removeTask', task.id)"
            >
              Remover
            </button>
          </div>
        </div>

        <!-- Badge de Estimativa Final da Task -->
        <div
          v-if="task.finalEstimate !== null"
          class="shrink-0 w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-extrabold text-xs flex items-center justify-center"
          title="Média / Estimativa final"
        >
          {{ task.finalEstimate }}
        </div>
      </li>
    </ul>
  </aside>
</template>
