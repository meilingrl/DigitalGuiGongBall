<script setup lang="ts">
import { useResizeObserver } from '@vueuse/core'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import TemplateCard from '../../components/TemplateCard.vue'
import {
  templates,
  type TemplateCategory,
  type TemplateDifficulty,
  type TemplateStyle,
} from '../../data/content'
import { workshopSubmissions } from '../../data/mall'
import { useAppStore } from '../../stores/app'
import { usePointsStore, TASK_IDS } from '../../stores/points'

const store = useAppStore()
const pointsStore = usePointsStore()
const t = computed(() => store.t)

// ─── Submit form ──────────────────────────────────────────────────────────────
const showSubmitForm = ref(false)
const submitTitle = ref('')
const submitDesc = ref('')
const submitType = ref('')
const submitIch = ref('')
const submitLoading = ref(false)
const submitDone = ref(false)
const toastVisible = ref(false)

// User-submitted works (added to the list after submit)
interface UserWork {
  id: string
  titleZh: string
  titleEn: string
  typeZh: string
  typeEn: string
  ichZh: string
  ichEn: string
  descZh: string
  descEn: string
  badge: string
  date: string
  authorZh: string
  authorEn: string
  isUser: boolean
}

const userWorks = ref<UserWork[]>([])

const allWorks = computed(() => [
  ...userWorks.value,
  ...workshopSubmissions.map((w) => ({ ...w, isUser: false })),
])

function openSubmitForm() {
  submitTitle.value = ''
  submitDesc.value = ''
  submitType.value = ''
  submitIch.value = ''
  submitDone.value = false
  showSubmitForm.value = true
}
function closeSubmitForm() {
  showSubmitForm.value = false
}

function doSubmit() {
  if (!submitTitle.value.trim() || !submitDesc.value.trim()) return
  submitLoading.value = true
  setTimeout(() => {
    submitLoading.value = false
    submitDone.value = true
    // Add to local list
    userWorks.value.unshift({
      id: `user-${Date.now()}`,
      titleZh: submitTitle.value,
      titleEn: submitTitle.value,
      typeZh: submitType.value || (store.locale === 'zh' ? t.value.submitWorkTypeOptions[0] : t.value.submitWorkTypeOptions[0]),
      typeEn: submitType.value,
      ichZh: submitIch.value || (store.locale === 'zh' ? '鬼工球' : 'Guigong Ball'),
      ichEn: submitIch.value,
      descZh: submitDesc.value,
      descEn: submitDesc.value,
      badge: 'mine',
      date: new Date().toISOString().slice(0, 10),
      authorZh: store.displayName,
      authorEn: store.displayName,
      isUser: true,
    })
    pointsStore.completeTask(TASK_IDS.WORK_SUBMIT)
    // Show toast
    showSubmitForm.value = false
    toastVisible.value = true
    setTimeout(() => { toastVisible.value = false }, 3500)
  }, 900)
}

type SortKey = 'popular' | 'newest' | 'layers' | 'time'

const searchQuery = ref('')
const activeCategory = ref<TemplateCategory | 'all'>('all')
const activeDifficulty = ref<TemplateDifficulty | 'all'>('all')
const activeStyle = ref<TemplateStyle | 'all'>('all')
const sortKey = ref<SortKey>('popular')

const sortOpen = ref(false)
const sortDropdownRef = ref<HTMLElement | null>(null)

function closeSortOnOutsideClick(e: MouseEvent) {
  if (sortDropdownRef.value && !sortDropdownRef.value.contains(e.target as Node)) {
    sortOpen.value = false
  }
}
onMounted(() => document.addEventListener('click', closeSortOnOutsideClick))
onBeforeUnmount(() => document.removeEventListener('click', closeSortOnOutsideClick))

