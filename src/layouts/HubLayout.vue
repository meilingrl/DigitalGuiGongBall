<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import HubBottomBar from '../components/HubBottomBar.vue'
import HubSidebarDock from '../components/HubSidebarDock.vue'
import { useAppStore } from '../stores/app'

const store = useAppStore()
const route = useRoute()

type NavName =
  | 'hub-dashboard'
  | 'hub-workshop'
  | 'hub-museum'
  | 'hub-social'
  | 'hub-explore'
  | 'hub-mall'
  | 'hub-stats'
  | 'hub-settings'

type NavItem = { name: NavName; label: string }

const navGroups = computed((): { title: string; items: NavItem[] }[] => {
  const t = store.t
  return [
    {
      title: t.navSectionJourney,
      items: [
        { name: 'hub-dashboard', label: t.dashboard },
        { name: 'hub-museum', label: t.museum },
        { name: 'hub-workshop', label: t.workshop },
        { name: 'hub-explore', label: t.explore },
      ],
    },
    {
      title: t.navSectionCommunity,
      items: [
        { name: 'hub-social', label: t.social },
        { name: 'hub-mall', label: t.mall },
      ],
    },
    {
      title: t.navSectionAccount,
      items: [
        { name: 'hub-stats', label: t.stats },
        { name: 'hub-settings', label: t.settings },
      ],
    },
  ]
})

/** 窄屏顶栏：同一顺序扁平展示，避免横向再嵌套分组 */
const navFlat = computed(() => navGroups.value.flatMap((g) => g.items))

function isActive(name: string) {
  return route.name === name
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

    <!-- 侧边栏：仅宽屏；小屏仅用底部合并 Dock -->
    <aside class="hub-sidebar hidden flex-col border-r pl-5 pr-4 pt-8 lg:flex" :class="asideShell">
      <div class="mb-[var(--space-lg)] px-1">
        <h1 class="font-display text-fluid-lg font-semibold tracking-tight text-slate-900 dark:text-white">
          {{ store.t.brand }}
        </h1>
      </div>
      <nav class="min-h-0 flex-1 overflow-y-auto px-0.5 pb-4">
        <div v-for="group in navGroups" :key="group.title" class="mb-5 last:mb-0">
          <p
            class="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500"
          >
            {{ group.title }}
          </p>
          <div class="space-y-1">
            <RouterLink
              v-for="item in group.items"
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
            >
              {{ item.label }}
            </RouterLink>
          </div>
        </div>
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

    <HubBottomBar :nav-items="navFlat" />
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
  padding: var(--space-lg) var(--space-lg) var(--space-2xl);
}

/* ── 窄屏（< 1024px）覆盖 ──────────────────────────────────── */
@media (max-width: 1023px) {
  .hub-shell {
    grid-template-columns: 1fr;
  }

  /* 无顶栏；底部合并 Dock（导航 + 账户）预留高度 */
  .hub-main {
    grid-column: 1;
    padding-top: var(--space-md);
    padding-bottom: max(var(--space-2xl), clamp(4.25rem, 14vw, 5.5rem));
    padding-left: var(--space-md);
    padding-right: var(--space-md);
  }
}
</style>
