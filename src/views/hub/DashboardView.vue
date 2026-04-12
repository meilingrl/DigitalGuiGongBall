<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useAppStore } from '../../stores/app'
import { templates } from '../../data/content'
import { friends } from '../../data/social'
import { recentSessions } from '../../data/stats'

const store = useAppStore()
const t = computed(() => store.t)

// Featured templates for this week
const featuredTemplates = computed(() =>
  templates.filter((item) => item.featured).slice(0, 3),
)

// Online friends for sidebar
const onlineFriends = computed(() => friends.filter((f) => f.status !== 'offline').slice(0, 5))

// Last session (for resume card)
const lastSession = computed(() => recentSessions.find((s) => s.status === 'in-progress'))

const greetingHour = new Date().getHours()
const greeting = computed(() => {
  if (store.locale === 'en') {
    if (greetingHour < 5) return 'Good night'
    if (greetingHour < 12) return 'Good morning'
    if (greetingHour < 18) return 'Good afternoon'
    return 'Good evening'
  }
  if (greetingHour < 5) return '深夜好'
  if (greetingHour < 12) return '早上好'
  if (greetingHour < 18) return '下午好'
  return '晚上好'
})

function templateName(t: (typeof templates)[0]) {
  return store.locale === 'zh' ? t.nameZh : t.nameEn
}

function templateDesc(item: (typeof templates)[0]) {
  return store.locale === 'zh' ? item.descriptionZh : item.descriptionEn
}

const difficultyColors: Record<string, string> = {
  beginner: 'text-emerald-600 dark:text-emerald-400',
  intermediate: 'text-sky-600 dark:text-sky-400',
  advanced: 'text-amber-600 dark:text-amber-400',
  master: 'text-rose-600 dark:text-rose-400',
}

const statusColors: Record<string, string> = {
  carving: 'bg-teal-500',
  museum: 'bg-sky-500',
  idle: 'bg-amber-400',
  offline: 'bg-slate-300 dark:bg-slate-600',
}

function friendActivity(f: (typeof friends)[0]) {
  if (f.status === 'carving') {
    const tpl = store.locale === 'zh' ? f.currentTemplateZh : f.currentTemplateEn
    return `${store.locale === 'zh' ? '雕刻中 · ' : 'Carving · '}${tpl ?? ''}`
  }
  if (f.status === 'museum') return store.locale === 'zh' ? '浏览文化博物馆' : 'Browsing museum'
  return store.locale === 'zh' ? '空闲' : 'Idle'
}
</script>

