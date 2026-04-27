<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '../../stores/app'
import { useQuizStore } from '../../stores/quiz'
import { usePointsStore, TASK_IDS } from '../../stores/points'
import {
  friends,
  rooms,
  chatChannels as chatChannelsSeed,
  chatMessages,
  type FriendStatus,
  type FriendRegion,
  type ChatChannel,
  type FriendItem,
} from '../../data/social'
import type { LeaderboardScope } from '../../stores/quiz'
import { quizQuestions } from '../../data/mall'
import { difficultyColor, difficultyLabel } from '../../data/content'
import QuizTimerRing from '../../components/quiz/QuizTimerRing.vue'
import ChatSwipeChannelRow from '../../components/chat/ChatSwipeChannelRow.vue'

const store = useAppStore()
const quizStore = useQuizStore()
const pointsStore = usePointsStore()
const route = useRoute()

const t = computed(() => store.t)

// ─── Tab state ───────────────────────────────────────────────────────────────
type Tab = 'collab' | 'quiz' | 'chat'
const activeTab = ref<Tab>('collab')

// Watch query param for direct navigation (e.g. from MuseumView banner)
watch(
  () => route.query.tab,
  (val) => {
    if (val === 'quiz') activeTab.value = 'quiz'
    else if (val === 'chat') activeTab.value = 'chat'
    else activeTab.value = 'collab'
  },
  { immediate: true },
)

// ─── Collaboration Tab ───────────────────────────────────────────────────────
const onlineFriends = computed(() => friends.filter((f) => f.status !== 'offline'))
const offlineFriends = computed(() => friends.filter((f) => f.status === 'offline'))

const statusMeta: Record<FriendStatus, { labelKey: 'socialCarving' | 'socialMuseum' | 'socialIdle' | 'socialOffline'; color: string }> = {
  carving: { labelKey: 'socialCarving', color: 'bg-teal-500' },
  museum: { labelKey: 'socialMuseum', color: 'bg-sky-500' },
  idle: { labelKey: 'socialIdle', color: 'bg-amber-400' },
  offline: { labelKey: 'socialOffline', color: 'bg-slate-300 dark:bg-slate-600' },
}

