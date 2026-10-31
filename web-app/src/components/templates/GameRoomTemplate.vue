<template>
  <div class="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col">
    <slot name="navbar" />

    <main
      class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
    >
      <!-- Coluna Principal: Historia + Mesa + Resultados + Dock (8 colunas no desktop) -->
      <div class="lg:col-span-8 flex flex-col justify-between gap-6 w-full">
        <div class="w-full">
          <slot name="header" />
        </div>

        <div class="flex-1 flex flex-col items-center justify-center w-full">
          <slot name="table" />
        </div>

        <div class="w-full flex flex-col gap-4">
          <slot name="results" />
          <slot name="dock" />
        </div>
      </div>

      <!-- Coluna Lateral: Lista de Tasks da Sessao (4 colunas no desktop) -->
      <div class="lg:col-span-4 w-full lg:sticky lg:top-22">
        <slot name="sidebar" />
      </div>
    </main>

    <slot name="modals" />
  </div>
</template>
