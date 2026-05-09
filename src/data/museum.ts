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
  leadZh: string
  leadEn: string
  contentBlocksZh: string[]
  contentBlocksEn: string[]
  keywordsZh: string[]
  keywordsEn: string[]
  timelineZh: string[]
  timelineEn: string[]
}

export type MuseumKnowledge = {
  titleZh: string
  titleEn: string
  summaryZh: string
  summaryEn: string
  leadZh: string
  leadEn: string
  contentBlocksZh: string[]
  contentBlocksEn: string[]
  keywordsZh: string[]
  keywordsEn: string[]
  timelineZh: string[]
  timelineEn: string[]
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
    leadZh:
      '这件“十二层同心鬼工球（数字复原）”并不是简单意义上的三维扫描成果，而是一次围绕结构逻辑、观赏路径与教学用途同时展开的数字典藏实验。项目的重点不只是把器物表面“扫出来”，而是尽可能让观众看见层与层之间的关系、复原判断的依据，以及数字版本如何在保存原件观看边界的同时提供更高强度的研究可见性。',
    leadEn:
      'This Twelve-Layer Concentric Ball restoration is more than a straightforward 3D scan. It is a digital-collection experiment built around structural reading, viewing paths, and classroom use at the same time, aiming not only to capture the surface but to make the relations between layers and the logic of restoration more visible.',
    contentBlocksZh: [
      '从命名上看，“数字复原”比“数字复制”更准确。复制强调外观对应，复原则意味着项目团队需要对缺损、遮蔽、难以进入的深层空间做出连续判断。对于多层鬼工球来说，这个差别尤其重要，因为真正具有研究价值的部分往往恰恰位于最难直接观看的内部结构。',
      '该项目的第一步通常不是建模，而是采集策略的设计。多角度摄影、局部微距、受控光照和旋转观察要被安排成可互相印证的一套流程，目的不是追求拍得越多越好，而是尽量减少死角，并为后续层间推断保留足够信息。数字典藏的质量，很大程度上在这一阶段就被决定了。',
      '由于十二层结构本身极其密集，外层开窗能够提供的观察通道是有限的。团队在处理这类对象时，往往需要结合可见层的纹样节奏、孔位尺寸、转动轨迹与历史同类器物资料，对不可见部分做结构推断。换句话说，数字模型的许多地方并非“直接获取”，而是“基于证据的重建”。',
      '这件作品之所以适合做开放数据模型，还因为它天然具备“分层阅读”的优势。普通观众可以先从整体外观进入，看到通透、匀称与繁密感；进阶使用者则可以逐步关闭外层、单独观察中层或内层，比较不同深度的纹样密度、筋位安排和旋转留量。一个静止器物因此变成了可切换的学习界面。',
      '在数字典藏语境中，“同心”不再只是审美词汇，而是一个非常具体的数据组织原则。模型往往需要围绕共同中心重新校准不同层的空间关系，确保观察、拆分和动画演示时不会因为轻微偏差而误导使用者。对外行来说这只是“对齐”，对研究者来说却关系到结构解释是否可信。',
      '项目团队在整理这类成果时，通常会同时产出多个版本：一个面向公共展示的轻量模型，一个保留更多细节的研究版，一个适合课堂解释的爆炸拆解版。它们共享同一对象，却服务于完全不同的阅读深度。数字典藏的价值并不在于只有一个“最终版”，而在于它允许不同层级的使用者进入同一件作品。',
      '对于馆方而言，这类复原还能明显降低原件展示压力。原件不需要反复高强度移动或长时间被多人近距离围观，观众仍然可以通过屏幕、投影或交互终端查看那些正常展柜条件下几乎不可能被看清的细部。这种“把观看权扩展开、把实物风险降下来”的平衡，是数字典藏最直接的现实意义之一。',
      '从研究层面看，十二层结构为比较分析提供了非常丰富的样本。研究者可以观察某些层之间为何采用相近纹样而另外一些层故意拉开差异，也可以比较外层孔位与内部旋转空间是否形成某种稳定比例。以前这些讨论往往停留在文字猜测，现在则可以围绕更具体的可视化对象展开。',
      '从教学层面看，这件作品几乎天然适合被拆成多个课程单元。教师可以先讲同心结构，再讲开窗逻辑，再讲层间避让，最后讲数字复原中的不确定性标注。学生不再只接触“成品真好看”的评价，而是能循着模型看到复杂工艺被一步步组织起来的路径。',
      '值得注意的是，数字复原并不等于宣布“原件真相已经被完全掌握”。恰恰相反，越严谨的项目越会在成果中标记不确定区段、推断边界和参考来源。对公众来说，这种标注可能显得不够“完美”；但对典藏系统而言，它恰恰体现了数字版本不是神话，而是一个持续可修订、可增补的研究成果。',
      '这件作品也展示了数字典藏如何把“观看对象”转化为“知识接口”。观众可以不只停留在惊叹层数之多，还能追问为什么某些层开得更疏、某些位置要保留更粗的筋位、某些纹样为何在向内推进时发生变化。只要这些问题能够被激发出来，数字复原就已经超出了展示复制的范畴。',
      '如果说原件代表的是手工巅峰，那么这件数字复原作品代表的，则是一种新的公共解释能力。它把过去只有少数研究者或工匠能接近的结构逻辑，重新翻译成更多人可以阅读、比较和讨论的界面。即使观众最后记不住全部技术细节，也会意识到“十二层”并不是数字上的夸张，而是一整套工艺秩序被稳定建立的结果。',
    ],
    contentBlocksEn: [
      'The phrase “digital restoration” is more accurate here than “digital copy.” A copy suggests surface correspondence, while restoration requires repeated judgment about missing, hidden, or inaccessible parts. In nested puzzle-ball structures, the most significant knowledge often lies precisely in the spaces least visible to direct viewing.',
      'The project begins with capture design rather than modelling alone. Multi-angle photography, macro details, controlled lighting, and rotational viewing are organised to reduce blind spots and preserve evidence for later inference between layers.',
      'Because a twelve-layer object offers limited visual access to its deepest shells, the model necessarily combines direct observation with evidence-based reconstruction. Pattern rhythm, opening size, rotational traces, and comparison with related objects all feed into the digital outcome.',
      'The result is valuable as an open collection object because it supports layered reading. General visitors can begin with the overall form, while advanced users can isolate shells, compare density across depths, and study where structure was conserved for stability.',
      'In digital-collection practice, “concentric” is not only an aesthetic word but also a data principle. Shells must be spatially aligned around a common center or later animations, comparisons, and teaching views become misleading.',
      'Different outputs usually serve different audiences: a lightweight public model, a more detailed research version, and an exploded classroom version. Their shared value lies in making one object readable at multiple levels rather than forcing one final format.',
      'The project also reduces pressure on the original artifact while expanding access to detail. Visitors can examine relationships that would be nearly impossible to see inside a standard display case, while the collection itself remains under more controlled physical conditions.',
      'Most importantly, the restoration turns an admired object into a knowledge interface. Instead of stopping at the fact that it has twelve layers, viewers can ask why certain shells open more sparsely, why support is preserved in some zones, and how pattern changes as the carving moves inward.',
    ],
    keywordsZh: ['数字复原', '十二层结构', '开放数据模型', '分层观察'],
    keywordsEn: ['Digital restoration', 'Twelve-layer structure', 'Open data model', 'Layered viewing'],
    timelineZh: [
      '采集设计：多角度摄影、微距记录与观察通道规划同步展开。',
      '结构推断：结合可见层信息与同类器物经验重建深层关系。',
      '模型分版：形成公共展示版、研究版与教学拆解版等不同输出。',
      '典藏开放：模型进入数字典藏体系，成为可浏览、可教学、可比较的馆藏对象。',
    ],
    timelineEn: [
      'Capture design: multi-angle imaging and viewing-path planning are established first.',
      'Structural inference: deeper layers are reconstructed from visible evidence and comparative knowledge.',
      'Model variants: public, research, and teaching-oriented versions are produced.',
      'Collection access: the model enters the digital archive as a browsable and teachable object.',
    ],
  },
  {
    titleZh: '龙纹透雕外层（纹样库 A-12）',
    titleEn: 'Dragon Openwork Shell (Motif Library A-12)',
    yearZh: '2024 社区共创',
    yearEn: '2024 community',
    descZh: '由创作者上传并经馆方标注的传统纹样切片。',
    descEn: 'Community slice annotated by curatorial team.',
    leadZh:
      '“龙纹透雕外层（纹样库 A-12）”看上去不像一件完整器物，更像一段被截取、编号、重新整理过的结构片段。但正因为它不是完整成品，而是经过社区上传、馆方标注与纹样归档后的“切片型典藏”，它反而非常适合承担知识整理的任务，帮助用户从一个局部进入传统纹样如何组织空间、如何沿球面延展的具体问题。',
    leadEn:
      'The Dragon Openwork Shell in Motif Library A-12 is not a complete artifact in the traditional sense. It is a sliced, numbered, and annotated fragment, and precisely because it is fragmentary, it works well as a knowledge object for showing how motif systems occupy curved space and how a pattern behaves on a shell surface.',
    contentBlocksZh: [
      '在很多数字馆藏项目中，完整器物当然最吸引人，但局部切片往往更适合学习。完整作品会让观众首先被“整体效果”吸走注意力，而纹样切片则把焦点收缩到一段可反复观察的局部关系上，例如龙身如何转折、鳞片如何疏密变化、云纹怎样辅助填充空隙、筋位如何在不破坏题材连贯性的前提下维持结构稳定。',
      '这件 A-12 条目来自社区共创，是一个很有意思的设定。它意味着素材并非完全由馆方单向生产，而是先由创作者上传，再由馆方进行校对、命名、类别归档与解释补充。这样一来，它既保留了民间创作的活跃度，又通过标注体系进入更稳定的知识结构。',
      '从展示价值看，龙纹本身就非常适合做球面纹样研究。龙身具有天然的曲线延展能力，既可以顺着球面环绕，也可以通过头、身、尾的方向变化引导视线绕行。对于鬼工球外层而言，这种“带着观众转一圈”的题材特性非常重要，因为它能把球体的圆转感与图像叙事结合起来。',
      '在这类条目中，透雕外层的意义并不只是“第一层”。它常常负责定义整件作品的观看门槛：开孔是密还是疏，节奏是紧还是松，题材是威严还是灵动，观众是否能透过局部看到更深层内容，都会由外层先给出暗示。把外层单独做成纹样库条目，本身就是在承认它拥有独立的研究价值。',
      '社区共创的加入还带来了一个额外好处，那就是纹样变体可以被更快积累。同样是龙纹，不同创作者可能上传走向更舒展的版本、更重云气包裹的版本、强调鳞片密度的版本、或与几何边界结合得更紧的版本。馆方通过统一标注后，用户就能在同一类目中比较这些差异，而不必依赖零散截图或口头描述。',
      '编号“ A-12 ”这种做法看似冷静，其实非常有用。它把一个原本可能只存在于图像感受中的花纹片段，转化为可以被索引、引用、对比和复用的知识单元。学生在课堂中可以直接引用 A-12 与 A-13 比较，策展说明可以点名引用，后续创作者也能基于编号系统继续上传衍生版本。',
      '从技术上看，球面纹样切片比平面纹样切片更复杂，因为它不仅要记录图案轮廓，还要保留曲率信息、边缘厚薄和与开孔关系。一个看似简单的龙纹外层，真正进入数字归档后，往往需要同时描述主线条、留白区、支撑桥、局部穿插与结构脆弱点。这也是为什么它适合被单独作为典藏内容，而不是只附属于完整器物简介。',
      '从文化语境看，龙纹之所以常见，并不只是因为“好看”或“吉祥”。它还是一种极强的秩序符号，能够在复杂表面上组织方向、层级与主次关系。观众在面对球体时容易失去前后左右的稳定判断，而龙纹的头尾、转身和穿行轨迹恰好能够帮助建立这种观看秩序。',
      '在数字知识库中，这类局部条目的另一个价值，是能帮助平台从“展示结果”走向“展示方法”。用户不再只是看见一张漂亮图片，而是可以知道这一段为何被切出来、它属于哪一类纹样、适合与哪些案例并读、在教学中常被用来说明什么问题。局部片段因此获得了完整的知识角色。',
      '馆方标注也为社区内容提供了必要的质量缓冲。并不是所有上传都天然适合作为公共知识条目，有些版本可能过度装饰，有些命名可能混乱，有些结构可能无法对应真实工艺逻辑。经过标注与筛选之后，平台既保留创作活力，又不会让用户误以为所有视觉片段都具有同样的典藏可信度。',
      '如果把它放进更长的使用链条中看，A-12 这类条目还能成为创作与研究之间的桥梁。研究者可以从中抽取典型转折关系，教师可以把它作为纹样分析练习，创作者可以参考其开孔密度与走势重新设计自己的外层方案。一个局部条目，因而同时服务于看、学、比、做四个动作。',
      '也正是在这种意义上，“往期作品与数字典藏”不必全部是宏大的完整器物。像 A-12 这种中尺度、可编号、可比较、可延展的纹样条目，反而能让知识库更厚。它让用户意识到，典藏并不是只收藏最终结果，也收藏工艺语言被拆解、命名和继续生长的过程。',
    ],
    contentBlocksEn: [
      'Complete objects often dominate attention, but sliced pattern entries are frequently better teaching tools. They narrow the field of view and let users focus on how a dragon line turns, how density changes, and how support is kept without breaking visual continuity.',
      'Because A-12 is community-sourced and curator-annotated, it occupies an especially useful middle ground. It keeps the vitality of public contribution while entering a more stable descriptive system through naming, classification, and interpretation.',
      'Dragon motifs are particularly effective on spherical shells because they naturally wrap, turn, and guide the eye across curved surfaces. That makes them ideal for studying how image narrative and round structure work together.',
      'Treating the outer shell as an independent archive object is important. The outer layer often determines viewing rhythm, perceived density, and the first hint of what lies deeper inside. It is not merely the first layer; it is often the layer that frames the whole reading experience.',
      'A numbered slice such as A-12 also becomes quotable and comparable. Students can cite it, curators can cross-reference it, and later contributors can upload related variants that still belong to a usable pattern family rather than an unstructured image pile.',
      'Digitally, a spherical motif slice is more complex than a flat one because the archive must preserve curvature, edge thickness, openwork relations, and fragile bridge zones. That complexity is exactly why such fragments deserve their own entries.',
      'In a knowledge-base context, entries like this move the platform beyond “showing a nice picture.” They explain why a fragment was isolated, what it can teach, and how it belongs to a broader vocabulary of making, studying, and designing.',
    ],
    keywordsZh: ['龙纹', '纹样切片', '社区共创', '曲面透雕'],
    keywordsEn: ['Dragon motif', 'Pattern slice', 'Community co-creation', 'Curved openwork'],
    timelineZh: [
      '社区上传：创作者提交龙纹外层片段与基础说明。',
      '馆方标注：平台完成命名、类别归档与结构注记。',
      '纹样入库：条目以 A-12 编号进入可检索纹样库。',
      '教学复用：该条目被用于对比分析、创作参考与课堂讲解。',
    ],
    timelineEn: [
      'Community upload: contributors submit the dragon-shell fragment and base notes.',
      'Curatorial annotation: naming, classification, and structural comments are added.',
      'Library entry: the slice becomes a searchable item under the A-12 index.',
      'Educational reuse: it supports comparison, design reference, and teaching explanation.',
    ],
  },
  {
    titleZh: '内层球体爆炸拆解教学包',
    titleEn: 'Exploded Shell Teaching Pack',
    yearZh: '2023 教育合作',
    yearEn: '2023 education',
    descZh: '面向工艺课程的分层动画与习题（示意）。',
    descEn: 'Layered animations & exercises for craft courses (mock).',
    leadZh:
      '“内层球体爆炸拆解教学包”是一类非常典型的教育型数字典藏成果。它不像传统馆藏那样强调单件原作的庄重展示，而是更接近一套围绕理解难点设计出来的教学工具组合：动画、分层图、结构标记、观察题和讨论题被组织在一起，目标不是让学生记住某件作品的名字，而是让他们真正看懂内层空间是如何被建立出来的。',
    leadEn:
      'The Exploded Shell Teaching Pack is a strongly educational form of digital collection. Instead of centering on the prestige of a single original artifact, it groups animations, layered diagrams, structure labels, and guided exercises into a package designed to help learners actually understand how inner spatial relations are built.',
    contentBlocksZh: [
      '对于鬼工球教学来说，最难讲清的部分往往不是外层，而是内层。外层至少还能直接看到开孔和纹样，而内层的结构判断、旋转关系和避让逻辑，若只靠口头说明，学生很容易形成模糊印象。所谓“爆炸拆解”，正是把原本套叠在一起的层级沿共同中心依次拉开，让隐藏关系变成可见关系。',
      '一个成熟的教学包通常不会只给出一张爆炸图，而是提供多种观察方式。例如按层数拆开、按制作顺序拆开、按纹样关系拆开，或者固定某一层不动、观察其他层如何围绕它展开。不同拆法服务于不同问题，也让学生意识到同一件作品并不存在唯一的“正确看法”。',
      '教育合作项目之所以重要，是因为课堂环境和博物馆环境面对的是不同任务。展览更强调激发兴趣与整体感受，课堂则需要可重复解释、可操作练习和可检测理解。把馆藏内容重新打包成教学包，意味着项目团队已经开始把“好看”进一步翻译成“能教、能学、能复盘”。',
      '在这类教学包里，动画往往比静态图片更关键。因为内层结构的难点不只是“长什么样”，而是“怎样从外向内发生”。如果动画能展示某一层先定位、另一层再开透、某些筋位最后才被释放，学生就更容易把时间顺序与空间关系同时记住，而不是把所有层混成一团复杂花纹。',
      '习题的作用也不只是检查记忆。好的习题会要求学生判断哪一层更适合先开口、哪一处支撑不能提前去掉、哪种纹样安排更可能导致内层卡滞，甚至要求他们根据爆炸图反推某些制作步骤。这些题目迫使学习者从“看懂图”进入“尝试做判断”的状态。',
      '从课程组织上看，这类教学包可以被切成多个教学节奏。教师可以在第一节课先用简化版爆炸图建立概念，在第二节课加入真实馆藏案例，在第三节课让学生对照模型完成标注练习，最后再回到完整作品做综合讨论。数字典藏因此不仅是内容来源，也是课程结构的骨架。',
      '这一成果之所以被放进“往期作品与数字典藏”，也说明典藏不必只围绕“物”。一个高质量教学包虽然不是传统意义上的单件文物，却同样值得被长期保存，因为它记录了某一阶段平台如何理解、拆解并传播工艺知识的方法。它收藏的是解释能力，而不只是图像文件。',
      '教学包还有一个现实优势，就是非常适合不同基础的用户使用。初学者可以只看分层顺序和大轮廓，进阶学习者可以关注每层厚薄与旋转空间，教师和研究者则可以把它当作结构示意的公共底图。一个资源被多个层级同时使用，正是数字典藏效能很高的表现。',
      '从平台设计角度看，这类内容还可以自然延伸到互动题、课堂讨论和作业提交。学生在看完拆解动画后，可以直接进入标注练习、排序题或短答反思；教师则能据此追踪学生是否真正理解“由外到内”“保留支撑”“分阶段细化”等关键原则。内容和交互因此形成闭环。',
      '如果说完整器物展示强调的是“结果如何惊人”，那么爆炸拆解教学包强调的就是“过程如何成立”。这两者并不冲突，而是共同构成公众理解传统工艺的两条腿。前者负责吸引人驻足，后者负责让人真的学到东西。只有两者都存在，数字馆藏才不会停留在视觉奇观层面。',
      '也因此，这类条目即使带有明显的教学工具属性，也完全值得写得足够详细。它不仅服务某一次课堂合作，还能成为后续课程、工作坊、导览乃至跨学科讨论的通用底座。典藏系统若能持续保留这类“解释型成果”，整个知识库就会从对象陈列逐渐成长为可持续学习环境。',
      '对于浏览者来说，点开这类条目时看到的不应只是“附带练习的动画包”，而应是一个把复杂工艺拆解为可学习单元的公共装置。它让人意识到，真正高质量的数字典藏，并不只是把原件搬上屏幕，更是把原本难以进入的理解路径也一起搬了出来。',
    ],
    contentBlocksEn: [
      'In puzzle-ball education, inner shells are much harder to teach than outer ones. Outer openings can at least be seen directly, but inner structure, clearance, and sequencing often remain vague if explained only in words. Exploded views make hidden relations visible.',
      'A strong teaching pack usually offers several modes of separation: by shell order, by making order, by motif relation, or by fixing one layer while others move around it. Different decompositions answer different questions.',
      'This is where educational collaboration matters. Exhibition content is designed to attract and orient; classroom content must support repetition, exercise, and measurable understanding. The teaching pack translates admiration into teachable sequence.',
      'Animation is especially useful because the difficulty lies not only in what inner shells look like, but in how they come into being from the outside inward. Time order and spatial order become legible together.',
      'Exercises then move learners from recognition to judgment. Instead of merely naming layers, students can predict which support must remain, where opening should wait, or how a poor arrangement might cause later blockage.',
      'As a digital-collection artifact, the pack preserves not only content but interpretation method. It records how one phase of the platform chose to explain difficult craft knowledge, and that explanatory method is itself worth archiving.',
      'For users, this means the entry functions as more than an educational attachment. It becomes a reusable public device for turning complex process into learnable units across courses, workshops, and guided tours.',
    ],
    keywordsZh: ['爆炸拆解', '教学包', '分层动画', '课堂练习'],
    keywordsEn: ['Exploded view', 'Teaching pack', 'Layered animation', 'Classroom exercise'],
    timelineZh: [
      '教育合作立项：围绕工艺课程需求整理教学难点与目标。',
      '资源制作：完成分层动画、爆炸图与配套习题设计。',
      '课堂试用：在教学场景中验证理解效果与讲解节奏。',
      '典藏沉淀：教学包作为可复用数字资源进入平台收藏体系。',
    ],
    timelineEn: [
      'Project setup: teaching goals and difficult concepts are identified with course partners.',
      'Resource production: animations, exploded views, and exercises are created.',
      'Classroom trial: the pack is tested in live teaching scenarios.',
      'Archive inclusion: the package becomes a reusable educational collection asset.',
    ],
  },
  {
    titleZh: '五层象牙球复原研究报告',
    titleEn: 'Five-Layer Ivory Ball Restoration Report',
    yearZh: '2022 学术合作',
    yearEn: '2022 academic',
    descZh: '联合高校对清代五层象牙球的数字化测量与工艺路径复原。',
    descEn: 'Joint digitization and craft-path reconstruction of a Qing-era ivory puzzle ball.',
    leadZh:
      '“五层象牙球复原研究报告”比前几项更明显地带有学术合作色彩。它不只是给观众看的展示内容，也不是面向初学者的教学包，而是一份围绕测量、比对、工艺推断与修复逻辑展开的综合性研究成果。放进数字典藏系统后，它让平台拥有了一种更接近研究档案的深度层级。',
    leadEn:
      'The Five-Layer Ivory Ball Restoration Report has a more overt academic character than the other entries. It is not only a public display item and not simply a teaching asset, but a research-oriented record combining measurement, comparison, process inference, and restoration reasoning.',
    contentBlocksZh: [
      '五层结构在数量上不像十二层那样夸张，但在研究上却非常合适。层数适中意味着许多关键关系仍然可以被较清楚地观察和比对，同时又足够复杂，能够承载关于开窗顺序、纹样递进、受力分配和层间旋转的系统讨论。对于学术合作来说，这类对象往往比极端复杂或极端简单的案例都更适合建立方法论。',
      '所谓“复原研究报告”，核心并不在于给出一个绝对确定的答案，而是在于把研究路径清楚呈现出来。团队通常需要说明哪些数据来自直接测量，哪些判断来自局部对照，哪些结构属于高置信度推断，哪些地方仍然存在不确定性。报告写作本身，就是把研究过程转化为可被他人复核的证据链。',
      '数字化测量在这里扮演的角色非常关键。它帮助研究者把肉眼难以稳定比较的细节转化为可记录、可复用的参数，例如开孔尺度、层厚变化、局部偏心、旋转间隙与纹样重复节奏。只有当这些细节能够被稳定讨论，工艺路径复原才不会停留在经验印象上。',
      '这类报告往往还会结合历史图录、同类器物、工艺文献与馆藏修复记录共同分析。单一对象当然重要，但真正有说服力的结论往往来自比较：为什么这一件的层间留量与另一件不同，为什么某一时期更偏好特定开窗形式，为什么某些纹样安排在五层系统中更常出现。比较视野让个案不再孤立。',
      '从工艺路径复原角度看，研究报告最有价值的部分之一，是把“可能的制作顺序”拆成多个阶段说明。研究者不会满足于说“它应该是从外到内做的”，而会进一步讨论外层如何先建立定位、第二层何时扩大开口、第三层如何为旋转预留回避区域、最后几层怎样完成细部调整。这些推断使工艺讨论真正具体起来。',
      '报告还可能涉及修复与保存史。许多馆藏对象并不是以“出土即完美”的状态进入今天的研究系统，而是经历过清理、转手、保存环境变化甚至早期修补。数字典藏若能把这些历史层也记录下来，观众和研究者就会知道自己面对的不是一个抽象范本，而是一件在时间中不断被影响的真实对象。',
      '把研究报告放进公共平台还有一个很重要的意义，就是缩短研究档案与公共认知之间的距离。传统上，这类材料往往只存在于论文、档案室或内部报告中，公众很难接触。数字化之后，即使不是全文开放，至少也可以通过摘要、图解、关键结论和结构示意让更多人知道研究是如何发生的。',
      '当然，学术合作条目也需要在公开时处理好伦理和权限边界。哪些原始数据适合公开，哪些图像需要限制分发，哪些推断仍处在讨论阶段，哪些引用必须带有明确出处，这些问题都决定了研究成果能否在公共平台上既可读又可信。典藏系统在这里不只是展示空间，也是治理空间。',
      '如果将其与前面的教学包或社区纹样条目相比，这份研究报告的风格会显得更慢、更重、更谨慎。但正是这种“慢”构成了平台知识层次的底部支撑。没有研究层提供的参数、证据与方法，很多面向公众的解释最终都会重新滑回模糊印象和空泛赞叹。',
      '在用户体验上，这类条目并不一定要做得很“学术难懂”。恰当的做法是把复杂信息分层：先给一段公共导语，再给结构结论，再给少量关键图解，最后允许更专业的读者进一步下钻。这样既不会牺牲研究严肃性，也不会让普通观众在第一屏就被门槛拦住。',
      '从数字典藏的长期建设看，这种研究型条目尤其重要，因为它为未来扩展留下了接口。以后若补充新的测量数据、新的比较案例或新的学术意见，只要条目结构清楚，就能持续迭代。它不是一次性发布物，而是一份可以伴随研究进展继续生长的档案节点。',
      '因此，“五层象牙球复原研究报告”的意义，不只是说明某件清代器物曾被研究过，而是展示平台愿意把研究过程本身也纳入收藏视野。对公众而言，这让“典藏”不再只是看结果；对平台而言，这让内容体系拥有了更稳的学术根基。即使用户只是快速浏览，也会感受到这里不仅有漂亮图像，还有支撑这些图像解释成立的方法与证据。',
    ],
    contentBlocksEn: [
      'A five-layer object may sound less dramatic than a twelve-layer one, but it is often ideal for research. It remains complex enough to sustain serious discussion while still allowing clearer comparison across openings, shell thickness, rotation, and process sequence.',
      'The value of a restoration report lies not in claiming absolute certainty but in showing the path of inquiry. Good reports distinguish direct measurement from comparative judgment, high-confidence reconstruction from unresolved uncertainty, and observation from inference.',
      'Digital measurement is crucial because it stabilises details that are difficult to compare by eye alone: opening scale, thickness change, eccentricity, rotational clearance, and pattern rhythm. Once these become discussable parameters, craft-path reconstruction becomes more rigorous.',
      'Research reports also gain strength from comparison with catalogues, related objects, craft writing, and conservation records. A single object matters, but convincing interpretation usually comes from seeing how one case aligns with or departs from a broader field.',
      'Public access to this kind of report narrows the gap between specialist archives and general understanding. Even when full data is not openly released, summaries, diagrams, and key conclusions allow more users to see how scholarly interpretation is built.',
      'Compared with educational or community entries, a research report is slower and more cautious in tone. That caution is valuable. It forms the deep support layer beneath more public-facing storytelling and keeps the archive from collapsing into admiration without evidence.',
      'As a digital-collection entry, the report is also future-facing. New measurements, new comparisons, and new academic views can extend it over time, making it a living node in the archive rather than a one-time publication.',
    ],
    keywordsZh: ['研究报告', '数字测量', '工艺路径复原', '学术合作'],
    keywordsEn: ['Research report', 'Digital measurement', 'Craft-path reconstruction', 'Academic collaboration'],
    timelineZh: [
      '项目启动：馆方与高校围绕清代五层器物建立联合研究目标。',
      '数据测量：完成关键尺寸、层间关系与局部结构的数字记录。',
      '路径推断：结合比较材料提出可能的制作与修复逻辑。',
      '报告归档：研究成果整理为可摘要展示的数字典藏条目。',
    ],
    timelineEn: [
      'Project launch: museum and university partners define a joint research agenda.',
      'Measurement stage: shell relations, dimensions, and local structures are digitally recorded.',
      'Path inference: comparative materials support proposed making and restoration logic.',
      'Archive report: the findings are condensed into a digital collection entry for long-term access.',
    ],
  },
]

