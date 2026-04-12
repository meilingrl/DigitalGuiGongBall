import { watch } from 'vue'
import { useAppStore } from '../stores/app'

/**
 * Pinia theme → <html class="dark"> + data-theme + color-scheme
 * 不再给 body/#app 写死内联背景，避免与 Vue 根节点类名「锁死」在浅色。
 */
export function installThemeDomSync() {
  const store = useAppStore()

  watch(
    () => store.theme,
    (mode) => {
      if (typeof document === 'undefined') return
      const root = document.documentElement
      const isDark = mode === 'dark'

      root.classList.toggle('dark', isDark)
      root.dataset.theme = isDark ? 'dark' : 'light'
      root.style.colorScheme = isDark ? 'dark' : 'light'

      document.body.style.colorScheme = isDark ? 'dark' : 'light'
    },
    { immediate: true, flush: 'sync' },
  )
}
