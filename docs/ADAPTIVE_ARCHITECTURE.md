# 全站自适应架构设计文档

> **项目：** digital-guigong-ball  
> **技术栈：** Vue 3 · Vite 8 · TypeScript · Tailwind CSS v3 · Pinia · Three.js  
> **文档版本：** v1.0  
> **日期：** 2026-04-09  

---

## 一、现状评估

### 1.1 当前响应式模式

项目已建立了基于 Tailwind CSS 断点工具类的初步响应式结构，主要表现为：


| 维度        | 现状                                             | 问题                |
| --------- | ---------------------------------------------- | ----------------- |
| **导航**    | `lg:` 切换侧边栏 / 顶栏 / 底栏                          | 硬断点切换，过渡有跳变感      |
| **内容网格**  | `sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` | 仅在固定断点重排，非连续流动    |
| **字体/间距** | 固定 Tailwind 等级（`text-sm`、`p-4`…）               | 与视口无关联，宽屏显示比例失调   |
| **视频卡片**  | `MuseumView` 内联实现，无复用组件                        | 交互逻辑散落，触屏/悬停无差异化  |
| **单位体系**  | `px` / Tailwind 固定 rem 级别                      | 无全局相对缩放体系         |
| **交互感知**  | 无媒体输入类型检测                                      | hover 效果在触屏上体验不一致 |


**结论：** 当前架构属于「响应式静态布局」—— 在有限断点之间切换固定方案。用户要求的是「流体布局哲学」，两者有本质差距，但现有代码已具备改造基础，无需重写，可渐进增强。

---

## 二、可行性判断

### 2.1 技术可行性：高

- **Tailwind CSS v3** 内置 `clamp()` / `min()` / `max()` 任意值语法，可直接表达流体计算。
- **CSS Container Queries**（`@container`）已获主流浏览器支持（Chrome 105+, Firefox 110+, Safari 16+），可实现容器感知布局，配合 Tailwind v3 的 JIT 模式可用 `@apply` 封装。
- **CSS `clamp()` 函数** 可在 `tailwind.config.js` 中统一注册为 CSS 变量，形成全局流体刻度尺。
- **Vue 3 Composition API** 的 `useResizeObserver` / `useMediaQuery`（VueUse）可实现细粒度的容器感知组件逻辑。
- 项目无 `peerDependency` 冲突，新增 **VueUse** 不会影响现有依赖。

### 2.2 改造成本分级


| 优先级 | 改造项                     | 成本估计     | 收益               |
| --- | ----------------------- | -------- | ---------------- |
| P0  | CSS 变量流体刻度系统            | 低（1 天）   | 全站字体/间距连续缩放      |
| P0  | 视频卡片抽取为独立组件 + 交互感知      | 中（1 天）   | 触屏/鼠标体验分离        |
| P1  | HubLayout 流体化改造         | 中（1–2 天） | 侧边栏平滑过渡，无跳变      |
| P1  | 网格 Container Queries 改造 | 中（1 天）   | 内容网格容器感知自适应      |
| P2  | Atelier 场景 HiDPI 感知     | 中（0.5 天） | 高分屏 Three.js 清晰度 |
| P3  | 全局断点语义层重构               | 高（3+ 天）  | 可跳过，现有断点已够用      |


---

## 三、技术方案设计

### 3.1 流体刻度系统（Fluid Scale System）

**原理：** 使用 `clamp(min, preferred, max)` 在视口宽度两端锚定大小，中间线性插值。

#### 3.1.1 在 `tailwind.config.js` 注入 CSS 变量

