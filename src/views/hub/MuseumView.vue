<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import heroImg1 from '../../assets/materials/images/museum/hero/museum-hero-01-v1.0.png'
import heroImg2 from '../../assets/materials/images/museum/hero/museum-hero-02-v1.0.png'
import heroImg3 from '../../assets/materials/images/museum/hero/museum-hero-03-v1.0.png'
import {
  museumExhibitions,
  museumKnowledge,
  museumPastWorks,
  museumVideos,
} from '../../data/museum'
import { useAppStore } from '../../stores/app'
import VideoCard from '../../components/VideoCard.vue'
import { resolvePublicUrl } from '../../utils/publicUrl'

const store = useAppStore()

type MuseumDetailSection = 'exhibition' | 'collection' | 'knowledge' | 'video'

type MuseumDetailPayload = {
  section: MuseumDetailSection
  title: string
  subtitle: string
  desc: string
  tag?: string
  materials: string[]
  contentBlocks: string[]
}

type VideoModalPayload = {
  title: string
  duration: string
  desc: string
  poster?: string
  preview?: string
  detail?: MuseumDetailPayload
}

function buildKnowledgeContent(title: string, summary: string, isZh: boolean): string[] {
  if (isZh) {
    return [
      `${title}并非单一物件说明，而是工艺、历史与文化语境的交叉入口。`,
      `核心摘要：${summary}`,
      '在馆藏讲解中，建议先给出一段 100-150 字的背景导读，再进入工艺细节，减少用户认知负担。',
      '知识条目正文建议按「概念来源 -> 工艺流程 -> 典型案例 -> 当代转译」四段组织，方便阅读与检索。',
      '若涉及工艺术语，请在首次出现处给出简短注释，并在文末附可折叠术语表，提升非专业用户可读性。',
      '长文排版建议每段控制在 3-5 句，段间留白大于正文行高，关键句采用浅色强调而非高饱和色块。',
      '对比信息建议使用并排卡片或时间轴，不建议在同段堆叠过多年份与名词，避免阅读压力累积。',
      '发布前请补充来源说明、版权状态与学术校核人信息，确保教育场景可追溯与可引用。',
    ]
  }
  return [
    `${title} is best treated as an entry point crossing craft, history, and cultural context.`,
    `Key summary: ${summary}`,
    'For guided reading, start with a 100-150 word overview before technical details to reduce cognitive load.',
    'Structure long-form content as: context, process, representative case, and contemporary interpretation.',
    'Add short glossary notes at first mention of technical terms, then provide a foldable glossary at the end.',
    'Keep each paragraph concise, maintain generous spacing, and highlight key lines with low-contrast accents.',
    'Use side-by-side cards or timelines for comparisons instead of stacking dense dates in one paragraph.',
    'Before publishing, include source traceability, copyright status, and reviewer metadata for reuse.',
  ]
}