export const museumKnowledge: MuseumKnowledge[] = [
  {
    titleZh: '什么是「鬼工」？',
    titleEn: 'What is “Guigong”?',
    summaryZh: '形容技艺神妙、非人力可及的镂空与套层工艺，强调同心与通透。',
    summaryEn: 'A term for uncanny openwork and nesting—concentric, translucent, precise.',
    leadZh:
      '“鬼工”不是某一件器物的固定名称，而是一种赞叹式的工艺评价。它常被用来形容那些细密到近乎不可思议、层层相套却依然通透灵动的雕刻成果，尤其适合指向鬼工球这类同时要求结构、耐心与审美判断的高难度作品。',
    leadEn:
      '“Guigong” is not the official name of a single object but a term of admiration for workmanship that feels almost beyond ordinary human ability. It is especially suited to layered openwork objects such as puzzle balls, where structure, patience, and aesthetic judgment must all succeed at once.',
    contentBlocksZh: [
      '从字面上看，“鬼工”带有明显的夸饰色彩。“鬼”并不真的指神怪，而是借一种超常、难测、令人惊叹的想象，来强调技艺已经突破了日常经验中的“手工极限”；“工”则落回手艺本身，提醒人们这份惊奇最终仍然来自长期训练、材料理解与工具控制。',
      '因此，“鬼工”首先是一种观看方式。观者面对作品时，不仅看见表面的花纹，更会本能地追问：这些层层相扣的空间是怎样被打开的？内部的球层为何能够转动却不脱落？细小纹样为何没有在加工时整体崩裂？当这些问题同时出现时，“鬼工”这个词也就自然浮现出来。',
      '在鬼工球的审美经验中，“同心”与“通透”是最重要的两条线索。同心意味着每一层球壳都围绕同一中心建立秩序，作品因此拥有稳定的结构逻辑；通透则意味着雕刻并不是简单地挖空，而是通过开窗、留筋、穿插与避让，让光线、视线与旋转路径共同构成作品的节奏。',
      '也正因为如此，鬼工球并不只是“复杂”而已。真正成熟的作品往往会把复杂隐藏起来，让观者首先感受到的是轻盈、匀称与呼吸感。外层纹样不能一味求满，内层变化也不能只靠数量取胜，层与层之间必须既有关联又有差异，这才会让人感到它不是堆砌，而是被精确组织过的空间。',
      '从工艺对象的角度看，鬼工球之所以常被当作技艺象征，是因为它把多个传统手工判断同时压缩在一个小尺度之内。匠人既要考虑刀路推进的顺序，也要判断局部受力后的整体反应，还要为后续层次预留足够的开口和旋转余量。它不是单点炫技，而是连续决策的结果。',
      '民间赞誉里常把这类作品称为“鬼斧神工”，说明人们对它的惊叹并不仅来自制作难度，也来自它所呈现出的秩序感。一个优秀的鬼工球会让观看者觉得内部空间像是自然生长出来的，而不是被暴力剖开出来的。这种“像天生如此”的完成度，正是“鬼工”一词的文化力量所在。',
      '如果把它放回更大的岭南工艺语境中，“鬼工”也可以被理解为一种对细作传统的集中表达。岭南地区长期重视精巧、玲珑、可近赏的工艺趣味，许多器物都强调细部经营、通景关系与手上分寸。鬼工球之所以能够成为代表，并不是因为它孤立存在，而是因为它把这种审美传统推到了极致。',
      '在今天的展览叙事中，“鬼工”还承担着解释门槛的作用。面对年轻观众或非专业观众，策展语言若只说“多层球体雕刻”，常常不足以传达作品的难度与魅力；而“鬼工”这个词能迅速建立情绪强度，让观众意识到自己面对的不是普通装饰品，而是一种凝缩了技术、想象与时间的文化对象。',
      '不过，数字时代对“鬼工”的理解也在发生变化。过去观众主要通过成品表面来想象内部结构，如今则可以借助三维模型、爆炸图、分层动画与可交互剖面去“进入”器物内部。这样一来，“鬼工”不再只是不可言说的神秘感，它也能被拆解、被解释、被教学，转化为可学习的知识路径。',
      '这并不意味着神秘感会消失。恰恰相反，当人们真正看清一件作品需要经过多少次判断、多少次避险、多少次修正之后，反而更能理解前人为何要用带有传奇意味的词语来命名它。数字工具把工艺过程讲明白，并不是为了消解赞叹，而是让赞叹拥有更扎实的依据。',
      '所以，今天在知识库中解释“鬼工”，既要保留它作为文化赞语的温度，也要补上它作为工艺概念的清晰度。只有当观众同时理解“为什么令人惊叹”与“究竟难在何处”，这个词条才真正完成了从展陈标题到公共知识的转化。',
    ],
    contentBlocksEn: [
      'At the level of language, the term carries deliberate exaggeration. “Gui” evokes something uncanny or extraordinary, while “gong” returns us to craft itself, reminding us that the marvel still comes from trained hands, practiced judgment, and repeated control over tools and material.',
      'That makes “Guigong” a way of seeing as much as a way of naming. Viewers do not simply notice decoration; they begin to ask how nested layers were opened, why inner shells can rotate without falling apart, and how delicate patterns survived the making process. The word appears at the moment technique becomes almost unimaginable.',
      'Within puzzle-ball aesthetics, concentric order and visual transparency are the key principles. Concentricity gives the object structural calm, while transparency is achieved not by hollowing at random but by balancing openings, bridges, circulation of light, and the paths through which the eye travels.',
      'A mature work therefore hides its complexity rather than shouting it. The best examples feel light, even breathable. Outer patterns cannot be crowded for the sake of density alone, and inner layers cannot rely only on quantity. Each shell must relate to the others while keeping its own visual role.',
      'From a making perspective, the puzzle ball is admired because it compresses many kinds of decision-making into a very small scale. The maker must think about sequence, stress response, future access, rotational clearance, and decorative rhythm all at once. It is not a single trick but a chain of linked judgments.',
      'Historically, praise such as “ghostly” or “divine” workmanship reflects more than difficulty. It reflects a sense that the finished object possesses order without visible strain. The layers seem to have grown from within rather than having been forced apart, and that illusion of effortless completion is central to the cultural force of the term.',
      'In a broader Lingnan context, “Guigong” can also stand for a regional preference for precision, refinement, and close-up appreciation. Puzzle balls became emblematic not because they existed in isolation, but because they pushed those values to an extreme point where structure and ornament became inseparable.',
      'Today, digital interpretation changes how the term is understood. Earlier audiences had to imagine inner structure from the outer surface. Now 3D models, exploded diagrams, and interactive cross-sections allow viewers to enter the object conceptually. “Guigong” becomes explainable without becoming ordinary.',
      'That is the main reason to include the term in a public knowledge base. We preserve its emotional force as a word of wonder, but we also give it analytical clarity. A strong entry should help readers understand both why the object inspires awe and where, precisely, that difficulty resides.',
    ],
    keywordsZh: ['鬼工球', '套层镂空', '同心结构', '岭南牙雕'],
    keywordsEn: ['Puzzle ball', 'Nested openwork', 'Concentric structure', 'Lingnan carving'],
    timelineZh: [
      '观念形成：以“鬼斧神工”类赞语形容超常细作，逐步凝聚为“鬼工”式审美判断。',
      '工艺代表化：多层套球因结构难度高、观赏性强，成为“鬼工”最具代表性的器物门类之一。',
      '展陈解释期：博物馆与公共教育开始把“鬼工”从赞叹性词语转化为可讲解的工艺概念。',
      '数字转译期：三维建模、分层动画与交互剖面让“鬼工”从成品观看扩展到过程理解。',
    ],
    timelineEn: [
      'Term of admiration: praise for almost unbelievable fine work gradually condenses into a recognisable craft label.',
      'Representative object: nested puzzle balls become one of the clearest material examples of “Guigong” skill.',
      'Museum interpretation: curatorial and educational writing begins to explain the term rather than merely repeat it.',
      'Digital translation: 3D models and layered views expand understanding from finished appearance to making process.',
    ],
  },
  {
    titleZh: '多层球体的应力与开洞顺序',
    titleEn: 'Stress & drilling order',
    summaryZh: '外层开窗影响内层强度；教学上常从粗到细、从外到内分阶段完成。',
    summaryEn: 'Outer cuts affect inner shells; teaching follows coarse-to-fine, outside-in.',
    leadZh:
      '鬼工球最容易被外行低估的一点，是它并不是把一颗球“慢慢掏空”那么简单。多层球体之所以难，在于每开一个孔、每去掉一条筋、每改变一次厚薄分布，都会重新分配整件作品的受力状态；工艺顺序因此不是附属问题，而是结构能否成立的核心。',
    leadEn:
      'One of the easiest misunderstandings about puzzle balls is to imagine them as objects that are simply hollowed out little by little. In reality, every opening, every bridge removed, and every change in wall thickness redistributes stress across the object. Sequence is therefore not a secondary matter but one of the main reasons the structure survives.',
    contentBlocksZh: [
      '从结构上看，多层球体像一组彼此嵌套的薄壳系统。外层承担最直接的碰撞与握持压力，中层负责连接视觉密度与内部旋转空间，内层则往往最能暴露加工精度。一旦某一层的开孔比例过大、厚薄差异过急，局部强度下降就可能通过连锁反应影响相邻层。',
      '这也是为什么工艺教学总强调“先判断整体，再处理局部”。对于初学者来说，最危险的不是刀不够快，而是急于做出漂亮纹样，在外层过早切掉关键支撑。表面上看只是多开了一扇窗，实际上可能已经削弱了后续定位、转向和修整所依赖的稳定骨架。',
      '开洞顺序之所以重要，还因为工具进入路径本身受到限制。鬼工球不是平面镂空，内层加工必须借助外层已有的孔道完成。也就是说，外层开口既是视觉设计，也是工具通道。孔位过窄，后续刀具无法调整角度；孔位过大，又可能导致外层视觉节奏被提前破坏。',
      '传统经验中常见“由粗到细、由外到内、由定位到装饰”的基本原则。先建立球体的中心、分区和主要开口，再逐步向内推进，在每一层保留足够的结构余量，最后才进入纹样细化和表面修整。这不是保守做法，而是一种把风险分散到多个阶段的工艺逻辑。',
      '应力控制并不只发生在“切削”时，也发生在“保留”时。匠人需要知道哪些筋位必须暂留，哪些地方可以晚一点再透开，哪些纹样必须改变方向以绕开脆弱区域。很多成熟作品看上去纹路自由流动，实际上背后往往隐藏着极为克制的结构保守主义。',
      '从失败案例来看，常见问题包括外层开窗过密导致整体发软、层间厚度不均导致局部偏心、内层旋转空间预留不足导致层与层互相卡滞，以及为了追求视觉对称而忽略刀具真实进入角度，最后在转折处形成不可修复的崩口。这些问题往往不是最后一步造成，而是在前几步就已经埋下。',
      '因此，经验丰富的工匠很少把工序理解为一条直线。他们会不断在“继续向内”与“返回修外层”之间切换，像是在不同深度之间来回校正。某一层的纹样密度、开口边界和旋转余量，都需要结合下一层的可操作性一起考虑。这种跨层判断，正是鬼工球难以用单张流程图讲清楚的地方。',
      '在现代教学中，数字模拟能帮助初学者更直观地理解这些关系。通过爆炸图、透明剖面或简化受力示意，学习者可以先看到“如果这里提前开透会发生什么”，再进入真实材料操作。这种前置理解能减少把珍贵练习时间浪费在重复性失误上的概率。',
      '不过，数字模型并不能取代手上经验。真实材料存在纹理、弹性、微裂与工具回弹，很多风险是屏幕上难以完整显示的。理想的教学方式不是用数字模型替代工艺，而是让它承担“预判与复盘”的角色：在下刀前帮助建立路径想象，在失败后帮助定位错误原因。',
      '从展示角度看，讲清“应力与开洞顺序”也有助于观众理解为什么鬼工球不只是“雕得很细”。真正困难的地方并非细，而是细必须建立在结构连续成立的前提上。每一处通透都以另一处保留为代价，每一次向内推进都在消耗可逆空间，这正是它区别于一般表面雕饰的地方。',
      '所以，知识库在呈现这一主题时，不应只展示完成后的密集花纹，更应帮助观众看见看不见的那部分：被保留下来的筋位、被延后的开口、被重新规划的刀路，以及那些为了让成品成立而做出的“少做一点”的决定。很多时候，工艺智慧恰恰体现在克制之中。',
    ],
    contentBlocksEn: [
      'Structurally, a puzzle ball behaves like a set of nested thin shells. The outer shell receives the most direct handling pressure, middle shells balance density and access, and inner shells often reveal the highest demands on precision. Weakness in one layer can quickly affect the others.',
      'That is why teaching begins with the whole before the detail. Beginners often fail not because tools are blunt, but because they rush into beautiful openings too early and remove support that later steps still require. A single extra window may look harmless while quietly destabilising the entire working process.',
      'Openings matter because they are also tool paths. Inner shells can only be reached through holes already established in the layers outside them. An outer opening is therefore both a visual decision and an access decision. Too narrow, and tools cannot move; too wide, and the visual rhythm is broken too early.',
      'Traditional instruction often follows a coarse-to-fine, outside-in, structure-before-ornament sequence. Main access points, divisions, and shell logic are secured first. Decorative refinement comes later, once each layer still retains enough material to remain reliable under continued work.',
      'Stress control also depends on what is deliberately left in place. Makers must know which bridges should remain temporary, which openings should wait, and where patterns must bend around fragile zones. Works that appear free and flowing often rest on very conservative structural choices.',
      'Typical failures include over-opened outer shells, uneven thickness between layers, insufficient rotational clearance, and symmetry pursued without regard for the real angle of tool entry. Most such failures do not begin at the final step; they were seeded several decisions earlier.',
      'Digital teaching tools can clarify these relations by showing exploded views, transparent sections, and simplified what-if scenarios before real material is touched. They are most valuable when used for anticipation and review rather than as a substitute for the tactile intelligence of handwork.',
      'For museum interpretation, this topic is essential because it explains why the craft is not merely “very detailed.” Its true difficulty lies in making delicacy coexist with structural continuity. Every opening is paid for by something retained, and every deeper move consumes some degree of reversibility.',
    ],
    keywordsZh: ['应力分配', '开洞顺序', '刀路规划', '层间余量'],
    keywordsEn: ['Stress distribution', 'Opening order', 'Tool-path planning', 'Layer clearance'],
    timelineZh: [
      '经验积累期：师徒传承中形成“由外到内、由粗到细”的基本工序认知。',
      '教学总结期：工艺教学开始把开口、旋转与受力关系拆分成可讲授的步骤原则。',
      '数字辅助期：爆炸图与透明分层模型被用于帮助初学者理解跨层结构约束。',
      '展示解释期：博物馆开始把工序顺序作为公众理解鬼工球难度的重要切入点。',
    ],
    timelineEn: [
      'Workshop tradition: makers develop outside-in and coarse-to-fine sequencing through practice.',
      'Teaching formalisation: access, rotation, and stress are summarised into teachable procedural rules.',
      'Digital assistance: exploded and transparent models help beginners grasp cross-layer constraints.',
      'Public interpretation: museums use process order to explain why the craft is structurally demanding.',
    ],
  },
  {
    titleZh: '数字化传承的伦理与材料',
    titleEn: 'Ethics & materials in digitization',
    summaryZh: '数字复原可规避野生动物制品风险，强调文化阐释与开源协作。',
    summaryEn: 'Digital craft avoids wildlife risk; foreground culture and open collaboration.',
    leadZh:
      '当鬼工球进入数字化展示与教学语境时，最敏感的问题往往不是“能不能做出更逼真的模型”，而是“我们究竟在传承什么”。如果只复制材料表面，却回避其伦理背景，数字化就可能变成一种无反思的再包装；如果只谈伦理而不谈工艺机制，传承又会失去具体内容。',
    leadEn:
      'Once puzzle-ball heritage enters digital exhibition and teaching, the central question is often not whether we can build a more realistic model, but what exactly is being transmitted. If digitisation copies the surface of historical material while avoiding its ethical context, it becomes uncritical repackaging. If it speaks only of ethics and not of process, transmission loses substance.',
    contentBlocksZh: [
      '讨论数字化传承，首先要承认历史材料与当代价值之间并不天然一致。部分传统器物依赖的材料，在今天已经涉及野生动物保护、国际贸易限制与公众伦理判断。也就是说，历史上真实存在过的工艺条件，并不等于今天仍适合作为推广、教学与消费的默认前提。',
      '这并不意味着相关器物失去研究价值。恰恰相反，越是处于伦理张力中的对象，越需要被清楚、负责任地解释。数字化在这里的第一层意义，不是替代所有研究，而是为公众提供一种不继续消耗敏感材料、也能进入工艺结构与文化语境的方式。',
      '对于博物馆和教育平台而言，重要的是区分“展示历史对象”与“鼓励复制材料”这两件事。前者关注的是如何说明其时代背景、工艺逻辑与收藏路径；后者则可能无意中把注意力重新引向材料本身的稀缺性与猎奇性。好的数字转译，应当把焦点从“珍稀材质”转回“复杂工艺与文化叙事”。',
      '因此，数字复原最有价值的部分往往不是表面的高精度贴图，而是那些能解释工艺机制的结构信息。例如层与层的关系、开窗顺序、纹样生成逻辑、旋转余量、修复痕迹与后期标注。它们帮助观众理解作品为什么成立，而不是只惊叹于它“看起来像真的”。',
      '伦理问题还体现在叙述方式上。如果平台只用“绝世珍品”“稀世奇工”之类的语言不断强化稀缺与神秘，却不说明材料来源、时代制度与当代保护边界，就容易把历史对象浪漫化。相反，负责任的知识库会把赞叹与说明并置，让观众知道何者值得欣赏，何者需要保持距离与反思。',
      '数字化传承也不是简单把文件上传到网上。所谓“开放”必须伴随清楚的边界：哪些模型可用于教学，哪些图像仅供浏览，哪些元数据可以再利用，哪些需要保留出处与版权声明。没有授权策略的开放，既可能伤害原始机构，也会让后续引用失去可信度。',
      '从材料替代的角度看，数字技术提供了一个重要转向。它让工艺训练可以围绕结构理解、刀路逻辑和空间组织展开，而不必绑定某一种历史材料。学习者可以通过树脂、木材、可切削复合材料甚至纯数字雕刻去练习层套关系，从而把“传承”从材料依赖中部分解放出来。',
      '但这里也需要避免另一个误区：材料替代并不自动等于传承完成。真正被传承的，不只是一个外形轮廓，而是与材料交互时形成的判断体系，包括何时留筋、何时避让、何时收口、何时停止。数字化能帮助保存这些判断的描述，却仍需要靠教学设计让它们重新进入实践。',
      '所以，“工艺传承”与“材料替代”不是同一问题。前者关心的是知识、步骤、语汇与审美标准能否延续；后者关心的是在当代伦理条件下，是否存在更可接受的媒介去承载这些内容。两者有交集，但不能互相替代。一个平台如果只提供漂亮模型而没有解释路径，实际上只完成了展示，没有完成传承。',
      '理想的数字知识库，应当同时承担三项任务：第一，尊重历史对象的复杂性，不回避材料争议；第二，把真正值得学习的工艺结构与文化背景讲清楚；第三，为再利用建立明确规则，让教师、学生与公众知道自己可以如何合法、合伦理地使用这些内容。',
      '在这个意义上，数字化不是对传统的稀释，而是一次重新校准。它迫使我们区分什么是不可继续复制的历史条件，什么是仍然值得传播的工艺智慧，什么是需要被放进当代公共讨论中的伦理前提。只有完成这层校准，数字传承才不只是“保存”，而是真正面向未来的再阐释。',
    ],
    contentBlocksEn: [
      'Any discussion of digital transmission must begin by recognising that historical material conditions and present-day values are not automatically aligned. Some materials once used in prestigious craft now sit within modern frameworks of wildlife protection, trade restriction, and public ethical scrutiny.',
      'That does not remove such objects from scholarship. It increases the need for careful interpretation. Digitisation is valuable here because it offers access to structure and cultural meaning without requiring further circulation or celebration of sensitive material as a desirable commodity.',
      'Museums and educational platforms must distinguish between presenting a historical object and encouraging the replication of its material prestige. Strong digital interpretation shifts attention away from rarity and toward process, structure, technique, and context.',
      'For that reason, the most valuable digital asset is often not the most photorealistic surface, but the most legible structural explanation: shell relationships, opening order, pattern logic, rotational allowance, repairs, annotations, and documented uncertainties.',
      'Ethics also lives in language. If a platform keeps repeating phrases of rarity and mystery without explaining material provenance, historical systems, or present-day limits, it romanticises the object. Responsible writing keeps admiration and explanation side by side.',
      'Open access requires boundaries. Some assets may be suitable for teaching reuse, some only for viewing, and some only with clear attribution or rights controls. Openness without licensing clarity weakens both legal trust and scholarly reuse.',
      'Digital workflows also support material substitution. Training can focus on spatial logic, tool sequence, and nested structure using resin, wood, composite media, or purely virtual carving environments. This helps separate craft knowledge from dependence on a historical material.',
      'Still, substitution is not the same as transmission. What must be carried forward is not just form, but judgment: when to leave support, when to avoid a fragile zone, when to close a cut, and when to stop. A good knowledge base therefore preserves ethical clarity and procedural intelligence together.',
    ],
    keywordsZh: ['数字复原', '伦理阐释', '材料替代', '开放授权'],
    keywordsEn: ['Digital restoration', 'Ethical interpretation', 'Material substitution', 'Open licensing'],
    timelineZh: [
      '历史对象阶段：传统器物在原有材料条件下形成工艺高峰与收藏价值。',
      '伦理转折阶段：野生动物保护与公众伦理意识提升，促使展示方式重新评估。',
      '数字复原阶段：三维扫描、建模与分层演示成为替代性传播的重要工具。',
      '规范建设阶段：平台开始重视版权、授权、再利用边界与教育语境说明。',
    ],
    timelineEn: [
      'Historical object stage: craft prestige forms under earlier material conditions.',
      'Ethical turning point: conservation law and public ethics require reinterpretation of display practice.',
      'Digital restoration stage: scans, models, and layered demonstrations become key transmission tools.',
      'Governance stage: licensing, attribution, and educational reuse rules become part of the heritage workflow.',
    ],
  },
  {
    titleZh: '地域流派与命名差异',
    titleEn: 'Regional Schools & Naming',
    summaryZh: '广州、潮州、福建各有工艺传承脉络，同类器物因地域而名称各异。',
    summaryEn: 'Guangzhou, Chaozhou, and Fujian each carry distinct lineages; similar objects bear different local names.',
    leadZh:
      '许多观众第一次接触传统工艺时，容易以为“一个器物就对应一个标准名称”。但真正进入地方工艺脉络后就会发现，名称、分类和流派从来不是整齐划一的。相似的器物可能因为行话、地域、用途和传播路径不同而拥有不同称呼，而这些差异本身就是文化信息的一部分。',
    leadEn:
      'Many first-time viewers assume that one type of object should correspond to one standard name. Once we move into regional craft lineages, that assumption quickly breaks down. Similar objects may carry different labels because of workshop jargon, local language, function, or routes of transmission, and those naming differences are themselves part of the cultural record.',
    contentBlocksZh: [
      '以鬼工球相关器物为例，不同地区的工匠、收藏者、商贸渠道和观众，并不一定使用完全相同的词汇。某些名称强调制作方式，某些名称强调视觉特征，某些则更接近市场称呼或外部观看者的概括。名称差异因此不只是“叫法不同”，它往往折射出谁在命名、为了什么而命名。',
      '广州常被视为相关细作工艺的重要代表区域之一，原因在于其长期发达的工商业环境、外向型交流与成熟的工艺分工。这里的命名方式往往更容易进入展览、出版与收藏体系，被后来的公众认知反复放大。于是，某些广州系统中的名称会逐渐获得“标准名”的地位。',
      '但如果转向潮州或福建等地，会发现地方工艺同样有自身的传承脉络与术语习惯。有些地区更强调纹样趣味与装饰语汇，有些更看重器物在礼俗、陈设或交易中的位置。相近的结构形式，在不同地方可能被纳入不同类别，甚至被放进完全不同的叙述框架之中。',
      '这说明“流派”并不只是风格差异，也包括知识组织方式的差异。某个地区也许更习惯以题材分类，如龙凤、花卉、吉祥纹；另一个地区则更习惯以工序、层数、用途或师承来辨认对象。观众今天看到的一张标签卡片，往往只是这些复杂分类逻辑被压缩之后的结果。',
      '地方命名之所以值得重视，还因为它与口传经验紧密相连。很多术语最初并不是为书面记录准备的，而是在工坊、市场和师徒交流中被反复使用。它们可能带有方言色彩、行业缩写或语义漂移，离开本地语境后就容易被误解、简化，甚至被其他地区的通用说法覆盖掉。',
      '在现代知识库建设中，这会带来一个典型风险：为了让检索和展示更整齐，平台倾向于把各种地方名称统一折叠到一个“标准词条”下面。这样做当然有利于初级导航，但如果缺乏别名、出处和地域说明，也会抹平地方差异，让用户误以为所有地区都在说同一种话、做同一种工艺。',
      '更稳妥的做法，是把“标准词条”视为入口，而不是终点。词条正文应说明常见别名、使用区域、命名角度与可能的语义偏移，让用户知道为什么同类器物会有不同称呼，也知道这些称呼之间并非简单的一一对应关系。只有这样，平台才是在整理知识，而不是替地方知识做消音处理。',
      '从风格上看，不同地区对密度、线条、留白和题材偏好也可能存在明显差异。有的系统偏向工整、玲珑与精致均衡，有的更强调装饰性、节奏感或地方吉祥图像的连续运用。这些视觉差异会反过来影响命名，因为许多名字本身就是从“看起来像什么”出发形成的。',
      '对研究者而言，地域差异还能帮助追踪传播路径。某一名称何时进入出版物、何时从地方作坊进入城市收藏、何时又被展览系统重新固定下来，这些问题都能帮助我们理解一门工艺是如何从地方经验变成公共文化对象的。命名史某种程度上也是流通史与认知史。',
      '对于公众教育来说，承认命名差异也有现实意义。它提醒观众，传统文化并不是一个已经被整理完毕的整齐目录，而是由许多地方知识、口头经验与后续解释不断叠合而成。知识库如果只提供唯一答案，看起来清爽，却可能失去最值得学习的复杂性。',
      '因此，数字知识库在处理地域与命名问题时，目标不应只是“统一”，而应是“可导航地保留差异”。让用户能先找到主要词条，再看到别名、地区、语境和流派联系，这样既不会把信息做得过于散乱，也不会因为追求整洁而压平地方传统真正的纹理。',
    ],
    contentBlocksEn: [
      'With puzzle-ball-related objects, naming varies because different groups name from different needs. Makers may stress process, traders may stress recognisable form, collectors may prefer a prestige label, and later museum audiences may inherit whichever name became most visible in print.',
      'Guangzhou is often treated as a major reference point because its strong commercial and craft networks allowed certain labels to circulate through exhibitions, publications, and collection systems. Over time, a local usage can begin to look like a universal standard.',
      'Yet Chaozhou, Fujian, and other regions preserve their own lines of terminology and transmission. Similar structures may be grouped differently depending on local aesthetic emphasis, workshop habit, ritual use, or market history. “Regional school” therefore means more than visual style.',
      'Naming is deeply tied to oral practice. Many terms began as workshop language rather than formal cataloguing language. They may contain dialect, abbreviation, or semantic drift, and once removed from their local context they can easily be simplified or overwritten by broader public labels.',
      'This creates a common digital-archive risk: in order to make searching and display neat, platforms compress many local names into one standard entry. That is useful for basic navigation, but if aliases, provenance, and regional notes are missing, local knowledge is flattened out.',
      'A better approach is to treat the standard entry as an entry point rather than a final verdict. Each article should note common aliases, the regions in which they appear, the perspective behind the name, and where meanings overlap only partially rather than perfectly.',
      'Regional style differences matter here as well. Preferences for density, line flow, blank space, subject matter, and decorative rhythm all influence how objects are perceived and thus how they are named. Naming history is therefore also a history of circulation and interpretation.',
      'For public education, preserving this variation is important. A knowledge base should not only standardise terms; it should make difference navigable. That allows readers to find the main entry quickly while still encountering the local texture that gives traditional craft its real depth.',
    ],
    keywordsZh: ['地域流派', '地方命名', '口传术语', '知识归并'],
    keywordsEn: ['Regional schools', 'Local naming', 'Oral terminology', 'Knowledge consolidation'],
    timelineZh: [
      '地方生成阶段：术语在工坊、市场与口传环境中自然形成并随地区分化。',
      '出版传播阶段：部分区域名称进入图录、研究与收藏系统，影响更广泛认知。',
      '标准化阶段：展览与数据库倾向于建立统一词条，提升检索效率。',
      '反扁平化阶段：数字知识库开始通过别名、地域注记与来源说明保留地方差异。',
    ],
    timelineEn: [
      'Local formation: terms emerge in workshops, markets, and oral exchange.',
      'Publication spread: some regional labels gain wider authority through catalogues and collecting.',
      'Standardisation: exhibitions and databases build unified entries for easier search and display.',
      'Anti-flattening response: digital archives restore aliases, locality, and provenance notes to preserve difference.',
    ],
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