const roomStatusMeta = {
  active: { labelKey: 'socialActive' as const, color: 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/50' },
  waiting: { labelKey: 'socialWaiting' as const, color: 'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/50' },
  full: { labelKey: 'socialFull' as const, color: 'text-slate-600 bg-slate-100 dark:text-slate-300 dark:bg-slate-800' },
}

function levelColor(level: number) {
  if (level >= 60) return 'text-rose-600 dark:text-rose-400'
  if (level >= 40) return 'text-amber-600 dark:text-amber-400'
  if (level >= 25) return 'text-sky-600 dark:text-sky-400'
  return 'text-slate-500 dark:text-slate-400'
}

// ─── Quiz Tab ────────────────────────────────────────────────────────────────
// Sub-states: 'list' | 'running' | 'result' | 'review' | 'leaderboard'
const quizSubPhase = ref<'list' | 'running' | 'result' | 'review' | 'leaderboard'>('list')
const quizMode = ref<'daily' | 'quick'>('daily')

// Running state
const localQuestions = ref<typeof quizQuestions>([])
const localOrder = ref<number[]>([])
const localIdx = ref(0)
const localAnswers = ref<(number | null)[]>([])
const localCombo = ref(0)
const localMaxCombo = ref(0)
const localScore = ref(0)
const localCorrect = ref(0)
const localTimeLeft = ref(0)
const localQuestionTimeLeft = ref(0)
const localQuestionTotal = ref(0)
const localElapsed = ref(0)
const localFocusLost = ref(0)
/** Per-question countdown anchor — reset on each new question */
const questionTimerStart = ref(0)
let timerHandle: ReturnType<typeof setInterval> | null = null
let questionTimerHandle: ReturnType<typeof setInterval> | null = null

const lbPeriod = ref<'today' | 'week' | 'allTime'>('today')
const lbScope = ref<LeaderboardScope>('global')
const lbRegion = ref<FriendRegion>('huadong')

onMounted(() => {
  quizStore.checkDailyReset()
  quizStore.generateLeaderboard(lbPeriod.value, lbScope.value, lbRegion.value)
})

watch([lbPeriod, lbScope, lbRegion], () => {
  quizStore.generateLeaderboard(lbPeriod.value, lbScope.value, lbRegion.value)
})

onBeforeUnmount(() => {
  clearAllTimers()
})

// Derived
const currentQ = computed(() => {
  if (localOrder.value.length === 0) return null
  const idx = localOrder.value[localIdx.value]
  return localQuestions.value[idx] ?? null
})
const isLastQ = computed(() => localIdx.value === localOrder.value.length - 1)
const questionCount = computed(() => localOrder.value.length)
const dailyDone = computed(() => quizStore.dailyAttemptedToday)

const leaderboard = computed(() => quizStore.leaderboard)
const myRank = computed(() => leaderboard.value.find((e) => e.userId === 'me')?.rank ?? 0)
const quizStats = computed(() => ({
  totalQuestions: quizStore.totalQuestionsAnswered,
  accuracy: quizStore.accuracy,
  streak: quizStore.streakDays,
}))

// Quiz methods
function shuffle<T>(arr: T[]): T[] {
  const s = [...arr]
  for (let i = s.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[s[i], s[j]] = [s[j], s[i]]
  }
  return s
}

function startQuiz(mode: 'daily' | 'quick') {
  quizMode.value = mode
  const count = mode === 'daily' ? 20 : 20
  const selected = shuffle(quizQuestions).slice(0, count)
  const timeTotal = mode === 'daily' ? 300 : 180 // 5 min daily, 3 min quick
  const perQuestionTime = mode === 'daily' ? 15 : 9

  localQuestions.value = selected.map((q) => {
    const indices = q.optionsZh.map((_, i) => i)
    const shuffledIdx = shuffle(indices)
    return {
      ...q,
      optionsZh: shuffledIdx.map((i) => q.optionsZh[i]),
      optionsEn: shuffledIdx.map((i) => q.optionsEn[i]),
      answer: shuffledIdx.indexOf(q.answer),
    }
  }) as any

  localOrder.value = localQuestions.value.map((_, i) => i)
  localIdx.value = 0
  localAnswers.value = Array(count).fill(null)
  localCombo.value = 0
  localMaxCombo.value = 0
  localScore.value = 0
  localCorrect.value = 0
  localElapsed.value = 0
  localTimeLeft.value = timeTotal
  localQuestionTimeLeft.value = perQuestionTime
  localQuestionTotal.value = perQuestionTime
  localFocusLost.value = 0
  quizSubPhase.value = 'running'

  quizStore.startFocusTracking()

  const start = Date.now()
  questionTimerStart.value = Date.now()

  timerHandle = setInterval(() => {
    const elapsed = Math.ceil((Date.now() - start) / 1000)
    localTimeLeft.value = Math.max(0, timeTotal - elapsed)
    localElapsed.value = elapsed
    if (localTimeLeft.value <= 0) finishQuiz()
  }, 200)

  questionTimerHandle = setInterval(() => {
    const qElapsed = Math.ceil((Date.now() - questionTimerStart.value) / 1000)
    localQuestionTimeLeft.value = Math.max(0, perQuestionTime - qElapsed)
    if (localQuestionTimeLeft.value <= 0) {
      // Auto-skip: record as wrong
      if (localAnswers.value[localIdx.value] === null) {
        localAnswers.value[localIdx.value] = -1 // mark as timeout
        localCombo.value = 0
      }
      if (isLastQ.value) {
        finishQuiz()
      } else {
        localIdx.value++
        questionTimerStart.value = Date.now()
        localQuestionTimeLeft.value = perQuestionTime
      }
    }
  }, 200)
}

function selectAnswer(oi: number) {
  if (quizSubPhase.value !== 'running') return
  if (localAnswers.value[localIdx.value] !== null) return
  localAnswers.value[localIdx.value] = oi

  const q = currentQ.value
  if (q) {
    if (q.answer === oi) {
      localCombo.value++
      if (localCombo.value > localMaxCombo.value) localMaxCombo.value = localCombo.value
    } else {
      localCombo.value = 0
    }
  }

  setTimeout(() => {
    if (isLastQ.value) {
      finishQuiz()
    } else {
      localIdx.value++
      questionTimerStart.value = Date.now()
      localQuestionTimeLeft.value = localQuestionTotal.value
    }
  }, 400)
}

function finishQuiz() {
  clearAllTimers()
  quizStore.stopFocusTracking()
  localFocusLost.value = quizStore.focusLossCount
  quizSubPhase.value = 'result'

  let correct = 0
  localAnswers.value.forEach((ans, i) => {
    const qIdx = localOrder.value[i]
    if (qIdx !== undefined && localQuestions.value[qIdx]) {
      if (ans === localQuestions.value[qIdx].answer) correct++
    }
  })
  localCorrect.value = correct

  const isCheating = localFocusLost.value >= 2

  if (quizMode.value === 'daily') {
    const timeBonus = Math.max(0, Math.floor((localTimeLeft.value / (quizMode.value === 'daily' ? 300 : 180)) * 30))
    localScore.value = correct * 10 + localMaxCombo.value * 5 + timeBonus
  } else {
    const timeBonus = Math.max(0, Math.floor((localTimeLeft.value / 180) * 30))
    localScore.value = correct * 10 + localMaxCombo.value * 8 + timeBonus
  }

  // Record
  quizStore.records.push({
    mode: quizMode.value,
    score: localScore.value,
    combo: localMaxCombo.value,
    correctCount: correct,
    totalCount: questionCount.value,
    date: new Date().toISOString(),
    focusLost: localFocusLost.value,
    duration: localElapsed.value,
  })

  quizStore.reconcileAggregatesFromRecords()

  // Check streak
  const today = new Date().toISOString().slice(0, 10)
  if (quizStore.lastQuizDate) {
    const last = new Date(quizStore.lastQuizDate)
    const current = new Date(today)
    const diffDays = Math.floor((current.getTime() - last.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 1) {
      quizStore.streakDays++
    } else if (diffDays > 1) {
      quizStore.streakDays = 1
    }
  } else {
    quizStore.streakDays = 1
  }
  quizStore.lastQuizDate = today

  if (quizMode.value === 'daily') {
    quizStore.dailyAttemptedToday = true
    if (!isCheating && localScore.value > quizStore.dailyHighScore) {
      quizStore.dailyHighScore = localScore.value
    }
    if (!isCheating && localMaxCombo.value > quizStore.dailyHighCombo) {
      quizStore.dailyHighCombo = localMaxCombo.value
    }
    if (!isCheating) pointsStore.completeTask(TASK_IDS.DAILY_QUIZ)
  } else {
    if (!isCheating && localScore.value > quizStore.quickBattleBest) {
      quizStore.quickBattleBest = localScore.value
    }
    if (!isCheating && localMaxCombo.value > quizStore.quickBattleBestCombo) {
      quizStore.quickBattleBestCombo = localMaxCombo.value
    }
    if (!isCheating) pointsStore.completeTask(TASK_IDS.QUICK_BATTLE)
  }

  quizStore.persist()
  quizStore.generateLeaderboard(lbPeriod.value, lbScope.value, lbRegion.value)
}

function clearAllTimers() {
  if (timerHandle) { clearInterval(timerHandle); timerHandle = null }
  if (questionTimerHandle) { clearInterval(questionTimerHandle); questionTimerHandle = null }
}

function backToQuizList() {
  clearAllTimers()
  quizStore.stopFocusTracking()
  quizSubPhase.value = 'list'
  quizStore.generateLeaderboard(lbPeriod.value, lbScope.value, lbRegion.value)
}

function openLeaderboardOnly() {
  quizSubPhase.value = 'leaderboard'
  quizStore.generateLeaderboard(lbPeriod.value, lbScope.value, lbRegion.value)
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ─── Chat Tab ────────────────────────────────────────────────────────────────
const selectedChannelId = ref<string | null>(null)
const chatInput = ref('')
const localMessages = ref<{ id: string; sender: string; text: string; time: string; isMe?: boolean }[]>([])

const channels = ref<ChatChannel[]>(
  chatChannelsSeed.map((c) => ({
    ...c,
    pinned: c.pinned ?? false,
    muted: c.muted ?? false,
    hidden: c.hidden ?? false,
  })),
)

function sortChannelsSubset(list: ChatChannel[]) {
  const visible = list.filter((c) => !c.hidden)
  return [...visible].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned))
}

const sortedRoomChannels = computed(() =>
  sortChannelsSubset(channels.value.filter((c) => c.type === 'room')),
)
const sortedDirectChannels = computed(() =>
  sortChannelsSubset(channels.value.filter((c) => c.type === 'direct')),
)

const friendsPanelOpen = ref(true)

function dmChannelId(friendId: string) {
  return `dm-${friendId}`
}

function openChatWithFriend(f: FriendItem) {
  const id = dmChannelId(f.id)
  let ch = channels.value.find((c) => c.id === id)
  if (!ch) {
    ch = {
      id,
      nameZh: f.nameZh,
      nameEn: f.nameEn,
      type: 'direct',
      friendId: f.id,
      unread: 0,
      lastMessageZh: '暂无消息',
      lastMessageEn: 'No messages yet',
      lastTime: '—',
      pinned: false,
      muted: false,
      hidden: false,
    }
    channels.value.push(ch)
  } else {
    ch.hidden = false
  }
  selectChannel(id)
}

const friendQuery = ref('')

function friendMatchesQuery(f: FriendItem): boolean {
  const q = friendQuery.value.trim()
  if (!q) return true
  const lower = q.toLowerCase()
  return f.nameZh.includes(q) || f.nameEn.toLowerCase().includes(lower)
}

const onlineFiltered = computed(() => onlineFriends.value.filter(friendMatchesQuery))
const offlineFiltered = computed(() => offlineFriends.value.filter(friendMatchesQuery))

const selectedChannel = computed(() =>
  channels.value.find((c) => c.id === selectedChannelId.value) ?? null,
)

const channelMessages = computed(() => {
  if (!selectedChannelId.value) return []
  return chatMessages.filter((m) => m.channelId === selectedChannelId.value)
})

function pinChannel(id: string) {
  const ch = channels.value.find((x) => x.id === id)
  if (ch) ch.pinned = !ch.pinned
}

function muteChannel(id: string) {
  const ch = channels.value.find((x) => x.id === id)
  if (ch) {
    ch.muted = !ch.muted
    if (ch.muted) ch.unread = 0
  }
}

function deleteChannelRow(id: string) {
  const ch = channels.value.find((x) => x.id === id)
  if (ch) {
    ch.hidden = true
    ch.unread = 0
  }
  if (selectedChannelId.value === id) selectedChannelId.value = null
}

function selectChannel(id: string) {
  selectedChannelId.value = id
  const ch = channels.value.find((c) => c.id === id)
  if (ch) ch.unread = 0
  localMessages.value = []
  nextTick(() => scrollToBottom())
}

function scrollToBottom() {
  nextTick(() => {
    const el = document.getElementById('chat-messages')
    if (el) el.scrollTop = el.scrollHeight
  })
}

function sendMessage() {
  const text = chatInput.value.trim()
  if (!text || !selectedChannelId.value) return
  const now = new Date()
  const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  localMessages.value.push({
    id: `local-${Date.now()}`,
    sender: 'me',
    text,
    time,
    isMe: true,
  })
  chatInput.value = ''
  scrollToBottom()
}

// ─── Leaderboard helpers ─────────────────────────────────────────────────────
function isMyEntry(entry: { userId: string }) {
  return entry.userId === 'me'
}
</script>

<template>
  <div>
    <!-- Header -->
    <header class="mb-6">
      <p class="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">{{ t.community }}</p>
      <h2 class="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{{ t.communityIntro }}</h2>
      <p class="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{{ t.communityBody }}</p>
    </header>

    <!-- Tab bar -->
    <div class="mb-6 flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 w-fit dark:border-slate-800 dark:bg-slate-900">
      <button
        v-for="tab in (['collab', 'quiz', 'chat'] as const)"
        :key="tab"
        type="button"
        class="rounded-lg px-4 py-1.5 text-sm font-medium transition"
        :class="
          activeTab === tab
            ? 'bg-white text-slate-900 shadow-soft dark:bg-slate-800 dark:text-white'
            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
        "
        @click="activeTab = tab"
      >
        {{ tab === 'collab' ? t.communityTabCollab : tab === 'quiz' ? t.communityTabQuiz : t.communityTabChat }}
      </button>
    </div>

    <!-- ══════════════════════ TAB: COLLAB ══════════════════════ -->
    <div v-if="activeTab === 'collab'" class="space-y-6">
      <!-- Rooms -->
      <div>
        <div class="mb-3 flex items-center justify-between">
          <p class="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{{ t.socialRoomsTab }} · {{ rooms.length }}</p>
          <button type="button" class="rounded-xl bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 transition dark:bg-teal-600 dark:hover:bg-teal-500">
            + {{ t.socialCreateRoom }}
          </button>
        </div>
        <div class="space-y-4">
          <article
            v-for="room in rooms"
            :key="room.id"
            class="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900"
            :class="room.status === 'full' ? 'opacity-60' : ''"
          >
            <div class="mb-3 flex items-start justify-between gap-3">
              <div>
                <h4 class="font-semibold text-slate-900 dark:text-white">{{ store.locale === 'zh' ? room.nameZh : room.nameEn }}</h4>
                <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{{ store.locale === 'zh' ? '主持：' + room.hostNameZh : 'Host: ' + room.hostNameEn }}</p>
              </div>
              <span class="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium" :class="roomStatusMeta[room.status].color">{{ t[roomStatusMeta[room.status].labelKey] }}</span>
            </div>
            <div class="mb-3 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span>{{ store.locale === 'zh' ? '模板：' : 'Template: ' }}<span class="font-medium text-slate-700 dark:text-slate-200">{{ store.locale === 'zh' ? room.templateZh : room.templateEn }}</span></span>
              <span>{{ t.socialLayers }}: <span class="font-medium text-slate-700 dark:text-slate-200">{{ room.layerRange }}</span></span>
              <span>{{ t.socialMembers }}: <span class="tabular-nums font-medium text-slate-700 dark:text-slate-200">{{ room.members }}/{{ room.maxMembers }}</span></span>
              <span v-if="room.startedAgo">{{ room.startedAgo }} {{ store.locale === 'zh' ? '分钟前开始' : 'min ago' }}</span>
            </div>
            <div class="mb-4 flex flex-wrap gap-1.5">
              <span class="rounded-full px-2 py-0.5 text-[11px] font-medium" :class="difficultyColor(room.difficulty)">{{ difficultyLabel(room.difficulty, store.locale) }}</span>
              <span v-for="tag in (store.locale === 'zh' ? room.tagsZh : room.tagsEn)" :key="tag" class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">{{ tag }}</span>
            </div>
            <div class="mb-4 flex gap-1">
              <div v-for="i in room.maxMembers" :key="i" class="h-2 flex-1 rounded-full transition" :class="i <= room.members ? 'bg-teal-500' : 'bg-slate-100 dark:bg-slate-800'" />
            </div>
            <button
              type="button"
              class="w-full rounded-xl border px-4 py-2 text-sm font-medium transition"
              :class="room.status === 'full' ? 'cursor-not-allowed border-slate-200 text-slate-400 dark:border-slate-700' : 'border-teal-600 text-teal-700 hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-950/30'"
              :disabled="room.status === 'full'"
            >
              {{ room.status === 'full' ? (store.locale === 'zh' ? '已满员' : 'Room full') : t.socialJoin }}
            </button>
          </article>
        </div>
      </div>
    </div>

    <!-- ══════════════════════ TAB: QUIZ ══════════════════════ -->
    <div v-else-if="activeTab === 'quiz'">
      <!-- ── QUIZ LIST ── -->
      <div v-if="quizSubPhase === 'list'" class="space-y-6">
        <!-- Entry cards -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <!-- Daily -->
          <div
            class="overflow-hidden rounded-2xl border p-5 transition-colors"
            :class="dailyDone
              ? 'border-slate-200 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-800/30'
              : 'border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 dark:border-amber-800 dark:from-amber-950/30 dark:to-orange-950/20 hover:border-amber-400 dark:hover:border-amber-600'"
          >
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-3">
                <span class="flex size-10 items-center justify-center rounded-xl bg-amber-200 text-xl dark:bg-amber-700">⚡</span>
                <div>
                  <h4 class="font-display text-base font-semibold text-slate-800 dark:text-white">{{ t.quizModeDaily }}</h4>
                  <p class="text-xs text-slate-500 dark:text-slate-400">{{ dailyDone ? t.quizDailyAttempted : t.quizModeDailyDesc }}</p>
                </div>
              </div>
              <span v-if="dailyDone" class="flex size-6 items-center justify-center rounded-full bg-emerald-100 text-xs text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">✓</span>
            </div>
            <div v-if="!dailyDone" class="mt-4 space-y-2">
              <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span v-if="quizStore.dailyHighScore > 0">{{ t.quizBestScore }}: {{ quizStore.dailyHighScore }}</span>
                <span v-else>&nbsp;</span>
                <span class="font-mono text-amber-600 dark:text-amber-400">+30 {{ store.locale === 'zh' ? '积分' : 'pts' }}</span>
              </div>
              <button class="w-full rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600" @click="startQuiz('daily')">
                {{ t.quizStart }}
              </button>
            </div>
            <div v-else class="mt-4 space-y-2">
              <div class="flex items-center justify-between text-xs">
                <span class="text-slate-500 dark:text-slate-400">{{ t.quizBestScore }}: {{ quizStore.dailyHighScore }}</span>
                <span class="text-emerald-600 dark:text-emerald-400">#{{ quizStore.dailyRank || '-' }}</span>
              </div>
              <button
                type="button"
                class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-teal-500 hover:text-teal-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-teal-600"
                @click="openLeaderboardOnly"
              >
                {{ t.quizViewLeaderboard }}
              </button>
              <button type="button" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-400 cursor-not-allowed dark:border-slate-700 dark:bg-slate-800 dark:text-slate-600" disabled>
                {{ t.quizDailyAttempted }}
              </button>
            </div>
          </div>

          <!-- Quick -->
          <div
            class="overflow-hidden rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50 p-5 transition-colors hover:border-rose-400 dark:border-rose-800 dark:from-rose-950/30 dark:to-pink-950/20 dark:hover:border-rose-600"
          >
            <div class="flex items-center gap-3">
              <span class="flex size-10 items-center justify-center rounded-xl bg-rose-200 text-xl dark:bg-rose-700">🔥</span>
              <div>
                <h4 class="font-display text-base font-semibold text-slate-800 dark:text-white">{{ t.quizModeQuick }}</h4>
                <p class="text-xs text-slate-500 dark:text-slate-400">{{ t.quizModeQuickDesc }}</p>
              </div>
            </div>
            <div class="mt-4 space-y-2">
              <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span v-if="quizStore.quickBattleBest > 0">{{ t.quizBestScore }}: {{ quizStore.quickBattleBest }} · {{ t.quizBestCombo }} x{{ quizStore.quickBattleBestCombo }}</span>
                <span v-else>&nbsp;</span>
                <span class="font-mono text-rose-600 dark:text-rose-400">+25 {{ store.locale === 'zh' ? '积分' : 'pts' }}</span>
              </div>
              <button class="w-full rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600" @click="startQuiz('quick')">
                {{ t.quizStart }}
              </button>
            </div>
          </div>
        </div>

        <!-- Stats bar -->
        <div class="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/30">
          <div class="flex flex-wrap items-center justify-center gap-8 text-sm">
            <div class="text-center">
              <p class="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{{ t.quizStatAnswered }}</p>
              <p class="mt-1 font-mono text-xl font-bold tabular-nums text-slate-800 dark:text-slate-100">{{ quizStats.totalQuestions }}</p>
            </div>
            <div class="text-center">
              <p class="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{{ t.quizStatAccuracy }}</p>
              <p class="mt-1 font-mono text-xl font-bold tabular-nums text-slate-800 dark:text-slate-100">{{ quizStats.accuracy }}%</p>
            </div>
            <div class="text-center">
              <p class="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{{ t.quizStatStreakDays }}</p>
              <p class="mt-1 font-mono text-xl font-bold tabular-nums text-slate-800 dark:text-slate-100">{{ quizStats.streak }}</p>
            </div>
            <div class="text-center">
              <p class="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{{ t.quizStatPoints }}</p>
              <p class="mt-1 font-mono text-xl font-bold tabular-nums text-teal-700 dark:text-teal-300">{{ pointsStore.balance }}</p>
            </div>
          </div>
        </div>

        <!-- Leaderboard -->
        <div>
          <div class="mb-2 flex flex-wrap items-start justify-between gap-3">
            <h3 class="font-display text-base font-semibold text-slate-900 dark:text-white">{{ t.quizLeaderboard }}</h3>
            <div class="flex flex-wrap items-center gap-2">
              <div class="flex gap-1 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
                <button
                  v-for="p in (['today', 'week', 'allTime'] as const)"
                  :key="p"
                  type="button"
                  class="rounded-md px-2.5 py-1 text-xs font-medium transition"
                  :class="lbPeriod === p ? 'bg-white text-teal-700 shadow-sm dark:bg-slate-700 dark:text-teal-300' : 'text-slate-500 dark:text-slate-400'"
                  @click="lbPeriod = p"
                >
                  {{ p === 'today' ? t.quizLeaderboardToday : p === 'week' ? t.quizLeaderboardWeek : t.quizLeaderboardAllTime }}
                </button>
              </div>
              <div class="flex gap-1 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
                <button
                  v-for="s in (['global', 'friends', 'region'] as const)"
                  :key="s"
                  type="button"
                  class="rounded-md px-2 py-1 text-[11px] font-medium transition"
                  :class="lbScope === s ? 'bg-white text-teal-700 shadow-sm dark:bg-slate-700 dark:text-teal-300' : 'text-slate-500 dark:text-slate-400'"
                  @click="lbScope = s"
                >
                  {{ s === 'global' ? t.quizLbScopeGlobal : s === 'friends' ? t.quizLbScopeFriends : t.quizLbScopeRegion }}
                </button>
              </div>
            </div>
          </div>
          <p class="mb-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{{ t.quizLeaderboardExplain }}</p>
          <div v-if="lbScope === 'region'" class="mb-3 flex flex-wrap gap-1">
            <button
              v-for="reg in (['huadong', 'huanan', 'huabei', 'xinan'] as const)"
              :key="reg"
              type="button"
              class="rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition"
              :class="lbRegion === reg ? 'border-teal-500 bg-teal-50 text-teal-800 dark:border-teal-600 dark:bg-teal-950/40 dark:text-teal-200' : 'border-slate-200 text-slate-600 hover:border-teal-300 dark:border-slate-600 dark:text-slate-400'"
              @click="lbRegion = reg"
            >
              {{ reg === 'huadong' ? t.quizLbRegionHuadong : reg === 'huanan' ? t.quizLbRegionHuanan : reg === 'huabei' ? t.quizLbRegionHuabei : t.quizLbRegionXinan }}
            </button>
          </div>

          <div v-if="leaderboard.length > 0" class="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
            <div class="flex border-b border-slate-100 bg-slate-50 px-4 py-2 text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-400">
              <span class="w-8 shrink-0 text-center">{{ t.quizLeaderboardRank }}</span>
              <span class="w-10 shrink-0" />
              <span class="min-w-0 flex-1">{{ t.quizLeaderboardName }}</span>
              <span class="w-14 shrink-0 text-right">{{ t.quizLbColScore }}</span>
              <span class="hidden w-14 shrink-0 text-right sm:inline">{{ t.quizLbColTime }}</span>
            </div>
            <div
              v-for="entry in leaderboard.slice(0, 10)"
              :key="`${entry.userId}-${entry.rank}`"
              class="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5 text-sm last:border-b-0 transition-colors dark:border-slate-800 sm:gap-3"
              :class="isMyEntry(entry) ? 'bg-teal-50/70 dark:bg-teal-950/20' : ''"
            >
              <span class="w-8 shrink-0 text-center font-mono text-xs font-semibold tabular-nums" :class="entry.rank <= 3 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-600'">
                {{ entry.rank <= 3 ? ['🥇','🥈','🥉'][entry.rank - 1] : entry.rank }}
              </span>
              <div
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                :style="{ backgroundColor: entry.avatarColor }"
              >
                {{ entry.initials }}
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate font-medium text-slate-900 dark:text-white">
                  {{ store.locale === 'zh' ? entry.nameZh : entry.nameEn }}
                </p>
                <p class="truncate text-[11px] text-slate-400 dark:text-slate-600">{{ t.quizLbColCombo }} x{{ entry.combo }}</p>
              </div>
              <div class="w-14 shrink-0 text-right">
                <p class="font-mono text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-200">{{ entry.score }}</p>
              </div>
              <div class="hidden w-14 shrink-0 text-right sm:block">
                <p class="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">{{ formatTime(entry.duration) }}</p>
              </div>
            </div>
          </div>
          <div v-else class="rounded-2xl border border-dashed border-slate-200 p-8 text-center dark:border-slate-800">
            <p class="text-sm text-slate-400 dark:text-slate-600">{{ t.quizEmptyLeaderboard }}</p>
          </div>
        </div>

        <!-- My rank badge -->
        <div v-if="myRank > 0 && myRank > 10" class="sticky bottom-0 mt-4 rounded-2xl border-2 border-teal-200 bg-white px-5 py-3 dark:border-teal-800 dark:bg-slate-900">
          <p class="text-xs text-slate-500 dark:text-slate-400">{{ store.locale === 'zh' ? '我的排名' : 'My rank' }} <span class="font-semibold text-teal-700 dark:text-teal-300">#{{ myRank }}</span></p>
        </div>
      </div>

      <!-- ── QUIZ RUNNING ── -->
      <div v-else-if="quizSubPhase === 'running' && currentQ" class="mx-auto max-w-lg space-y-4">
        <!-- Timer bar -->
        <div class="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-3 dark:border-slate-800 dark:bg-slate-900">
          <div class="flex items-center gap-3">
            <QuizTimerRing
              :remaining="localTimeLeft"
              :total="quizMode === 'daily' ? 300 : 180"
            />
            <div>
              <p class="text-xs text-slate-500 dark:text-slate-400">{{ t.quizTimer }}</p>
              <p class="font-mono text-lg font-semibold tabular-nums" :class="localTimeLeft <= 30 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'">{{ formatTime(localTimeLeft) }}</p>
            </div>
          </div>
          <div class="flex items-center gap-4 text-right">
            <div>
              <p class="text-xs text-slate-400 dark:text-slate-600">{{ t.quizCombo }}</p>
              <p class="font-mono text-lg font-semibold tabular-nums" :class="localCombo >= 5 ? 'text-orange-500 dark:text-orange-400' : 'text-slate-500 dark:text-slate-400'">x{{ localCombo }}</p>
            </div>
            <div>
              <p class="text-xs text-slate-400 dark:text-slate-600">{{ t.quizProgress.replace('{cur}', String(localIdx + 1)).replace('{total}', String(questionCount)) }}</p>
              <!-- Question timer -->
              <div class="mt-0.5 h-1.5 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  class="h-full rounded-full transition-[width] duration-200"
                  :class="localQuestionTimeLeft <= 3 ? 'bg-rose-500' : 'bg-teal-500'"
                  :style="{ width: ((localQuestionTimeLeft / localQuestionTotal) * 100) + '%' }"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Question card -->
        <div class="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h3 class="text-lg font-semibold leading-relaxed text-slate-900 dark:text-white">{{ store.locale === 'zh' ? currentQ.questionZh : currentQ.questionEn }}</h3>
          <div class="mt-5 space-y-2.5">
            <button
              v-for="(opt, oi) in store.locale === 'zh' ? currentQ.optionsZh : currentQ.optionsEn"
              :key="oi"
              type="button"
              class="w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all"
              :class="
                localAnswers[localIdx] === null
                  ? 'border-slate-200 text-slate-700 hover:border-teal-400 hover:bg-teal-50/50 dark:border-slate-700 dark:text-slate-300 dark:hover:border-teal-600 dark:hover:bg-teal-950/30'
                  : localAnswers[localIdx] === oi
                    ? (oi === currentQ.answer
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:border-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300'
                        : 'border-rose-500 bg-rose-50 text-rose-800 dark:border-rose-600 dark:bg-rose-950/30 dark:text-rose-300')
                    : oi === currentQ.answer
                      ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20'
                      : 'border-slate-100 text-slate-400 dark:border-slate-700 dark:text-slate-600'
              "
              :disabled="localAnswers[localIdx] !== null"
              @click="selectAnswer(oi)"
            >
              <span class="mr-2 text-xs text-slate-400">{{ 'ABCD'[oi] }}.</span>{{ opt }}
            </button>
          </div>
        </div>

        <!-- Quit button -->
        <div class="text-center">
          <button class="text-xs text-slate-400 underline hover:text-slate-600 dark:text-slate-600 dark:hover:text-slate-400" @click="backToQuizList">
            {{ store.locale === 'zh' ? '退出答题' : 'Quit' }}
          </button>
        </div>
      </div>

      <!-- ── QUIZ RESULT ── -->
      <div v-else-if="quizSubPhase === 'result'" class="mx-auto max-w-sm space-y-5">
        <div class="rounded-2xl border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900">
          <span class="text-4xl">{{ localScore >= 100 ? '🏆' : localScore >= 60 ? '🎉' : '📚' }}</span>
          <h3 class="mt-3 font-display text-xl font-semibold text-slate-900 dark:text-white">{{ t.quizResultTitle }}</h3>
          <div class="mt-4 grid grid-cols-3 gap-3">
            <div class="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
              <p class="font-mono text-2xl font-bold text-teal-600 dark:text-teal-400 tabular-nums">{{ localScore }}</p>
              <p class="mt-0.5 text-[11px] text-slate-400 dark:text-slate-600">{{ t.quizTotalScore }}</p>
            </div>
            <div class="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
              <p class="font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{{ localCorrect }}/{{ questionCount }}</p>
              <p class="mt-0.5 text-[11px] text-slate-400 dark:text-slate-600">{{ t.quizCorrectCount }}</p>
            </div>
            <div class="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
              <p class="font-mono text-2xl font-bold text-orange-500 dark:text-orange-400 tabular-nums">x{{ localMaxCombo }}</p>
              <p class="mt-0.5 text-[11px] text-slate-400 dark:text-slate-600">{{ t.quizComboMax }}</p>
            </div>
          </div>
          <p class="mt-3 font-mono text-xs text-slate-400">{{ t.quizElapsed }}: {{ formatTime(localElapsed) }}</p>
          <p v-if="localFocusLost >= 2" class="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:bg-rose-950/30 dark:text-rose-400">
            {{ store.locale === 'zh' ? '检测到切屏行为，本次成绩不计入排名' : 'Tab switching detected, score excluded from leaderboard' }}
          </p>
          <div class="mt-5 flex gap-3">
            <button class="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" @click="backToQuizList">
              {{ t.quizPlayAgain }}
            </button>
            <button class="flex-1 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500" @click="quizSubPhase = 'leaderboard'">
              {{ t.quizLeaderboard }}
            </button>
          </div>
        </div>
      </div>

      <!-- ── QUIZ LEADERBOARD FULL ── -->
      <div v-else-if="quizSubPhase === 'leaderboard'" class="mx-auto max-w-lg space-y-4">
        <div class="mb-3 flex flex-wrap items-center gap-3">
          <button type="button" class="rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-500 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-200" @click="backToQuizList">
            ← {{ t.quizBackModes }}
          </button>
          <span class="text-xs text-slate-400">{{ t.quizLeaderboard }}</span>
        </div>
        <p class="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{{ t.quizLeaderboardExplain }}</p>
        <div class="flex flex-wrap gap-2">
          <div class="flex gap-1 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
            <button
              v-for="p in (['today', 'week', 'allTime'] as const)"
              :key="p"
              type="button"
              class="rounded-md px-2.5 py-1 text-xs font-medium transition"
              :class="lbPeriod === p ? 'bg-white text-teal-700 shadow-sm dark:bg-slate-700 dark:text-teal-300' : 'text-slate-500 dark:text-slate-400'"
              @click="lbPeriod = p"
            >
              {{ p === 'today' ? t.quizLeaderboardToday : p === 'week' ? t.quizLeaderboardWeek : t.quizLeaderboardAllTime }}
            </button>
          </div>
          <div class="flex gap-1 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
            <button
              v-for="s in (['global', 'friends', 'region'] as const)"
              :key="s"
              type="button"
              class="rounded-md px-2 py-1 text-[11px] font-medium transition"
              :class="lbScope === s ? 'bg-white text-teal-700 shadow-sm dark:bg-slate-700 dark:text-teal-300' : 'text-slate-500 dark:text-slate-400'"
              @click="lbScope = s"
            >
              {{ s === 'global' ? t.quizLbScopeGlobal : s === 'friends' ? t.quizLbScopeFriends : t.quizLbScopeRegion }}
            </button>
          </div>
        </div>
        <div v-if="lbScope === 'region'" class="flex flex-wrap gap-1">
          <button
            v-for="reg in (['huadong', 'huanan', 'huabei', 'xinan'] as const)"
            :key="reg"
            type="button"
            class="rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition"
            :class="lbRegion === reg ? 'border-teal-500 bg-teal-50 text-teal-800 dark:border-teal-600 dark:bg-teal-950/40 dark:text-teal-200' : 'border-slate-200 text-slate-600 dark:border-slate-600 dark:text-slate-400'"
            @click="lbRegion = reg"
          >
            {{ reg === 'huadong' ? t.quizLbRegionHuadong : reg === 'huanan' ? t.quizLbRegionHuanan : reg === 'huabei' ? t.quizLbRegionHuabei : t.quizLbRegionXinan }}
          </button>
        </div>
        <div v-if="leaderboard.length > 0" class="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
          <div class="flex border-b border-slate-100 bg-slate-50 px-4 py-2 text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-400">
            <span class="w-8 shrink-0 text-center">{{ t.quizLeaderboardRank }}</span>
            <span class="w-10 shrink-0" />
            <span class="min-w-0 flex-1">{{ t.quizLeaderboardName }}</span>
            <span class="w-14 shrink-0 text-right">{{ t.quizLbColScore }}</span>
            <span class="hidden w-14 shrink-0 text-right sm:inline">{{ t.quizLbColTime }}</span>
          </div>
          <div
            v-for="entry in leaderboard.slice(0, 20)"
            :key="`${entry.userId}-${entry.rank}`"
            class="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5 text-sm last:border-b-0 transition-colors dark:border-slate-800 sm:gap-3"
            :class="isMyEntry(entry) ? 'bg-teal-50/70 dark:bg-teal-950/20' : ''"
          >
            <span class="w-8 shrink-0 text-center font-mono text-xs font-semibold tabular-nums" :class="entry.rank <= 3 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-600'">
              {{ entry.rank <= 3 ? ['🥇','🥈','🥉'][entry.rank - 1] : entry.rank }}
            </span>
            <div
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
              :style="{ backgroundColor: entry.avatarColor }"
            >
              {{ entry.initials }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate font-medium text-slate-900 dark:text-white">
                {{ store.locale === 'zh' ? entry.nameZh : entry.nameEn }}
              </p>
              <p class="truncate text-[11px] text-slate-400 dark:text-slate-600">{{ t.quizLbColCombo }} x{{ entry.combo }}</p>
            </div>
            <div class="w-14 shrink-0 text-right">
              <p class="font-mono text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-200">{{ entry.score }}</p>
            </div>
            <div class="hidden w-14 shrink-0 text-right sm:block">
              <p class="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">{{ formatTime(entry.duration) }}</p>
            </div>
          </div>
        </div>
        <div v-else class="rounded-2xl border border-dashed border-slate-200 p-8 text-center dark:border-slate-800">
          <p class="text-sm text-slate-400 dark:text-slate-600">{{ t.quizEmptyLeaderboard }}</p>
        </div>
      </div>
    </div>

    <!-- ══════════════════════ TAB: CHAT ══════════════════════ -->
    <div v-else-if="activeTab === 'chat'" class="flex gap-4 h-[calc(100vh-18rem)] min-h-[400px]">
      <!-- Sidebar：联系人（类 IM）+ 左滑会话 -->
      <div class="flex w-[min(100%,21rem)] shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div class="shrink-0 border-b border-slate-100 px-2 pb-2 pt-2 dark:border-slate-800">
          <label class="sr-only" for="friend-search">{{ t.chatContactSearch }}</label>
          <div class="relative">
            <span class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
            <input
              id="friend-search"
              v-model="friendQuery"
              type="search"
              autocomplete="off"
              class="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500/30 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100 dark:placeholder:text-slate-500"
              :placeholder="t.chatContactSearch"
            />
          </div>
        </div>

        <div class="shrink-0 border-b border-slate-100 dark:border-slate-800">
          <button
            type="button"
            class="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 transition hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50"
            @click="friendsPanelOpen = !friendsPanelOpen"
          >
            <span>{{ t.chatFriendsPanel }}</span>
            <span class="font-medium normal-case text-teal-700 dark:text-teal-400">{{
              friendsPanelOpen ? t.chatFriendsCollapse : t.chatFriendsExpand
            }}</span>
          </button>
        </div>

        <div
          v-show="friendsPanelOpen"
          class="max-h-[38vh] min-h-[120px] shrink-0 overflow-y-auto border-b border-slate-100 dark:border-slate-800"
        >
          <div v-if="onlineFiltered.length" class="sticky top-0 z-[1] flex items-center justify-between bg-slate-50/95 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 backdrop-blur-sm dark:bg-slate-900/95 dark:text-slate-400">
            <span>{{ t.chatOnlineSection }}</span>
            <span class="tabular-nums text-slate-400">{{ onlineFiltered.length }}</span>
          </div>
          <div v-if="onlineFiltered.length" class="px-1.5 pb-2">
            <button
              v-for="f in onlineFiltered"
              :key="'on-' + f.id"
              type="button"
              class="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition hover:bg-slate-50 active:bg-slate-100 dark:hover:bg-slate-800/70 dark:active:bg-slate-800"
              @click="openChatWithFriend(f)"
            >
              <span class="relative shrink-0">
                <span class="flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white shadow-inner" :style="{ backgroundColor: f.avatarColor }">{{ f.initials }}</span>
                <span class="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900" :class="statusMeta[f.status].color" />
              </span>
              <div class="min-w-0 flex-1">
                <div class="flex items-baseline justify-between gap-2">
                  <span class="truncate font-medium text-slate-900 dark:text-white">{{ store.locale === 'zh' ? f.nameZh : f.nameEn }}</span>
                  <span class="shrink-0 text-[11px] font-semibold tabular-nums" :class="levelColor(f.level)">Lv.{{ f.level }}</span>
                </div>
                <p class="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{{ t[statusMeta[f.status].labelKey] }}</p>
                <p v-if="f.currentTemplateZh || f.currentTemplateEn" class="mt-0.5 truncate text-[11px] text-teal-600 dark:text-teal-400/90">
                  {{ store.locale === 'zh' ? f.currentTemplateZh : f.currentTemplateEn }}
                </p>
              </div>
            </button>
          </div>

          <div v-if="offlineFiltered.length" class="sticky top-0 z-[1] flex items-center justify-between bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:bg-slate-900 dark:text-slate-500">
            <span>{{ t.chatOfflineSection }}</span>
            <span class="tabular-nums">{{ offlineFiltered.length }}</span>
          </div>
          <div v-if="offlineFiltered.length" class="px-1.5 pb-3">
            <button
              v-for="f in offlineFiltered"
              :key="'off-' + f.id"
              type="button"
              class="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left opacity-80 transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
              @click="openChatWithFriend(f)"
            >
              <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white opacity-75" :style="{ backgroundColor: f.avatarColor }">{{ f.initials }}</span>
              <div class="min-w-0 flex-1">
                <div class="flex items-baseline justify-between gap-2">
                  <span class="truncate font-medium text-slate-600 dark:text-slate-300">{{ store.locale === 'zh' ? f.nameZh : f.nameEn }}</span>
                  <span class="shrink-0 text-[10px] text-slate-400">{{ t.socialOffline }}</span>
                </div>
                <p class="mt-0.5 truncate text-xs text-slate-400 dark:text-slate-500">{{ store.locale === 'zh' ? f.specialtyZh : f.specialtyEn }}</p>
              </div>
            </button>
          </div>
          <p v-if="!onlineFiltered.length && !offlineFiltered.length" class="px-4 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
            {{ store.locale === 'zh' ? '无匹配联系人' : 'No matching contacts' }}
          </p>
        </div>

        <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
          <p class="shrink-0 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{{ store.locale === 'zh' ? '会话' : 'Chats' }}</p>
          <div class="min-h-0 flex-1 space-y-3 overflow-y-auto px-1.5 pb-2">
            <div v-if="sortedRoomChannels.length">
              <p class="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{{ t.chatSectionRooms }}</p>
              <div class="space-y-1">
                <ChatSwipeChannelRow
                  v-for="ch in sortedRoomChannels"
                  :key="ch.id"
                  :title="store.locale === 'zh' ? ch.nameZh : ch.nameEn"
                  :selected="selectedChannelId === ch.id"
                  :pinned="!!ch.pinned"
                  :muted="!!ch.muted"
                  :unread="ch.unread"
                  :type-room="true"
                  :labels="{
                    pin: t.chatPin,
                    unpin: t.chatUnpin,
                    del: t.chatDelete,
                    hintPin: t.chatSwipeHintPin,
                    hintDel: t.chatSwipeHintDel,
                  }"
                  @select="selectChannel(ch.id)"
                  @pin="pinChannel(ch.id)"
                  @delete="deleteChannelRow(ch.id)"
                />
              </div>
            </div>
            <div v-if="sortedDirectChannels.length">
              <p class="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{{ t.chatSectionDirects }}</p>
              <div class="space-y-1">
                <ChatSwipeChannelRow
                  v-for="ch in sortedDirectChannels"
                  :key="ch.id"
                  :title="store.locale === 'zh' ? ch.nameZh : ch.nameEn"
                  :selected="selectedChannelId === ch.id"
                  :pinned="!!ch.pinned"
                  :muted="!!ch.muted"
                  :unread="ch.unread"
                  :type-room="false"
                  :labels="{
                    pin: t.chatPin,
                    unpin: t.chatUnpin,
                    del: t.chatDelete,
                    hintPin: t.chatSwipeHintPin,
                    hintDel: t.chatSwipeHintDel,
                  }"
                  @select="selectChannel(ch.id)"
                  @pin="pinChannel(ch.id)"
                  @delete="deleteChannelRow(ch.id)"
                />
              </div>
            </div>
            <p v-if="!sortedRoomChannels.length && !sortedDirectChannels.length" class="px-2 py-4 text-center text-xs text-slate-400 dark:text-slate-500">
              {{ store.locale === 'zh' ? '暂无会话' : 'No conversations' }}
            </p>
          </div>
        </div>
      </div>

      <!-- Chat area -->
      <div class="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <!-- Chat header -->
        <div v-if="selectedChannel" class="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-5">
          <div class="min-w-0 flex-1">
            <p class="flex items-center gap-2 font-medium text-slate-900 dark:text-white">
              <span class="shrink-0 text-sm opacity-70" aria-hidden="true">{{ selectedChannel.type === 'room' ? '👥' : '💬' }}</span>
              <span class="truncate">{{ store.locale === 'zh' ? selectedChannel.nameZh : selectedChannel.nameEn }}</span>
            </p>
            <p class="mt-0.5 text-xs text-slate-400 dark:text-slate-600">
              {{ store.locale === 'zh' ? selectedChannel.lastMessageZh : selectedChannel.lastMessageEn }} · {{ selectedChannel.lastTime }}
            </p>
          </div>
          <button
            type="button"
            class="shrink-0 rounded-full p-2 text-lg leading-none text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            :aria-pressed="selectedChannel.muted"
            :aria-label="selectedChannel.muted ? t.chatUnmute : t.chatMute"
            :title="selectedChannel.muted ? t.chatUnmute : t.chatMute"
            @click="muteChannel(selectedChannel.id)"
          >
            <span aria-hidden="true">{{ selectedChannel.muted ? '🔕' : '🔔' }}</span>
          </button>
        </div>

        <!-- Messages -->
        <div id="chat-messages" class="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          <div v-if="!selectedChannel" class="flex h-full items-center justify-center">
            <p class="text-sm text-slate-400 dark:text-slate-600">{{ store.locale === 'zh' ? '选择一个频道开始聊天' : 'Select a channel to start chatting' }}</p>
          </div>
          <template v-else>
            <div v-for="(m, mi) in channelMessages" :key="mi">
              <div v-if="m.sender === 'system'" class="text-center">
                <span class="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] text-slate-400 dark:bg-slate-800 dark:text-slate-600">{{ store.locale === 'zh' ? m.textZh : m.textEn }}</span>
              </div>
              <div v-else class="flex gap-2.5">
                <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" :style="{ backgroundColor: m.avatarColor }">
                  {{ m.initials }}
                </div>
                <div class="max-w-[70%]">
                  <p class="text-[10px] text-slate-400 dark:text-slate-600">{{ store.locale === 'zh' ? m.nameZh : m.nameEn }} · {{ m.time }}</p>
                  <div class="mt-0.5 rounded-2xl rounded-tl-md bg-slate-100 px-3.5 py-2 text-sm text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                    {{ store.locale === 'zh' ? m.textZh : m.textEn }}
                  </div>
                </div>
              </div>
            </div>
            <div v-for="(m, mi) in localMessages" :key="mi">
              <div class="flex gap-2.5 flex-row-reverse">
                <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white bg-teal-600">
                  {{ store.locale === 'zh' ? '我' : 'Me' }}
                </div>
                <div class="max-w-[70%]">
                  <p class="text-right text-[10px] text-slate-400 dark:text-slate-600">{{ m.sender }} · {{ m.time }}</p>
                  <div class="mt-0.5 rounded-2xl rounded-tr-md bg-teal-600 px-3.5 py-2 text-sm text-white">{{ m.text }}</div>
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- Input area -->
        <div v-if="selectedChannel" class="shrink-0 border-t border-slate-100 px-4 py-3 dark:border-slate-800">
          <form class="flex gap-2" @submit.prevent="sendMessage">
            <input
              v-model="chatInput"
              type="text"
              class="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-600"
              :placeholder="store.locale === 'zh' ? '输入消息...' : 'Type a message...'"
            />
            <button
              type="submit"
              class="rounded-xl bg-teal-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
              :disabled="!chatInput.trim()"
            >
              {{ store.locale === 'zh' ? '发送' : 'Send' }}
            </button>
          </form>
        </div>
      </div>
    </div>

  </div>
</template>
