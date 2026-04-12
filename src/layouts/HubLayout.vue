<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import HubSidebarDock from '../components/HubSidebarDock.vue'
import { useAppStore } from '../stores/app'

const store = useAppStore()
const route = useRoute()

/** 窄屏抽屉开关（仅在 < lg 时生效） */
const drawerOpen = ref(false)

const nav = computed(() => [
  { name: 'hub-dashboard' as const, label: store.t.dashboard },
  { name: 'hub-workshop' as const, label: store.t.workshop },
  { name: 'hub-museum' as const, label: store.t.museum },
  { name: 'hub-social' as const, label: store.t.social },
  { name: 'hub-explore' as const, label: store.t.explore },
  { name: 'hub-mall' as const, label: store.t.mall },
  { name: 'hub-stats' as const, label: store.t.stats },
  { name: 'hub-settings' as const, label: store.t.settings },
])

function isActive(name: string) {
  return route.name === name
}

/** 窄屏：点击导航项后关闭抽屉 */
function onNavClick() {
  drawerOpen.value = false
}

const shell = computed(() =>
  store.theme === 'dark'
    ? 'bg-slate-950 text-slate-100'
    : 'bg-slate-100 text-slate-900',
)

const asideShell = computed(() =>
  store.theme === 'dark'
    ? 'border-slate-800/90 bg-slate-900/95 shadow-[inset_-1px_0_0_0_rgba(148,163,184,0.12)]'
    : 'border-slate-200/90 bg-white shadow-[inset_-1px_0_0_0_rgba(148,163,184,0.18)]',
)

const mainColor = computed(() =>
  store.theme === 'dark' ? 'text-slate-100' : 'text-slate-900',
)
</script>

<template>
  <!-- CSS Grid 主骨架：宽屏两列（侧边栏 + 主区），窄屏单列 -->
  <div class="hub-shell" :class="shell">

    <!-- 窄屏顶栏（< lg）：含汉堡按钮 + 横向滚动导航 -->
    <nav
      class="hub-topbar fixed left-0 right-0 top-0 z-40 flex items-center gap-2 border-b px-3 py-2.5 backdrop-blur-sm lg:hidden"
      :class="store.theme === 'dark' ? 'border-slate-800 bg-slate-900/95' : 'border-slate-200 bg-white/95'"
    >
      <!-- 汉堡按钮（触发抽屉） -->
      <button
        class="shrink-0 rounded-lg p-1.5 transition"
        :class="store.theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-100'"
        :aria-label="drawerOpen ? '关闭菜单' : '打开菜单'"
        @click="drawerOpen = !drawerOpen"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path v-if="!drawerOpen" stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          <path v-else stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <!-- 横向滚动快捷导航 -->
      <div class="flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
        <RouterLink
          v-for="item in nav"
          :key="item.name"
          :to="{ name: item.name }"
          class="shrink-0 rounded-full px-3 py-1.5 text-fluid-xs transition"
          :class="
            isActive(item.name)
              ? 'bg-teal-700 text-white'
              : store.theme === 'dark'
                ? 'text-slate-300 hover:bg-slate-800'
                : 'text-slate-600 hover:bg-slate-100'
          "
        >
          {{ item.label }}
        </RouterLink>
      </div>
    </nav>

    <!-- 窄屏抽屉遮罩 -->
    <Transition name="fade">
      <div
        v-if="drawerOpen"
        class="hub-drawer-mask fixed inset-0 z-40 bg-black/40 lg:hidden"
        @click="drawerOpen = false"
      />
    </Transition>

    <!-- 侧边栏：宽屏嵌入 Grid 第一列；窄屏为 fixed 抽屉 -->
    <aside
      class="hub-sidebar border-r flex flex-col pl-5 pr-4 pt-8"
      :class="[asideShell, { 'drawer-open': drawerOpen }]"
    >
      <div class="mb-[var(--space-lg)] px-1">
        <h1 class="font-display text-fluid-lg font-semibold tracking-tight text-slate-900 dark:text-white">
          {{ store.t.brand }}
        </h1>
      </div>
      <nav class="min-h-0 flex-1 space-y-1 overflow-y-auto px-0.5 pb-4">
        <RouterLink
          v-for="item in nav"
          :key="item.name"
          :to="{ name: item.name }"
          class="block w-full rounded-xl px-3 py-2.5 text-left text-fluid-sm transition"
          :class="
            isActive(item.name)
              ? 'bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-200'
              : store.theme === 'dark'
                ? 'text-slate-400 hover:bg-slate-800/80 hover:text-white'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          "
          @click="onNavClick"
        >
          {{ item.label }}
        </RouterLink>
      </nav>
      <div class="mt-auto shrink-0 border-t border-slate-200/80 pt-4 dark:border-slate-700/80">
        <div class="px-1 pb-5">
          <HubSidebarDock />
        </div>
      </div>
    </aside>

    <!-- 主内容区：Grid 第二列，内边距使用流体 CSS 变量 -->
    <main class="hub-main min-w-0" :class="mainColor">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
/* ── 主骨架：CSS Grid ───────────────────────────────────────── */
.hub-shell {
  display: grid;
  /* 宽屏：侧边栏占 var(--sidebar-w)，主区占剩余空间 */
  grid-template-columns: var(--sidebar-w) 1fr;
  grid-template-rows: 1fr;
  min-height: 100dvh;
}

/* 侧边栏：宽屏内嵌 Grid 第一列，高度撑满整行 */
.hub-sidebar {
  grid-column: 1;
  grid-row: 1;
  position: sticky;
  top: 0;
  height: 100dvh;
  overflow-y: auto;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 主内容区：宽屏填充 Grid 第二列 */
.hub-main {
  grid-column: 2;
  grid-row: 1;
  /* 流体内边距：上边留出顶栏高度（窄屏），左右与底部用 CSS 变量 */
  padding: var(--space-lg) var(--space-lg) var(--space-2xl);
}

/* ── 窄屏（< 1024px）覆盖 ──────────────────────────────────── */
@media (max-width: 1023px) {
  .hub-shell {
    /* 窄屏：单列，主区独占 */
    grid-template-columns: 1fr;
  }

  /* 侧边栏变为 fixed 抽屉，默认隐藏在左侧屏幕外 */
  .hub-sidebar {
    position: fixed;
    inset: 0 auto 0 0;
    z-index: 50;
    width: min(72vw, 260px);
    transform: translateX(-100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* 抽屉打开态 */
  .hub-sidebar.drawer-open {
    transform: translateX(0);
  }

  /* 窄屏主区：只需为顶栏（约 44px）留出上方空间，无底栏 */
  .hub-main {
    grid-column: 1;
    padding-top: calc(44px + var(--space-md));
    padding-bottom: var(--space-xl);
    padding-left: var(--space-md);
    padding-right: var(--space-md);
  }
}

/* ── 遮罩淡入淡出动画 ─────────────────────────────────────── */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
