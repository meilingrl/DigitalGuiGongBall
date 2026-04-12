<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAppStore } from '../../stores/app'
import {
  achievements,
  recentSessions,
  skills,
  type SkillKey,
} from '../../data/stats'

const store = useAppStore()
const t = computed(() => store.t)

// ─── radar chart (hexagon) ────────────────────────────────────────────────────
const radarSize = 180
const center = radarSize / 2
const maxRadius = 72

const skillKeys: SkillKey[] = ['precision', 'depth', 'aesthetics', 'speed', 'collab', 'creativity']

const skillLabels = computed(() => ({
  precision: t.value.statsSkillPrecision,
  depth: t.value.statsSkillDepth,
  aesthetics: t.value.statsSkillAesthetics,
  speed: t.value.statsSkillSpeed,
  collab: t.value.statsSkillCollab,
  creativity: t.value.statsSkillCreativity,
}))

function radarPoint(i: number, ratio: number) {
  const angle = (Math.PI * 2 * i) / skillKeys.length - Math.PI / 2
  return {
    x: center + Math.cos(angle) * maxRadius * ratio,
    y: center + Math.sin(angle) * maxRadius * ratio,
  }
}

function radarPolygon(ratio: number) {
  return skillKeys
    .map((_, i) => {
      const p = radarPoint(i, ratio)
      return `${p.x},${p.y}`
    })
    .join(' ')
}

const dataPolygon = computed(() =>
  skillKeys
    .map((key, i) => {
      const p = radarPoint(i, skills[key] / 100)
      return `${p.x},${p.y}`
    })
    .join(' '),
)

const rings = [0.25, 0.5, 0.75, 1.0]

// ─── full-year heatmap ────────────────────────────────────────────────────────
const currentYear = new Date().getFullYear()
const selectedYear = ref(currentYear)

interface WeekCell {
  date: Date
  val: number   // -1 = outside selected year or future, 0-3 = activity level
  inYear: boolean
}

function seedVal(date: Date): number {
  // deterministic pseudo-random based on date: gives consistent cross-session data
  const n = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate()
  const x = Math.sin(n * 9301 + 49297) * 233280
  const r = x - Math.floor(x)
  if (r < 0.40) return 0
  if (r < 0.65) return 1
  if (r < 0.84) return 2
  return 3
}

const yearGrid = computed((): WeekCell[][] => {
  const year = selectedYear.value
  const jan1 = new Date(year, 0, 1)
  const startDate = new Date(jan1)
  startDate.setDate(jan1.getDate() - jan1.getDay()) // rewind to the previous Sunday

  const today = new Date()
  today.setHours(23, 59, 59, 999)

  const weeks: WeekCell[][] = []
  const cursor = new Date(startDate)

  for (let w = 0; w < 54; w++) {
    const week: WeekCell[] = []
    let hasInYear = false

    for (let d = 0; d < 7; d++) {
      const date = new Date(cursor)
      const inYear = date.getFullYear() === year
      if (inYear) hasInYear = true

      const isFuture = date > today
      week.push({
        date,
        inYear,
        val: inYear && !isFuture ? seedVal(date) : -1,
      })
      cursor.setDate(cursor.getDate() + 1)
    }

    // include weeks that overlap the selected year; stop once we've passed it
    if (w === 0 || hasInYear) {
      weeks.push(week)
    } else {
      break
    }
  }

  return weeks
})

const monthLabels = computed(() => {
  const year = selectedYear.value
  const jan1 = new Date(year, 0, 1)
  const startDate = new Date(jan1)
  startDate.setDate(jan1.getDate() - jan1.getDay())

  const zhNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']
  const enNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const names = store.locale === 'zh' ? zhNames : enNames

  const labels: { label: string; col: number }[] = []
  for (let m = 0; m < 12; m++) {
    const d = new Date(year, m, 1)
    const diffDays = Math.floor((d.getTime() - startDate.getTime()) / 86400000)
    const col = Math.floor(diffDays / 7)
    labels.push({ label: names[m] ?? '', col })
  }
  return labels
})

// Pixel step: each cell is w-3 (12px) + gap-1 (4px) = 16px per column
const CELL_STEP = 16

const yearStats = computed(() => {
  let activeDays = 0
  let totalActivity = 0
  const grid = yearGrid.value
  for (const week of grid) {
    for (const cell of week) {
      if (cell.inYear && cell.val > 0) {
        activeDays++
        totalActivity += cell.val
      }
    }
  }
  return {
    activeDays,
    focusHours: +(totalActivity * 0.9).toFixed(1),
    layersCarved: totalActivity * 48,
  }
})

