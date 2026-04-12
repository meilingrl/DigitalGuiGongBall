import type { TemplateDifficulty } from './content'

export type FriendStatus = 'carving' | 'museum' | 'idle' | 'offline'

export type FriendItem = {
  id: string
  nameZh: string
  nameEn: string
  initials: string
  avatarColor: string
  level: number
  specialtyZh: string
  specialtyEn: string
  status: FriendStatus
  currentTemplateZh?: string
  currentTemplateEn?: string
  layersCarved: number
  worksCompleted: number
}

export type RoomStatus = 'active' | 'waiting' | 'full'

export type RoomItem = {
  id: string
  nameZh: string
  nameEn: string
  hostNameZh: string
  hostNameEn: string
  members: number
  maxMembers: number
  templateZh: string
  templateEn: string
  difficulty: TemplateDifficulty
  layerRange: string
  status: RoomStatus
  tagsZh: string[]
  tagsEn: string[]
  startedAgo?: number  // minutes ago
}

export const friends: FriendItem[] = [
  {
    id: 'u1',
    nameZh: '沈一鸣',
    nameEn: 'Yiming Shen',
    initials: '沈',
    avatarColor: '#2d6a4f',
    level: 38,
    specialtyZh: '龙纹精雕',
    specialtyEn: 'Dragon motif carving',
    status: 'carving',
    currentTemplateZh: '云龙献瑞',
    currentTemplateEn: 'Cloud Dragon',
    layersCarved: 22840,
    worksCompleted: 94,
  },
  {
    id: 'u2',
    nameZh: '林晓桐',
    nameEn: 'Xiaotong Lin',
    initials: '林',
    avatarColor: '#7b4f9e',
    level: 52,
    specialtyZh: '几何抽象',
    specialtyEn: 'Geometric abstract',
    status: 'museum',
    layersCarved: 41280,
    worksCompleted: 162,
  },
  {
    id: 'u3',
    nameZh: '陈墨',
    nameEn: 'Mo Chen',
    initials: '陈',
    avatarColor: '#b5451b',
    level: 29,
    specialtyZh: '花卉纹样',
    specialtyEn: 'Floral patterns',
    status: 'idle',
    layersCarved: 9560,
    worksCompleted: 41,
  },
  {
    id: 'u4',
    nameZh: '吴子涵',
    nameEn: 'Zihan Wu',
    initials: '吴',
    avatarColor: '#1a6ea8',
    level: 67,
    specialtyZh: '大师级规划',
    specialtyEn: 'Master-level planning',
    status: 'carving',
    currentTemplateZh: '古纹回响',
    currentTemplateEn: 'Ancestral Echoes',
    layersCarved: 86400,
    worksCompleted: 308,
  },
  {
    id: 'u5',
    nameZh: '赵芷若',
    nameEn: 'Zhiruo Zhao',
    initials: '赵',
    avatarColor: '#8a6f1e',
    level: 21,
    specialtyZh: '吉祥纹理',
    specialtyEn: 'Auspicious motifs',
    status: 'offline',
    layersCarved: 4820,
    worksCompleted: 18,
  },
  {
    id: 'u6',
    nameZh: '徐皓月',
    nameEn: 'Haoyue Xu',
    initials: '徐',
    avatarColor: '#3a7d8c',
    level: 44,
    specialtyZh: '山水意境',
    specialtyEn: 'Ink-wash landscape',
    status: 'offline',
    layersCarved: 28100,
    worksCompleted: 115,
  },
  {
    id: 'u7',
    nameZh: '方承泽',
    nameEn: 'Chengze Fang',
    initials: '方',
    avatarColor: '#5a4e8a',
    level: 33,
    specialtyZh: '人物鸟兽',
    specialtyEn: 'Figures & birds',
    status: 'idle',
    layersCarved: 13200,
    worksCompleted: 57,
  },
  {
    id: 'u8',
    nameZh: '谢雨晴',
    nameEn: 'Yuqing Xie',
    initials: '谢',
    avatarColor: '#c46a2e',
    level: 18,
    specialtyZh: '初学者探索',
    specialtyEn: 'Beginner explorer',
    status: 'carving',
    currentTemplateZh: '吉祥如意',
    currentTemplateEn: 'Auspicious Clouds',
    layersCarved: 2140,
    worksCompleted: 9,
  },
]

export const rooms: RoomItem[] = [
  {
    id: 'r1',
    nameZh: '青玉协作坊',
    nameEn: 'Jade Co-op',
    hostNameZh: '沈一鸣',
    hostNameEn: 'Yiming Shen',
    members: 3,
    maxMembers: 4,
    templateZh: '云龙献瑞',
    templateEn: 'Cloud Dragon',
    difficulty: 'intermediate',
    layerRange: 'L3–L6',
    status: 'active',
    tagsZh: ['龙纹', '协同分层', '进阶'],
    tagsEn: ['Dragon', 'Split layers', 'Intermediate'],
    startedAgo: 28,
  },
  {
    id: 'r2',
    nameZh: '纹样共创营',
    nameEn: 'Motif Lab',
    hostNameZh: '吴子涵',
    hostNameEn: 'Zihan Wu',
    members: 2,
    maxMembers: 3,
    templateZh: '古纹回响',
    templateEn: 'Ancestral Echoes',
    difficulty: 'master',
    layerRange: 'L8–L15',
    status: 'active',
    tagsZh: ['大师专场', '深层精密', '邀请制'],
    tagsEn: ['Masters only', 'Deep carving', 'Invite'],
    startedAgo: 62,
  },
  {
    id: 'r3',
    nameZh: '星穹探索队',
    nameEn: 'Celestial Explorers',
    hostNameZh: '林晓桐',
    hostNameEn: 'Xiaotong Lin',
    members: 1,
    maxMembers: 4,
    templateZh: '星穹连环',
    templateEn: 'Celestial Spheres',
    difficulty: 'advanced',
    layerRange: 'L1–L10',
    status: 'waiting',
    tagsZh: ['几何', '全程开放', '高级'],
    tagsEn: ['Geometric', 'Open join', 'Advanced'],
  },
  {
    id: 'r4',
    nameZh: '花卉初见',
    nameEn: 'First Blossom',
    hostNameZh: '谢雨晴',
    hostNameEn: 'Yuqing Xie',
    members: 4,
    maxMembers: 4,
    templateZh: '百花争艳',
    templateEn: 'Hundred Blossoms',
    difficulty: 'beginner',
    layerRange: 'L1–L5',
    status: 'full',
    tagsZh: ['入门', '花卉', '满员'],
    tagsEn: ['Beginner', 'Floral', 'Full'],
    startedAgo: 14,
  },
  {
    id: 'r5',
    nameZh: '折叠实验室',
    nameEn: 'Folding Lab',
    hostNameZh: '方承泽',
    hostNameEn: 'Chengze Fang',
    members: 2,
    maxMembers: 3,
    templateZh: '折叠宇宙',
    templateEn: 'Folded Cosmos',
    difficulty: 'advanced',
    layerRange: 'L5–L12',
    status: 'waiting',
    tagsZh: ['抽象', '当代', '实验性'],
    tagsEn: ['Abstract', 'Contemporary', 'Experimental'],
  },
]
