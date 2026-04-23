<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import heroImg1 from '../../assets/picture/top/屏幕截图 2026-04-12 113044.png'
import heroImg2 from '../../assets/picture/top/屏幕截图 2026-04-12 113103.png'
import heroImg3 from '../../assets/picture/top/屏幕截图 2026-04-12 113335.png'
import {
  museumExhibitions,
  museumKnowledge,
  museumPastWorks,
  museumVideos,
} from '../../data/museum'
import { quizQuestions } from '../../data/mall'
import { useAppStore } from '../../stores/app'
import { usePointsStore, TASK_IDS } from '../../stores/points'
import VideoCard from '../../components/VideoCard.vue'

const store = useAppStore()
const pointsStore = usePointsStore()
const router = useRouter()

// ─── Quiz state machine ───────────────────────────────────────────────────────
type QuizState = 'idle' | 'running' | 'result' | 'review'
const quizState = ref<QuizState>('idle')
const currentIdx = ref(0)
const answers = ref<(number | null)[]>(Array(quizQuestions.length).fill(null))

const currentQuestion = computed(() => quizQuestions[currentIdx.value])
const isLast = computed(() => currentIdx.value === quizQuestions.length - 1)

const correctCount = computed(() =>
  answers.value.filter((a, i) => a === quizQuestions[i].answer).length,
)
const score = computed(() => Math.round((correctCount.value / quizQuestions.length) * 100))
const earnedPoints = computed(() => {
  if (score.value >= 90) return 50
  if (score.value >= 60) return 30
  return 20
})

function startQuiz() {
  answers.value = Array(quizQuestions.length).fill(null)
  currentIdx.value = 0
  quizState.value = 'running'
}
function selectAnswer(idx: number) {
  answers.value[currentIdx.value] = idx
}
function nextQuestion() {
  if (isLast.value) {
    submitQuiz()
  } else {
    currentIdx.value++
  }
}
function submitQuiz() {
  quizState.value = 'result'
  pointsStore.completeTask(TASK_IDS.QUIZ_COMPLETE)
}
function goMall() {
  router.push({ name: 'hub-mall' })
}

function progressText() {
  return store.t.quizProgress
    .replace('{cur}', String(currentIdx.value + 1))
    .replace('{total}', String(quizQuestions.length))
}

const exhibitions = computed(() =>
  museumExhibitions.map((item) => ({
    title: store.locale === 'zh' ? item.titleZh : item.titleEn,
    period: store.locale === 'zh' ? item.periodZh : item.periodEn,
    desc: store.locale === 'zh' ? item.descZh : item.descEn,
    tag: store.locale === 'zh' ? item.tagZh : item.tagEn,
  })),
)

const pastWorks = computed(() =>
  museumPastWorks.map((item) => ({
    title: store.locale === 'zh' ? item.titleZh : item.titleEn,
    year: store.locale === 'zh' ? item.yearZh : item.yearEn,
    desc: store.locale === 'zh' ? item.descZh : item.descEn,
  })),
)

const knowledge = computed(() =>
  museumKnowledge.map((item) => ({
    title: store.locale === 'zh' ? item.titleZh : item.titleEn,
    summary: store.locale === 'zh' ? item.summaryZh : item.summaryEn,
  })),
)

const videos = computed(() =>
  museumVideos.map((item) => ({
    title: store.locale === 'zh' ? item.titleZh : item.titleEn,
    duration: store.locale === 'zh' ? item.durationZh : item.durationEn,
    desc: store.locale === 'zh' ? item.descZh : item.descEn,
    poster: item.poster,
    preview: item.preview,
  })),
)

/** 博物馆 Hero 背景：末尾重复首张，用于无缝向上滚 */
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

onMounted(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduceMotion) return
  heroTimer = setInterval(() => {
    if (heroSlideIndex.value < heroStripSources.length - 1) {
      heroSlideIndex.value++
    }
  }, HERO_SLIDE_MS)
})

onUnmounted(() => {
  if (heroTimer) clearInterval(heroTimer)
})

