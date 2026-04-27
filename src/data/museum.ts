/** 博物馆模块文案与列表（中英） */

export type MuseumExhibition = {
  titleZh: string
  titleEn: string
  periodZh: string
  periodEn: string
  descZh: string
  descEn: string
  tagZh: string
  tagEn: string
  /** 展览卡头图，相对 /public */
  image?: string
}

export type MuseumPastWork = {
  titleZh: string
  titleEn: string
  yearZh: string
  yearEn: string
  descZh: string
  descEn: string
}

export type MuseumKnowledge = {
  titleZh: string
  titleEn: string
  summaryZh: string
  summaryEn: string
}

export type MuseumVideo = {
  titleZh: string
  titleEn: string
  durationZh: string
  durationEn: string
  descZh: string
  descEn: string
  /** 封面图路径，相对 /public，建议 WebP 16:9。缺省时组件显示渐变占位。 */
  poster?: string
  /** 微缩预览视频路径，相对 /public，建议静音短片 ≤10s。缺省时禁用悬停预览。 */
  preview?: string
}

export const museumExhibitions: MuseumExhibition[] = [
  {
    titleZh: '镂月裁云：鬼工球与岭南牙雕',
    titleEn: 'Carved Moon, Cut Clouds: Puzzle Balls & Lingnan Ivory',
    periodZh: '2026.03.01 — 2026.06.30',
    periodEn: 'Mar 1 — Jun 30, 2026',
    descZh: '聚焦多层镂空与同心圆结构，配合高清扫描与互动剖面。',
    descEn: 'Multi-layer openwork and concentric shells, with scans and interactive sections.',
    tagZh: '特展',
    tagEn: 'Special',
    image: '/materials/museum/exhibitions/1.webp',
  },
  {
    titleZh: '纹样与秩序：从开窗到几何网格',
    titleEn: 'Motif & Order: From Fenestration to Grids',
    periodZh: '2026.01.10 — 2026.05.10',
    periodEn: 'Jan 10 — May 10, 2026',
    descZh: '拆解传统云雷、如意与几何开窗的节奏关系。',
    descEn: 'Traditional clouds, ruyi, and geometric fenestration rhythm.',
    tagZh: '常设',
    tagEn: 'Permanent',
    image: '/materials/museum/exhibitions/2.webp',
  },
  {
    titleZh: '数字孪生：馆藏三维档案公开周',
    titleEn: 'Digital Twin: Open Week for 3D Archives',
    periodZh: '2026.04.18 — 2026.04.25',
    periodEn: 'Apr 18 — Apr 25, 2026',
    descZh: '限时开放高分辨率模型下载与教学用途授权（演示）。',
    descEn: 'Time-limited HD downloads & educational licensing (mock).',
    tagZh: '活动',
    tagEn: 'Event',
    image: '/materials/museum/exhibitions/3.webp',
  },
  {
    titleZh: '技艺活化：非遗工艺数字互动展',
    titleEn: 'Living Craft: ICH Digital Interactive',
    periodZh: '2026.05.15 — 2026.08.31',
    periodEn: 'May 15 — Aug 31, 2026',
    descZh: '融合 AR 技术与实体工艺演示，观众可实时体验传统技艺的当代诠释。',
    descEn: 'AR overlays and live craft demos let visitors engage with traditional skills in real time.',
    tagZh: '互动',
    tagEn: 'Interactive',
    image: '/materials/museum/exhibitions/4.webp',
  },
]

export const museumPastWorks: MuseumPastWork[] = [
  {
    titleZh: '十二层同心鬼工球（数字复原）',
    titleEn: 'Twelve-Layer Concentric Ball (Digital Restoration)',
    yearZh: '2025 馆藏数字化',
    yearEn: '2025 digitization',
    descZh: '基于多角度摄影与结构推断的开放数据模型。',
    descEn: 'Open data model from multi-view imaging and inference.',
  },
  {
    titleZh: '龙纹透雕外层（纹样库 A-12）',
    titleEn: 'Dragon Openwork Shell (Motif Library A-12)',
    yearZh: '2024 社区共创',
    yearEn: '2024 community',
    descZh: '由创作者上传并经馆方标注的传统纹样切片。',
    descEn: 'Community slice annotated by curatorial team.',
  },
  {
    titleZh: '内层球体爆炸拆解教学包',
    titleEn: 'Exploded Shell Teaching Pack',
    yearZh: '2023 教育合作',
    yearEn: '2023 education',
    descZh: '面向工艺课程的分层动画与习题（示意）。',
    descEn: 'Layered animations & exercises for craft courses (mock).',
  },
  {
    titleZh: '五层象牙球复原研究报告',
    titleEn: 'Five-Layer Ivory Ball Restoration Report',
    yearZh: '2022 学术合作',
    yearEn: '2022 academic',
    descZh: '联合高校对清代五层象牙球的数字化测量与工艺路径复原。',
    descEn: 'Joint digitization and craft-path reconstruction of a Qing-era ivory puzzle ball.',
  },
]