const heatColors = [
  'bg-slate-100 dark:bg-slate-800',
  'bg-teal-200 dark:bg-teal-900',
  'bg-teal-400 dark:bg-teal-700',
  'bg-teal-600 dark:bg-teal-500',
]

function cellColor(cell: WeekCell): string {
  if (!cell.inYear || cell.val < 0) return 'bg-slate-100/60 dark:bg-slate-800/40'
  return heatColors[cell.val] ?? heatColors[0] ?? ''
}

function cellTitle(cell: WeekCell): string {
  const dateStr = cell.date.toLocaleDateString(
    store.locale === 'zh' ? 'zh-CN' : 'en-US',
    { year: 'numeric', month: 'short', day: 'numeric' },
  )
  if (!cell.inYear || cell.val < 0) return dateStr
  const levels = store.locale === 'zh'
    ? ['无活动', '轻度活跃', '中度活跃', '高度活跃']
    : ['No activity', 'Light', 'Moderate', 'Highly active']
  return `${dateStr}  ·  ${levels[cell.val] ?? ''}`
}

const weekDays = computed(() =>
  store.locale === 'zh'
    ? ['日', '一', '二', '三', '四', '五', '六']
    : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
)

// ─── achievement pin (up to 3, allow zero) ────────────────────────────────────
const pinnedAchIds = ref<string[]>(achievements.slice(0, 3).map((a) => a.id))

function toggleAch(id: string) {
  if (pinnedAchIds.value.includes(id)) {
    pinnedAchIds.value = pinnedAchIds.value.filter((x) => x !== id)
  } else if (pinnedAchIds.value.length < 3) {
    pinnedAchIds.value = [...pinnedAchIds.value, id]
  }
}

// ─── recent sessions ─────────────────────────────────────────────────────────
function sessionName(s: (typeof recentSessions)[0]) {
  return store.locale === 'zh' ? s.templateZh : s.templateEn
}

const statusStyles: Record<string, string> = {
  completed: 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/50',
  'in-progress': 'text-sky-700 bg-sky-50 dark:text-sky-300 dark:bg-sky-950/50',
  abandoned: 'text-slate-500 bg-slate-100 dark:text-slate-400 dark:bg-slate-800',
}

function statusLabel(s: string) {
  if (store.locale === 'zh') return { completed: '已完成', 'in-progress': '进行中', abandoned: '已中断' }[s] ?? s
  return { completed: 'Done', 'in-progress': 'In progress', abandoned: 'Abandoned' }[s] ?? s
}

// ─── work records filter + sort ───────────────────────────────────────────────
type SortKey = 'date-desc' | 'date-asc' | 'likes-desc' | 'layers-desc'
type FilterKey = 'all' | 'completed' | 'in-progress' | 'abandoned'

const sortKey = ref<SortKey>('date-desc')
const filterKey = ref<FilterKey>('all')

const sortOptions = computed<{ key: SortKey; label: string }[]>(() =>
  store.locale === 'zh'
    ? [
        { key: 'date-desc', label: '最新时间' },
        { key: 'date-asc', label: '最早时间' },
        { key: 'likes-desc', label: '点赞最多' },
        { key: 'layers-desc', label: '层数最多' },
      ]
    : [
        { key: 'date-desc', label: 'Newest' },
        { key: 'date-asc', label: 'Oldest' },
        { key: 'likes-desc', label: 'Most liked' },
        { key: 'layers-desc', label: 'Most layers' },
      ],
)

const filterOptions = computed<{ key: FilterKey; label: string }[]>(() =>
  store.locale === 'zh'
    ? [
        { key: 'all', label: '全部' },
        { key: 'completed', label: '已完成' },
        { key: 'in-progress', label: '进行中' },
        { key: 'abandoned', label: '已中断' },
      ]
    : [
        { key: 'all', label: 'All' },
        { key: 'completed', label: 'Done' },
        { key: 'in-progress', label: 'In progress' },
        { key: 'abandoned', label: 'Abandoned' },
      ],
)

const filteredSortedSessions = computed(() => {
  let list = filterKey.value === 'all'
    ? [...recentSessions]
    : recentSessions.filter((s) => s.status === filterKey.value)

  if (sortKey.value === 'date-desc') list.sort((a, b) => b.date.localeCompare(a.date))
  else if (sortKey.value === 'date-asc') list.sort((a, b) => a.date.localeCompare(b.date))
  else if (sortKey.value === 'likes-desc') list.sort((a, b) => b.likes - a.likes)
  else if (sortKey.value === 'layers-desc') list.sort((a, b) => b.layersCompleted - a.layersCompleted)

  return list
})
</script>

