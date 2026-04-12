<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAppStore } from './stores/app'

const store = useAppStore()
const { theme } = storeToRefs(store)
</script>

<template>
  <!-- 根级显式背景，不依赖 dark: 是否命中，避免「只有滚动条变」的割裂 -->
  <div
    id="app-root"
    class="min-h-[100dvh] w-full transition-colors duration-200"
    :class="
      theme === 'dark'
        ? 'bg-slate-950 text-slate-100'
        : 'bg-slate-100 text-slate-900'
    "
  >
    <RouterView />
  </div>
</template>