const categories: { key: TemplateCategory | 'all'; labelKey: keyof typeof t.value }[] = [
  { key: 'all', labelKey: 'workshopCategoryAll' },
  { key: 'geometric', labelKey: 'workshopCategoryGeometric' },
  { key: 'dragon', labelKey: 'workshopCategoryDragon' },
  { key: 'floral', labelKey: 'workshopCategoryFloral' },
  { key: 'figure', labelKey: 'workshopCategoryFigure' },
  { key: 'auspicious', labelKey: 'workshopCategoryAuspicious' },
  { key: 'abstract', labelKey: 'workshopCategoryAbstract' },
]

const difficulties: { key: TemplateDifficulty | 'all'; labelKey: keyof typeof t.value }[] = [
  { key: 'all', labelKey: 'workshopDiffAll' },
  { key: 'beginner', labelKey: 'workshopDiffBeginner' },
  { key: 'intermediate', labelKey: 'workshopDiffIntermediate' },
  { key: 'advanced', labelKey: 'workshopDiffAdvanced' },
  { key: 'master', labelKey: 'workshopDiffMaster' },
]

const styles: { key: TemplateStyle | 'all'; labelKey: keyof typeof t.value }[] = [
  { key: 'all', labelKey: 'workshopStyleAll' },
  { key: 'traditional', labelKey: 'workshopStyleTraditional' },
  { key: 'modern', labelKey: 'workshopStyleModern' },
  { key: 'mixed', labelKey: 'workshopStyleMixed' },
]

const sortOptions: { key: SortKey; labelKey: keyof typeof t.value }[] = [
  { key: 'popular', labelKey: 'workshopSortPopular' },
  { key: 'newest', labelKey: 'workshopSortNewest' },
  { key: 'layers', labelKey: 'workshopSortLayers' },
  { key: 'time', labelKey: 'workshopSortTime' },
]

const filtered = computed(() => {
  let list = [...templates]

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter((item) =>
      item.nameZh.toLowerCase().includes(q) ||
      item.nameEn.toLowerCase().includes(q) ||
      item.tagsZh.some((tag) => tag.includes(q)) ||
      item.tagsEn.some((tag) => tag.toLowerCase().includes(q)),
    )
  }

  if (activeCategory.value !== 'all') {
    list = list.filter((item) => item.category === activeCategory.value)
  }
  if (activeDifficulty.value !== 'all') {
    list = list.filter((item) => item.difficulty === activeDifficulty.value)
  }
  if (activeStyle.value !== 'all') {
    list = list.filter((item) => item.style === activeStyle.value)
  }

  switch (sortKey.value) {
    case 'popular': list.sort((a, b) => b.plays - a.plays); break
    case 'newest': list.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0) || b.likes - a.likes); break
    case 'layers': list.sort((a, b) => a.layers - b.layers); break
    case 'time': list.sort((a, b) => a.estimatedMin - b.estimatedMin); break
  }

  return list
})

function resetFilters() {
  searchQuery.value = ''
  activeCategory.value = 'all'
  activeDifficulty.value = 'all'
  activeStyle.value = 'all'
  sortKey.value = 'popular'
}

const hasActiveFilter = computed(
  () =>
    searchQuery.value !== '' ||
    activeCategory.value !== 'all' ||
    activeDifficulty.value !== 'all' ||
    activeStyle.value !== 'all',
)

/* ── 单块玻璃 + 分段滑块高亮（无 per-control SVG 折射）──────────── */
interface SegHighlight {
  left: number
  width: number
  ready: boolean
}

function emptyHl(): SegHighlight {
  return { left: 0, width: 0, ready: false }
}

const categoryTrackRef = ref<HTMLElement | null>(null)
const difficultyTrackRef = ref<HTMLElement | null>(null)
const styleTrackRef = ref<HTMLElement | null>(null)

const catHl = ref<SegHighlight>(emptyHl())
const diffHl = ref<SegHighlight>(emptyHl())
const styleHl = ref<SegHighlight>(emptyHl())