```js
// tailwind.config.js
theme: {
  extend: {
    fontSize: {
      'fluid-xs':  ['clamp(0.75rem,  0.7rem  + 0.25vw, 0.875rem)', { lineHeight: '1.5' }],
      'fluid-sm':  ['clamp(0.875rem, 0.8rem  + 0.375vw, 1rem)',     { lineHeight: '1.5' }],
      'fluid-base':['clamp(1rem,     0.9rem  + 0.5vw,  1.125rem)',  { lineHeight: '1.6' }],
      'fluid-lg':  ['clamp(1.125rem, 1rem    + 0.625vw,1.375rem)',  { lineHeight: '1.4' }],
      'fluid-xl':  ['clamp(1.25rem,  1.1rem  + 0.75vw, 1.75rem)',   { lineHeight: '1.3' }],
      'fluid-2xl': ['clamp(1.5rem,   1.25rem + 1.25vw, 2.25rem)',   { lineHeight: '1.2' }],
      'fluid-3xl': ['clamp(1.875rem, 1.5rem  + 1.875vw,3rem)',      { lineHeight: '1.1' }],
    },
    spacing: {
      'fluid-sm':  'clamp(0.5rem,  0.4rem + 0.5vw,  0.75rem)',
      'fluid-md':  'clamp(1rem,    0.8rem + 1vw,    1.5rem)',
      'fluid-lg':  'clamp(1.5rem,  1.2rem + 1.5vw,  2.5rem)',
      'fluid-xl':  'clamp(2rem,    1.5rem + 2.5vw,  4rem)',
      'fluid-2xl': 'clamp(3rem,    2rem   + 5vw,    6rem)',
    },
  }
}
```

**使用示例：**

```html
<!-- 替换前 -->
<h2 class="text-xl md:text-2xl lg:text-3xl">

<!-- 替换后 -->
<h2 class="text-fluid-2xl">
```

#### 3.1.2 全局 CSS 变量层（`src/style.css`）

```css
:root {
  /* 间距令牌 */
  --space-xs:   clamp(0.25rem, 0.2rem + 0.25vw, 0.5rem);
  --space-sm:   clamp(0.5rem,  0.4rem + 0.5vw,  0.75rem);
  --space-md:   clamp(1rem,    0.8rem + 1vw,     1.5rem);
  --space-lg:   clamp(1.5rem,  1.2rem + 1.5vw,   2.5rem);
  --space-xl:   clamp(2rem,    1.5rem + 2.5vw,   4rem);

  /* 内容区宽度令牌 */
  --content-xs:  min(100%, 480px);
  --content-sm:  min(100%, 640px);
  --content-md:  min(100%, 768px);
  --content-lg:  min(100%, 1024px);
  --content-xl:  min(100%, 1280px);
  --content-2xl: min(100%, 1536px);

  /* 侧边栏宽度（流体） */
  --sidebar-w: clamp(200px, 15vw, 280px);
}
```

---

### 3.2 HubLayout 流体化改造

#### 3.2.1 当前问题

`HubLayout.vue` 在 `lg:` 断点硬切换侧边栏/顶栏，导致 1024px 附近出现跳变。

#### 3.2.2 改造方案：CSS Grid 主骨架

```html
<!-- HubLayout.vue -->
<template>
  <div class="hub-shell">
    <aside class="hub-sidebar" :class="{ 'sidebar--collapsed': sidebarCollapsed }">
      <slot name="sidebar" />
    </aside>
    <div class="hub-main-area">
      <header class="hub-topbar">
        <slot name="topbar" />
      </header>
      <main class="hub-content">
        <RouterView />
      </main>
    </div>
  </div>
</template>
```

```css
/* HubLayout 专属 scoped CSS */
.hub-shell {
  display: grid;
  grid-template-columns: var(--sidebar-w) 1fr;
  grid-template-rows: 1fr;
  min-height: 100dvh;        /* dvh: 动态视口高度，适配移动端地址栏 */
  transition: grid-template-columns 0.3s ease;
}

/* 宽屏：侧边栏收起 */
.hub-shell:has(.sidebar--collapsed) {
  grid-template-columns: 64px 1fr;
}

/* 窄屏（< 768px）：侧边栏移出视口，顶栏接管 */
@media (max-width: 767px) {
  .hub-shell {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }
  .hub-sidebar {
    position: fixed;
    inset: 0 auto 0 0;
    width: min(85vw, 320px);
    transform: translateX(-100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 50;
  }
  .hub-sidebar.sidebar--open {
    transform: translateX(0);
  }
}
```

**核心改进：**

