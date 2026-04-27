<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import ThemeToggle from './ThemeToggle.vue'
import { useAppStore } from '../stores/app'

const store = useAppStore()
const route = useRoute()

const props = defineProps<{
  navItems: readonly { name: string; label: string }[]
}>()

const navScrollRef = ref<HTMLElement | null>(null)

function isActive(name: string) {
  return route.name === name
}

function onLogout() {
  if (typeof window !== 'undefined' && window.confirm(store.t.logoutConfirm)) {
    store.signOut()
  }
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n))
}

/** 当前布局下，链接在导航内容坐标系中的 [left, right)（与 scrollLeft 同一坐标） */
function linkBoundsInNav(nav: HTMLElement, link: HTMLElement): { left: number; right: number } {
  const navRect = nav.getBoundingClientRect()
  const r = link.getBoundingClientRect()
  const left = r.left - navRect.left + nav.scrollLeft
  const right = left + link.offsetWidth
  return { left, right }
}

/**
 * 分段滚动：选一个 scrollLeft，使「当前路由」完整落在视口内，
 * 且尽量多显示完整 tab（不出现半个被裁在边上的邻居）。
 */
function scrollNavToSegmentForName(routeName: string, behavior: ScrollBehavior = 'smooth') {
  const nav = navScrollRef.value
  if (!nav) return

  const links = [...nav.querySelectorAll<HTMLElement>('[data-hub-nav]')]
  const ix = links.findIndex((el) => el.dataset.hubNav === routeName)
  if (ix < 0) return

  const pad = 4
  const vw = nav.clientWidth
  const maxS = Math.max(0, nav.scrollWidth - vw)
  const b = links.map((el) => linkBoundsInNav(nav, el))

  function fullyVisible(i: number, s: number) {
    return b[i].left >= s + pad - 0.5 && b[i].right <= s + vw - pad + 0.5
  }

  const candidates = new Set<number>()
  for (let j = 0; j < links.length; j++) {
    candidates.add(clamp(0, b[j].left - pad, maxS))
    candidates.add(clamp(0, b[j].right - vw + pad, maxS))
  }
  candidates.add(0)
  candidates.add(maxS)

  let bestS = clamp(0, b[ix].left - pad, maxS)
  let bestCount = -1
  /** 次要：当前项尽量靠近视口水平中心（在「整段最多」前提下） */
  let bestCenterDist = Number.POSITIVE_INFINITY
  const activeMid = (b[ix].left + b[ix].right) / 2

  for (const s of candidates) {
    if (!fullyVisible(ix, s)) continue
    let cnt = 0
    for (let i = 0; i < links.length; i++) {
      if (fullyVisible(i, s)) cnt++
    }
    const viewMid = s + vw / 2
    const dist = Math.abs(activeMid - viewMid)
    if (cnt > bestCount || (cnt === bestCount && dist < bestCenterDist)) {
      bestCount = cnt
      bestS = s
      bestCenterDist = dist
    }
  }

  if (bestCount < 0) {
    bestS = clamp(0, b[ix].left - pad, maxS)
  }

  nav.scrollTo({ left: bestS, behavior })
}

function scheduleScroll(behavior: ScrollBehavior) {
  const name = route.name
  if (typeof name !== 'string') return
  nextTick(() => {
    requestAnimationFrame(() => {
      scrollNavToSegmentForName(name, behavior)
    })
  })
}

function onNavWheel(e: WheelEvent) {
  if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
    e.preventDefault()
  }
}

let ro: ResizeObserver | null = null

onMounted(() => {
  nextTick(() => {
    scheduleScroll('auto')
    const nav = navScrollRef.value
    if (!nav || typeof ResizeObserver === 'undefined') return
    ro = new ResizeObserver(() => scheduleScroll('auto'))
    ro.observe(nav)
  })
})

watch(
  () => route.name,
  () => scheduleScroll('smooth'),
)

onBeforeUnmount(() => {
  ro?.disconnect()
  ro = null
})

const glassOuter = computed(() =>
  store.theme === 'dark'
    ? 'border-t border-white/10 border-x-0 border-b-0 bg-slate-900/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_-8px_32px_rgba(0,0,0,0.25)]'
    : 'border-t border-white/70 border-x-0 border-b-0 bg-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_-8px_28px_rgba(15,23,42,0.06)]',
)

const segTrack = computed(() =>
  store.theme === 'dark'
    ? 'bg-black/30 ring-1 ring-inset ring-white/[0.08]'
    : 'bg-slate-900/[0.05] ring-1 ring-inset ring-slate-900/[0.06]',
)