<template>
  <div>
    <!-- Greeting -->
    <header class="mb-[var(--space-xl)]">
      <p class="text-fluid-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">{{ t.dashboard }}</p>
      <h2 class="mt-1 text-fluid-2xl font-semibold text-slate-900 dark:text-white">
        {{ greeting }}，{{ store.displayName }} 👋
      </h2>
      <p class="mt-1.5 text-fluid-sm text-slate-500 dark:text-slate-400">{{ t.dashboardBody }}</p>
    </header>

    <!-- Quick actions -->
    <div class="mb-[var(--space-xl)] flex flex-wrap gap-[var(--space-sm)]">
      <RouterLink
        class="rounded-xl bg-teal-700 px-[var(--space-md)] py-[var(--space-xs)] text-fluid-sm font-medium text-white shadow-soft transition hover:bg-teal-800"
        :to="{ name: 'hub-workshop' }"
      >
        {{ t.quickStart }}
      </RouterLink>
      <RouterLink
        class="rounded-xl border border-slate-300 px-[var(--space-md)] py-[var(--space-xs)] text-fluid-sm font-medium text-slate-700 transition hover:border-teal-600 hover:text-teal-800 dark:border-slate-600 dark:text-slate-200 dark:hover:border-teal-500"
        :to="{ name: 'hub-social' }"
      >
        {{ store.locale === 'zh' ? '查看协作房间' : 'Browse rooms' }}
      </RouterLink>
      <RouterLink
        class="rounded-xl border border-slate-300 px-[var(--space-md)] py-[var(--space-xs)] text-fluid-sm font-medium text-slate-700 transition hover:border-teal-600 hover:text-teal-800 dark:border-slate-600 dark:text-slate-200 dark:hover:border-teal-500"
        :to="{ name: 'hub-museum' }"
      >
        {{ t.museum }}
      </RouterLink>
    </div>

    <!-- Resume banner (if there's an in-progress session) -->
    <div
      v-if="lastSession"
      class="mb-[var(--space-xl)] flex items-center justify-between gap-[var(--space-md)] rounded-2xl border border-teal-200 bg-teal-50/60 p-[var(--space-md)] dark:border-teal-800 dark:bg-teal-950/20"
    >
      <div>
        <p class="text-fluid-xs font-medium text-teal-700 dark:text-teal-400">
          {{ store.locale === 'zh' ? '继续上次的雕刻' : 'Continue where you left off' }}
        </p>
        <p class="mt-0.5 font-semibold text-slate-900 dark:text-white">
          {{ store.locale === 'zh' ? lastSession.templateZh : lastSession.templateEn }}
        </p>
        <p class="mt-0.5 text-fluid-xs text-slate-500 dark:text-slate-400">
          {{ store.locale === 'zh' ? '已完成 ' : 'Completed ' }}{{ lastSession.layersCompleted }}{{ store.locale === 'zh' ? ' 层 · ' : ' layers · ' }}{{ lastSession.durationMin }} min
        </p>
      </div>
      <RouterLink
        :to="{ name: 'hub-workshop' }"
        class="shrink-0 rounded-xl bg-teal-700 px-[var(--space-md)] py-[var(--space-xs)] text-fluid-sm font-medium text-white hover:bg-teal-800 transition"
      >
        {{ store.locale === 'zh' ? '继续雕刻' : 'Resume' }}
      </RouterLink>
    </div>

    <div class="grid gap-[var(--space-lg)] lg:grid-cols-3">
      <!-- Left/main column -->
      <div class="lg:col-span-2 space-y-[var(--space-lg)]">

        <!-- Mini stats -->
        <div class="grid grid-cols-3 gap-[var(--space-sm)]">
          <div class="rounded-2xl border border-slate-200 bg-white p-[var(--space-md)] text-center shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <p class="text-fluid-xl font-bold tabular-nums text-slate-900 dark:text-white">14,208</p>
            <p class="mt-1 text-fluid-xs text-slate-500 dark:text-slate-400">{{ store.locale === 'zh' ? '累计层数' : 'Total layers' }}</p>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-white p-[var(--space-md)] text-center shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <p class="text-fluid-xl font-bold tabular-nums text-slate-900 dark:text-white">47</p>
            <p class="mt-1 text-fluid-xs text-slate-500 dark:text-slate-400">{{ store.locale === 'zh' ? '完成作品' : 'Completed' }}</p>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-white p-[var(--space-md)] text-center shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <p class="text-fluid-xl font-bold tabular-nums text-slate-900 dark:text-white">#384</p>
            <p class="mt-1 text-fluid-xs text-slate-500 dark:text-slate-400">{{ store.locale === 'zh' ? '全站排名' : 'Rank' }}</p>
          </div>
        </div>

        <!-- Weekly picks -->
        <div>
          <div class="mb-[var(--space-md)] flex items-center justify-between">
            <h3 class="text-fluid-sm font-semibold text-slate-800 dark:text-slate-200">{{ t.weeklyPick }}</h3>
            <RouterLink :to="{ name: 'hub-workshop' }" class="text-fluid-xs text-teal-700 hover:underline dark:text-teal-400">
              {{ store.locale === 'zh' ? '全部模板 →' : 'All templates →' }}
            </RouterLink>
          </div>
          <!-- container-grid 开启容器查询上下文，内部网格按容器宽度自适应列数 -->
          <div class="container-grid">
            <div class="content-grid">
              <RouterLink
                v-for="item in featuredTemplates"
                :key="item.id"
                :to="{ name: 'hub-workshop' }"
                class="block rounded-2xl border border-slate-200 bg-white p-[var(--space-md)] shadow-soft transition hover:-translate-y-0.5 hover:border-teal-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-800"
              >
                <p class="mb-1 flex items-center gap-1 text-fluid-xs text-slate-400 dark:text-slate-500">
                  <span class="inline-flex items-baseline gap-0.5">
                    <span class="text-fluid-base font-bold tabular-nums text-teal-700 dark:text-teal-400">{{ item.layers }}</span>
                    <span class="text-fluid-xs text-slate-400 dark:text-slate-500">{{ t.layers }}</span>
                  </span>
                  <span class="text-slate-300 dark:text-slate-700">·</span>
                  <span :class="difficultyColors[item.difficulty]">{{ store.locale === 'zh' ? { beginner: '入门', intermediate: '进阶', advanced: '高级', master: '大师' }[item.difficulty] : item.difficulty }}</span>
                </p>
                <p class="text-fluid-sm font-semibold text-slate-900 dark:text-white">{{ templateName(item) }}</p>
                <p class="mt-1.5 text-fluid-xs text-slate-500 dark:text-slate-400 line-clamp-2">{{ templateDesc(item) }}</p>
                <p class="mt-3 text-fluid-xs text-slate-400 dark:text-slate-600">
                  ~{{ item.estimatedMin }} min · {{ (item.plays / 1000).toFixed(1) }}k {{ store.locale === 'zh' ? '人制作' : 'crafted' }}
                </p>
              </RouterLink>
            </div>
          </div>
        </div>

        <!-- Recent activity feed -->
        <div>
          <h3 class="mb-[var(--space-md)] text-fluid-sm font-semibold text-slate-800 dark:text-slate-200">
            {{ store.locale === 'zh' ? '最近记录' : 'Recent activity' }}
          </h3>
          <div class="space-y-[var(--space-xs)]">
            <div
              v-for="s in recentSessions.slice(0, 3)"
              :key="s.id"
              class="flex items-center gap-[var(--space-md)] rounded-xl border border-slate-100 bg-white px-[var(--space-md)] py-[var(--space-sm)] dark:border-slate-800 dark:bg-slate-900"
            >
              <div class="h-8 w-8 shrink-0 flex items-center justify-center rounded-full bg-slate-100 text-fluid-sm dark:bg-slate-800">
                {{ s.status === 'completed' ? '✓' : s.status === 'in-progress' ? '▶' : '✕' }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-fluid-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                  {{ store.locale === 'zh' ? s.templateZh : s.templateEn }}
                </p>
                <p class="text-fluid-xs text-slate-500 dark:text-slate-400">{{ s.date }} · {{ s.durationMin }} min · {{ s.layersCompleted }} {{ t.layers }}</p>
              </div>
              <span
                class="shrink-0 rounded-full px-2 py-0.5 text-fluid-xs font-medium"
                :class="{
                  'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/50': s.status === 'completed',
                  'text-sky-700 bg-sky-50 dark:text-sky-400 dark:bg-sky-950/50': s.status === 'in-progress',
                  'text-slate-500 bg-slate-100 dark:text-slate-400 dark:bg-slate-800': s.status === 'abandoned',
                }"
              >
                {{ s.status === 'completed' ? (store.locale === 'zh' ? '已完成' : 'Done') : s.status === 'in-progress' ? (store.locale === 'zh' ? '进行中' : 'In progress') : (store.locale === 'zh' ? '已中断' : 'Abandoned') }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right sidebar -->
      <div class="space-y-[var(--space-md)]">

        <!-- Online friends -->
        <div class="rounded-2xl border border-slate-200 bg-white p-[var(--space-md)] shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <div class="mb-[var(--space-sm)] flex items-center justify-between">
            <h4 class="text-fluid-sm font-semibold text-slate-800 dark:text-slate-200">
              {{ store.locale === 'zh' ? '在线好友' : 'Friends online' }}
            </h4>
            <RouterLink :to="{ name: 'hub-social' }" class="text-fluid-xs text-teal-700 hover:underline dark:text-teal-400">
              {{ store.locale === 'zh' ? '全部 →' : 'All →' }}
            </RouterLink>
          </div>
          <div class="space-y-[var(--space-sm)]">
            <div
              v-for="f in onlineFriends"
              :key="f.id"
              class="flex items-center gap-[var(--space-sm)]"
            >
              <div class="relative shrink-0">
                <div
                  class="flex h-8 w-8 items-center justify-center rounded-full text-fluid-xs font-bold text-white"
                  :style="{ backgroundColor: f.avatarColor }"
                >
                  {{ f.initials }}
                </div>
                <span
                  class="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-slate-900"
                  :class="statusColors[f.status]"
                />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-fluid-xs font-medium text-slate-800 dark:text-slate-100 truncate">
                  {{ store.locale === 'zh' ? f.nameZh : f.nameEn }}
                </p>
                <p class="text-fluid-xs text-slate-400 dark:text-slate-500 truncate">{{ friendActivity(f) }}</p>
              </div>
              <span class="shrink-0 text-fluid-xs font-medium text-slate-400 dark:text-slate-600">Lv.{{ f.level }}</span>
            </div>
          </div>
        </div>

        <!-- Active rooms summary -->
        <div class="rounded-2xl border border-slate-200 bg-white p-[var(--space-md)] shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <div class="mb-[var(--space-sm)] flex items-center justify-between">
            <h4 class="text-fluid-sm font-semibold text-slate-800 dark:text-slate-200">
              {{ store.locale === 'zh' ? '协作房间' : 'Active rooms' }}
            </h4>
            <RouterLink :to="{ name: 'hub-social' }" class="text-fluid-xs text-teal-700 hover:underline dark:text-teal-400">
              {{ store.locale === 'zh' ? '更多 →' : 'More →' }}
            </RouterLink>
          </div>
          <div class="space-y-[var(--space-xs)] text-fluid-xs text-slate-600 dark:text-slate-400">
            <div class="flex items-center justify-between">
              <span>{{ store.locale === 'zh' ? '青玉协作坊' : 'Jade Co-op' }}</span>
              <span class="tabular-nums text-teal-600 dark:text-teal-400">3/4</span>
            </div>
            <div class="flex items-center justify-between">
              <span>{{ store.locale === 'zh' ? '纹样共创营' : 'Motif Lab' }}</span>
              <span class="tabular-nums text-teal-600 dark:text-teal-400">2/3</span>
            </div>
            <div class="flex items-center justify-between text-slate-400 dark:text-slate-600">
              <span>{{ store.locale === 'zh' ? '星穹探索队' : 'Celestial Explorers' }}</span>
              <span class="tabular-nums">1/4</span>
            </div>
          </div>
          <RouterLink
            :to="{ name: 'hub-social' }"
            class="mt-[var(--space-sm)] block w-full rounded-lg border border-slate-200 py-1.5 text-center text-fluid-xs font-medium text-slate-600 hover:border-teal-500 hover:text-teal-700 transition dark:border-slate-700 dark:text-slate-300"
          >
            {{ store.locale === 'zh' ? '加入房间' : 'Join a room' }}
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>
