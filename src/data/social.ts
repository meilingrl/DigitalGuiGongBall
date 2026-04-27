import type { TemplateDifficulty } from './content'

export type FriendStatus = 'carving' | 'museum' | 'idle' | 'offline'

export type FriendRegion = 'huadong' | 'huanan' | 'huabei' | 'xinan'

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
  /** 区域榜筛选用（示意数据） */
  regionCode: FriendRegion
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
  startedAgo?: number
}

// Chat data types
export type ChatChannel = {
  id: string
  nameZh: string
  nameEn: string
  type: 'room' | 'direct'
  /** 私聊时关联好友 id（用于从好友列表打开/新建会话） */
  friendId?: string
  unread: number
  lastMessageZh: string
  lastMessageEn: string
  lastTime: string
  pinned?: boolean
  muted?: boolean
  hidden?: boolean
}

export type ChatMessage = {
  channelId: string
  sender: string
  nameZh: string
  nameEn: string
  initials: string
  avatarColor: string
  textZh: string
  textEn: string
  time: string
}

export const chatChannels: ChatChannel[] = [
  {
    id: 'c1',
    nameZh: '青玉协作坊',
    nameEn: 'Jade Co-op',
    type: 'room',
    unread: 3,
    lastMessageZh: '沈一鸣：我完成了L3层，可以开始L4了',
    lastMessageEn: 'Yiming: I finished L3, ready for L4',
    lastTime: '10:32',
  },
  {
    id: 'c2',
    nameZh: '纹样共创营',
    nameEn: 'Motif Lab',
    type: 'room',
    unread: 0,
    lastMessageZh: '吴子涵：新模板的花纹可以参考明代风格',
    lastMessageEn: 'Zihan: New template motifs can reference Ming style',
    lastTime: '09:15',
  },
  {
    id: 'dm-u1',
    nameZh: '沈一鸣',
    nameEn: 'Yiming Shen',
    type: 'direct',
    friendId: 'u1',
    unread: 1,
    lastMessageZh: '好的，晚上一起参加快问快答！',
    lastMessageEn: 'OK, lets do the quick quiz tonight!',
    lastTime: '11:02',
  },
  {
    id: 'c4',
    nameZh: '知识交流群',
    nameEn: 'Knowledge Hub',
    type: 'room',
    unread: 5,
    lastMessageZh: '陈墨：分享一篇关于鬼工球历史的文章',
    lastMessageEn: 'Mo: Sharing an article about Guigong Ball history',
    lastTime: '08:45',
  },
]

export const chatMessages: ChatMessage[] = [
  {
    channelId: 'c1',
    sender: 'u1',
    nameZh: '沈一鸣',
    nameEn: 'Yiming Shen',
    initials: '沈',
    avatarColor: '#2d6a4f',
    textZh: '大家进度怎么样？',
    textEn: 'How is everyones progress?',
    time: '10:15',
  },
  {
    channelId: 'c1',
    sender: 'u2',
    nameZh: '林晓桐',
    nameEn: 'Xiaotong Lin',
    initials: '林',
    avatarColor: '#7b4f9e',
    textZh: '我刚进L2，这个纹样细节很多',
    textEn: 'Just entered L2, so many details in this pattern',
    time: '10:18',
  },
  {
    channelId: 'c1',
    sender: 'u1',
    nameZh: '沈一鸣',
    nameEn: 'Yiming Shen',
    initials: '沈',
    avatarColor: '#2d6a4f',
    textZh: '我完成了L3层，可以开始L4了',
    textEn: 'I finished L3, ready for L4',
    time: '10:32',
  },
  {
    channelId: 'c2',
    sender: 'u4',
    nameZh: '吴子涵',
    nameEn: 'Zihan Wu',
    initials: '吴',
    avatarColor: '#1a6ea8',
    textZh: '新模板的花纹可以参考明代风格',
    textEn: 'New template motifs can reference Ming style',
    time: '09:15',
  },
  {
    channelId: 'dm-u1',
    sender: 'u1',
    nameZh: '沈一鸣',
    nameEn: 'Yiming Shen',
    initials: '沈',
    avatarColor: '#2d6a4f',
    textZh: '好的，晚上一起参加快问快答！',
    textEn: 'OK, lets do the quick quiz tonight!',
    time: '11:02',
  },
  {
    channelId: 'c4',
    sender: 'u3',
    nameZh: '陈墨',
    nameEn: 'Mo Chen',
    initials: '陈',
    avatarColor: '#b5451b',
    textZh: '分享一篇关于鬼工球历史的文章',
    textEn: 'Sharing an article about Guigong Ball history',
    time: '08:45',
  },
  {
    channelId: 'c4',
    sender: 'u7',
    nameZh: '方承泽',
    nameEn: 'Chengze Fang',
    initials: '方',
    avatarColor: '#5a4e8a',
    textZh: '太棒了，我刚在博物馆看到相关的展品',
    textEn: 'Awesome, I just saw related exhibits in the museum',
    time: '08:50',
  },
  {
    channelId: 'c4',
    sender: 'u3',
    nameZh: '陈墨',
    nameEn: 'Mo Chen',
    initials: '陈',
    avatarColor: '#b5451b',
    textZh: '对了，今天的每日竞赛你参加了吗？',
    textEn: 'By the way, did you join todays daily challenge?',
    time: '08:52',
  },
]

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
    regionCode: 'huadong',
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
    regionCode: 'huanan',
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
    regionCode: 'huadong',
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
    regionCode: 'huabei',
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
    regionCode: 'xinan',
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
    regionCode: 'huadong',
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
    regionCode: 'huanan',
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
    regionCode: 'huadong',
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
    tagsZh: ['几何抽象', '开放加入', '拉片协作'],
    tagsEn: ['Geometric', 'Open', 'Split-screen'],
  },
  {
    id: 'r4',
    nameZh: '初学互助会',
    nameEn: 'Beginner Guild',
    hostNameZh: '谢雨晴',
    hostNameEn: 'Yuqing Xie',
    members: 2,
    maxMembers: 5,
    templateZh: '吉祥如意',
    templateEn: 'Auspicious Clouds',
    difficulty: 'beginner',
    layerRange: 'L1–L2',
    status: 'waiting',
    tagsZh: ['新手友好', '教学引导', '互助'],
    tagsEn: ['Beginner-friendly', 'Tutorial', 'Help'],
  },
  {
    id: 'r5',
    nameZh: '极限镂空挑战',
    nameEn: 'Hollow Challenge',
    hostNameZh: '赵芷若',
    hostNameEn: 'Zhiruo Zhao',
    members: 4,
    maxMembers: 4,
    templateZh: '百鸟朝凤',
    templateEn: 'Birds Pay Tribute',
    difficulty: 'master',
    layerRange: 'L5–L20',
    status: 'full',
    tagsZh: ['极限挑战', '大师级', '满员'],
    tagsEn: ['Extreme', 'Master', 'Full'],
    startedAgo: 45,
  },
]