function offsetLeftWithin(btn: HTMLElement, ancestor: HTMLElement): number {
  let left = 0
  let n: HTMLElement | null = btn
  while (n && n !== ancestor) {
    left += n.offsetLeft
    n = n.offsetParent as HTMLElement | null
  }
  return n === ancestor ? left : 0
}

function measureSeg(
  track: HTMLElement | null,
  active: string,
  dataAttr: string,
  out: Ref<SegHighlight>,
) {
  if (!track) {
    out.value = emptyHl()
    return
  }
  const btn = track.querySelector(`[${dataAttr}="${active}"]`) as HTMLElement | null
  if (!btn) {
    out.value = emptyHl()
    return
  }
  out.value = {
    left: offsetLeftWithin(btn, track),
    width: btn.offsetWidth,
    ready: true,
  }
}

function refreshSegmentHighlights() {
  measureSeg(categoryTrackRef.value, activeCategory.value, 'data-cat', catHl)
  measureSeg(difficultyTrackRef.value, activeDifficulty.value, 'data-diff', diffHl)
  measureSeg(styleTrackRef.value, activeStyle.value, 'data-style', styleHl)
}

watch(
  [activeCategory, activeDifficulty, activeStyle, () => store.locale],
  () => nextTick(refreshSegmentHighlights),
)

onMounted(() => {
  nextTick(refreshSegmentHighlights)
})

useResizeObserver(categoryTrackRef, () => nextTick(refreshSegmentHighlights))
useResizeObserver(difficultyTrackRef, () => nextTick(refreshSegmentHighlights))
useResizeObserver(styleTrackRef, () => nextTick(refreshSegmentHighlights))
</script>