- 用 CSS Grid `fr` 单位取代 `fixed`/`absolute` 定位，主区域宽度自动响应侧边栏状态。
- `min-height: 100dvh` 适配 iOS Safari 动态地址栏。
- 侧边栏宽度由 CSS 变量 `--sidebar-w`（`clamp(200px, 15vw, 280px)`）驱动，连续缩放。

---

### 3.3 内容网格 Container Queries 改造

#### 3.3.1 当前问题

`sm:grid-cols-2 lg:grid-cols-3` 以视口宽度为断点，当侧边栏宽度变化时，内容区宽度已变，但列数不变，导致卡片过宽或过窄。

#### 3.3.2 改造方案

```css
/* src/style.css 或组件 scoped */
.content-grid-container {
  container-type: inline-size;
  container-name: content-grid;
}

.content-grid {
  display: grid;
  gap: var(--space-md);
  /* 自动流体列：每列最小 260px，自动填充 */
  grid-template-columns: repeat(auto-fill, minmax(min(260px, 100%), 1fr));
}

/* 大容器时限制最多 4 列 */
@container content-grid (min-width: 1100px) {
  .content-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

```html
<!-- 视图中使用 -->
<div class="content-grid-container">
  <div class="content-grid">
    <VideoCard v-for="item in videos" :key="item.id" :data="item" />
  </div>
</div>
```

`auto-fill + minmax` 实现了「液态」重排：容器够宽就多列，不够宽就自动少列，无需手动指定断点。

---

### 3.4 视频卡片组件化与交互感知

#### 3.4.1 抽取 `VideoCard.vue` 组件

```typescript
// src/components/VideoCard.vue
interface VideoCardProps {
  id: string
  title: string
  description?: string
  duration: string
  thumbnailUrl?: string
  tags?: string[]
}
```

#### 3.4.2 交互媒介感知（Interaction Media Detection）

**核心逻辑：** CSS `@media (hover: hover)` 检测设备是否支持精确悬停，`@media (pointer: coarse)` 检测触摸输入。

```css
/* VideoCard.vue <style scoped> */

.video-card {
  position: relative;
  overflow: hidden;
  border-radius: 0.75rem;
  cursor: pointer;
  container-type: inline-size;
}

.video-card__overlay {
  /* 默认状态：触屏设备始终显示渐变和标题 */
  background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%);
  opacity: 1;
  transition: opacity 0.25s ease;
}

/* 仅在支持 hover 的设备上启用悬停交互 */
@media (hover: hover) and (pointer: fine) {
  .video-card__overlay {
    opacity: 0;  /* 鼠标设备：初始隐藏，hover 时显示 */
  }
  .video-card:hover .video-card__overlay {
    opacity: 1;
  }
  .video-card:hover .video-card__thumbnail {
    transform: scale(1.04);
  }
  .video-card__play-btn {
    transform: scale(0.8);
    opacity: 0;
    transition: transform 0.25s ease, opacity 0.25s ease;
  }
  .video-card:hover .video-card__play-btn {
    transform: scale(1);
    opacity: 1;
  }
}

/* 触屏设备：播放按钮始终可见且更大（更易点击） */
@media (pointer: coarse) {
  .video-card__play-btn {
    width: 56px;
    height: 56px;   /* 触屏：最小点击区 44x44px，给定 56px 余量 */
    opacity: 1;
  }
  .video-card__duration {
    font-size: 0.875rem;
    padding: 4px 8px; /* 更大的可读性 */
  }
}
```

**Vue 侧：** 通过 VueUse 的 `useMediaQuery` 在 JS 层同步媒体状态，用于控制更复杂的交互行为（如触屏长按 vs 鼠标右键菜单）：

```typescript
// src/composables/usePointerType.ts
import { useMediaQuery } from '@vueuse/core'

export function usePointerType() {
  const isTouchPrimary = useMediaQuery('(pointer: coarse)')
  const hasHoverCapability = useMediaQuery('(hover: hover)')
  const isMousePrimary = computed(() => !isTouchPrimary.value && hasHoverCapability.value)
  return { isTouchPrimary, hasHoverCapability, isMousePrimary }
}
```

---

### 3.5 Atelier 三维场景高分屏优化

```typescript
// src/components/AtelierScene.vue

