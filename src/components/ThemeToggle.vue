<script setup lang="ts">
import { useAppStore } from '../stores/app'

withDefaults(
  defineProps<{
    /** fixed：独立悬浮（工作区）；inline：嵌入底栏（Hub） */
    layout?: 'fixed' | 'inline'
    /** sm：侧栏单行内嵌 */
    size?: 'sm' | 'md'
  }>(),
  { layout: 'fixed', size: 'md' },
)

const store = useAppStore()
</script>

<template>
  <button
    type="button"
    class="flex items-center justify-center rounded-full border border-slate-300/80 bg-white/95 text-slate-800 shadow-soft backdrop-blur-sm transition hover:border-teal-600 hover:text-teal-800 dark:border-slate-600 dark:bg-slate-800/95 dark:text-amber-100 dark:hover:border-amber-400/60 dark:hover:text-amber-50"
    :class="[
      layout === 'fixed' ? 'fixed bottom-5 left-5 z-[100] h-11 w-11 text-lg' : 'shrink-0',
      layout === 'inline' && size === 'sm' ? 'h-8 w-8' : '',
      layout === 'inline' && size === 'md' ? 'h-10 w-10 text-base' : '',
    ]"
    :aria-label="store.t.themeToggleAria"
    :title="store.t.themeToggleAria"
    @click.stop="store.toggleTheme"
  >
    <!-- 使用内联 SVG，避免 emoji 在部分系统上导致按钮状态不易辨认 -->
    <svg
      v-if="store.theme === 'light'"
      :class="layout === 'inline' && size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path
        stroke-linecap="round"
        d="M12 2v2m0 18v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2m18 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
      />
    </svg>
    <svg
      v-else
      :class="layout === 'inline' && size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"
      />
    </svg>
  </button>
</template>
