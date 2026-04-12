/** ICH category — drives marker icon and colour */
export type IchCategory = 'craft' | 'performing' | 'festival' | 'culinary' | 'museum'

export interface Venue {
  id: string
  nameZh: string
  nameEn: string
  city: string
  addressZh: string
  addressEn: string
  lng: number
  lat: number
  ichCategory: IchCategory
  typeZh: string
  typeEn: string
  tagsZh: string[]
  tagsEn: string[]
  openHoursZh: string
  openHoursEn: string
  tel: string
  descZh: string
  descEn: string
}

export interface Activity {
  id: string
  venueId: string
  titleZh: string
  titleEn: string
  date: string
  timeZh: string
  timeEn: string
  quota: number | null
  remaining: number | null
  tagsZh: string[]
  tagsEn: string[]
  descZh: string
  descEn: string
  pointsReward: number
}

export const venues: Venue[] = [
  {
    id: 'v001',
    nameZh: '中国非物质文化遗产馆',
    nameEn: 'China Intangible Cultural Heritage Museum',
    city: '北京',
    addressZh: '北京市朝阳区芍药居北里甲1号',
    addressEn: 'No.1 Shaoyaoju Beili, Chaoyang, Beijing',
    lng: 116.452,
    lat: 40.002,
    ichCategory: 'museum',
    typeZh: '鬼工球 · 综合展陈',
    typeEn: 'Guigong Ball · Main galleries',
    tagsZh: ['鬼工球', '象牙球', '广作'],
    tagsEn: ['Guigong ball', 'Ivory sphere', 'Guangzhou craft'],
    openHoursZh: '周二至周日 09:00–17:00',
    openHoursEn: 'Tue–Sun 09:00–17:00',
    tel: '010-64912345',
    descZh:
      '常设「同心鬼工」主题展，以鬼工球多层镂空与同心圆结构为主线，配合史料与影像介绍广州牙雕鬼工球的历史与工艺要点，并可预约研学与手作体验。',
    descEn:
      'Permanent “Concentric Guigong” gallery traces multi-layer openwork ivory spheres and Guangzhou carving heritage, with archival media and bookable study sessions.',
  },
  {
    id: 'v002',
    nameZh: '苏州博物馆',
    nameEn: 'Suzhou Museum',
    city: '苏州',
    addressZh: '江苏省苏州市姑苏区东北街204号',
    addressEn: '204 Dongbei St, Gusu District, Suzhou',
    lng: 120.634,
    lat: 31.323,
    ichCategory: 'craft',
    typeZh: '鬼工球 · 微雕与层次',
    typeEn: 'Guigong Ball · Layers & micro-carving',
    tagsZh: ['微雕', '层次结构', '球体'],
    tagsEn: ['Micro-carving', 'Layering', 'Sphere'],
    openHoursZh: '周二至周日 09:00–17:00',
    openHoursEn: 'Tue–Sun 09:00–17:00',
    tel: '0512-67574421',
    descZh:
      '特展聚焦球体类工艺中的「层套」逻辑：从鬼工球同心层到核雕层次，展示苏作精工如何与广作鬼工球在审美与技法上对话。',
    descEn:
      'A special show on nested spheres — linking Guigong concentric layers with Suzhou micro-carving traditions.',
  },
  {
    id: 'v003',
    nameZh: '成都博物馆',
    nameEn: 'Chengdu Museum',
    city: '成都',
    addressZh: '四川省成都市青羊区小河街1号',
    addressEn: 'No.1 Xiaohe St, Qingyang District, Chengdu',
    lng: 104.056,
    lat: 30.664,
    ichCategory: 'performing',
    typeZh: '鬼工球 · 数字化演绎',
    typeEn: 'Guigong Ball · Digital interpretation',
    tagsZh: ['3D扫描', 'XR', '拆解动画'],
    tagsEn: ['3D scan', 'XR', 'Exploded view'],
    openHoursZh: '周二至周日 09:00–20:00',
    openHoursEn: 'Tue–Sun 09:00–20:00',
    tel: '028-86696228',
    descZh:
      '沉浸式展区用三维拆解与互动沙盘演示鬼工球从整块料到数十层同心壳的形成过程，适合作为数字鬼工球项目的线下参照体验。',
    descEn:
      'Immersive zone uses 3D breakdowns and touch tables to explain how layered Guigong spheres are formed — a physical anchor for digital demos.',
  },
  {
    id: 'v004',
    nameZh: '广东省非物质文化遗产馆',
    nameEn: 'Guangdong ICH Museum',
    city: '广州',
    addressZh: '广东省广州市天河区兴华路1号',
    addressEn: 'No.1 Xinghua Rd, Tianhe District, Guangzhou',
    lng: 113.352,
    lat: 23.134,
    ichCategory: 'festival',
    typeZh: '鬼工球 · 广作源流',
    typeEn: 'Guigong Ball · Guangzhou origins',
    tagsZh: ['广作牙雕', '传承谱系', '节庆特展'],
    tagsEn: ['Guangzhou ivory craft', 'Lineage', 'Festival'],
    openHoursZh: '周二至周日 09:00–17:00',
    openHoursEn: 'Tue–Sun 09:00–17:00',
    tel: '020-38305678',
    descZh:
      '系统呈现广作牙雕与鬼工球传承谱系，结合节庆档期推出「一球一故事」导览与亲子拼图活动，突出鬼工球作为岭南工艺名片的文化叙事。',
    descEn:
      'Documents Guangzhou ivory carving lineage and Guigong Ball storytelling tours plus family workshops during festival seasons.',
  },
]

