// Activity heatmap: 8 weeks × 7 days (Sun→Sat), 0=none, 1=low, 2=med, 3=high
export const activityGrid: number[][] = [
  [0, 1, 2, 1, 0, 0, 1],
  [1, 2, 3, 2, 1, 0, 0],
  [0, 1, 1, 3, 2, 1, 0],
  [2, 3, 3, 2, 3, 1, 1],
  [1, 2, 2, 1, 2, 3, 2],
  [0, 0, 1, 2, 3, 2, 1],
  [1, 2, 3, 3, 2, 1, 0],
  [0, 1, 2, 3, 2, 0, 0], // current week (partially filled)
]

// Skill radar: 0–100
export type SkillKey = 'precision' | 'depth' | 'aesthetics' | 'speed' | 'collab' | 'creativity'

export const skills: Record<SkillKey, number> = {
  precision: 82,
  depth: 74,
  aesthetics: 68,
  speed: 57,
  collab: 90,
  creativity: 63,
}

export type Achievement = {
  id: string
  icon: string
  titleZh: string
  titleEn: string
  descZh: string
  descEn: string
  unlockedAt: string
  rare: boolean
}

export const achievements: Achievement[] = [
  {
    id: 'a1',
    icon: '🏺',
    titleZh: '古器觉醒',
    titleEn: 'Ancient Vessel',
    descZh: '完成第一件完整作品',
    descEn: 'Completed your first full piece',
    unlockedAt: '2025-09',
    rare: false,
  },
  {
    id: 'a2',
    icon: '🐉',
    titleZh: '龙纹初成',
    titleEn: 'Dragon Touch',
    descZh: '完成任意龙纹主题模板',
    descEn: 'Completed a dragon-themed template',
    unlockedAt: '2025-10',
    rare: false,
  },
  {
    id: 'a3',
    icon: '🤝',
    titleZh: '协同工匠',
    titleEn: 'Co-op Craftsman',
    descZh: '参与 5 次协作房间',
    descEn: 'Joined 5 co-op rooms',
    unlockedAt: '2025-11',
    rare: false,
  },
  {
    id: 'a4',
    icon: '🔭',
    titleZh: '深渊探索者',
    titleEn: 'Deep Diver',
    descZh: '在单件作品中连续雕刻至第 10 层',
    descEn: 'Carved to layer 10 in a single session',
    unlockedAt: '2025-12',
    rare: true,
  },
  {
    id: 'a5',
    icon: '⏱',
    titleZh: '专注百小时',
    titleEn: '100h Focus',
    descZh: '累计专注时长超过 100 小时',
    descEn: 'Accumulated over 100h of focus time',
    unlockedAt: '2026-01',
    rare: false,
  },
  {
    id: 'a6',
    icon: '🌸',
    titleZh: '花开四季',
    titleEn: 'Four Seasons',
    descZh: '完成所有花卉主题模板',
    descEn: 'Completed all floral templates',
    unlockedAt: '2026-02',
    rare: true,
  },
]

export type RecentSession = {
  id: string
  /** 对应 `templates` 条目，用于从统计页跳转到工房该模板 */
  templateId: string
  templateZh: string
  templateEn: string
  date: string
  durationMin: number
  layersCompleted: number
  status: 'completed' | 'in-progress' | 'abandoned'
  likes: number
}

export const recentSessions: RecentSession[] = [
  {
    id: 's1',
    templateId: 'cloud-dragon',
    templateZh: '云龙献瑞',
    templateEn: 'Cloud Dragon',
    date: '2026-04-02',
    durationMin: 48,
    layersCompleted: 6,
    status: 'completed',
    likes: 142,
  },
  {
    id: 's2',
    templateId: 'celestial-sphere',
    templateZh: '星穹连环',
    templateEn: 'Celestial Spheres',
    date: '2026-04-01',
    durationMin: 35,
    layersCompleted: 5,
    status: 'in-progress',
    likes: 87,
  },
  {
    id: 's3',
    templateId: 'folded-cosmos',
    templateZh: '折叠宇宙',
    templateEn: 'Folded Cosmos',
    date: '2026-03-30',
    durationMin: 72,
    layersCompleted: 10,
    status: 'completed',
    likes: 318,
  },
  {
    id: 's4',
    templateId: 'ancestral-echo',
    templateZh: '古纹回响',
    templateEn: 'Ancestral Echoes',
    date: '2026-03-28',
    durationMin: 22,
    layersCompleted: 3,
    status: 'abandoned',
    likes: 21,
  },
  {
    id: 's5',
    templateId: 'hundred-flowers',
    templateZh: '百花争艳',
    templateEn: 'Hundred Blossoms',
    date: '2026-03-26',
    durationMin: 19,
    layersCompleted: 5,
    status: 'completed',
    likes: 204,
  },
]
