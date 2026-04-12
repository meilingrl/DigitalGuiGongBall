<script setup lang="ts">
import ThemeToggle from './ThemeToggle.vue'
import { useAppStore } from '../stores/app'

const store = useAppStore()

function onLogout() {
  if (typeof window !== 'undefined' && window.confirm(store.t.logoutConfirm)) {
    store.signOut()
  }
}
</script>

<template>
  <!-- 小屏：与侧栏同一套单行紧凑布局 -->
  <div class="pointer-events-none fixed bottom-4 left-3 right-3 z-[100] lg:hidden">
    <div
      class="pointer-events-auto flex items-center gap-2 rounded-lg border border-slate-200/90 bg-white/95 px-2 py-1.5 shadow-soft backdrop-blur-md dark:border-slate-700/90 dark:bg-slate-900/95"
    >
      <div
        class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-100 to-teal-200 text-[11px] font-semibold text-teal-900 dark:from-teal-900 dark:to-teal-950 dark:text-teal-100"
        aria-hidden="true"
      >
        {{ store.displayName.slice(0, 1) }}
      </div>
      <div class="min-w-0 flex-1 leading-tight">
        <p class="truncate text-xs font-medium text-slate-900 dark:text-white">
          {{ store.displayName }}
        </p>
        <p class="truncate text-[10px] text-slate-500 dark:text-slate-400">{{ store.t.userRole }}</p>
      </div>
      <ThemeToggle layout="inline" size="sm" />
      <button
        type="button"
        class="shrink-0 rounded-md border border-transparent px-1.5 py-0.5 text-[10px] font-medium text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 dark:text-slate-400 dark:hover:border-red-900/50 dark:hover:bg-red-950/40 dark:hover:text-red-300"
        @click="onLogout"
      >
        {{ store.t.logout }}
      </button>
    </div>
  </div>
</template>
