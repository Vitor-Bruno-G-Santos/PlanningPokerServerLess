<script setup lang="ts">
import { ref } from 'vue';
import type { StoryTask } from '@shared/types';

interface Props {
  tasks: StoryTask[];
  activeTaskId: string | null;
  isHost: boolean;
  collapsed?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  collapsed: false,
});

const emit = defineEmits<{
  addTask: [title: string];
  selectTask: [taskId: string];
  editTask: [taskId: string, newTitle: string];
  removeTask: [taskId: string];
  toggleCollapse: [];
}>();

const newTaskTitle = ref('');
const editingTaskId = ref<string | null>(null);
const editingDraft = ref('');

function parseTaskDisplay(task: StoryTask, index: number): {
  code: string;
  cleanTitle: string;
} {
  const match = task.title.match(/^([A-Za-z]+-\d+|#\d+)\s*[:\-–]\s*(.+)$/);
  if (match) {
    return {
      code: match[1].toUpperCase(),
      cleanTitle: match[2],
    };
  }
  return {
    code: `US-${String(index + 1).padStart(2, '0')}`,
    cleanTitle: task.title,
  };
}

function handleAddTask() {
  const clean = newTaskTitle.value.trim();
  if (!clean) return;
  emit('addTask', clean);
  newTaskTitle.value = '';
}

function handleSelectTask(task: StoryTask) {
  if (!props.isHost) return;
  if (editingTaskId.value === task.id) return;
  if (task.id !== props.activeTaskId) {
    emit('selectTask', task.id);
  }
}

function startEditing(task: StoryTask) {
  if (!props.isHost) return;
  if (editingTaskId.value === task.id) {
    editingTaskId.value = null;
    return;
  }
  editingTaskId.value = task.id;
  editingDraft.value = task.title;
}

function cancelEditing() {
  editingTaskId.value = null;
  editingDraft.value = '';
}

function saveEditing(task: StoryTask) {
  const clean = editingDraft.value.trim();
  if (clean && clean !== task.title) {
    emit('editTask', task.id, clean);
  }
  editingTaskId.value = null;
}
</script>

<template>
  <aside
    class="tasks-sidebar"
    :class="{ collapsed }"
  >
    <div class="sidebar-header">
      <div class="sidebar-title-group">
        <span class="sidebar-tag">SPRINT // BACKLOG</span>
        <h2 class="sidebar-heading">
          TASKS DA SALA ({{ tasks.length }})
        </h2>
      </div>

      <button
        type="button"
        class="collapse-btn"
        title="Recolher / Expandir menu de tasks"
        aria-label="Recolher ou expandir lista de tasks"
        @click="emit('toggleCollapse')"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline
            v-if="collapsed"
            points="9 18 15 12 9 6"
          />
          <polyline
            v-else
            points="15 18 9 12 15 6"
          />
        </svg>
      </button>
    </div>

    <div
      class="collapsed-vertical-label"
      @click="emit('toggleCollapse')"
    >
      TASKS DA SPRINT ({{ tasks.length }})
    </div>

    <div class="sidebar-body">
      <div
        v-if="tasks.length === 0"
        class="empty-tasks-box"
      >
        Nenhuma task cadastrada na sala.
      </div>

      <div
        v-for="(task, index) in tasks"
        :key="task.id"
        class="task-item"
        :class="{
          active: task.id === activeTaskId,
          editing: editingTaskId === task.id,
          clickable: isHost,
        }"
        @click="handleSelectTask(task)"
      >
        <div class="task-item-top">
          <div class="task-badge-row">
            <span class="task-id-pill">
              {{ parseTaskDisplay(task, index).code }}
            </span>

            <span
              v-if="task.id === activeTaskId && task.status !== 'completed'"
              class="task-status-pill voting"
            >
              EM VOTAÇÃO
            </span>
            <span
              v-else-if="task.finalEstimate"
              class="task-status-pill done"
            >
              MÉDIA: {{ task.finalEstimate }}
            </span>
            <span
              v-else-if="task.id === activeTaskId"
              class="task-status-pill voting"
            >
              EM VOTAÇÃO
            </span>
            <span
              v-else
              class="task-status-pill pending"
            >
              PENDENTE
            </span>
          </div>

          <!-- Ações exclusivas do Host: Ícone de Lápis (Editar) e Ícone de Lixeira (Excluir) -->
          <div
            v-if="isHost"
            class="task-item-actions"
          >
            <button
              type="button"
              class="icon-action-btn"
              title="Editar task"
              aria-label="Editar task"
              @click.stop="startEditing(task)"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </button>

            <button
              type="button"
              class="icon-action-btn delete"
              title="Excluir task"
              aria-label="Excluir task"
              @click.stop="emit('removeTask', task.id)"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </button>
          </div>
        </div>

        <div class="task-item-title">
          {{ parseTaskDisplay(task, index).cleanTitle }}
        </div>

        <!-- Caixa de Edição Inline (Host) -->
        <div
          v-if="isHost && editingTaskId === task.id"
          class="task-edit-box"
          @click.stop
        >
          <input
            v-model="editingDraft"
            type="text"
            class="task-edit-input"
            maxlength="120"
            @keydown.enter="saveEditing(task)"
            @keydown.esc="cancelEditing"
          />
          <div class="flex gap-1.5 justify-end">
            <button
              type="button"
              class="btn-ds btn-outline btn-sm"
              @click.stop="cancelEditing"
            >
              CANCELAR
            </button>
            <button
              type="button"
              class="btn-ds btn-primary btn-sm"
              @click.stop="saveEditing(task)"
            >
              SALVAR
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Rodapé da Sidebar: Adicionar task para o Host, ou aviso somente leitura para o Player -->
    <form
      v-if="isHost"
      class="sidebar-footer"
      @submit.prevent="handleAddTask"
    >
      <input
        v-model="newTaskTitle"
        type="text"
        class="new-task-input"
        maxlength="120"
        placeholder="Nova task (ex: US-107...)"
      />
      <button
        type="submit"
        class="btn-ds btn-outline btn-sm"
      >
        + ADD
      </button>
    </form>

    <div
      v-else
      class="sidebar-footer readonly-note"
    >
      Apenas o Host gerencia as tasks
    </div>
  </aside>
</template>

<style scoped>
.tasks-sidebar {
  width: 340px;
  height: 100%;
  max-height: 100%;
  min-height: 0;
  background: var(--surface-card);
  border-right: 1px solid var(--border-card);
  display: flex;
  flex-direction: column;
  transition: width 0.24s cubic-bezier(0.22, 1, 0.36, 1), transform 0.24s ease;
  position: relative;
  z-index: 25;
  flex-shrink: 0;
  overflow: hidden;
}

.tasks-sidebar.collapsed {
  width: 52px;
}

.sidebar-header {
  padding: 16px 16px 14px;
  border-bottom: 1px dashed var(--border-dashed);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 61px;
}

.tasks-sidebar.collapsed .sidebar-header {
  justify-content: center;
  padding: 16px 8px;
}

.sidebar-title-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}