<template>
  <div>
    <header class="mb-8">
      <p class="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">{{ t.stats }}</p>
      <h2 class="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{{ t.statsIntro }}</h2>
    </header>

    <!-- Key metric cards -->
    <div class="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <p class="mb-2 text-xs text-slate-500 dark:text-slate-400">{{ t.statsLayersCarved }}</p>
        <p class="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">14,208</p>
        <p class="mt-1 text-xs text-teal-600 dark:text-teal-400">↑ 326 {{ store.locale === 'zh' ? '本周' : 'this week' }}</p>
      </article>
      <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <p class="mb-2 text-xs text-slate-500 dark:text-slate-400">{{ t.statsTimeSpent }}</p>
        <p class="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">128 h</p>
        <p class="mt-1 text-xs text-teal-600 dark:text-teal-400">↑ 4.2h {{ store.locale === 'zh' ? '本周' : 'this week' }}</p>
      </article>
      <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <p class="mb-2 text-xs text-slate-500 dark:text-slate-400">{{ t.statsWorksCompleted }}</p>
        <p class="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">47</p>
        <p class="mt-1 text-xs text-slate-400 dark:text-slate-500">{{ store.locale === 'zh' ? '含协作 12 件' : 'incl. 12 co-op' }}</p>
      </article>
      <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <p class="mb-2 text-xs text-slate-500 dark:text-slate-400">{{ t.statsRank }}</p>
        <p class="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">#  384</p>
        <p class="mt-1 text-xs text-teal-600 dark:text-teal-400">↑ 29 {{ store.locale === 'zh' ? '名' : 'places' }}</p>
      </article>
    </div>

    <!-- Radar + Activity heatmap row -->
    <div class="mb-8 grid gap-6 lg:grid-cols-[auto_1fr]">

      <!-- Skill radar -->
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <h3 class="mb-4 text-sm font-medium text-slate-700 dark:text-slate-300">{{ t.statsSkillTitle }}</h3>
        <div class="flex items-center justify-center">
          <svg :width="radarSize" :height="radarSize" class="overflow-visible">
            <polygon
              v-for="r in rings"
              :key="r"
              :points="radarPolygon(r)"
              fill="none"
              class="stroke-slate-200 dark:stroke-slate-700"
              stroke-width="1"
            />
            <line
              v-for="(key, i) in skillKeys"
              :key="key"
              :x1="center"
              :y1="center"
              :x2="radarPoint(i, 1).x"
              :y2="radarPoint(i, 1).y"
              class="stroke-slate-200 dark:stroke-slate-700"
              stroke-width="1"
            />
            <polygon
              :points="dataPolygon"
              class="fill-teal-500/20 dark:fill-teal-400/20 stroke-teal-600 dark:stroke-teal-400"
              stroke-width="1.5"
            />
            <circle
              v-for="(key, i) in skillKeys"
              :key="key + '-dot'"
              :cx="radarPoint(i, skills[key] / 100).x"
              :cy="radarPoint(i, skills[key] / 100).y"
              r="3"
              class="fill-teal-600 dark:fill-teal-400"
            />
            <text
              v-for="(key, i) in skillKeys"
              :key="key + '-label'"
              :x="radarPoint(i, 1.22).x"
              :y="radarPoint(i, 1.22).y"
              text-anchor="middle"
              dominant-baseline="middle"
              font-size="9.5"
              class="fill-slate-500 dark:fill-slate-400 select-none"
            >
              {{ skillLabels[key] }}
            </text>
          </svg>
        </div>
        <!-- Skill bars -->
        <div class="mt-4 space-y-2">
          <div v-for="key in skillKeys" :key="key" class="flex items-center gap-3">
            <span class="w-14 shrink-0 text-right text-[11px] text-slate-500 dark:text-slate-400">{{ skillLabels[key] }}</span>
            <div class="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                class="h-full rounded-full bg-teal-500 dark:bg-teal-400 transition-all"
                :style="{ width: skills[key] + '%' }"
              />
            </div>
            <span class="w-6 text-right text-[11px] tabular-nums text-slate-500 dark:text-slate-400">{{ skills[key] }}</span>
          </div>
        </div>
      </div>

      <!-- Full-year activity heatmap -->
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <!-- Header: title + year nav -->
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-sm font-medium text-slate-700 dark:text-slate-300">{{ t.statsActivityTitle }}</h3>
          <div class="flex items-center gap-1">
            <button
              type="button"
              :disabled="selectedYear <= currentYear - 3"
              class="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              @click="selectedYear--"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span class="w-12 text-center text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200">
              {{ selectedYear }}
            </span>
            <button
              type="button"
              :disabled="selectedYear >= currentYear"
              class="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              @click="selectedYear++"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Heatmap grid with month labels -->
        <div class="overflow-x-auto pb-1">
          <div class="relative inline-block" style="padding-top: 18px">
            <!-- Month label overlay -->
            <div class="pointer-events-none absolute left-0 top-0 right-0 h-[18px]">
              <!-- day-label offset: w-5 (20px) + gap-1 (4px) = 24px -->
              <span
                v-for="(lbl, i) in monthLabels"
                :key="i"
                class="absolute top-0 text-[9px] text-slate-400 dark:text-slate-500 select-none"
                :style="{ left: (24 + lbl.col * CELL_STEP) + 'px' }"
              >
                {{ lbl.label }}
              </span>
            </div>

            <!-- Grid: day-of-week labels + week columns -->
            <div class="flex gap-1">
              <!-- Day labels (only odd indices: Mon, Wed, Fri) -->
              <div class="flex w-5 shrink-0 flex-col gap-1">
                <div
                  v-for="(d, di) in weekDays"
                  :key="di"
                  class="flex h-3 items-center justify-end text-[9px] text-slate-400 dark:text-slate-600"
                >
                  <template v-if="di % 2 === 1">{{ d }}</template>
                </div>
              </div>

              <!-- Week columns -->
              <div class="flex gap-1">
                <div v-for="(week, wi) in yearGrid" :key="wi" class="flex flex-col gap-1">
                  <div
                    v-for="(cell, di) in week"
                    :key="di"
                    class="h-3 w-3 rounded-sm transition-colors duration-150"
                    :class="cellColor(cell)"
                    :title="cellTitle(cell)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Legend -->
        <div class="mt-3 flex items-center gap-1.5">
          <span class="mr-0.5 text-[10px] text-slate-400 dark:text-slate-600">{{ store.locale === 'zh' ? '少' : 'Less' }}</span>
          <div v-for="(cls, ci) in heatColors" :key="ci" class="h-2.5 w-2.5 rounded-sm" :class="cls" />
          <span class="ml-0.5 text-[10px] text-slate-400 dark:text-slate-600">{{ store.locale === 'zh' ? '多' : 'More' }}</span>
        </div>

        <!-- Year summary -->
        <div class="mt-5 grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 pt-4 dark:divide-slate-800 dark:border-slate-800">
          <div class="pr-3 text-center">
            <p class="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{{ yearStats.activeDays }}</p>
            <p class="text-[10px] text-slate-400 dark:text-slate-500">{{ store.locale === 'zh' ? '活跃天' : 'Active days' }}</p>
          </div>
          <div class="px-3 text-center">
            <p class="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{{ yearStats.focusHours }}h</p>
            <p class="text-[10px] text-slate-400 dark:text-slate-500">{{ store.locale === 'zh' ? '专注时长' : 'Focus time' }}</p>
          </div>
          <div class="pl-3 text-center">
            <p class="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{{ yearStats.layersCarved }}</p>
            <p class="text-[10px] text-slate-400 dark:text-slate-500">{{ store.locale === 'zh' ? '新增层数' : 'Layers carved' }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Achievements -->
    <div class="mb-8">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-sm font-medium text-slate-700 dark:text-slate-300">{{ t.statsAchievementsTitle }}</h3>
        <span class="text-xs text-slate-400 dark:text-slate-500">
          {{ store.locale === 'zh'
            ? (pinnedAchIds.length > 0 ? `已展示 ${pinnedAchIds.length}/3，点击徽章切换` : '点击徽章展示（最多3枚）')
            : (pinnedAchIds.length > 0 ? `${pinnedAchIds.length}/3 pinned — click to toggle` : 'Click badges to pin (max 3)') }}
        </span>
      </div>
      <div class="container-grid content-grid">
        <button
          v-for="ach in achievements"
          :key="ach.id"
          type="button"
          class="flex items-start gap-3 rounded-xl border p-4 text-left shadow-soft transition focus:outline-none"
          :class="pinnedAchIds.includes(ach.id)
            ? 'border-emerald-400 bg-white ring-1 ring-emerald-400/50 dark:border-emerald-500 dark:bg-slate-900 dark:ring-emerald-500/40'
            : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700'"
          @click="toggleAch(ach.id)"
        >
          <span class="text-2xl leading-none mt-0.5">{{ ach.icon }}</span>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5">
              <p class="text-sm font-medium text-slate-800 dark:text-slate-100">
                {{ store.locale === 'zh' ? ach.titleZh : ach.titleEn }}
              </p>
              <span
                v-if="ach.rare"
                class="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-400"
              >
                {{ store.locale === 'zh' ? '稀有' : 'Rare' }}
              </span>
              <span
                v-if="pinnedAchIds.includes(ach.id)"
                class="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
              >
                {{ store.locale === 'zh' ? '展示中' : 'Pinned' }}
              </span>
            </div>
            <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {{ store.locale === 'zh' ? ach.descZh : ach.descEn }}
            </p>
            <p class="mt-1.5 text-[10px] text-slate-400 dark:text-slate-600">{{ ach.unlockedAt }}</p>
          </div>
        </button>
      </div>
    </div>

    <!-- Work records -->
    <div>
      <!-- Header + filter/sort controls -->
      <div class="mb-4 space-y-3">
        <h3 class="text-sm font-medium text-slate-700 dark:text-slate-300">{{ t.statsRecentTitle }}</h3>

        <!-- Filter pills -->
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs text-slate-400 dark:text-slate-500 shrink-0">{{ store.locale === 'zh' ? '筛选' : 'Filter' }}:</span>
          <button
            v-for="opt in filterOptions"
            :key="opt.key"
            type="button"
            class="rounded-full px-3 py-1 text-xs font-medium transition"
            :class="filterKey === opt.key
              ? 'bg-teal-700 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'"
            @click="filterKey = opt.key"
          >{{ opt.label }}</button>

          <span class="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-700 shrink-0" />

          <span class="text-xs text-slate-400 dark:text-slate-500 shrink-0">{{ store.locale === 'zh' ? '排序' : 'Sort' }}:</span>
          <button
            v-for="opt in sortOptions"
            :key="opt.key"
            type="button"
            class="rounded-full px-3 py-1 text-xs font-medium transition"
            :class="sortKey === opt.key
              ? 'bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'"
            @click="sortKey = opt.key"
          >{{ opt.label }}</button>
        </div>
      </div>

      <!-- Table -->
      <div class="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 dark:bg-slate-800/60">
            <tr>
              <th class="px-4 py-2.5 text-left text-xs font-medium text-slate-500 dark:text-slate-400">{{ store.locale === 'zh' ? '模板' : 'Template' }}</th>
              <th class="px-4 py-2.5 text-left text-xs font-medium text-slate-500 dark:text-slate-400">{{ store.locale === 'zh' ? '日期' : 'Date' }}</th>
              <th class="px-4 py-2.5 text-right text-xs font-medium text-slate-500 dark:text-slate-400">{{ store.locale === 'zh' ? '时长' : 'Duration' }}</th>
              <th class="px-4 py-2.5 text-right text-xs font-medium text-slate-500 dark:text-slate-400">{{ store.locale === 'zh' ? '完成层' : 'Layers' }}</th>
              <th class="px-4 py-2.5 text-right text-xs font-medium text-slate-500 dark:text-slate-400">
                <span class="flex items-center justify-end gap-1">
                  <svg class="h-3 w-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                  {{ store.locale === 'zh' ? '点赞' : 'Likes' }}
                </span>
              </th>
              <th class="px-4 py-2.5 text-right text-xs font-medium text-slate-500 dark:text-slate-400">{{ store.locale === 'zh' ? '状态' : 'Status' }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
            <tr
              v-for="s in filteredSortedSessions"
              :key="s.id"
              class="hover:bg-slate-50 dark:hover:bg-slate-800/40"
            >
              <td class="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{{ sessionName(s) }}</td>
              <td class="px-4 py-3 text-slate-500 dark:text-slate-400 tabular-nums">{{ s.date }}</td>
              <td class="px-4 py-3 text-right tabular-nums text-slate-600 dark:text-slate-300">{{ s.durationMin }} min</td>
              <td class="px-4 py-3 text-right tabular-nums text-slate-600 dark:text-slate-300">{{ s.layersCompleted }}</td>
              <td class="px-4 py-3 text-right tabular-nums text-rose-500 dark:text-rose-400">{{ s.likes }}</td>
              <td class="px-4 py-3 text-right">
                <span class="rounded-full px-2 py-0.5 text-[11px] font-medium" :class="statusStyles[s.status]">
                  {{ statusLabel(s.status) }}
                </span>
              </td>
            </tr>
            <tr v-if="filteredSortedSessions.length === 0">
              <td colspan="6" class="px-4 py-8 text-center text-sm text-slate-400 dark:text-slate-600">
                {{ store.locale === 'zh' ? '暂无符合条件的作品记录' : 'No records match the current filter.' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