const profileTitle = computed(() => `${store.displayName} · ${store.t.userRole}`)
</script>

<template>
  <!-- 小屏：贴底全宽；导航槽背景铺满（min-w-full 轨道）；滚动为分段对齐，不露半个 tab -->
  <div
    class="pointer-events-none fixed bottom-0 left-0 right-0 z-[100] box-border w-full min-w-0 max-w-full lg:hidden"
    style="padding-bottom: max(0.5rem, env(safe-area-inset-bottom, 0px))"
  >
    <div
      class="pointer-events-auto box-border flex w-full min-w-0 max-w-full min-h-[clamp(2.25rem,8vw,2.75rem)] items-center gap-[clamp(0.25rem,1.5vw,0.5rem)] py-[clamp(0.125rem,0.6vw,0.375rem)] pl-[max(0.5rem,env(safe-area-inset-left,0px))] pr-[max(0.5rem,env(safe-area-inset-right,0px))] [-webkit-backdrop-filter:blur(28px)_saturate(1.45)] [backdrop-filter:blur(28px)_saturate(1.45)]"
      :class="glassOuter"
    >
      <nav
        ref="navScrollRef"
        class="hub-bottom-nav-scroll min-h-[clamp(1.875rem,6.5vw,2.125rem)] w-0 min-w-0 flex-1 overflow-x-auto overflow-y-hidden overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="主导航"
        @wheel="onNavWheel"
      >
        <!-- min-w-full：槽内背景与右侧账户区同宽铺满，避免只包住文字宽度 -->
        <div
          class="flex h-full min-h-[inherit] w-max min-w-full shrink-0 flex-nowrap items-center gap-0.5 rounded-xl p-1"
          :class="segTrack"
        >
          <RouterLink
            v-for="item in props.navItems"
            :key="item.name"
            :data-hub-nav="item.name"
            :to="{ name: item.name }"
            class="relative z-10 shrink-0 rounded-full font-medium leading-none transition-colors duration-200"
            :class="[
              'px-[clamp(0.375rem,1.8vw,0.625rem)] py-[clamp(0.25rem,1vw,0.375rem)] text-[clamp(0.625rem,2.6vw,0.75rem)]',
              isActive(item.name)
                ? store.theme === 'dark'
                  ? 'bg-white/[0.16] text-white shadow-[0_1px_8px_rgba(0,0,0,0.3)] ring-1 ring-white/10'
                  : 'bg-white/90 text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.08)]'
                : store.theme === 'dark'
                  ? 'text-slate-400 hover:text-slate-100'
                  : 'text-slate-500 hover:text-slate-800',
            ]"
          >
            {{ item.label }}
          </RouterLink>
        </div>
      </nav>

      <div
        class="hidden min-[360px]:block shrink-0 self-stretch w-px"
        :class="store.theme === 'dark' ? 'bg-slate-500/40' : 'bg-slate-300/70'"
        aria-hidden="true"
      />

      <div
        class="flex shrink-0 items-center gap-[clamp(0.125rem,1.2vw,0.5rem)]"
        role="group"
        :aria-label="profileTitle"
      >
        <div
          class="flex aspect-square h-[clamp(1.5rem,6vw,1.75rem)] min-h-[1.5rem] max-h-[1.75rem] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-100 to-teal-200 text-[clamp(0.5625rem,2.2vw,0.6875rem)] font-semibold text-teal-900 dark:from-teal-900 dark:to-teal-950 dark:text-teal-100"
          :title="profileTitle"
          aria-hidden="true"
        >
          {{ store.displayName.slice(0, 1) }}
        </div>
        <p
          class="hidden max-w-[min(7.5rem,22vw)] truncate text-[clamp(0.625rem,2.4vw,0.75rem)] font-medium text-slate-900 min-[360px]:block dark:text-white"
          :title="profileTitle"
        >
          {{ store.displayName }}
        </p>
        <ThemeToggle layout="inline" size="sm" />
        <button
          type="button"
          class="shrink-0 rounded-md border border-transparent px-[clamp(0.125rem,1vw,0.375rem)] py-0.5 text-[clamp(0.5625rem,2vw,0.625rem)] font-medium text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 dark:text-slate-400 dark:hover:border-red-900/50 dark:hover:bg-red-950/40 dark:hover:text-red-300"
          @click="onLogout"
        >
          {{ store.t.logout }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hub-bottom-nav-scroll {
  -webkit-overflow-scrolling: touch;
}
</style>