function getMaterialRequirements(section: MuseumDetailSection, isZh: boolean): string[] {
  const baseZh = [
    '标题与副标题：中英文各 1 版，标题 <= 28 字，副标题 <= 60 字。',
    '导语与正文：导语 100-150 字，正文建议 800-2000 字，分 4-8 段。',
    '元数据：年代、地域、工艺流派、关键词（3-8 个）、来源/版权状态。',
    '结构化信息：时间线节点（>=3 个）+ 对比点（>=2 组）+ 延伸阅读（>=3 条）。',
  ]
  const baseEn = [
    'Title/subtitle in both languages. Title <= 28 chars, subtitle <= 60 chars.',
    'Lead paragraph (100-150 words) and body copy (800-2000 words, 4-8 sections).',
    'Metadata: era, region, craft school, keywords (3-8), source and rights status.',
    'Structured content: >=3 timeline nodes, >=2 comparison groups, >=3 references.',
  ]
  const sectionExtrasZh: Record<MuseumDetailSection, string[]> = {
    exhibition: [
      '策展说明：策展目标、观展路径、受众层级、无障碍说明。',
      '展项占位图层：主视觉占位比例 16:9，说明图占位比例 4:3（可先用线框）。',
    ],
    collection: [
      '藏品卡字段：材质、尺寸、工艺步骤、保存状态、修复记录摘要。',
      '学术引用：至少 1 条馆内记录 + 1 条外部文献编号。',
    ],
    knowledge: [
      '知识条目结构：术语定义、技术机制、争议点、学习路径建议。',
      '阅读辅助：段落锚点、小结标题、关键句标注（每屏建议 <=2 处）。',
    ],
    video: [
      '脚本框架：主题目标、分镜段落、旁白文本、知识点回顾。',
      '交互说明：播放入口文案、时长标签、关联条目跳转规则。',
    ],
  }
  const sectionExtrasEn: Record<MuseumDetailSection, string[]> = {
    exhibition: [
      'Curatorial outline: goals, route design, audience layers, accessibility notes.',
      'Placeholder visual layers: hero 16:9 and support figures 4:3 before final assets.',
    ],
    collection: [
      'Collection schema: material, dimensions, process steps, conservation status, repair notes.',
      'Scholarly references: at least one internal record and one external citation.',
    ],
    knowledge: [
      'Entry schema: definition, mechanism, debates, suggested learning path.',
      'Reading aids: anchors, section summaries, and limited key-line highlights.',
    ],
    video: [
      'Script package: topic goal, sequence outline, narration text, recap points.',
      'Interaction copy: play-entry labels, duration tags, and related-entry jumps.',
    ],
  }

  return isZh
    ? [...baseZh, ...sectionExtrasZh[section]]
    : [...baseEn, ...sectionExtrasEn[section]]
}

const detailOpen = ref(false)
const activeDetail = ref<MuseumDetailPayload | null>(null)
const detailScrollRef = ref<HTMLDivElement | null>(null)
const readerScrollRatio = ref(0)
const readerBookmarkRatio = ref<number | null>(null)

const videoModalOpen = ref(false)
const videoModalPayload = ref<VideoModalPayload | null>(null)
const videoPlayerRef = ref<HTMLVideoElement | null>(null)

const modalVideoSrc = computed(() => resolvePublicUrl(videoModalPayload.value?.preview))
const modalPosterSrc = computed(() => resolvePublicUrl(videoModalPayload.value?.poster))

const railProgressStyle = computed(() => ({
  top: `calc(${readerScrollRatio.value * 100}% - 8px)`,
}))

const railBookmarkStyle = computed(() => ({
  top: `calc(${(readerBookmarkRatio.value ?? 0) * 100}% - 10px)`,
}))

function createDetailPayload(
  section: MuseumDetailSection,
  title: string,
  subtitle: string,
  desc: string,
  tag?: string,
): MuseumDetailPayload {
  const isZh = store.locale === 'zh'
  return {
    section,
    title,
    subtitle,
    desc,
    tag,
    materials: getMaterialRequirements(section, isZh),
    contentBlocks:
      section === 'knowledge'
        ? buildKnowledgeContent(title, desc, isZh)
        : [
            desc,
            isZh
              ? '该内容位于演示框架中：当前优先验证信息结构、阅读路径与交互密度，后续再替换为正式图文素材。'
              : 'This item runs in framework mode first, validating structure and readability before final assets.',
            isZh
              ? '建议先补齐术语注释与来源链接，再逐步加入高分辨率视觉资产，避免一次性堆叠信息。'
              : 'Add glossary notes and source links first, then incrementally layer high-resolution visual assets.',
            isZh
              ? '若用于课堂或导览，请补充 2-3 个讨论问题，形成“看展 -> 提问 -> 回看”闭环。'
              : 'For class/tour usage, include 2-3 discussion prompts to complete a read-question-review loop.',
          ],
  }
}

const exhibitions = computed(() =>
  museumExhibitions.map((item) => ({
    title: store.locale === 'zh' ? item.titleZh : item.titleEn,
    period: store.locale === 'zh' ? item.periodZh : item.periodEn,
    desc: store.locale === 'zh' ? item.descZh : item.descEn,
    tag: store.locale === 'zh' ? item.tagZh : item.tagEn,
    image: item.image,
    detail: createDetailPayload(
      'exhibition',
      store.locale === 'zh' ? item.titleZh : item.titleEn,
      store.locale === 'zh' ? item.periodZh : item.periodEn,
      store.locale === 'zh' ? item.descZh : item.descEn,
      store.locale === 'zh' ? item.tagZh : item.tagEn,
    ),
  })),
)