.tasks-sidebar.collapsed .sidebar-title-group,
.tasks-sidebar.collapsed .sidebar-body,
.tasks-sidebar.collapsed .sidebar-footer {
  display: none;
}

.collapsed-vertical-label {
  display: none;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  transform: rotate(180deg);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: var(--text-secondary);
  text-transform: uppercase;
  margin: 24px auto 0;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.tasks-sidebar.collapsed .collapsed-vertical-label {
  display: inline-flex;
}

.sidebar-tag {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  color: var(--secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.sidebar-heading {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.collapse-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-card);
  background: var(--surface-subtle);
  color: var(--text-primary);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s ease;
}
.collapse-btn:hover {
  border-color: var(--secondary);
  background: var(--secondary-soft);
}

.sidebar-body {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1;
  min-height: 0;
  scrollbar-width: thin;
  scrollbar-color: var(--border-card) transparent;
}

.sidebar-body::-webkit-scrollbar {
  width: 6px;
}

.sidebar-body::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-body::-webkit-scrollbar-thumb {
  background-color: var(--border-card);
  border-radius: 999px;
}

.sidebar-body::-webkit-scrollbar-thumb:hover {
  background-color: var(--secondary);
}

.empty-tasks-box {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-muted);
  text-align: center;
  padding: 20px 12px;
  border: 1px dashed var(--border-dashed);
  border-radius: var(--radius-md);
}

.task-item {
  background: var(--surface-subtle);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-md);
  padding: 11px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: all 0.15s ease;
}