// 当前问题：renderer.setPixelRatio(1) 或硬编码比例
// 改造：感知设备像素比并限制上限
const dpr = Math.min(window.devicePixelRatio ?? 1, 2)  // 上限 2，防止 3x 设备过载
renderer.setPixelRatio(dpr)

// ResizeObserver 驱动的连续尺寸更新（优于 window.resize 事件）
const resizeObserver = new ResizeObserver(([entry]) => {
  const { width, height } = entry.contentRect
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
})
resizeObserver.observe(canvasContainer.value!)
```

---

## 四、实施路线图（无排期版）

**总原则：** 先完成「可复用的地基」，再实现「地图 / 视频」等重 UI 模块；地基未稳时，功能可以写原型，但应在进入联调前把流体刻度与主布局骨架对齐，避免二次返工。

---

### 阶段 A — 流体刻度与全局令牌（最先）

**目标：** 全站有可执行的相对度量体系，后续页面只消费令牌，不再手写阶梯式字号。


| 步骤  | 产出物                                                                            | 完成判据                                           |
| --- | ------------------------------------------------------------------------------ | ---------------------------------------------- |
| A1  | 在 `tailwind.config.js` 扩展 `fontSize` / `spacing`（`clamp` 流体类）                  | 至少 3 个字号档位、3 个间距档位可在任意页面试用                     |
| A2  | 在 `src/style.css` 定义 `:root` CSS 变量（`--space-`*、`--content-`*、`--sidebar-w` 等） | 组件可用 `var(--space-md)` 或 Tailwind 任意值引用，无魔法数散落 |
| A3  | 选定 1～2 个「样板页」（建议 `DashboardView` + 任一列表页）全量替换为流体字号/间距                          | 在 320px 与 1920px 下无「字过大/过小」或挤压溢出               |


**依赖：** 无。  
**阻塞：** 阶段 B、C、D 的样式统一都依赖本阶段。

---

### 阶段 B — 主壳布局流体化（Hub）

**目标：** `HubLayout` 在窗口连续拉伸时，主内容区与导航区域的关系是连续、可预测的，减少「断点附近一跳」的观感。


| 步骤  | 产出物                                                         | 完成判据                            |
| --- | ----------------------------------------------------------- | ------------------------------- |
| B1  | 用 CSS Grid 定义 `hub-shell` 主骨架（侧栏 + 主区），侧栏宽度绑定 `--sidebar-w` | 侧栏显隐或宽度变化时，主区宽度自动吃满剩余空间，无固定像素死区 |
| B2  | 窄屏：侧栏改为抽屉/覆盖层（或保留现有顶栏+底栏模式，但行为与宽屏语义一致）                      | 同一套路由与焦点顺序在窄/宽屏均可完成核心导航         |
| B3  | 主区内边距用流体间距类或 CSS 变量，替代大量 `p-4 sm:p-6 lg:px-10` 堆砌（可渐进替换）    | 主区左右留白随视口平滑变化，不出现某一宽度下突然变空      |


**依赖：** 阶段 A（至少 A2 变量可用）。  
**与功能关系：** 地图页、视频列表页都挂在 Hub 下，本阶段完成后，这些页面的「可用宽度」才稳定。

---

### 阶段 C — 内容区容器查询与流体网格

**目标：** 列表/卡片区域的列数由**容器宽度**决定，而不是仅由视口断点决定，避免「侧栏一开，内容区变窄但列数不变」的问题。


| 步骤  | 产出物                                                               | 完成判据                           |
| --- | ----------------------------------------------------------------- | ------------------------------ |
| C1  | 在列表外层增加 `container-type: inline-size` 的包装类                        | DevTools 中调整侧栏宽度时，网格列数随之变化     |
| C2  | 使用 `repeat(auto-fill, minmax(min(260px, 100%), 1fr))` 或等价策略实现卡片栅格 | 无需为每个断点手写 `grid-cols-`*，窄屏自动单列 |
| C3  | 为「横向滚动条」类区块（如展馆横滑）单独约定：何时用 scroll、何时用 grid，避免双滚动条                 | 移动端主方向滚动唯一、可预期                 |


**依赖：** 阶段 B（主区宽度稳定）。  
**阻塞：** 视频卡片墙、商城/工坊卡片墙、统计图表旁的辅助信息块。

---

### 阶段 D — 视频能力（在 A～C 至少到可用程度后）

**目标：** 视频相关 UI 可复用、交互符合指针类型，而不是散落在页面里。


| 步骤  | 产出物                                                                            | 完成判据                       |
| --- | ------------------------------------------------------------------------------ | -------------------------- |
| D1  | 从 `MuseumView` 抽取 `VideoCard.vue`（或统一命名 `MediaCard`），props 与数据层 `museum.ts` 对齐 | 博物馆页仅组装数据，卡片结构单处维护         |
| D2  | 卡片样式使用阶段 A 的流体字号/间距；布局使用阶段 C 的容器网格                                             | 与 Hub 侧栏联动时列数合理            |
| D3  | 用 `@media (hover: hover)` / `(pointer: coarse)` 区分悬停预览与触屏常显控件                  | 触屏上主要操作区 ≥ 44×44px（或项目约定值） |
| D4  | 若接入真实 `<video>`：约定 `aspect-ratio`、`object-fit`、全屏/画中画等占位与降级策略                  | 无视频源时布局不塌陷                 |


**依赖：** 推荐 A + C 完成后再做 D2/D3；D1 可在 A 未完成时先抽组件，但样式会返工一次。  
**与地图顺序：** 视频与地图无强依赖；若人力有限，**先做 D（卡片+媒体）再攻地图**通常更顺，因为卡片模式可复用到多页。

---

### 阶段 E — 地图能力（Explore，建议在 Hub 骨架稳定后）

**目标：** 地图与信息面板在任意宽高比下分配空间合理，且地图容器尺寸变化时 AMap 能正确重绘。


| 步骤  | 产出物                                                                           | 完成判据                             |
| --- | ----------------------------------------------------------------------------- | -------------------------------- |
| E1  | `ExploreView` 外层用 flex/grid 定义「地图区 + 侧栏」比例（如 `minmax(0, 1fr)` + 固定最小宽度侧栏）     | 窄屏纵向堆叠、宽屏横向分栏，无地图高度为 0           |
| E2  | 地图容器用 `min-h` + `flex-1` 或 `aspect-ratio` 策略二选一并写清                            | 地址栏显示/隐藏时（移动 Safari）不出现整块空白或裁切异常 |
| E3  | 在地图容器上挂 `ResizeObserver`（或 VueUse `useResizeObserver`），在尺寸变化时调用 AMap `resize` | 侧栏展开/收起、窗口拖拽后地图铺满容器              |
| E4  | 信息密度：侧栏内列表/筛选用阶段 A 的流体字号；复杂筛选在窄屏可折叠                                           | 与第七节验收宽度点自洽                      |


**依赖：** 阶段 B 强烈建议完成；阶段 A、C 能显著提升侧栏与列表体验。  
**阻塞：** 无（可与阶段 D 并行），但与 B 冲突时应先 B。

---

### 阶段 F — 全站一致性与非 Hub 页面

**目标：** `/atelier` 等全屏页与 Hub 页在视口单位、安全区、滚动行为上一致。


| 步骤  | 产出物                                                                         | 完成判据                  |
| --- | --------------------------------------------------------------------------- | --------------------- |
| F1  | `AtelierScene`：`devicePixelRatio` 上限、`ResizeObserver` 驱动 `setSize`（见 3.5 节） | 高分屏清晰、resize 无黑边或拉伸错位 |
| F2  | 全局将「整页高度」从 `100vh` 迁移为 `100dvh` / `min-height: 100dvh`（按需）                  | 移动端地址栏伸缩时布局不跳动或跳动可接受  |
| F3  | 校对 `env(safe-area-inset-*)` 与底栏/顶栏叠加关系                                      | 刘海屏与横屏安全区无遮挡可点区域      |


**依赖：** 阶段 A、B 之后做最有收益；可与 E 并行。

---

### 阶段 G — 收尾与回归（持续到最后一次发布前）

**目标：** 把「流体架构」从实现变成可验证的质量条。


| 步骤  | 产出物                               | 完成判据            |
| --- | --------------------------------- | --------------- |
| G1  | 按第七节宽度清单做手工回归，并记录例外（若有）           | 每条有截图或简短说明      |
| G2  | 补充团队约定：新页面必须使用的间距/字号类名前缀或 CSS 变量名 | 新代码 review 有据可依 |
| G3  | 性能抽检：地图 resize、列表长列表滚动、Three 场景帧率 | 无明显卡顿或仅记录已知上限   |


**依赖：** A～F 按需完成度；**不依赖**具体日历，但应在功能冻结前至少完成 G1。

---

### 推荐推进顺序（摘要）

1. **A → B → C**（地基；地图与视频都受益）
2. **D**（视频卡片与真实/模拟播放器）与 **E**（地图）可在 C 之后并行，若必须二选一：**先做 D** 更利于沉淀可复用卡片模式。
3. **F**（Atelier / 全屏页）与 **G**（回归与约定）贯穿后期，**G1 在每次里程碑结束前执行一次**即可。

---

## 五、关键技术选型依据


| 技术                       | 选用理由                          | 兼容性                                     |
| ------------------------ | ----------------------------- | --------------------------------------- |
| `clamp()`                | 原生 CSS，零运行时，Tailwind JIT 完整支持 | Chrome 79+ / Firefox 75+ / Safari 13.1+ |
| CSS Container Queries    | 组件自治，不依赖全局视口                  | Chrome 105+ / Firefox 110+ / Safari 16+ |
| `auto-fill + minmax`     | 真正的流体网格，无需断点声明                | 全浏览器支持                                  |
| `100dvh`                 | 正确处理移动端动态地址栏                  | Chrome 108+ / Safari 15.4+              |
| `@media (pointer/hover)` | 精确的输入媒介检测，非 UA 嗅探             | 全浏览器支持                                  |
| VueUse `useMediaQuery`   | 与 Vue 响应式系统桥接，避免手动监听器         | 项目无冲突                                   |
| CSS Grid `fr`            | 主布局骨架，天然流体，优于 Flex + 固定宽度     | 全浏览器支持                                  |


---

## 六、不纳入范围的说明


| 方向                                        | 排除理由                                          |
| ----------------------------------------- | --------------------------------------------- |
| 全局断点语义重构（修改默认 Tailwind screens）           | 改造成本高，现有断点未发现明显问题，优先级 P3                      |
| CSS Subgrid 跨组件对齐                         | 项目卡片布局独立，无需跨组件对齐，过度设计                         |
| 字体变体轴（Variable Fonts）                     | Noto Sans SC 网络字体加载已是性能瓶颈，引入可变字体会加重           |
| JS 驱动的尺寸计算（ResizeObserver + inline style） | CSS 原生方案已能覆盖需求，JS 方案保留用于 Three.js 等 Canvas 场景 |


---

## 七、验收标准

改造完成后，需在以下场景回归验证：

1. **320px** — 最小移动设备（iPhone SE）：导航可用，内容不溢出，字体不超出容器
2. **375px** — 标准移动端：视频卡片单列展示，播放按钮触屏友好（≥ 44px）
3. **768px** — 平板竖屏：侧边栏收起或以抽屉形式呈现，内容双列
4. **1024px** — 平板横屏 / 笔记本：侧边栏展开，内容三列
5. **1440px** — 标准桌面：四列，字体比例自然，侧边栏不过宽
6. **2560px** — 超宽显示器：内容区有合理最大宽度限制，不出现文字行超过 90 字符
7. **窗口连续拖拽**：无跳变，布局平滑过渡，无出现滚动条死角或空白
8. **触屏模式**（Chrome DevTools 模拟）：hover 效果关闭，播放按钮常显，可点击区足够大

---

*本文档作为工程实施依据，具体代码以 PR 为准，文档随迭代同步更新。*