const heroTrackTransform = computed(() => {
  const n = heroStripSources.length
  const pct = (100 / n) * heroSlideIndex.value
  return `translateY(-${pct}%)`
})
</script>

<template>
  <div class="space-y-12 lg:space-y-16">
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
          <h3 class="font-display text-xl font-semibold text-slate-900 dark:text-white">
            {{ store.t.museumLatest }}
          </h3>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {{ store.locale === 'zh' ? '策展叙事与展期，一张图读懂当前重点。' : 'Curatorial stories and dates at a glance.' }}
          </p>
        </div>
      </div>
      <div class="container-grid content-grid">
        <article
          v-for="(ex, index) in exhibitions"
          :key="index"
          class="cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft transition hover:border-teal-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-800"
        >
          <div class="relative aspect-[16/10] bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800">
            <span class="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-teal-900 shadow-sm dark:bg-slate-900/90 dark:text-teal-200">
              {{ ex.tag }}
            </span>
          </div>
          <div class="p-4">
            <p class="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {{ ex.period }}
            </p>
            <h4 class="font-display mt-1 text-base font-semibold leading-snug text-slate-900 dark:text-white">
              {{ ex.title }}
            </h4>
            <p class="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              {{ ex.desc }}
            </p>
          </div>
        </article>
      </div>
      <div class="mt-4 flex justify-end">
        <button type="button" class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-500 transition hover:border-teal-300 hover:text-teal-700 dark:border-slate-700 dark:text-slate-400 dark:hover:border-teal-700 dark:hover:text-teal-400">
          {{ store.locale === 'zh' ? '更多展览 →' : 'More exhibitions →' }}
        </button>
      </div>
    </section>

    <!-- Past works -->
    <section>
      <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 class="font-display text-xl font-semibold text-slate-900 dark:text-white">
            {{ store.t.museumPast }}
          </h3>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {{ store.locale === 'zh' ? '典藏数字化与社区再创作条目，可按年代与主题筛选（示意）。' : 'Digitized holdings and community remix entries—filter by era (mock).' }}
          </p>
        </div>
      </div>
      <div class="container-grid content-grid">
        <article
          v-for="(work, index) in pastWorks"
          :key="index"
          class="cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-soft transition hover:border-teal-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-800"
        >
          <p class="text-xs font-medium text-slate-500 dark:text-slate-400">{{ work.year }}</p>
          <h4 class="font-display mt-2 text-base font-semibold leading-snug text-slate-900 dark:text-white">
            {{ work.title }}
          </h4>
          <p class="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {{ work.desc }}
          </p>
        </article>
      </div>
      <div class="mt-4 flex justify-end">
        <button type="button" class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-500 transition hover:border-teal-300 hover:text-teal-700 dark:border-slate-700 dark:text-slate-400 dark:hover:border-teal-700 dark:hover:text-teal-400">
          {{ store.locale === 'zh' ? '更多典藏 →' : 'More collections →' }}
        </button>
      </div>
    </section>

    <!-- Knowledge -->
    <section>
      <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 class="font-display text-xl font-semibold text-slate-900 dark:text-white">
            {{ store.t.museumKnowledgeTitle }}
          </h3>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ store.t.museumKnowledgeSubtitle }}</p>
        </div>
      </div>
      <div class="container-grid content-grid">
        <article
          v-for="(item, index) in knowledge"
          :key="index"
          class="cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-soft transition hover:border-teal-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-800"
        >
          <div class="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-teal-100 text-sm font-bold text-teal-900 dark:bg-teal-950 dark:text-teal-200">
            {{ index + 1 }}
          </div>
          <h4 class="font-display text-base font-semibold text-slate-900 dark:text-white">
            {{ item.title }}
          </h4>
          <p class="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {{ item.summary }}
          </p>
        </article>
      </div>
      <div class="mt-4 flex justify-end">
        <button type="button" class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-500 transition hover:border-teal-300 hover:text-teal-700 dark:border-slate-700 dark:text-slate-400 dark:hover:border-teal-700 dark:hover:text-teal-400">
          {{ store.locale === 'zh' ? '更多词条 →' : 'More entries →' }}
        </button>
      </div>
    </section>

    <!-- ── Quiz section ────────────────────────────────────────────────── -->
    <section>
      <!-- Banner / Entry point (shown when idle) -->
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-2"
        mode="out-in"
      >
        <!-- Idle banner -->
        <div
          v-if="quizState === 'idle'"
          key="banner"
          class="flex flex-col items-start gap-4 overflow-hidden rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50 px-6 py-7 shadow-soft dark:border-amber-800/30 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-amber-950/30 sm:flex-row sm:items-center"
        >
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-2xl dark:bg-amber-950/60">🏆</div>
          <div class="flex-1">
            <h3 class="font-display text-lg font-semibold text-amber-900 dark:text-amber-200">{{ store.t.quizBannerTitle }}</h3>
            <p class="mt-1 text-sm text-amber-800/70 dark:text-amber-300/70">{{ store.t.quizBannerDesc }}</p>
          </div>
          <button
            type="button"
            class="shrink-0 rounded-xl bg-amber-700 px-5 py-2.5 text-sm font-medium text-white shadow-soft transition hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500"
            @click="startQuiz"
          >
            {{ store.t.quizStart }}
          </button>
        </div>

        <!-- Running: question card -->
        <div v-else-if="quizState === 'running'" key="running" class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft dark:border-slate-700 dark:bg-slate-900">
          <!-- Progress bar -->
          <div class="h-1.5 bg-slate-100 dark:bg-slate-800">
            <div
              class="h-full bg-teal-600 transition-all duration-300"
              :style="{ width: `${((currentIdx + 1) / quizQuestions.length) * 100}%` }"
            />
          </div>
          <div class="p-6 space-y-5">
            <p class="text-xs font-medium text-slate-400 dark:text-slate-500">{{ progressText() }}</p>
            <h4 class="font-display text-lg font-semibold leading-snug text-slate-900 dark:text-white">
              {{ store.locale === 'zh' ? currentQuestion.questionZh : currentQuestion.questionEn }}
            </h4>
            <!-- Options -->
            <div class="space-y-2.5">
              <button
                v-for="(opt, idx) in (store.locale === 'zh' ? currentQuestion.optionsZh : currentQuestion.optionsEn)"
                :key="idx"
                type="button"
                class="w-full rounded-xl border px-4 py-3 text-left text-sm transition"
                :class="answers[currentIdx] === idx
                  ? 'border-teal-500 bg-teal-50 text-teal-900 dark:border-teal-500 dark:bg-teal-950/40 dark:text-teal-100'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-teal-300 hover:bg-teal-50/40 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:border-teal-700'"
                @click="selectAnswer(idx)"
              >
                <span class="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full border text-[11px] font-bold"
                  :class="answers[currentIdx] === idx ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300 text-slate-500 dark:border-slate-600'">
                  {{ String.fromCharCode(65 + idx) }}
                </span>
                {{ opt }}
              </button>
            </div>
            <!-- Next / Submit button -->
            <button
              type="button"
              class="w-full rounded-xl py-2.5 text-sm font-medium transition"
              :class="answers[currentIdx] !== null
                ? 'bg-teal-800 text-white hover:bg-teal-900 dark:bg-teal-600 dark:hover:bg-teal-500'
                : 'cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600'"
              :disabled="answers[currentIdx] === null"
              @click="answers[currentIdx] !== null && nextQuestion()"
            >
              {{ isLast ? store.t.quizSubmit : store.t.quizNext }}
            </button>
          </div>
        </div>

        <!-- Result -->
        <div v-else-if="quizState === 'result'" key="result" class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft dark:border-slate-700 dark:bg-slate-900">
          <div class="flex flex-col items-center gap-4 px-6 py-10 text-center">
            <div class="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-orange-100 text-4xl font-bold text-amber-800 dark:from-amber-950/60 dark:to-orange-950/40 dark:text-amber-300">
              {{ score }}
            </div>
            <h3 class="font-display text-xl font-semibold text-slate-900 dark:text-white">{{ store.t.quizResultTitle }}</h3>
            <div class="flex gap-8 text-sm">
              <div class="text-center">
                <p class="text-xs text-slate-400 dark:text-slate-500">{{ store.t.quizScore }}</p>
                <p class="text-xl font-bold text-slate-800 dark:text-white">{{ score }}</p>
              </div>
              <div class="text-center">
                <p class="text-xs text-slate-400 dark:text-slate-500">{{ store.t.quizCorrectCount }}</p>
                <p class="text-xl font-bold text-slate-800 dark:text-white">{{ correctCount }} / {{ quizQuestions.length }}</p>
              </div>
              <div class="text-center">
                <p class="text-xs text-slate-400 dark:text-slate-500">{{ store.t.quizPointsEarned }}</p>
                <p class="text-xl font-bold text-teal-700 dark:text-teal-400">+{{ earnedPoints }}</p>
              </div>
            </div>
            <div class="mt-2 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                class="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 transition hover:border-teal-400 hover:text-teal-700 dark:border-slate-700 dark:text-slate-300"
                @click="quizState = 'review'"
              >
                {{ store.t.quizReview }}
              </button>
              <button
                type="button"
                class="rounded-xl bg-teal-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-900 dark:bg-teal-600"
                @click="goMall"
              >
                {{ store.t.quizGoMall }}
              </button>
              <button
                type="button"
                class="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-500 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400"
                @click="quizState = 'idle'"
              >
                {{ store.t.quizBackMuseum }}
              </button>
            </div>
          </div>
        </div>

        <!-- Review answers -->
        <div v-else-if="quizState === 'review'" key="review" class="space-y-3">
          <button
            type="button"
            class="flex items-center gap-1.5 text-sm text-teal-700 hover:text-teal-900 dark:text-teal-400 dark:hover:text-teal-200"
            @click="quizState = 'result'"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {{ store.locale === 'zh' ? '返回结果' : 'Back to results' }}
          </button>
          <div
            v-for="(q, qi) in quizQuestions"
            :key="q.id"
            class="overflow-hidden rounded-2xl border bg-white dark:bg-slate-900"
            :class="answers[qi] === q.answer ? 'border-teal-200 dark:border-teal-800' : 'border-rose-200 dark:border-rose-900/50'"
          >
            <div
              class="flex items-center gap-2 px-4 py-2.5 text-xs font-medium"
              :class="answers[qi] === q.answer
                ? 'bg-teal-50 text-teal-800 dark:bg-teal-950/30 dark:text-teal-300'
                : 'bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-300'"
            >
              <svg v-if="answers[qi] === q.answer" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <svg v-else class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              {{ answers[qi] === q.answer ? store.t.quizAnswerCorrect : store.t.quizAnswerWrong }}
              — Q{{ qi + 1 }}
            </div>
            <div class="p-4 space-y-2">
              <p class="text-sm font-medium text-slate-800 dark:text-slate-200">
                {{ store.locale === 'zh' ? q.questionZh : q.questionEn }}
              </p>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                <span class="font-medium">{{ store.t.quizExplanation }}: </span>
                {{ store.locale === 'zh' ? q.explanationZh : q.explanationEn }}
              </p>
            </div>
          </div>
        </div>
      </Transition>
    </section>

    <!-- Videos -->
    <section>
      <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 class="font-display text-xl font-semibold text-slate-900 dark:text-white">
            {{ store.t.museumVideosTitle }}
          </h3>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ store.t.museumVideosSubtitle }}</p>
        </div>
      </div>
      <div class="container-grid content-grid">
        <VideoCard
          v-for="(vid, index) in videos"
          :key="index"
          :title="vid.title"
          :duration="vid.duration"
          :desc="vid.desc"
          :poster="vid.poster"
          :preview="vid.preview"
          :watch-label="store.t.museumWatch"
        />
      </div>
      <div class="mt-4 flex justify-end">
        <button type="button" class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-500 transition hover:border-teal-300 hover:text-teal-700 dark:border-slate-700 dark:text-slate-400 dark:hover:border-teal-700 dark:hover:text-teal-400">
          {{ store.locale === 'zh' ? '更多视频 →' : 'More videos →' }}
        </button>
      </div>
    </section>
  </div>
</template>