export const activities: Activity[] = [
  {
    id: 'a001',
    venueId: 'v001',
    titleZh: '鬼工球入门：同心层怎么「镂」出来',
    titleEn: 'Guigong Basics: How Concentric Layers Are Hollowed',
    date: '2026-04-15',
    timeZh: '14:00–16:00',
    timeEn: '14:00–16:00',
    quota: 20,
    remaining: 7,
    tagsZh: ['鬼工球', '传习'],
    tagsEn: ['Guigong ball', 'Workshop'],
    descZh:
      '传承人演示从画线、开孔到逐层掏膛的要点，配合剖面模型理解「一球多壳」结构。提供仿象牙练习料与微型刻刀，完成一枚单层镂空练习球可带走。',
    descEn:
      'An inheritor demos layout, boring, and hollowing steps with section models. Practice piece and tools included; take home a single-layer exercise sphere.',
    pointsReward: 50,
  },
  {
    id: 'a002',
    venueId: 'v001',
    titleZh: '数字鬼工球论坛：扫描、建模与展示伦理',
    titleEn: 'Digital Guigong Forum: Scan, Model & Display Ethics',
    date: '2026-04-22',
    timeZh: '09:30–12:00',
    timeEn: '09:30–12:00',
    quota: 80,
    remaining: 34,
    tagsZh: ['数字化', '论坛'],
    tagsEn: ['Digitisation', 'Forum'],
    descZh:
      '围绕三维扫描、参数化建模与线上展示，讨论数字鬼工球项目中材质替代、版权与公众教育的平衡，适合课程答辩与产品原型对齐需求。',
    descEn:
      'On 3D capture, parametric models, and online display — material substitutes, rights, and public education for digital Guigong projects.',
    pointsReward: 20,
  },
  {
    id: 'a003',
    venueId: 'v002',
    titleZh: '特展：一球多壳——鬼工球与微雕球体对话',
    titleEn: 'Exhibition: Nested Spheres — Guigong & Micro-carving',
    date: '2026-04-10',
    timeZh: '全天（展览）',
    timeEn: 'All day (Exhibition)',
    quota: null,
    remaining: null,
    tagsZh: ['展览', '鬼工球'],
    tagsEn: ['Exhibition', 'Guigong ball'],
    descZh:
      '以鬼工球同心镂空与核雕球体并置展陈，辅以对比图解，说明南北方球体工艺的异同。免费参观；周末增设「数层次」互动屏。',
    descEn:
      'Juxtaposes Guigong concentric spheres with micro-carved balls, plus interactive “count the layers” screens on weekends. Free entry.',
    pointsReward: 20,
  },
  {
    id: 'a004',
    venueId: 'v002',
    titleZh: '手作体验：迷你层次球刻线练习',
    titleEn: 'Hands-on: Mini Layered Sphere Layout',
    date: '2026-04-18',
    timeZh: '10:00–12:00',
    timeEn: '10:00–12:00',
    quota: 12,
    remaining: 3,
    tagsZh: ['体验课', '鬼工球'],
    tagsEn: ['Workshop', 'Guigong ball'],
    descZh:
      '在导师指导下于练习球坯上完成分层定位与刻线，理解鬼工球「先定层、后镂空」的工序逻辑，不涉及真象牙材质。',
    descEn:
      'Guided layout and scoring on practice blanks to learn “layers first, then hollow” — no real ivory.',
    pointsReward: 50,
  },
  {
    id: 'a005',
    venueId: 'v003',
    titleZh: '公开课：用三维拆解讲清鬼工球结构',
    titleEn: 'Open Class: Explaining Guigong Structure in 3D',
    date: '2026-04-20',
    timeZh: '14:00–17:00',
    timeEn: '14:00–17:00',
    quota: 30,
    remaining: 15,
    tagsZh: ['公开课', '3D'],
    tagsEn: ['Open class', '3D'],
    descZh:
      '结合馆藏扫描数据，现场演示爆炸视图与截面动画，对应数字鬼工球应用中的层级切换与标注逻辑，适合作为项目技术路线展示素材。',
    descEn:
      'Uses collection scan data for exploded views and sections — maps directly to layer toggles and annotations in a digital Guigong app.',
    pointsReward: 30,
  },
  {
    id: 'a006',
    venueId: 'v004',
    titleZh: '「一球一故事」广作鬼工球导览',
    titleEn: '“One Sphere, One Story” Guangzhou Guigong Tour',
    date: '2026-04-25',
    timeZh: '10:00–12:00',
    timeEn: '10:00–12:00',
    quota: 40,
    remaining: 22,
    tagsZh: ['导览', '鬼工球'],
    tagsEn: ['Tour', 'Guigong ball'],
    descZh:
      '由讲解员串联广作牙雕史料与代表性鬼工球藏品，穿插问答与触摸仿制品体验，强化观众对鬼工球文化符号的认知。',
    descEn:
      'Docent-led tour linking Guangzhou ivory history with iconic Guigong spheres, Q&A and replica handling.',
    pointsReward: 30,
  },
]
