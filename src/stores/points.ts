import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export const TASK_IDS = {
  FIRST_VISIT: 'first-visit',
  QUIZ_COMPLETE: 'quiz-complete',
  WORK_SUBMIT: 'work-submit',
  EVENT_CHECKIN: 'event-checkin',
} as const

export type TaskId = (typeof TASK_IDS)[keyof typeof TASK_IDS]

export interface PointTask {
  id: TaskId
  labelZh: string
  labelEn: string
  hintZh: string
  hintEn: string
  points: number
  completed: boolean
  claimed: boolean
}

export const usePointsStore = defineStore('points', () => {
  const balance = ref(0)

  const tasks = ref<PointTask[]>([
    {
      id: TASK_IDS.FIRST_VISIT,
      labelZh: '首次访问商城',
      labelEn: 'First visit to Mall',
      hintZh: '已自动完成',
      hintEn: 'Auto-completed',
      points: 10,
      completed: false,
      claimed: false,
    },
    {
      id: TASK_IDS.QUIZ_COMPLETE,
      labelZh: '完成非遗知识竞赛',
      labelEn: 'Complete ICH Quiz',
      hintZh: '前往文化博物馆参加答题',
      hintEn: 'Visit Museum to take the quiz',
      points: 50,
      completed: false,
      claimed: false,
    },
    {
      id: TASK_IDS.WORK_SUBMIT,
      labelZh: '创意工坊提交作品',
      labelEn: 'Submit work in Workshop',
      hintZh: '前往创意工坊提交你的作品',
      hintEn: 'Visit Workshop to submit your work',
      points: 40,
      completed: false,
      claimed: false,
    },
    {
      id: TASK_IDS.EVENT_CHECKIN,
      labelZh: '参与活动签到',
      labelEn: 'Event Check-in',
      hintZh: '前往探索模块参与线下活动',
      hintEn: 'Visit Explore to join an offline event',
      points: 30,
      completed: false,
      claimed: false,
    },
  ])

  const pendingPoints = computed(() =>
    tasks.value
      .filter((t) => t.completed && !t.claimed)
      .reduce((sum, t) => sum + t.points, 0),
  )

  const hasUnclaimed = computed(() => pendingPoints.value > 0)

  /** Called by other modules when a task behaviour is triggered */
  function completeTask(id: TaskId) {
    const task = tasks.value.find((t) => t.id === id)
    if (task && !task.completed) {
      task.completed = true
    }
  }

  /** Called by Mall when user clicks "one-click claim" */
  function claimAll() {
    let gained = 0
    tasks.value.forEach((t) => {
      if (t.completed && !t.claimed) {
        t.claimed = true
        gained += t.points
      }
    })
    balance.value += gained
    return gained
  }

  /** Called when redeeming a product */
  function spend(amount: number): boolean {
    if (balance.value < amount) return false
    balance.value -= amount
    return true
  }

  /** Mark first-visit on Mall mount */
  function onMallVisit() {
    completeTask(TASK_IDS.FIRST_VISIT)
  }

  return {
    balance,
    tasks,
    pendingPoints,
    hasUnclaimed,
    completeTask,
    claimAll,
    spend,
    onMallVisit,
  }
})
