import { onMounted, ref } from 'vue';

export type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'pp_theme_mode';
const currentTheme = ref<ThemeMode>('dark');

function applyThemeToDom(mode: ThemeMode) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', mode);
  if (mode === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export function useTheme() {
  function initTheme() {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    const mode: ThemeMode = saved === 'light' || saved === 'dark' ? saved : 'dark';
    currentTheme.value = mode;
    applyThemeToDom(mode);
  }

  function setTheme(mode: ThemeMode) {
    currentTheme.value = mode;
    localStorage.setItem(THEME_STORAGE_KEY, mode);
    applyThemeToDom(mode);
  }

  function toggleTheme() {
    setTheme(currentTheme.value === 'dark' ? 'light' : 'dark');
  }

  onMounted(() => {
    initTheme();
  });

  return {
    theme: currentTheme,
    setTheme,
    toggleTheme,
    initTheme,
  };
}