<template>
  <div>
    <!-- Header -->
    <header class="mb-6">
      <p class="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">{{ t.workshop }}</p>
      <h2 class="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{{ t.chooseTemplate }}</h2>
      <p class="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{{ t.workshopBody }}</p>
    </header>

    <!-- ── 单块磨砂玻璃：内部分段滑块（Apple 式）────────────────── -->
    <div
      class="workshop-glass-panel sticky z-20"
      :class="store.theme === 'dark' ? 'workshop-glass-panel--dark' : 'workshop-glass-panel--light'"
    >
      <div class="workshop-glass-panel__inner relative z-20">
        <!-- 搜索 + 排序 -->
        <div class="flex flex-wrap items-center gap-2.5">
          <div class="workshop-glass-panel__field relative min-w-0 flex-1">
            <svg class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              v-model="searchQuery"
              type="search"
              :placeholder="t.workshopSearch"
              class="w-full border-0 bg-transparent py-2.5 pl-9 pr-3 text-sm text-slate-800 placeholder-slate-400 outline-none ring-0 focus:ring-0 dark:text-slate-100 dark:placeholder-slate-500"
            />
          </div>
          <div ref="sortDropdownRef" class="relative shrink-0">
            <button
              type="button"
              class="workshop-glass-panel__field flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700 outline-none transition dark:text-slate-200"
              @click="sortOpen = !sortOpen"
            >
              <svg class="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 7h18M6 12h12M9 17h6" />
              </svg>
              <span class="whitespace-nowrap">{{ t[sortOptions.find(o => o.key === sortKey)?.labelKey ?? 'workshopSortPopular'] }}</span>
              <svg
                class="h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200 dark:text-slate-500"
                :class="sortOpen ? 'rotate-180' : ''"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <Transition
              enter-active-class="transition duration-150 ease-out"
              enter-from-class="opacity-0 translate-y-1 scale-95"
              enter-to-class="opacity-100 translate-y-0 scale-100"
              leave-active-class="transition duration-100 ease-in"
              leave-from-class="opacity-100 translate-y-0 scale-100"
              leave-to-class="opacity-0 translate-y-1 scale-95"
            >
              <div
                v-if="sortOpen"
                class="absolute right-0 top-[calc(100%+8px)] z-30 min-w-[168px] origin-top-right rounded-2xl border border-slate-200/90 bg-white/95 py-1.5 shadow-xl backdrop-blur-2xl dark:border-slate-600/80 dark:bg-slate-900/95"
              >
                <button
                  v-for="opt in sortOptions"
                  :key="opt.key"
                  type="button"
                  class="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm transition-colors"
                  :class="
                    sortKey === opt.key
                      ? 'text-teal-700 dark:text-teal-400 bg-teal-50/80 dark:bg-teal-950/45 font-medium'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/90 dark:hover:bg-slate-800/60'
                  "
                  @click="sortKey = opt.key; sortOpen = false"
                >
                  <span
                    class="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition"
                    :class="
                      sortKey === opt.key
                        ? 'border-teal-600 dark:border-teal-400'
                        : 'border-slate-300 dark:border-slate-600'
                    "
                  >
                    <span
                      v-if="sortKey === opt.key"
                      class="h-2 w-2 rounded-full bg-teal-600 dark:bg-teal-400"
                    />
                  </span>
                  {{ t[opt.labelKey] }}
                </button>
              </div>
            </Transition>
          </div>
        </div>

        <!-- 主题：单轨道 + 滑动高亮 -->
        <div class="mt-3 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div
            ref="categoryTrackRef"
            class="workshop-seg-track relative inline-flex rounded-full p-1 ring-1 ring-inset ring-slate-900/[0.06] dark:ring-white/[0.08]"
          >
            <div
              class="workshop-seg-pill pointer-events-none absolute bottom-1 top-1 rounded-full shadow-sm transition-[left,width,opacity] duration-[380ms] ease-[cubic-bezier(0.32,0.72,0,1)] dark:shadow-[0_1px_12px_rgba(0,0,0,0.35)]"
              :style="{
                left: `${catHl.left}px`,
                width: `${catHl.width}px`,
                opacity: catHl.ready ? 1 : 0,
              }"
            />
            <div class="z-10 flex flex-nowrap gap-0.5">
              <button
                v-for="cat in categories"
                :key="cat.key"
                type="button"
                class="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-200"
                :class="
                  activeCategory === cat.key
                    ? 'text-slate-900 dark:text-white'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                "
                :data-cat="cat.key"
                @click="activeCategory = cat.key as typeof activeCategory"
              >
                {{ t[cat.labelKey] }}
              </button>
            </div>
          </div>
        </div>

        <!-- 难度 + 风格：各一条滑块轨道 -->
        <div class="mt-3 space-y-2.5">
          <div class="flex flex-wrap items-center gap-2">
            <span class="w-10 shrink-0 text-[11px] font-medium text-slate-500 dark:text-slate-400">{{ t.difficulty }}</span>
            <div class="min-w-0 flex-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div
                ref="difficultyTrackRef"
                class="workshop-seg-track relative inline-flex rounded-xl p-1 ring-1 ring-inset ring-slate-900/[0.06] dark:ring-white/[0.08]"
              >
                <div
                  class="workshop-seg-pill pointer-events-none absolute bottom-1 top-1 rounded-lg shadow-sm transition-[left,width,opacity] duration-[380ms] ease-[cubic-bezier(0.32,0.72,0,1)] dark:shadow-[0_1px_10px_rgba(0,0,0,0.35)]"
                  :style="{
                    left: `${diffHl.left}px`,
                    width: `${diffHl.width}px`,
                    opacity: diffHl.ready ? 1 : 0,
                  }"
                />
                <div class="z-10 flex flex-nowrap gap-0.5">
                  <button
                    v-for="d in difficulties"
                    :key="d.key"
                    type="button"
                    class="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors duration-200"
                    :class="
                      activeDifficulty === d.key
                        ? 'text-slate-900 dark:text-white'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    "
                    :data-diff="d.key"
                    @click="activeDifficulty = d.key as typeof activeDifficulty"
                  >
                    {{ t[d.labelKey] }}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <span class="w-10 shrink-0 text-[11px] font-medium text-slate-500 dark:text-slate-400">{{ store.locale === 'zh' ? '风格' : 'Style' }}</span>
            <div class="min-w-0 flex-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div
                ref="styleTrackRef"
                class="workshop-seg-track relative inline-flex rounded-xl p-1 ring-1 ring-inset ring-slate-900/[0.06] dark:ring-white/[0.08]"
              >
                <div
                  class="workshop-seg-pill pointer-events-none absolute bottom-1 top-1 rounded-lg shadow-sm transition-[left,width,opacity] duration-[380ms] ease-[cubic-bezier(0.32,0.72,0,1)] dark:shadow-[0_1px_10px_rgba(0,0,0,0.35)]"
                  :style="{
                    left: `${styleHl.left}px`,
                    width: `${styleHl.width}px`,
                    opacity: styleHl.ready ? 1 : 0,
                  }"
                />
                <div class="z-10 flex flex-nowrap gap-0.5">
                  <button
                    v-for="s in styles"
                    :key="s.key"
                    type="button"
                    class="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors duration-200"
                    :class="
                      activeStyle === s.key
                        ? 'text-slate-900 dark:text-white'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    "
                    :data-style="s.key"
                    @click="activeStyle = s.key as typeof activeStyle"
                  >
                    {{ t[s.labelKey] }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Result count + reset -->
    <div class="mb-4 mt-4 flex items-center justify-between">
      <p class="text-xs text-slate-500 dark:text-slate-400">
        {{ filtered.length }} {{ t.workshopResultCount }}
      </p>
      <button
        v-if="hasActiveFilter"
        type="button"
        class="text-xs text-teal-700 underline-offset-2 hover:underline dark:text-teal-400"
        @click="resetFilters"
      >
        {{ store.locale === 'zh' ? '重置筛选' : 'Reset filters' }}
      </button>
    </div>

    <!-- Template grid -->
    <div v-if="filtered.length > 0" class="container-grid content-grid">
      <TemplateCard v-for="item in filtered" :key="item.id" :item="item" />
    </div>

    <!-- Empty state -->
    <div v-else class="flex flex-col items-center justify-center py-16 text-center">
      <div class="mb-3 text-4xl">🔍</div>
      <p class="text-sm text-slate-500 dark:text-slate-400">{{ t.workshopNoResult }}</p>
      <button
        type="button"
        class="mt-4 rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:border-teal-600 hover:text-teal-700 dark:border-slate-600 dark:text-slate-300"
        @click="resetFilters"
      >
        {{ store.locale === 'zh' ? '清空筛选条件' : 'Clear all filters' }}
      </button>
    </div>

    <!-- ── My Creations / Submit section ──────────────────────────────────── -->
    <section class="mt-12 space-y-5">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 class="font-display text-xl font-semibold text-slate-900 dark:text-white">{{ t.workshopSubmitSection }}</h3>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t.workshopSubmitSectionDesc }}</p>
        </div>
        <button
          type="button"
          class="rounded-xl bg-teal-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-900 dark:bg-teal-600 dark:hover:bg-teal-500"
          @click="openSubmitForm"
        >
          {{ t.submitWorkBtn }}
        </button>
      </div>

      <!-- Works list -->
      <div class="container-grid content-grid">
        <article
          v-for="w in allWorks"
          :key="w.id"
          class="group overflow-hidden rounded-2xl border bg-white shadow-soft transition dark:bg-slate-900"
          :class="w.badge === 'mine' || (w as any).isUser
            ? 'border-teal-200 dark:border-teal-800'
            : 'border-slate-200 dark:border-slate-700'"
        >
          <!-- Color stripe -->
          <div
            class="h-1.5 w-full"
            :class="w.badge === 'featured' ? 'bg-amber-400' : w.badge === 'new' ? 'bg-teal-500' : w.badge === 'mine' || (w as any).isUser ? 'bg-violet-400' : 'bg-slate-200 dark:bg-slate-700'"
          />
          <div class="p-4 space-y-2">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-1.5 mb-1">
                  <span
                    v-if="w.badge === 'featured'"
                    class="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                  >{{ t.workshopFeatured }}</span>
                  <span
                    v-else-if="w.badge === 'new'"
                    class="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-semibold text-teal-800 dark:bg-teal-950/50 dark:text-teal-300"
                  >{{ t.workshopNew }}</span>
                  <span
                    v-else-if="w.badge === 'mine' || (w as any).isUser"
                    class="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-800 dark:bg-violet-950/50 dark:text-violet-300"
                  >{{ t.submitWorkMyBadge }}</span>
                </div>
                <h4 class="font-display text-sm font-semibold text-slate-900 dark:text-white">
                  {{ store.locale === 'zh' ? w.titleZh : w.titleEn }}
                </h4>
              </div>
              <span class="shrink-0 text-[10px] text-slate-400 dark:text-slate-500">{{ w.date }}</span>
            </div>
            <p class="line-clamp-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              {{ store.locale === 'zh' ? w.descZh : w.descEn }}
            </p>
            <div class="flex flex-wrap gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
              <span>{{ store.locale === 'zh' ? w.typeZh : w.typeEn }}</span>
              <span>·</span>
              <span>{{ store.locale === 'zh' ? w.ichZh : w.ichEn }}</span>
              <span>·</span>
              <span>{{ store.locale === 'zh' ? w.authorZh : w.authorEn }}</span>
            </div>
          </div>
        </article>
      </div>
    </section>
  </div>

  <!-- ── Submit modal ──────────────────────────────────────────────────────── -->
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showSubmitForm"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
        @click.self="closeSubmitForm"
      >
        <div class="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-slate-900">
          <div class="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <h3 class="font-display text-base font-semibold text-slate-900 dark:text-white">{{ t.submitWorkTitle }}</h3>
            <button type="button" class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" @click="closeSubmitForm">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <!-- Success state -->
          <div v-if="submitDone" class="flex flex-col items-center gap-3 px-5 py-10 text-center">
            <div class="flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-3xl dark:bg-teal-950/50">✓</div>
            <h4 class="font-display text-lg font-semibold text-teal-800 dark:text-teal-300">{{ t.submitWorkSuccess }}</h4>
            <p class="text-sm text-slate-500 dark:text-slate-400">{{ t.submitWorkToast }}</p>
            <button type="button" class="mt-2 w-full rounded-xl bg-teal-800 py-2.5 text-sm font-medium text-white dark:bg-teal-600" @click="closeSubmitForm">
              {{ store.locale === 'zh' ? '完成' : 'Done' }}
            </button>
          </div>

          <!-- Form -->
          <form v-else class="space-y-4 px-5 py-4" @submit.prevent="doSubmit">
            <div>
              <label class="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">{{ t.submitWorkNameLabel }} *</label>
              <input
                v-model="submitTitle"
                type="text"
                required
                maxlength="50"
                class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">{{ t.submitWorkDescLabel }} *</label>
              <textarea
                v-model="submitDesc"
                required
                maxlength="500"
                rows="4"
                class="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">{{ t.submitWorkTypeLabel }}</label>
                <select
                  v-model="submitType"
                  class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="">{{ store.locale === 'zh' ? '请选择' : 'Select…' }}</option>
                  <option
                    v-for="opt in t.submitWorkTypeOptions"
                    :key="opt"
                    :value="opt"
                  >{{ opt }}</option>
                </select>
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">{{ t.submitWorkIchLabel }}</label>
                <select
                  v-model="submitIch"
                  class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="">{{ store.locale === 'zh' ? '请选择' : 'Select…' }}</option>
                  <option
                    v-for="opt in t.submitWorkIchOptions"
                    :key="opt"
                    :value="opt"
                  >{{ opt }}</option>
                </select>
              </div>
            </div>
            <!-- Image upload hint (UI only) -->
            <div>
              <label class="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">{{ t.submitWorkImgLabel }}</label>
              <div class="flex h-20 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-500">
                {{ store.locale === 'zh' ? '（原型演示：上传功能仅作界面示意）' : '(Demo: upload is UI-only)' }}
              </div>
            </div>
            <div class="flex gap-3 pt-1">
              <button type="button" class="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300" @click="closeSubmitForm">
                {{ store.locale === 'zh' ? '取消' : 'Cancel' }}
              </button>
              <button
                type="submit"
                class="flex-1 rounded-xl py-2.5 text-sm font-medium text-white transition"
                :class="submitLoading ? 'bg-teal-600 cursor-wait' : 'bg-teal-800 hover:bg-teal-900 dark:bg-teal-600'"
                :disabled="submitLoading"
              >
                <span v-if="submitLoading" class="flex items-center justify-center gap-2">
                  <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                  {{ store.locale === 'zh' ? '提交中…' : 'Submitting…' }}
                </span>
                <span v-else>{{ t.submitWorkSubmitBtn }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- ── Submit toast ──────────────────────────────────────────────────────── -->
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-2"
    >
      <div
        v-if="toastVisible"
        class="fixed bottom-6 right-4 z-[100] max-w-xs rounded-2xl border border-teal-200 bg-white px-4 py-3 shadow-lg dark:border-teal-800 dark:bg-slate-900"
      >
        <p class="text-sm font-medium text-teal-800 dark:text-teal-300">✓ {{ t.submitWorkToast }}</p>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* 单块吸顶磨砂玻璃（整块容器折射一次背景，内部分段滑块） */
.workshop-glass-panel {
  top: 0;
  margin-left: calc(-1 * var(--space-lg));
  margin-right: calc(-1 * var(--space-lg));
  padding: 8px var(--space-lg) 12px;
  margin-bottom: 0;
}

.workshop-glass-panel__inner {
  border-radius: 22px;
  padding: 14px 14px 12px;
  -webkit-backdrop-filter: blur(28px) saturate(1.45);
  backdrop-filter: blur(28px) saturate(1.45);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.55) inset,
    0 12px 40px rgba(15, 23, 42, 0.08);
}

