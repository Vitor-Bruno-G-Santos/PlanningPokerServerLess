<template>
  <div
    class="min-h-screen w-full flex flex-col justify-between relative overflow-x-hidden"
    style="background-color: var(--bg-app); color: var(--text-primary);"
  >
    <main
      class="relative z-10 flex-1 flex flex-col items-center w-full max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-8"
    >
      <slot />
    </main>
  </div>
</template>