export const museumKnowledge: MuseumKnowledge[] = [
  {
    titleZh: '什么是「鬼工」？',
    titleEn: 'What is “Guigong”?',
    summaryZh: '形容技艺神妙、非人力可及的镂空与套层工艺，强调同心与通透。',
    summaryEn: 'A term for uncanny openwork and nesting—concentric, translucent, precise.',
  },
  {
    titleZh: '多层球体的应力与开洞顺序',
    titleEn: 'Stress & drilling order',
    summaryZh: '外层开窗影响内层强度；教学上常从粗到细、从外到内分阶段完成。',
    summaryEn: 'Outer cuts affect inner shells; teaching follows coarse-to-fine, outside-in.',
  },
  {
    titleZh: '数字化传承的伦理与材料',
    titleEn: 'Ethics & materials in digitization',
    summaryZh: '数字复原可规避野生动物制品风险，强调文化阐释与开源协作。',
    summaryEn: 'Digital craft avoids wildlife risk; foreground culture and open collaboration.',
  },
  {
    titleZh: '地域流派与命名差异',
    titleEn: 'Regional Schools & Naming',
    summaryZh: '广州、潮州、福建各有工艺传承脉络，同类器物因地域而名称各异。',
    summaryEn: 'Guangzhou, Chaozhou, and Fujian each carry distinct lineages; similar objects bear different local names.',
  },
]

export const museumVideos: MuseumVideo[] = [
  {
    titleZh: '5 分钟看懂：鬼工球分层结构',
    titleEn: '5 Minutes: Layered Structure',
    durationZh: '05:12',
    durationEn: '05:12',
    descZh: '动画演示外层、中层与内核的关系。',
    descEn: 'Animation of outer, middle, and core relationships.',
    poster: '/materials/museum/videos/covers/museum-video-cover-01-v1.0.webp',
    preview: '/materials/museum/videos/previews/museum-video-preview-01-v1.0.mp4',
  },
  {
    titleZh: '策展人导览：云龙纹与开窗节奏',
    titleEn: "Curator's Tour: Dragon Motifs",
    durationZh: '12:40',
    durationEn: '12:40',
    descZh: '结合馆藏扫描与历史图像的对照讲解。',
    descEn: 'Scans compared with historical images.',
    poster: '/materials/museum/videos/covers/museum-video-cover-02-v1.0.webp',
    preview: '/materials/museum/videos/previews/museum-video-preview-02-v1.0.mp4',
  },
  {
    titleZh: '数字鬼工球：从扫描到可编辑纹样',
    titleEn: 'From Scan to Editable Motif',
    durationZh: '08:06',
    durationEn: '08:06',
    descZh: '工作流概览：网格清理、矢量提取与社区发布。',
    descEn: 'Mesh cleanup, vector extraction, community release.',
    poster: '/materials/museum/videos/covers/museum-video-cover-03-v1.0.webp',
    preview: '/materials/museum/videos/previews/museum-video-preview-03-v1.0.mp4',
  },
  {
    titleZh: '工艺速写：一颗球的诞生',
    titleEn: 'Craft Sketch: Birth of a Sphere',
    durationZh: '06:28',
    durationEn: '06:28',
    descZh: '从起稿、开窗到抛光的快节奏流程记录，适合入门观摩。',
    descEn: 'A fast walkthrough from sketching to polishing, ideal for beginners.',
    poster: '/materials/museum/videos/covers/museum-video-cover-04-v1.0.webp',
    preview: '/materials/museum/videos/previews/museum-video-preview-04-v1.0.mp4',
  },
]
