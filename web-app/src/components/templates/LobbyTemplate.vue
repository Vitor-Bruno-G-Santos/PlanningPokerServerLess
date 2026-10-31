<template>
  <div
    class="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden"
  >
    <!-- Glow decorativo de fundo -->
    <div
      class="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[680px] h-[360px] bg-indigo-600/15 blur-[130px] rounded-full"
    />

    <main
      class="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12"
    >
      <slot />
    </main>

    <footer
      class="relative z-10 py-4 text-center text-xs text-slate-500 border-t border-slate-900"
    >
      Planning Poker Serverless • Cloudflare Durable Objects (WebSocket Hibernation) + Host Source of Truth
    </footer>
  </div>
</template>