const pastWorks = computed(() =>
  museumPastWorks.map((item) => ({
    title: store.locale === 'zh' ? item.titleZh : item.titleEn,
    year: store.locale === 'zh' ? item.yearZh : item.yearEn,
    desc: store.locale === 'zh' ? item.descZh : item.descEn,
    detail: createDetailPayload(
      'collection',
      store.locale === 'zh' ? item.titleZh : item.titleEn,
      store.locale === 'zh' ? item.yearZh : item.yearEn,
      store.locale === 'zh' ? item.descZh : item.descEn,
    ),
  })),
)

const knowledge = computed(() =>
  museumKnowledge.map((item) => ({
    title: store.locale === 'zh' ? item.titleZh : item.titleEn,
    summary: store.locale === 'zh' ? item.summaryZh : item.summaryEn,
    detail: createDetailPayload(
      'knowledge',
      store.locale === 'zh' ? item.titleZh : item.titleEn,
      store.t.museumKnowledgeSubtitle,
      store.locale === 'zh' ? item.summaryZh : item.summaryEn,
    ),
  })),
)

const videos = computed(() =>
  museumVideos.map((item) => ({
    title: store.locale === 'zh' ? item.titleZh : item.titleEn,
    duration: store.locale === 'zh' ? item.durationZh : item.durationEn,
    desc: store.locale === 'zh' ? item.descZh : item.descEn,
    poster: item.poster,
    preview: item.preview,
    detail: createDetailPayload(
      'video',
      store.locale === 'zh' ? item.titleZh : item.titleEn,
      store.locale === 'zh' ? item.durationZh : item.durationEn,
      store.locale === 'zh' ? item.descZh : item.descEn,
    ),
  })),
)

function openDetail(detail: MuseumDetailPayload) {
  activeDetail.value = detail
  detailOpen.value = true
  readerBookmarkRatio.value = null
  readerScrollRatio.value = 0
  nextTick(() => {
    if (detailScrollRef.value) detailScrollRef.value.scrollTop = 0
    updateReaderScrollRatio()
  })
}

function closeDetail() {
  detailOpen.value = false
}

function openVideoModal(payload: VideoModalPayload) {
  videoModalPayload.value = payload
  videoModalOpen.value = true
  nextTick(() => {
    void videoPlayerRef.value?.play().catch(() => {})
  })
}

function openVideoFrameworkFromModal() {
  const d = videoModalPayload.value?.detail
  if (!d) return
  closeVideoModal()
  nextTick(() => openDetail(d))
}

function closeVideoModal() {
  if (videoPlayerRef.value) {
    videoPlayerRef.value.pause()
    videoPlayerRef.value.currentTime = 0
  }
  videoModalOpen.value = false
  videoModalPayload.value = null
}

function onCardKeyOpen(e: KeyboardEvent, detail: MuseumDetailPayload) {
  if (e.key !== 'Enter' && e.key !== ' ') return
  e.preventDefault()
  openDetail(detail)
}

function updateReaderScrollRatio() {
  const el = detailScrollRef.value
  if (!el) return
  const max = el.scrollHeight - el.clientHeight
  readerScrollRatio.value = max <= 0 ? 0 : el.scrollTop / max
}

function ratioFromRailEvent(e: MouseEvent): number {
  const target = e.currentTarget as HTMLElement | null
  if (!target) return 0
  const rect = target.getBoundingClientRect()
  const raw = (e.clientY - rect.top) / rect.height
  return Math.min(1, Math.max(0, raw))
}

function scrollReaderToRatio(ratio: number) {
  const el = detailScrollRef.value
  if (!el) return
  const max = el.scrollHeight - el.clientHeight
  el.scrollTo({ top: Math.max(0, max * ratio), behavior: 'smooth' })
}