.workshop-glass-panel--light .workshop-glass-panel__inner {
  background: rgba(255, 255, 255, 0.52);
  border: 1px solid rgba(255, 255, 255, 0.65);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.7) inset,
    0 12px 40px rgba(15, 23, 42, 0.07);
}

.workshop-glass-panel--dark .workshop-glass-panel__inner {
  background: rgba(15, 23, 42, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.06) inset,
    0 12px 40px rgba(0, 0, 0, 0.45);
}

.workshop-glass-panel__field {
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.04);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35);
}

.workshop-glass-panel--dark .workshop-glass-panel__field {
  background: rgba(255, 255, 255, 0.06);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

/* 分段轨道槽 */
.workshop-glass-panel--light .workshop-seg-track {
  background: rgba(15, 23, 42, 0.045);
}

.workshop-glass-panel--dark .workshop-seg-track {
  background: rgba(0, 0, 0, 0.28);
}

/* 滑动选中块：亮面小 pill，无厚色边 */
.workshop-glass-panel--light .workshop-seg-pill {
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
}

.workshop-glass-panel--dark .workshop-seg-pill {
  background: rgba(255, 255, 255, 0.14);
}

@media (max-width: 1023px) {
  .workshop-glass-panel {
    top: 0;
    margin-left: calc(-1 * var(--space-md));
    margin-right: calc(-1 * var(--space-md));
    padding-left: var(--space-md);
    padding-right: var(--space-md);
  }
}
</style>
