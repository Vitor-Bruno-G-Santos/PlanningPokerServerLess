<script setup lang="ts">
interface Props {
  size?: 'sm' | 'md' | 'lg';
}

withDefaults(defineProps<Props>(), {
  size: 'md',
});
</script>

<template>
  <div class="inline-flex items-center gap-3 select-none">
    <!-- Icone < [carta][5♠] > fiel a imagem de referencia -->
    <svg
      :class="[
        size === 'sm' ? 'w-14 h-9' : '',
        size === 'md' ? 'w-[76px] h-[48px]' : '',
        size === 'lg' ? 'w-24 h-15' : '',
      ]"
      viewBox="0 0 120 76"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <!-- Chevron Esquerdo < -->
      <path
        d="M27 20L9 38L27 56"
        stroke="var(--color-primary)"
        stroke-width="8.5"
        stroke-linecap="square"
        stroke-linejoin="round"
      />

      <!-- Carta Traseira (Esquerda, inclinada -15deg, vazada com borda) -->
      <g transform="translate(34, 14) rotate(-14)">
        <rect
          x="0"
          y="0"
          width="31"
          height="44"
          rx="4.5"
          fill="var(--bg-app)"
          stroke="var(--color-primary)"
          stroke-width="2.6"
        />
        <!-- Pequeno naipe de espadas no canto superior esquerdo -->
        <path
          d="M6.5 6.2C6.5 6.2 4.2 8.9 4.2 10.3C4.2 11.2 4.9 11.8 5.7 11.8C6.1 11.8 6.3 11.6 6.3 11.6L5.8 13.1H7.2L6.7 11.6C6.7 11.6 6.9 11.8 7.3 11.8C8.1 11.8 8.8 11.2 8.8 10.3C8.8 8.9 6.5 6.2 6.5 6.2Z"
          fill="var(--color-primary)"
        />
        <!-- Naipe central parcial -->
        <path
          d="M15.5 15.5C15.5 15.5 9.5 22 9.5 25.6C9.5 27.8 11.2 29.3 13.1 29.3C14.1 29.3 14.8 28.8 14.8 28.8L13.6 32.5H17.4L16.2 28.8C16.2 28.8 16.9 29.3 17.9 29.3C19.8 29.3 21.5 27.8 21.5 25.6C21.5 22 15.5 15.5 15.5 15.5Z"
          fill="var(--secondary)"
        />
      </g>

      <!-- Carta Frontal (Direita, inclinada +11deg, preenchida com 5 e Espadas) -->
      <g transform="translate(55, 9) rotate(11)">
        <rect
          x="0"
          y="0"
          width="33"
          height="46"
          rx="4.5"
          fill="var(--color-primary)"
          stroke="var(--bg-app)"
          stroke-width="1.5"
        />
        <!-- Numero 5 superior esquerdo -->
        <text
          x="4.5"
          y="10.5"
          fill="var(--surface-card)"
          font-family="Chakra Petch, JetBrains Mono, sans-serif"
          font-weight="700"
          font-size="8.5"
        >
          5
        </text>
        <!-- Naipe de Espadas Central -->
        <path
          d="M16.5 15C16.5 15 10 22.2 10 26.2C10 28.6 11.8 30.2 13.9 30.2C15 30.2 15.8 29.6 15.8 29.6L14.4 33.8H18.6L17.2 29.6C17.2 29.6 18 30.2 19.1 30.2C21.2 30.2 23 28.6 23 26.2C23 22.2 16.5 15 16.5 15Z"
          fill="var(--surface-card)"
        />
        <!-- Numero 5 inferior direito invertido -->
        <g transform="translate(28.5, 35.5) rotate(180)">
          <text
            x="0"
            y="0"
            fill="var(--surface-card)"
            font-family="Chakra Petch, JetBrains Mono, sans-serif"
            font-weight="700"
            font-size="8.5"
          >
            5
          </text>
        </g>
      </g>

      <!-- Chevron Direito > -->
      <path
        d="M93 20L111 38L93 56"
        stroke="var(--color-primary)"
        stroke-width="8.5"
        stroke-linecap="square"
        stroke-linejoin="round"
      />
    </svg>

    <!-- Tipografia Planning Poker -->
    <div
      class="flex flex-col font-bold leading-[0.98] tracking-[-0.01em]"
      style="font-family: var(--font-display); color: var(--text-primary);"
      :class="[
        size === 'sm' ? 'text-base' : '',
        size === 'md' ? 'text-[22px]' : '',
        size === 'lg' ? 'text-3xl' : '',
      ]"
    >
      <span>Planning</span>
      <span>Poker</span>
    </div>
  </div>
</template>
