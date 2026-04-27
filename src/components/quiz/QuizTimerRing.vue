<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    remaining: number
    total: number
    size?: number
    strokeWidth?: number
  }>(),
  { size: 72, strokeWidth: 6 },
)

const radius = computed(() => props.size / 2 - props.strokeWidth)
const circumference = computed(() => 2 * Math.PI * radius.value)
const progress = computed(() => {
  const pct = props.remaining / props.total
  return Math.max(0, Math.min(1, pct))
})
const dashOffset = computed(() => circumference.value * (1 - progress.value))

const color = computed(() => {
  const pct = progress.value
  if (pct <= 0.15) return '#ef4444'
  if (pct <= 0.33) return '#f59e0b'
  return '#0d9488'
})
</script>

<template>
  <div class="relative inline-flex items-center justify-center" :style="{ width: `${size}px`, height: `${size}px` }">
    <svg class="absolute inset-0 -rotate-90" :width="size" :height="size">
      <circle
        :cx="size / 2"
        :cy="size / 2"
        :r="radius"
        fill="none"
        :stroke-width="strokeWidth"
        class="stroke-slate-200 dark:stroke-slate-700"
      />
      <circle
        :cx="size / 2"
        :cy="size / 2"
        :r="radius"
        fill="none"
        :stroke-width="strokeWidth"
        :stroke="color"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="dashOffset"
        stroke-linecap="round"
        class="transition-all duration-500 ease-out"
      />
    </svg>
    <span
      class="relative font-mono text-sm font-bold tabular-nums"
      :class="progress <= 0.15 ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'"
    >
      {{ remaining }}
    </span>
  </div>
</template>
