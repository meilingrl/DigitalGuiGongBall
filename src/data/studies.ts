import { defaultConfigs, designConfigSchema, type DesignConfig, type TemplateId } from '../../shared/design'
import { inspirations, type InspirationId } from '../../shared/inspirations'

export type ObservationMode = 'whole' | 'cutaway' | 'separated'
export interface StudySource { label: string; url: string }
export interface Study {
  id: InspirationId
  title: string
  templateId: TemplateId
  summary: string
  number: string
  subtitle: string
  readTime: string
  image: 'nested' | 'openwork' | 'digital'
  question: string
  lead: string
  sections: { title: string; body: string; source?: StudySource }[]
  observation: Record<ObservationMode, { title: string; text: string }>
  experiment: string
}

const structureSource = { label: 'Heritage Museum of Asian Art · The Chinese Puzzle Ball', url: 'https://www.heritageasianart.org/the-chinese-puzzle' }
const metSource = { label: 'The Met · Ball Containing Seven Balls · 44.116', url: 'https://www.metmuseum.org/art/collection/search/41950' }
const nmsSource = { label: 'National Museums Scotland · Puzzle-ball · V.2016.33', url: 'https://www.nms.ac.uk/collections/search/object?entry=734390&object-name=Puzzle-ball&page=1&view=cards' }

