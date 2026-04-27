<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  title: string
  selected: boolean
  pinned: boolean
  muted: boolean
  unread: number
  typeRoom: boolean
  labels: {
    pin: string
    unpin: string
    del: string
    hintPin: string
    hintDel: string
  }
}>()

const emit = defineEmits<{
  select: []
  pin: []
  delete: []
}>()

/** 单侧露出宽度：右滑置顶 / 左滑删除 */
const ZONE = 72

const dx = ref(0)
const transition = ref('')
let startPointerX = 0
let startPointerY = 0
let startDx = 0
let active = false
let maxAbsDx = 0
let maxAbsDy = 0

const stage = computed(() => {
  if (dx.value >= 18) return 1
  if (dx.value <= -18) return 2
  return 0
})

const frontStyle = computed(() => ({
  transform: `translateX(${dx.value}px)`,
  transition: transition.value,
}))

function onPointerDown(e: PointerEvent) {
  if (e.button !== 0) return
  active = true
  startPointerX = e.clientX
  startPointerY = e.clientY
  startDx = dx.value
  maxAbsDx = 0
  maxAbsDy = 0
  transition.value = 'none'
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (!active) return
  maxAbsDx = Math.max(maxAbsDx, Math.abs(e.clientX - startPointerX))
  maxAbsDy = Math.max(maxAbsDy, Math.abs(e.clientY - startPointerY))
  let next = e.clientX - startPointerX + startDx
  if (next > ZONE) next = ZONE
  if (next < -ZONE) next = -ZONE
  dx.value = next
}

function onPointerUp(e: PointerEvent) {
  if (!active) return
  active = false
  try {
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
  } catch {
    /* noop */
  }

  const commit = dx.value
  transition.value = 'transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)'

  if (commit >= 28) {
    emit('pin')
  } else if (commit <= -28) {
    emit('delete')
  } else {
    const endDx = Math.abs(e.clientX - startPointerX)
    const endDy = Math.abs(e.clientY - startPointerY)
    const tap =
      endDx < 12 &&
      endDy < 12 &&
      maxAbsDx < 14 &&
      maxAbsDy < 14 &&
      Math.abs(commit) < 10
    if (tap) emit('select')
  }

  dx.value = 0
  setTimeout(() => {
    transition.value = ''
  }, 300)
}

function onPointerCancel(e: PointerEvent) {
  if (!active) return
  active = false
  try {
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
  } catch {
    /* noop */
  }
  transition.value = 'transform 0.24s cubic-bezier(0.34, 1.2, 0.64, 1)'
  dx.value = 0
  setTimeout(() => {
    transition.value = ''
  }, 260)
}
</script>

<template>
  <div class="relative overflow-hidden rounded-xl">
    <!-- 底层：左置顶 · 右删除（主行右滑见左栏、左滑见右栏） -->
    <div
      class="pointer-events-none absolute inset-0 z-0 flex justify-between text-[11px] font-semibold leading-tight text-white"
      aria-hidden="true"
    >
      <div
        class="flex h-full w-[72px] shrink-0 flex-col items-center justify-center bg-amber-500 px-0.5 transition-opacity duration-100"
        :style="{ opacity: 0.25 + Math.min(0.75, Math.max(0, dx / ZONE) * 0.75) }"
      >
        {{ props.pinned ? props.labels.unpin : props.labels.pin }}
      </div>
      <div
        class="flex h-full w-[72px] shrink-0 flex-col items-center justify-center bg-rose-600 px-0.5 transition-opacity duration-100"
        :style="{ opacity: 0.25 + Math.min(0.75, Math.max(0, (-dx) / ZONE) * 0.75) }"
      >
        {{ props.labels.del }}
      </div>
    </div>

    <div
      class="relative z-10 touch-pan-y select-none"
      :style="frontStyle"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerCancel"
    >
      <div
        role="button"
        tabindex="0"
        class="flex w-full cursor-pointer items-center gap-2 rounded-xl border border-transparent bg-white px-3 py-2.5 text-left text-sm outline-none transition-colors dark:bg-slate-900"
        :class="[
          props.selected ? 'bg-teal-50 text-teal-900 dark:bg-teal-950/40 dark:text-teal-100' : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/70',
          props.muted ? 'opacity-75' : '',
        ]"
        @keydown.enter.prevent="emit('select')"
        @keydown.space.prevent="emit('select')"
      >
        <span class="shrink-0 text-base">{{ props.pinned ? '📌' : '' }}{{ props.typeRoom ? '👥' : '💬' }}</span>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1.5">
            <span class="truncate font-medium">{{ props.title }}</span>
            <span v-if="props.muted" class="shrink-0 text-xs text-slate-400">🔕</span>
            <span
              v-if="props.unread && !props.muted"
              class="inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white"
            >
              {{ props.unread > 99 ? '99+' : props.unread }}
            </span>
          </div>
          <p v-if="stage > 0" class="mt-0.5 truncate text-[10px] font-medium text-amber-700 dark:text-amber-300">
            <span v-if="stage === 1">{{ props.labels.hintPin }}</span>
            <span v-else class="text-rose-700 dark:text-rose-300">{{ props.labels.hintDel }}</span>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
