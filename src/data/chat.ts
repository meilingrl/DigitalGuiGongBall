export interface ChatMessage {
  id: string
  senderId: string
  senderNameZh: string
  senderNameEn: string
  avatarColor: string
  textZh: string
  textEn: string
  timestamp: string // ISO string
  isSystem?: boolean
}

export interface ChatRoom {
  id: string
  nameZh: string
  nameEn: string
  icon: string
  descriptionZh: string
  descriptionEn: string
  onlineCount: number
  lastActive: string
}

export const chatRooms: ChatRoom[] = [
  {
    id: 'general',
    nameZh: '非遗交流大厅',
    nameEn: 'ICH Lounge',
    icon: '💬',
    descriptionZh: '非遗爱好者日常交流，分享心得与见闻',
    descriptionEn: 'Daily chat for ICH enthusiasts — share experiences and stories',
    onlineCount: 47,
    lastActive: new Date().toISOString(),
  },
  {
    id: 'quiz-talk',
    nameZh: '答题讨论区',
    nameEn: 'Quiz Discussion',
    icon: '🧠',
    descriptionZh: '讨论非遗知识竞赛题目，交流答题技巧',
    descriptionEn: 'Discuss quiz questions and share answering strategies',
    onlineCount: 23,
    lastActive: new Date().toISOString(),
  },
  {
    id: 'carving-chat',
    nameZh: '雕刻协作聊天',
    nameEn: 'Carving Collab Chat',
    icon: '🔧',
    descriptionZh: '雕刻技术交流与实时协作沟通',
    descriptionEn: 'Carving technique exchange and real-time collaboration',
    onlineCount: 15,
    lastActive: new Date().toISOString(),
  },
  {
    id: 'newbie-help',
    nameZh: '新手互助角',
    nameEn: 'Newbie Corner',
    icon: '🌱',
    descriptionZh: '新手提问与老手答疑，共同进步',
    descriptionEn: 'Beginners ask questions, veterans answer — learn together',
    onlineCount: 34,
    lastActive: new Date().toISOString(),
  },
]