.task-item.clickable {
  cursor: pointer;
}

.task-item.clickable:hover {
  border-color: var(--secondary);
}

.task-item.active {
  background: var(--surface-card);
  border: 2px solid var(--card-active-border);
  box-shadow: 0 0 0 3px var(--secondary-soft);
}

.task-item-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.task-badge-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex-wrap: wrap;
}

.task-id-pill {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  color: var(--text-primary);
  background: var(--secondary-soft);
  border: 1px solid var(--secondary);
  padding: 1px 6px;
  border-radius: var(--radius-sm);
}

.task-status-pill {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  letter-spacing: 0.04em;
}

.task-status-pill.voting {
  background: var(--btn-primary-bg);
  color: var(--btn-primary-text);
}

.task-status-pill.done {
  background: var(--success-soft);
  color: var(--success);
}

.task-status-pill.pending {
  background: transparent;
  color: var(--text-muted);
  border: 1px dashed var(--border-dashed);
}

.task-item-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.icon-action-btn {
  width: 26px;
  height: 26px;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.14s ease;
}

.icon-action-btn:hover {
  background: var(--surface-card);
  border-color: var(--border-card);
  color: var(--text-primary);
}

.icon-action-btn.delete:hover {
  background: var(--danger-soft);
  border-color: var(--danger-border);
  color: var(--danger);
}

.task-item-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.38;
  word-break: break-word;
}

.task-item.editing .task-item-title {
  display: none;
}

.task-edit-box {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 2px;
}

.task-edit-input {
  width: 100%;
  background: var(--surface-input);
  border: 1px solid var(--secondary);
  border-radius: var(--radius-sm);
  padding: 6px 8px;
  font-family: var(--font-body);
  font-size: 12px;
  color: var(--text-primary);
  outline: none;
}

.sidebar-footer {
  padding: 12px 14px;
  border-top: 1px dashed var(--border-dashed);
  display: flex;
  gap: 8px;
}

.sidebar-footer.readonly-note {
  justify-content: center;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-muted);
  text-align: center;
}

.new-task-input {
  flex: 1;
  min-width: 0;
  background: var(--surface-input);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-md);
  padding: 8px 10px;
  font-family: var(--font-body);
  font-size: 12px;
  color: var(--text-primary);
  outline: none;
}
.new-task-input:focus {
  border-color: var(--secondary);
}

.btn-ds {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  border-radius: var(--radius-md);
  padding: 6px 10px;
  cursor: pointer;
  transition: all 0.16s ease;
  border: 1px solid transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  white-space: nowrap;
}

.btn-primary {
  background: var(--btn-primary-bg);
  color: var(--btn-primary-text);
  border-color: var(--btn-primary-bg);
}

.btn-outline {
  background: var(--surface-card);
  color: var(--text-primary);
  border: 1px solid var(--border-card);
}
.btn-outline:hover {
  border-color: var(--secondary);
  background: var(--surface-subtle);
}

@media (max-width: 900px) {
  .tasks-sidebar {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    box-shadow: var(--shadow-card);
  }
}
</style>
