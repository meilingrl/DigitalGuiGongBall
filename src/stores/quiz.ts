import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { friends, type FriendItem, type FriendRegion } from '../data/social'

export type LeaderboardScope = 'global' | 'friends' | 'region'

const MY_REGION: FriendRegion = 'huadong'

export interface QuizRecord {
  mode: 'daily' | 'quick' | 'knowledge'
  score: number
  combo: number
  correctCount: number
  totalCount: number
  date: string
  focusLost?: number
  duration?: number
}

export interface LeaderboardEntry {
  rank: number
  userId: string
  nameZh: string
  nameEn: string
  initials: string
  avatarColor: string
  score: number
  duration: number
  combo: number
  focusLost?: number
  date: string
}

function hashSeed(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) || 0
  return h >>> 0
}

export const useQuizStore = defineStore('quiz', () => {
  const stored = JSON.parse(localStorage.getItem('quiz_state') || '{}')

  const records = ref<QuizRecord[]>(stored.records || [])
  const dailyAttemptedToday = ref<boolean>(stored.dailyAttemptedToday || false)
  const dailyDateStamp = ref<string>(stored.dailyDateStamp || '')
  const dailyHighScore = ref<number>(stored.dailyHighScore || 0)
  const dailyHighCombo = ref<number>(stored.dailyHighCombo || 0)
  const dailyRank = ref<number>(stored.dailyRank || 0)
  const quickBattleBest = ref<number>(stored.quickBattleBest || 0)
  const quickBattleBestCombo = ref<number>(stored.quickBattleBestCombo || 0)
  const totalQuizzes = ref<number>(stored.totalQuizzes || 0)
  const totalCorrect = ref<number>(stored.totalCorrect || 0)
  const streakDays = ref<number>(stored.streakDays || 0)
  const lastQuizDate = ref<string>(stored.lastQuizDate || '')

  function reconcileAggregatesFromRecords() {
    totalQuizzes.value = records.value.length
    totalCorrect.value = records.value.reduce((s, r) => s + r.correctCount, 0)
  }
  reconcileAggregatesFromRecords()

  function persist() {
    reconcileAggregatesFromRecords()
    localStorage.setItem(
      'quiz_state',
      JSON.stringify({
        records: records.value,
        dailyAttemptedToday: dailyAttemptedToday.value,
        dailyDateStamp: dailyDateStamp.value,
        dailyHighScore: dailyHighScore.value,
        dailyHighCombo: dailyHighCombo.value,
        dailyRank: dailyRank.value,
        quickBattleBest: quickBattleBest.value,
        quickBattleBestCombo: quickBattleBestCombo.value,
        totalQuizzes: totalQuizzes.value,
        totalCorrect: totalCorrect.value,
        streakDays: streakDays.value,
        lastQuizDate: lastQuizDate.value,
      }),
    )
  }

  function checkDailyReset() {
    const today = new Date().toISOString().slice(0, 10)
    if (dailyDateStamp.value !== today) {
      dailyAttemptedToday.value = false
      dailyDateStamp.value = today
      dailyRank.value = 0
      persist()
    }
  }

  const totalQuestionsAnswered = computed(() =>
    records.value.reduce((sum, r) => sum + r.totalCount, 0),
  )

  const accuracy = computed(() => {
    const allTotal = records.value.reduce((sum, r) => sum + r.totalCount, 0)
    if (allTotal === 0) return 0
    const allCorrect = records.value.reduce((sum, r) => sum + r.correctCount, 0)
    return Math.round((allCorrect / allTotal) * 100)
  })

  const leaderboard = ref<LeaderboardEntry[]>([])
  const leaderboardPeriod = ref<'today' | 'week' | 'allTime'>('today')
  const leaderboardScope = ref<LeaderboardScope>('global')
  const leaderboardRegion = ref<FriendRegion>('huadong')

  /** 全站唯一、与周期/榜单类型无关的实力值 —— 保证同一人相对名次不会在切换筛选时颠倒 */
  function intrinsicCore(userId: string): number {
    return hashSeed(`lb-core-v4-${userId}`) >>> 0
  }

  function meCore(): number {
    const base = intrinsicCore('me')
    const boost = dailyHighScore.value > 0 ? dailyHighScore.value * 2_200_000 : 0
    return Math.max(base, Math.floor(base * 0.55 + boost))
  }

  function periodK(period: 'today' | 'week' | 'allTime'): number {
    return period === 'today' ? 0.93 : period === 'week' ? 0.97 : 1
  }

  function buildRow(
    userId: string,
    nameZh: string,
    nameEn: string,
    initials: string,
    avatarColor: string,
    today: string,
  ): { core: number; entry: LeaderboardEntry } {
    const core = userId === 'me' ? meCore() : intrinsicCore(userId)
    const combo = 1 + (intrinsicCore(`${userId}|combo`) % 12)
    const duration = 52 + (intrinsicCore(`${userId}|dur`) % 290)
    return {
      core,
      entry: {
        rank: 0,
        userId,
        nameZh,
        nameEn,
        initials,
        avatarColor,
        score: 0,
        duration,
        combo,
        date: today,
      },
    }
  }

  const globalNpcFriends: FriendItem[] = [
    {
      id: 'npc-1',
      nameZh: '匿名挑战者·甲',
      nameEn: 'Challenger A',
      initials: '匿',
      avatarColor: '#475569',
      level: 40,
      specialtyZh: '—',
      specialtyEn: '—',
      status: 'idle',
      layersCarved: 0,
      worksCompleted: 0,
      regionCode: 'huabei',
    },
    {
      id: 'npc-2',
      nameZh: '匿名挑战者·乙',
      nameEn: 'Challenger B',
      initials: '乙',
      avatarColor: '#52525b',
      level: 35,
      specialtyZh: '—',
      specialtyEn: '—',
      status: 'idle',
      layersCarved: 0,
      worksCompleted: 0,
      regionCode: 'huanan',
    },
    {
      id: 'npc-3',
      nameZh: '匿名挑战者·丙',
      nameEn: 'Challenger C',
      initials: '丙',
      avatarColor: '#57534e',
      level: 28,
      specialtyZh: '—',
      specialtyEn: '—',
      status: 'idle',
      layersCarved: 0,
      worksCompleted: 0,
      regionCode: 'xinan',
    },
  ]

  function generateLeaderboard(
    period: 'today' | 'week' | 'allTime' = leaderboardPeriod.value,
    scope: LeaderboardScope = leaderboardScope.value,
    region: FriendRegion = leaderboardRegion.value,
  ) {
    leaderboardPeriod.value = period
    leaderboardScope.value = scope
    leaderboardRegion.value = region
    const today = new Date().toISOString().slice(0, 10)

    const rows: { core: number; entry: LeaderboardEntry }[] = []

    if (scope === 'global') {
      for (const f of friends) {
        rows.push(buildRow(f.id, f.nameZh, f.nameEn, f.initials, f.avatarColor, today))
      }
      for (const n of globalNpcFriends) {
        rows.push(buildRow(n.id, n.nameZh, n.nameEn, n.initials, n.avatarColor, today))
      }
    } else if (scope === 'friends') {
      for (const f of friends.filter((x) => x.status !== 'offline')) {
        rows.push(buildRow(f.id, f.nameZh, f.nameEn, f.initials, f.avatarColor, today))
      }
    } else {
      for (const f of friends.filter((x) => x.regionCode === region)) {
        rows.push(buildRow(f.id, f.nameZh, f.nameEn, f.initials, f.avatarColor, today))
      }
    }

    const includeMe =
      scope === 'global' || scope === 'friends' || (scope === 'region' && region === MY_REGION)
    if (includeMe) {
      const mine = buildRow('me', '林锐', 'Lin Rui', 'LR', '#0d9488', today)
      rows.push(mine)
    }

    rows.sort((a, b) => {
      if (b.core !== a.core) return b.core - a.core
      return a.entry.userId.localeCompare(b.entry.userId)
    })
    const k = periodK(period)
    const top = rows.slice(0, 20)
    /*
     * 排行榜（示意数据）规则 —— 详细说明放在此处而非界面长文案：
     * - 排序键 `core` 按 userId 稳定哈希，换「今日/本周/总榜」或「全站/好友/区域」不改变两人之间的先后关系。
     * - 展示分 `score` 在排序后按名次递减赋值并乘 periodK，避免用 core/2^32 映射到整数时全员同分。
     * - combo、duration 为装饰列；非商城积分。界面仅用 quizLeaderboardExplain 一行概括。
     */
    top.forEach((r, i) => {
      r.entry.rank = i + 1
      const raw = 398 - i * 13 - (i % 3)
      r.entry.score = Math.max(52, Math.round(raw * k))
    })

    leaderboard.value = top.map((r) => r.entry)

    const mine = leaderboard.value.find((e) => e.userId === 'me')
    dailyRank.value = mine?.rank ?? 0
  }

  function getLeaderboard(period: 'today' | 'week' | 'allTime') {
    generateLeaderboard(period)
    return leaderboard.value
  }

  const focusLossCount = ref(0)
  let visibilityHandler: (() => void) | null = null

  function startFocusTracking() {
    focusLossCount.value = 0
    visibilityHandler = () => {
      if (document.hidden) focusLossCount.value++
    }
    document.addEventListener('visibilitychange', visibilityHandler)
  }

  function stopFocusTracking() {
    if (visibilityHandler) {
      document.removeEventListener('visibilitychange', visibilityHandler)
      visibilityHandler = null
    }
  }

  return {
    records,
    dailyAttemptedToday,
    dailyDateStamp,
    dailyHighScore,
    dailyHighCombo,
    dailyRank,
    quickBattleBest,
    quickBattleBestCombo,
    totalQuizzes,
    totalCorrect,
    streakDays,
    lastQuizDate,
    totalQuestionsAnswered,
    accuracy,
    leaderboard,
    leaderboardPeriod,
    leaderboardScope,
    leaderboardRegion,
    focusLossCount,
    checkDailyReset,
    persist,
    reconcileAggregatesFromRecords,
    generateLeaderboard,
    getLeaderboard,
    startFocusTracking,
    stopFocusTracking,
  }
})
