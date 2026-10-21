import { ref } from 'vue'
import { defineStore } from 'pinia'

export type ThemeMode = 'light' | 'dark'
export type Locale = 'zh' | 'en'

export const usePreferencesStore = defineStore('preferences', () => {
  const theme = ref<ThemeMode>('light')
  const locale = ref<Locale>('zh')

  function initTheme() {
    if (typeof window === 'undefined') return
    const saved = window.localStorage.getItem('theme')
    if (saved === 'light' || saved === 'dark') {
      theme.value = saved
    } else {
      theme.value = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
  }

  function setTheme(mode: ThemeMode) {
    theme.value = mode
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('theme', mode)
    }
  }

  function toggleTheme() {
    setTheme(theme.value === 'light' ? 'dark' : 'light')
  }

  function setLocale(next: Locale) {
    locale.value = next
  }

  function toggleLocale() {
    setLocale(locale.value === 'zh' ? 'en' : 'zh')
  }

  return { theme, locale, initTheme, toggleTheme, setTheme, toggleLocale, setLocale }
})