function onRailDoubleClick(e: MouseEvent) {
  const ratio = ratioFromRailEvent(e)
  if (readerBookmarkRatio.value !== null && Math.abs(readerBookmarkRatio.value - ratio) < 0.04) {
    readerBookmarkRatio.value = null
    return
  }
  readerBookmarkRatio.value = ratio
}

function onBookmarkClick() {
  if (readerBookmarkRatio.value === null) return
  scrollReaderToRatio(readerBookmarkRatio.value)
}

function clearBookmark() {
  readerBookmarkRatio.value = null
}

const heroStripSources = [heroImg1, heroImg2, heroImg3, heroImg1]
const heroSlideIndex = ref(0)
const heroSlideAnimating = ref(true)
const HERO_SLIDE_MS = 10_000
const HERO_TRANSITION_MS = 1200

let heroTimer: ReturnType<typeof setInterval> | undefined

function onHeroTransitionEnd(e: TransitionEvent) {
  if (e.propertyName !== 'transform') return
  if (heroSlideIndex.value !== heroStripSources.length - 1) return
  heroSlideAnimating.value = false
  heroSlideIndex.value = 0
  nextTick(() => {
    requestAnimationFrame(() => {
      heroSlideAnimating.value = true
    })
  })
}

const anyOverlayOpen = computed(() => detailOpen.value || videoModalOpen.value)

function onEscapeKey(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (videoModalOpen.value) {
    e.preventDefault()
    closeVideoModal()
  } else if (detailOpen.value) {
    e.preventDefault()
    closeDetail()
  }
}

watch(anyOverlayOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
  if (typeof window === 'undefined') return
  if (open) window.addEventListener('keydown', onEscapeKey)
  else window.removeEventListener('keydown', onEscapeKey)
})

onMounted(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!reduceMotion) {
    heroTimer = setInterval(() => {
      if (heroSlideIndex.value < heroStripSources.length - 1) {
        heroSlideIndex.value++
      }
    }, HERO_SLIDE_MS)
  }
})

onUnmounted(() => {
  if (heroTimer) clearInterval(heroTimer)
  document.body.style.overflow = ''
  if (typeof window !== 'undefined') window.removeEventListener('keydown', onEscapeKey)
})

const heroTrackTransform = computed(() => {
  const n = heroStripSources.length
  const pct = (100 / n) * heroSlideIndex.value
  return `translateY(-${pct}%)`
})

const cardGridClass =
  'grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-4'
</script>

