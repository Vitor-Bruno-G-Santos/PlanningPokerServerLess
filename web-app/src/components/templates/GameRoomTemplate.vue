<template>
  <div class="room-shell">
    <slot name="navbar" />

    <div class="room-workspace">
      <!-- Menu Lateral Recolhível de Tasks (Esquerda, com scroll próprio) -->
      <slot name="sidebar" />

      <!-- Palco Centralizado (Com scroll próprio tanto no desktop quanto no mobile, mas dimensionado para caber sem scroll em 1920x1080 @ 125%) -->
      <main class="stage-area">
        <div class="stage-center">
          <slot name="header" />
          <slot name="results" />
          <slot name="table" />
        </div>
      </main>
    </div>

    <!-- Baralho Fixo na Parte Inferior -->
    <slot name="dock" />

    <!-- Modais Globais -->
    <slot name="modals" />
  </div>
</template>

<style scoped>
.room-shell {
  height: 100vh;
  max-height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-main);
  color: var(--text-primary);
  position: relative;
  overflow: hidden;
}

.room-workspace {
  flex: 1;
  min-height: 0;
  display: flex;
  position: relative;
  overflow: hidden;
}

.stage-area {
  flex: 1;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 12px var(--space-L) 78px;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  min-width: 0;
  scrollbar-width: thin;
  scrollbar-color: var(--border-card) transparent;
}

.stage-area::-webkit-scrollbar {
  width: 6px;
}

.stage-area::-webkit-scrollbar-track {
  background: transparent;
}

.stage-area::-webkit-scrollbar-thumb {
  background-color: var(--border-card);
  border-radius: 999px;
}

.stage-center {
  width: 100%;
  max-width: 920px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin: auto 0;
}

@media (max-width: 900px) {
  .stage-area {
    padding: 14px 14px 120px calc(52px + 14px);
  }

  .stage-center {
    margin: 0;
  }
}
</style>