export const chatMessages: Record<string, ChatMessage[]> = {
  general: [
    {
      id: 'm1',
      senderId: 'sys',
      senderNameZh: '系统',
      senderNameEn: 'System',
      avatarColor: '#0d9488',
      textZh: '欢迎来到非遗交流大厅！请友善交流，遵守社区规范。',
      textEn: 'Welcome to the ICH Lounge! Please be friendly and follow community guidelines.',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      isSystem: true,
    },
    {
      id: 'm2',
      senderId: 'u2',
      senderNameZh: '林晓桐',
      senderNameEn: 'Xiaotong Lin',
      avatarColor: '#7b4f9e',
      textZh: '今天在博物馆看到一件清代鬼工球实物，雕了28层，太震撼了！',
      textEn: 'Saw a Qing dynasty Guigong Ball with 28 layers today — absolutely stunning!',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
    },
    {
      id: 'm3',
      senderId: 'u1',
      senderNameZh: '沈一鸣',
      senderNameEn: 'Yiming Shen',
      avatarColor: '#2d6a4f',
      textZh: '28层！我最多只能雕到12层，还得继续练。',
      textEn: '28 layers! I can only manage 12 at most — need more practice.',
      timestamp: new Date(Date.now() - 1500000).toISOString(),
    },
    {
      id: 'm4',
      senderId: 'u7',
      senderNameZh: '方承泽',
      senderNameEn: 'Chengze Fang',
      avatarColor: '#5a4e8a',
      textZh: '大家觉得折叠宇宙那个模板怎么样？抽象风格挑战挺大的。',
      textEn: 'What do you all think of the Folded Cosmos template? The abstract style is quite challenging.',
      timestamp: new Date(Date.now() - 600000).toISOString(),
    },
    {
      id: 'm5',
      senderId: 'u4',
      senderNameZh: '吴子涵',
      senderNameEn: 'Zihan Wu',
      avatarColor: '#1a6ea8',
      textZh: '折叠宇宙是目前最有深度的现代风格模板，建议先完成星穹连环再尝试。',
      textEn: 'Folded Cosmos is the deepest modern-style template. I recommend finishing Celestial Spheres first.',
      timestamp: new Date(Date.now() - 300000).toISOString(),
    },
  ],
  'quiz-talk': [
    {
      id: 'mq1',
      senderId: 'sys',
      senderNameZh: '系统',
      senderNameEn: 'System',
      avatarColor: '#0d9488',
      textZh: '这里是答题讨论区，交流知识但请勿直接公布每日竞赛答案。',
      textEn: 'Quiz discussion zone — share knowledge but please don\'t reveal daily challenge answers.',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      isSystem: true,
    },
    {
      id: 'mq2',
      senderId: 'u3',
      senderNameZh: '陈墨',
      senderNameEn: 'Mo Chen',
      avatarColor: '#b5451b',
      textZh: '今天快问快答拿了780分，新纪录！连击真的太重要了。',
      textEn: 'Scored 780 in Quick Battle today — new record! Combos really matter.',
      timestamp: new Date(Date.now() - 2400000).toISOString(),
    },
    {
      id: 'mq3',
      senderId: 'u2',
      senderNameZh: '林晓桐',
      senderNameEn: 'Xiaotong Lin',
      avatarColor: '#7b4f9e',
      textZh: '非遗保护公约那题我总是搞混年份，有什么记忆技巧吗？',
      textEn: 'I always mess up the ICH convention year — any memory tricks?',
      timestamp: new Date(Date.now() - 1200000).toISOString(),
    },
    {
      id: 'mq4',
      senderId: 'u8',
      senderNameZh: '谢雨晴',
      senderNameEn: 'Yuqing Xie',
      avatarColor: '#c46a2e',
      textZh: '记"2003，非遗起"这句顺口溜就好！',
      textEn: 'Just remember "2003, ICH begins" — that\'s the mnemonic!',
      timestamp: new Date(Date.now() - 900000).toISOString(),
    },
  ],
  'carving-chat': [
    {
      id: 'mc1',
      senderId: 'sys',
      senderNameZh: '系统',
      senderNameEn: 'System',
      avatarColor: '#0d9488',
      textZh: '雕刻协作频道 — 在此协调分层任务与进度同步。',
      textEn: 'Carving collaboration channel — coordinate layer tasks and sync progress here.',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      isSystem: true,
    },
    {
      id: 'mc2',
      senderId: 'u1',
      senderNameZh: '沈一鸣',
      senderNameEn: 'Yiming Shen',
      avatarColor: '#2d6a4f',
      textZh: 'L4龙鳞区域已完成，@吴子涵 你可以开始L5了。',
      textEn: 'L4 dragon scale section done — @Zihan Wu you can start L5.',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
    },
    {
      id: 'mc3',
      senderId: 'u4',
      senderNameZh: '吴子涵',
      senderNameEn: 'Zihan Wu',
      avatarColor: '#1a6ea8',
      textZh: '收到，半小时内完成L5。注意边界衔接处留0.5mm余量。',
      textEn: 'Got it, finishing L5 within 30 min. Leave 0.5mm margin at boundary joints.',
      timestamp: new Date(Date.now() - 1500000).toISOString(),
    },
  ],
  'newbie-help': [
    {
      id: 'mn1',
      senderId: 'sys',
      senderNameZh: '系统',
      senderNameEn: 'System',
      avatarColor: '#0d9488',
      textZh: '新手互助角 — 老手热心答疑，新手放心提问！',
      textEn: 'Newbie Corner — veterans happy to help, beginners ask away!',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      isSystem: true,
    },
    {
      id: 'mn2',
      senderId: 'u5',
      senderNameZh: '赵芷若',
      senderNameEn: 'Zhiruo Zhao',
      avatarColor: '#8a6f1e',
      textZh: '刚开始学鬼工球雕刻，工具压力设置多少比较合适？',
      textEn: 'Just started carving — what pressure setting is best for a beginner?',
      timestamp: new Date(Date.now() - 2400000).toISOString(),
    },
    {
      id: 'mn3',
      senderId: 'u7',
      senderNameZh: '方承泽',
      senderNameEn: 'Chengze Fang',
      avatarColor: '#5a4e8a',
      textZh: '入门阶段建议压力设35-45，先练几何迷宫模板，那个最适合建立手感。',
      textEn: 'For beginners I suggest 35-45 pressure. Start with Geometric Labyrinth — perfect for building feel.',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
    },
    {
      id: 'mn4',
      senderId: 'u5',
      senderNameZh: '赵芷若',
      senderNameEn: 'Zhiruo Zhao',
      avatarColor: '#8a6f1e',
      textZh: '谢谢！我去试一下几何迷宫。',
      textEn: 'Thanks! Going to try Geometric Labyrinth now.',
      timestamp: new Date(Date.now() - 1200000).toISOString(),
    },
  ],
}