const editorial: Record<InspirationId, Omit<Study, 'id' | 'title' | 'templateId' | 'summary'>> = {
  'nested-structure': {
    number: '01', subtitle: '一个球，如何容纳另一个世界？', readTime: '约 3 分钟', image: 'nested',
    question: '穿过表面的一扇窗，你能看见第几层？',
    lead: '鬼工球引人驻足的地方，是外表的完整与内部的复杂同时存在。先别急着数纹样：从一个开孔向里看，目光会遇见下一道曲面，再遇见下一层光。',
    sections: [
      { title: '完整之中，另有空间', body: '亚洲艺术遗产博物馆的展览说明将这类套球描述为：从同一块材料雕成、由数个能够自由转动的同心球组成。它的奇妙来自内外相套的关系，而不只是表面图案的繁复。', source: structureSource },
      { title: '让眼睛进入内部', body: '看正面时，外层容易遮住里面的结构。把数字模型剖开，便能沿着断面辨认壳层与空隙；再将球壳分开，半径的递减会变得清楚。这是为理解结构而设计的观察方式，不代表实物可以如此拆开。' },
      { title: '从“多少层”走向“怎样相处”', body: '层数不是理解一件套球的唯一尺度。层与层的距离、孔洞是否相对、外壳怎样遮挡内部，都会改变观看的体验。在这里，先试着辨认四个独立球壳，再回到完整视图，看看你是否仍能发现它们。' },
    ],
    observation: {
      whole: { title: '从外向内看', text: '拖动球体，找一处能同时看见内外层的开孔。完整的轮廓藏住了多少结构？' },
      cutaway: { title: '看见壳层与空隙', text: '剖开视图保留半边球壳。沿断面数一数，区分实体的厚度与层间空隙。' },
      separated: { title: '把层次一一辨认', text: '数字展开将各层移开。使用“聚焦球层”单独观察，再选择全部，比较逐层缩小的半径。' },
    },
    experiment: '以「玲珑」四层结构开始。试着改变层数，再用剖开视图检查内外关系，为作品留下你自己的空间秩序。',
  },
  'openwork-rhythm': {
    number: '02', subtitle: '空下来的地方，也在塑造形状。', readTime: '约 3 分钟', image: 'openwork',
    question: '如果只看留下的线，和只看挖去的空，会看到同一个纹样吗？',
    lead: '镂空不只是在表面打孔。视线穿过孔洞，落在下一层，再返回外侧的边缘。实处提供轮廓，虚处引入深度，两者共同构成了观看的节奏。',
    sections: [
      { title: '内外层，可以说不同的语言', body: '苏格兰国家博物馆的一件十九世纪中国套球，登记为九层同心球；其藏品说明区分了内层的星形镂空与最外层的花卉高浮雕。同一件器物中，层次和装饰承担着不同的视觉角色。', source: nmsSource },
      { title: '看孔洞，也看孔洞之间', body: '观察镂空时，可以把注意力从“孔有多大”移向“孔与孔之间还留下什么”。重复的边框让视线连成路径，大小与间距的变化则让这条路径变得疏朗或紧凑。这是本导览的观察方法，并不是传统纹样寓意的考据。' },
      { title: '一次只改变一个变量', body: '在下方的数字模型里，先聚焦外层，再改变开孔大小。保持密度不变，你会更容易分辨开孔对边框和留白的影响。回到全部球层时，同样的孔洞又会叠出新的明暗关系。数字参数展示视觉变化，不用于判断实物能否加工。' },
    ],
    observation: {
      whole: { title: '寻找重复的节奏', text: '旋转玉色数字模型，观察外层的重复轮廓如何遮挡下一层。' },
      cutaway: { title: '追踪虚与实', text: '沿剖开边缘观察，找到开孔的边框。改变开孔大小，比较留下的实体如何变窄或变宽。' },
      separated: { title: '让纹样独自说话', text: '展开后选择第 1 层。把开孔从小调到大，再选择全部，对比单层与叠层的视觉节奏。' },
    },
    experiment: '以「如意」曲线开始，先保留三层结构，只调整开孔大小与密度。给作品一个能描述其节奏的名字。',
  },
  'digital-heritage': {
    number: '03', subtitle: '把一次好奇，变成你的下一件作品。', readTime: '约 3 分钟', image: 'digital',
    question: '数字模型保留了什么，又无法代替什么？',
    lead: '数字工具让我们有机会靠近一种难以直接触碰的结构：放大、旋转、剖开、反复比较。理解从观看开始，也可以在一次亲手调整之后继续。',
    sections: [
      { title: '先有记录，再有想象', body: '纽约大都会艺术博物馆的一件中国套球，藏品号 44.116，题名为《Ball Containing Seven Balls》，年代标为十九世纪，直径为 5.4 厘米。这样的记录给出可追溯的对象；它并不能被一张相似的图片或一个球形模型替代。', source: metSource },
      { title: '模型是一种解释', body: '本工坊以程序生成球壳、开孔与重复纹样，帮助你观察内外关系。这里的「玲珑」「如意」「莲华」是创作模板名称，米白、玉色与青铜色是数字外观；它们不是上述藏品的扫描、测绘复原或传统纹样的精确复制。' },
      { title: '从观察中带走一个问题', body: '你可以让模型层层紧靠，也可以将结构展开；可以选定一层，比较它与整体的关系。找到最想继续尝试的一个变化，再进入工坊创作。保存作品时保留这篇导览作为灵感来源，让一次修改有迹可循。' },
    ],
    observation: {
      whole: { title: '先看整体表达', text: '观察五层莲瓣纹样。青铜色是一种数字外观，试着区分色彩感受与实际几何结构。' },
      cutaway: { title: '检视模型的假设', text: '剖开后辨认程序生成的独立球壳。这个清楚的解释模型，和复杂的历史实物记录各有用途。' },
      separated: { title: '选择你的起点', text: '展开模型，找到最想进一步调整的一层。把这个观察带入创作，继续选择密度、层数与材质外观。' },
    },
    experiment: '以「莲华」五层结构开始。用数字材料和原创纹样表达你对层次的理解，并在作品说明中写下一个观察。',
  },
}

export const studies: Study[] = inspirations.map(inspiration => ({ ...inspiration, ...editorial[inspiration.id] }))

export function findStudy(id: unknown): Study | undefined {
  return typeof id === 'string' ? studies.find(study => study.id === id) : undefined
}

export function studyCreationPath(study: Study, config?: DesignConfig): string {
  const path = `/atelier?template=${study.templateId}&inspiration=${study.id}`
  if (!config) return path
  const parsed = designConfigSchema.safeParse(config)
  if (!parsed.success || parsed.data.templateId !== study.templateId) return path
  return `${path}&design=${encodeURIComponent(JSON.stringify(parsed.data))}`
}

export function createObservationConfig(id: unknown, mode: ObservationMode): DesignConfig | undefined {
  const study = findStudy(id)
  if (!study) return undefined
  return {
    ...defaultConfigs[study.templateId],
    cutaway: mode === 'cutaway',
    separation: mode === 'separated' ? 1 : 0,
    activeLayer: 0,
    autoRotate: false,
  }
}