<template>
  <div class="space-y-10 lg:space-y-14">
    <!-- Hero：底层竖向滚动画廊 + 上层文案 -->
    <header
      class="relative min-h-[280px] overflow-hidden rounded-3xl border border-slate-200/80 shadow-soft dark:border-slate-800 sm:min-h-[300px]"
    >
      <div class="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-3xl">
        <div
          class="flex w-full flex-col motion-reduce:transition-none"
          :class="heroSlideAnimating ? 'transition-transform' : ''"
          :style="{
            height: `${heroStripSources.length * 100}%`,
            transform: heroTrackTransform,
            transitionDuration: heroSlideAnimating ? `${HERO_TRANSITION_MS}ms` : '0ms',
            transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
          }"
          @transitionend="onHeroTransitionEnd"
        >
          <div
            v-for="(src, i) in heroStripSources"
            :key="`${i}-${src}`"
            class="relative w-full shrink-0 overflow-hidden"
            :style="{ height: `${100 / heroStripSources.length}%` }"
          >
            <img
              :src="src"
              alt=""
              class="h-full min-h-[200px] w-full object-cover"
              draggable="false"
            />
          </div>
        </div>
      </div>
      <div
        class="pointer-events-none absolute inset-0 z-[1] rounded-3xl bg-gradient-to-r from-black/32 via-black/10 to-transparent dark:from-black/38 dark:via-black/14 dark:to-transparent"
      />
      <div class="relative z-10 px-6 py-10 sm:px-10 sm:py-14">
        <p
          class="text-xs font-medium uppercase tracking-[0.2em] text-teal-100 [text-shadow:0_1px_2px_rgb(0_0_0_/_0.45)]"
        >
          {{ store.t.museum }}
        </p>
        <h2
          class="font-display mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-white [text-shadow:0_1px_3px_rgb(0_0_0_/_0.5),0_4px_20px_rgb(0_0_0_/_0.35)] sm:text-4xl"
        >
          {{ store.t.museumHeroTitle }}
        </h2>
        <p
          class="mt-3 max-w-xl font-display text-lg text-white/95 [text-shadow:0_1px_3px_rgb(0_0_0_/_0.45)]"
        >
          {{ store.t.museumHeroSubtitle }}
        </p>
        <p
          class="mt-4 max-w-2xl text-sm leading-relaxed text-white/90 [text-shadow:0_1px_2px_rgb(0_0_0_/_0.5)]"
        >
          {{ store.t.museumBody }}
        </p>
        <div class="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            class="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-medium text-white shadow-soft transition hover:bg-teal-500 dark:bg-teal-500 dark:hover:bg-teal-400"
          >
            {{ store.t.museumReserve }}
          </button>
          <button
            type="button"
            class="rounded-xl border border-white/40 bg-white/15 px-5 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition hover:border-white/60 hover:bg-white/25"
          >
            {{ store.t.museumLatest }}
          </button>
        </div>
      </div>
    </header>

    <!-- Latest exhibitions -->
    <section>
      <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 class="font-display text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {{ store.t.museumLatest }}
          </h3>
          <p class="mt-2 max-w-2xl text-[15px] leading-relaxed text-slate-500 dark:text-slate-400">
            {{ store.locale === 'zh' ? '策展叙事与展期，一张图读懂当前重点。' : 'Curatorial stories and dates at a glance.' }}
          </p>
        </div>
      </div>
      <div :class="cardGridClass">
        <article
          v-for="(ex, index) in exhibitions"
          :key="index"
          class="flex min-h-[17.5rem] cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white transition hover:border-teal-300/60 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-800/70"
          role="button"
          tabindex="0"
          @click="openDetail(ex.detail)"
          @keydown="(e) => onCardKeyOpen(e, ex.detail)"
        >
          <div
            class="relative aspect-[16/10] shrink-0 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900"
          >
            <img
              v-if="ex.image"
              :src="resolvePublicUrl(ex.image)"
              :alt="ex.title"
              class="h-full w-full object-cover"
              loading="lazy"
              draggable="false"
            />
            <span
              class="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-teal-900 shadow-sm dark:bg-slate-900/95 dark:text-teal-200"
            >
              {{ ex.tag }}
            </span>
          </div>
          <div class="flex flex-1 flex-col p-4">
            <p class="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {{ ex.period }}
            </p>
            <h4
              class="font-display mt-2 line-clamp-2 min-h-[2.75rem] text-base font-semibold leading-snug text-slate-900 dark:text-white"
            >
              {{ ex.title }}
            </h4>
            <p class="mt-2 line-clamp-3 flex-1 text-[15px] leading-relaxed text-slate-600 dark:text-slate-400">
              {{ ex.desc }}
            </p>
            <p class="mt-4 text-xs font-medium text-teal-700 dark:text-teal-400">
              {{ store.t.museumReadMore }}
            </p>
          </div>
        </article>
      </div>
      <div class="mt-6 flex justify-end">
        <button
          type="button"
          class="rounded-xl border border-slate-200/90 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-teal-300 hover:text-teal-800 dark:border-slate-700 dark:text-slate-300 dark:hover:border-teal-700 dark:hover:text-teal-300"
        >
          {{ store.locale === 'zh' ? '更多展览 →' : 'More exhibitions →' }}
        </button>
      </div>
    </section>

    <!-- Past works -->
    <section>
      <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 class="font-display text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {{ store.t.museumPast }}
          </h3>
          <p class="mt-2 max-w-2xl text-[15px] leading-relaxed text-slate-500 dark:text-slate-400">
            {{
              store.locale === 'zh'
                ? '典藏数字化与社区再创作条目，可按年代与主题筛选（示意）。'
                : 'Digitized holdings and community remix entries—filter by era (mock).'
            }}
          </p>
        </div>
      </div>
      <div :class="cardGridClass">
        <article
          v-for="(work, index) in pastWorks"
          :key="index"
          class="flex min-h-[17.5rem] cursor-pointer flex-col rounded-2xl border border-slate-200/90 bg-white p-4 transition hover:border-teal-300/60 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-800/70"
          role="button"
          tabindex="0"
          @click="openDetail(work.detail)"
          @keydown="(e) => onCardKeyOpen(e, work.detail)"
        >
          <p class="text-xs font-medium text-slate-500 dark:text-slate-400">{{ work.year }}</p>
          <h4
            class="font-display mt-2 line-clamp-2 min-h-[2.75rem] text-base font-semibold leading-snug text-slate-900 dark:text-white"
          >
            {{ work.title }}
          </h4>
          <p class="mt-2 line-clamp-3 flex-1 text-[15px] leading-relaxed text-slate-600 dark:text-slate-400">
            {{ work.desc }}
          </p>
          <p class="mt-4 text-xs font-medium text-teal-700 dark:text-teal-400">
            {{ store.t.museumReadMore }}
          </p>
        </article>
      </div>
      <div class="mt-6 flex justify-end">
        <button
          type="button"
          class="rounded-xl border border-slate-200/90 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-teal-300 hover:text-teal-800 dark:border-slate-700 dark:text-slate-300 dark:hover:border-teal-700 dark:hover:text-teal-300"
        >
          {{ store.locale === 'zh' ? '更多典藏 →' : 'More collections →' }}
        </button>
      </div>
    </section>

    <!-- Knowledge -->
    <section>
      <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 class="font-display text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {{ store.t.museumKnowledgeTitle }}
          </h3>
          <p class="mt-2 max-w-2xl text-[15px] leading-relaxed text-slate-500 dark:text-slate-400">
            {{ store.t.museumKnowledgeSubtitle }}
          </p>
        </div>
      </div>
      <div :class="cardGridClass">
        <article
          v-for="(item, index) in knowledge"
          :key="index"
          class="flex min-h-[17.5rem] cursor-pointer flex-col rounded-2xl border border-slate-200/90 bg-white p-4 transition hover:border-teal-300/60 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-800/70"
          role="button"
          tabindex="0"
          @click="openDetail(item.detail)"
          @keydown="(e) => onCardKeyOpen(e, item.detail)"
        >
          <div
            class="mb-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-sm font-bold text-teal-900 dark:bg-teal-950/80 dark:text-teal-200"
          >
            {{ index + 1 }}
          </div>
          <h4
            class="font-display line-clamp-2 min-h-[2.75rem] text-base font-semibold leading-snug text-slate-900 dark:text-white"
          >
            {{ item.title }}
          </h4>
          <p class="mt-2 line-clamp-3 flex-1 text-[15px] leading-relaxed text-slate-600 dark:text-slate-400">
            {{ item.summary }}
          </p>
          <p class="mt-4 text-xs font-medium text-teal-700 dark:text-teal-400">
            {{ store.t.museumReadMore }}
          </p>
        </article>
      </div>
      <div class="mt-6 flex justify-end">
        <button
          type="button"
          class="rounded-xl border border-slate-200/90 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-teal-300 hover:text-teal-800 dark:border-slate-700 dark:text-slate-300 dark:hover:border-teal-700 dark:hover:text-teal-300"
        >
          {{ store.locale === 'zh' ? '更多词条 →' : 'More entries →' }}
        </button>
      </div>
    </section>

    <!-- Videos -->
    <section>
      <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 class="font-display text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {{ store.t.museumVideosTitle }}
          </h3>
          <p class="mt-2 max-w-2xl text-[15px] leading-relaxed text-slate-500 dark:text-slate-400">
            {{ store.t.museumVideosSubtitle }}
          </p>
        </div>
      </div>
      <div :class="cardGridClass">
        <VideoCard
          v-for="(vid, index) in videos"
          :key="index"
          :title="vid.title"
          :duration="vid.duration"
          :desc="vid.desc"
          :poster="vid.poster"
          :preview="vid.preview"
          :watch-label="store.t.museumWatch"
          :tap-preview-hint="store.t.museumTapPreview"
          @open="
            openVideoModal({
              title: vid.title,
              duration: vid.duration,
              desc: vid.desc,
              poster: vid.poster,
              preview: vid.preview,
              detail: vid.detail,
            })
          "
        />
      </div>
      <div class="mt-6 flex justify-end">
        <button
          type="button"
          class="rounded-xl border border-slate-200/90 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-teal-300 hover:text-teal-800 dark:border-slate-700 dark:text-slate-300 dark:hover:border-teal-700 dark:hover:text-teal-300"
        >
          {{ store.locale === 'zh' ? '更多视频 →' : 'More videos →' }}
        </button>
      </div>
    </section>
  </div>

  <!-- 详情阅读：正文滚动 + 单条自定义滑轨（隐藏原生滚动条） -->
  <Teleport to="body">
    <div
      v-if="detailOpen && activeDetail"
      class="fixed inset-0 z-[70] flex items-stretch justify-end bg-slate-950/45 p-0 sm:p-4 sm:pl-8"
      role="presentation"
    >
      <button
        type="button"
        class="absolute inset-0 h-full w-full cursor-default bg-transparent"
        aria-label="close backdrop"
        @click="closeDetail"
      />
      <aside
        class="relative z-[71] flex h-full w-full max-w-3xl flex-col overflow-hidden border-l border-slate-200/90 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:my-auto sm:h-[min(92vh,880px)] sm:rounded-3xl sm:border"
      >
        <header class="shrink-0 border-b border-slate-200/80 px-6 py-5 dark:border-slate-800">
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0 space-y-1">
              <p class="text-[11px] font-medium uppercase tracking-[0.18em] text-teal-600 dark:text-teal-400">
                {{ activeDetail.tag || (store.locale === 'zh' ? '导读' : 'Overview') }}
              </p>
              <h3 class="font-display text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                {{ activeDetail.title }}
              </h3>
              <p class="text-sm text-slate-500 dark:text-slate-400">{{ activeDetail.subtitle }}</p>
            </div>
            <button
              type="button"
              class="shrink-0 rounded-xl border border-slate-200/90 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-teal-300 hover:text-teal-800 dark:border-slate-700 dark:text-slate-300 dark:hover:border-teal-700 dark:hover:text-teal-300"
              @click="closeDetail"
            >
              {{ store.locale === 'zh' ? '关闭' : 'Close' }}
            </button>
          </div>
        </header>

        <div class="flex min-h-0 flex-1">
          <div
            ref="detailScrollRef"
            class="museum-reader-scroll min-w-0 flex-1 overflow-y-auto px-6 py-6 text-[15px] leading-[1.85] text-slate-700 [-ms-overflow-style:none] [scrollbar-width:none] dark:text-slate-300 [&::-webkit-scrollbar]:hidden"
            @scroll="updateReaderScrollRatio"
          >
            <p class="text-lg leading-8 text-slate-800 dark:text-slate-100">
              {{ activeDetail.desc }}
            </p>

            <div class="mt-10 space-y-6">
              <p
                v-for="(block, idx) in activeDetail.contentBlocks"
                :key="idx"
                class="text-[15px] leading-[1.85] text-slate-600 dark:text-slate-400"
              >
                {{ block }}
              </p>
            </div>

            <div class="mt-12 border-t border-slate-200/80 pt-10 dark:border-slate-800">
              <h4 class="font-display text-base font-semibold text-slate-900 dark:text-white">
                {{ store.locale === 'zh' ? '素材要求（非图片/视频优先）' : 'Material checklist (non-media first)' }}
              </h4>
              <ul class="mt-5 list-none space-y-3 pb-10">
                <li
                  v-for="(m, idx) in activeDetail.materials"
                  :key="idx"
                  class="border-l-2 border-teal-400/70 pl-4 text-[15px] leading-relaxed text-slate-600 dark:border-teal-600/60 dark:text-slate-400"
                >
                  {{ m }}
                </li>
              </ul>
            </div>
          </div>

          <!-- 单轨：仅视觉轨道 + 书签，正文使用隐藏原生滚动条 -->
          <div
            class="relative hidden w-12 shrink-0 flex-col items-center border-l border-slate-200/70 py-4 dark:border-slate-800 md:flex"
          >
            <span class="text-[10px] font-medium tabular-nums text-slate-400">
              {{ Math.round(readerScrollRatio * 100) }}%
            </span>
            <div
              class="relative mt-3 min-h-0 w-2.5 flex-1 rounded-full bg-slate-200/90 dark:bg-slate-700/70"
              :aria-label="store.t.museumScrollBookmarkHint"
              @dblclick.prevent="onRailDoubleClick"
            >
              <div
                class="pointer-events-none absolute left-1/2 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-white bg-teal-500 shadow-sm dark:border-slate-950"
                :style="railProgressStyle"
              />
              <button
                v-if="readerBookmarkRatio !== null"
                type="button"
                class="absolute left-1/2 z-[1] h-5 w-5 -translate-x-1/2 rounded-full border-2 border-white bg-amber-500 shadow-md transition hover:scale-105 dark:border-slate-950"
                :style="railBookmarkStyle"
                :title="store.t.museumScrollBookmarkHint"
                :aria-label="store.t.museumScrollBookmarkHint"
                @click.stop="onBookmarkClick"
                @dblclick.stop.prevent="clearBookmark"
              />
            </div>
            <p class="mt-3 max-w-[10rem] px-1 text-center text-[10px] leading-snug text-slate-400">
              {{ store.t.museumScrollBookmarkHint }}
            </p>
          </div>
        </div>
      </aside>
    </div>
  </Teleport>

  <!-- 视频弹层 -->
  <Teleport to="body">
    <div
      v-if="videoModalOpen && videoModalPayload"
      class="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      :aria-label="videoModalPayload.title"
    >
      <button
        type="button"
        class="absolute inset-0 h-full w-full cursor-default"
        aria-label="close backdrop"
        @click="closeVideoModal"
      />
      <div
        class="relative z-[81] w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200/90 bg-slate-950 shadow-2xl dark:border-slate-800"
      >
        <div class="flex items-start justify-between gap-3 border-b border-slate-800/80 px-5 py-4">
          <div class="min-w-0">
            <h3 class="truncate font-display text-lg font-semibold text-white">
              {{ videoModalPayload.title }}
            </h3>
            <p class="mt-1 text-sm text-slate-400">{{ videoModalPayload.duration }}</p>
          </div>
          <button
            type="button"
            class="shrink-0 rounded-xl border border-slate-600/80 px-3 py-1.5 text-sm font-medium text-slate-200 transition hover:border-slate-400 hover:text-white"
            @click="closeVideoModal"
          >
            {{ store.t.museumVideoClose }}
          </button>
        </div>
        <div class="bg-black px-4 pb-5 pt-4 sm:px-6">
          <video
            v-if="modalVideoSrc"
            ref="videoPlayerRef"
            :src="modalVideoSrc"
            class="aspect-video max-h-[72vh] w-full rounded-xl bg-black object-contain"
            controls
            playsinline
            preload="metadata"
          />
          <div v-else class="flex aspect-video w-full flex-col items-center justify-center rounded-xl bg-slate-900 px-6 text-center">
            <p v-if="modalPosterSrc" class="text-sm text-slate-400">
              {{ store.t.museumVideoNoPreview }}
            </p>
            <img
              v-if="modalPosterSrc"
              :src="modalPosterSrc"
              :alt="videoModalPayload.title"
              class="mt-4 max-h-48 max-w-full rounded-lg object-contain opacity-90"
            />
            <p v-else class="text-sm text-slate-400">{{ store.t.museumVideoNoPreview }}</p>
          </div>
          <p v-if="videoModalPayload.desc" class="mt-4 text-sm leading-relaxed text-slate-400">
            {{ videoModalPayload.desc }}
          </p>
          <button
            v-if="videoModalPayload.detail"
            type="button"
            class="mt-4 w-full rounded-xl border border-slate-600/80 py-2.5 text-sm font-medium text-slate-200 transition hover:border-teal-500/60 hover:text-white"
            @click="openVideoFrameworkFromModal"
          >
            {{
              store.locale === 'zh' ? '查看内容框架与素材要求' : 'Open framework & material checklist'
            }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
