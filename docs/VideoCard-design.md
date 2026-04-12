# VideoCard 组件功能设计文档

**项目**：digital-guigong-ball  
**文档版本**：v1.0  
**日期**：2026-04-09  
**关联模块**：`MuseumView.vue` → 视频区块（Videos Section）

---

## 一、现状扫描

### 1.1 当前技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| UI 框架 | Vue 3 Composition API | ^3.5 |
| 构建工具 | Vite | ^8 |
| 类型系统 | TypeScript | — |
| 样式 | Tailwind CSS（class 深色模式） | ^3 |
| 状态管理 | Pinia | ^3 |
| 路由 | Vue Router | ^5 |
| 组件库 | 无（纯手写 SFC） | — |

### 1.2 现有视频区块分析

`MuseumView.vue` 中的视频区块（第 425–471 行）目前是**纯占位布局**：

```
<article>
  <div class="relative aspect-video bg-slate-900">   ← 深色背景占位
    渐变遮罩层
    居中播放按钮（SVG 图标）
    右下角时长角标
  </div>
  <div>标题 + 描述文字</div>
</article>
```

`MuseumVideo` 数据类型中**不含任何媒体资源字段**（无 `src`、`poster`、`preview`），仅有文案与时长。

---

## 二、需求可达性分析

### 2.1 资源解耦策略

| 要求 | 可达性 | 评估说明 |
|------|--------|----------|
| 封面图 + 微缩预览视频双资源模式 | ✅ **完全可达** | 需在 `MuseumVideo` 类型扩展 `poster?` 和 `preview?` 字段，使用本地路径（`/public/videos/...`） |
| 初始仅渲染静态封面 | ✅ **完全可达** | `<video>` 用 `v-if="isHovering"` 条件渲染，未触发时 DOM 中不存在 video 节点 |
| 按需加载：交互触发才请求视频资源 | ✅ **完全可达** | 结合 `v-if` + `:src="hoverActivated ? preview : undefined"` 实现动态 src 绑定，`preload="none"` 防止提前加载 |

**约束说明**：当前为本地文件资源（非 CDN），无需考虑网络请求优化，主要目标是避免浏览器在页面初始化时批量解码视频文件。

### 2.2 交互状态机管理

| 要求 | 可达性 | 评估说明 |
|------|--------|----------|
| Hover 防误触延迟（200–400ms） | ✅ **完全可达** | `@mouseenter` 触发 `setTimeout(300ms)`，计时器 ID 存入 `ref<number>`；`@mouseleave` 立即 `clearTimeout` 取消 |
| 鼠标离开立即重置到第一帧 | ✅ **完全可达** | `videoRef.value.pause(); videoRef.value.currentTime = 0` |
| 静音自动循环播放 | ✅ **完全可达** | `<video muted loop playsinline>`，`videoRef.value.play()` 在延迟确认后调用 |
| 移出后重置帧位置 | ✅ **完全可达** | `currentTime = 0` 重置，配合 `v-if` 卸载 DOM 节点，下次悬停从头开始 |

**风险点**：移动端无 `hover` 事件，触摸设备需降级为点击态。当前 Hub 布局以桌面为主，移动端降级策略可暂不实现（标注为待办）。

### 2.3 视觉渲染规范

| 要求 | 可达性 | 评估说明 |
|------|--------|----------|
| 封面与视频切换无白屏/跳变 | ✅ **完全可达** | 封面 `<img>` 与 `<video>` 使用绝对定位叠层（`absolute inset-0`），通过 CSS `opacity` + `transition` 实现交叉淡入淡出 |
| 容器比例锁定（Cover 填充） | ✅ **完全可达** | 容器使用 Tailwind `aspect-video`（即 `aspect-ratio: 16/9`），子元素 `object-cover w-full h-full` |
| 不同分辨率下内容不变形 | ✅ **完全可达** | `aspect-ratio` 锁定宽高比，`object-fit: cover` 保证填充不变形，已有现成 Tailwind 类 |

### 2.4 性能优化

| 要求 | 可达性 | 评估说明 |
|------|--------|----------|
| 非活跃状态对渲染引擎友好 | ✅ **完全可达** | 使用 `v-if` 而非 `v-show`，非悬停状态下 video DOM 节点完全不存在于文档树中 |
| `preload="none"` + 动态 src 绑定 | ✅ **完全可达** | `<video preload="none" :src="videoSrc">` 结合 `v-if` 双重保障，仅在悬停确认后赋值 src |
| 组件封装性 | ✅ **完全可达** | 独立 SFC `VideoCard.vue`，Props 注入数据，内部管理所有状态，外部无需感知实现细节 |

**不可达 / 暂缓项**：

| 要求 | 状态 | 原因 |
|------|------|------|
| IntersectionObserver 懒加载（视口外不预热） | ⚠️ **暂缓** | 当前视频区块在单页内，无虚拟滚动需求；首期实现 hover 懒加载已足够 |
| 移动端触摸态交互 | ⚠️ **暂缓** | Hub 主要面向桌面，移动版交互标注待办 |
| 视频加载进度 / 骨架屏 | ⚠️ **暂缓** | 本地资源加载极快，无需 loading 态；远程资源接入时再补充 |

---

## 三、数据模型变更

### 3.1 扩展 `MuseumVideo` 类型

**文件**：`src/data/museum.ts`

```typescript
// 变更前
export type MuseumVideo = {
  titleZh: string
  titleEn: string
  durationZh: string
  durationEn: string
  descZh: string
  descEn: string
}

// 变更后（新增可选媒体字段）
export type MuseumVideo = {
  titleZh: string
  titleEn: string
  durationZh: string
  durationEn: string
  descZh: string
  descEn: string
  poster?: string    // 封面图路径，相对于 /public，例如 '/covers/video-1.webp'
  preview?: string   // 微缩预览视频路径，例如 '/previews/video-1.mp4'
}
```

字段设计为**可选**，保证向后兼容：未填写时组件退化为当前的纯占位渲染模式（显示渐变背景 + 播放图标），不影响已有功能。

### 3.2 公共资源目录约定

```
digital-guigong-ball/
└── public/
    ├── covers/          ← 封面图（建议 WebP，16:9，宽度 ≥ 480px）
    │   ├── video-1.webp
    │   ├── video-2.webp
    │   └── video-3.webp
    └── previews/        ← 微缩预览视频（静音片段，建议 ≤ 10s，H.264/MP4）
        ├── video-1.mp4
        ├── video-2.mp4
        └── video-3.mp4
```

---

## 四、组件设计

### 4.1 组件位置与命名

```
src/components/VideoCard.vue
```

替换 `MuseumView.vue` 中视频区块的内联 `<article>` 元素，以 Props 注入数据。

### 4.2 Props 接口

```typescript
interface VideoCardProps {
  title: string          // 国际化后的标题（由父级 computed 处理）
  duration: string       // 时长文本，如 "05:12"
  desc: string           // 描述文本
  poster?: string        // 封面图路径（可选，缺省显示渐变占位）
  preview?: string       // 预览视频路径（可选，缺省不触发视频逻辑）
  watchLabel?: string    // 观看按钮文案（默认从 appStore 读取）
}
```

### 4.3 内部状态机

```
状态枚举：
  idle      → 初始态，仅显示封面，无 video DOM
  pending   → 鼠标已进入，等待防误触计时器（300ms）
  active    → 计时通过，video DOM 挂载，视频播放中
  fading    → 鼠标已离开，执行淡出过渡（150ms）

转换规则：
  idle    → (mouseenter)  → pending
  pending → (300ms 超时)  → active    [挂载 video DOM，播放]
  pending → (mouseleave)  → idle      [clearTimeout，不挂载]
  active  → (mouseleave)  → fading    [视频 pause + reset，触发淡出]
  fading  → (150ms 完成)  → idle      [卸载 video DOM]
  fading  → (mouseenter)  → active    [重新进入，跳过计时，直接复活]
```

简化实现：原型阶段可将 `pending` 和 `fading` 的中间态合并，用两个 `ref<boolean>` 管理：

```typescript
const isHoverConfirmed = ref(false)   // 延迟计时通过后置 true
const isVideoVisible = ref(false)     // 控制 video 的 opacity（CSS 过渡）
```

### 4.4 核心逻辑伪代码

```typescript
const hoverTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const videoRef = ref<HTMLVideoElement | null>(null)
const isHoverConfirmed = ref(false)
const isVideoVisible = ref(false)

function onMouseEnter() {
  if (!props.preview) return
  hoverTimer.value = setTimeout(() => {
    isHoverConfirmed.value = true           // 挂载 <video> DOM（v-if 触发）
    nextTick(() => {
      videoRef.value?.play()               // DOM 就绪后开始播放
      isVideoVisible.value = true          // 淡入视频层
    })
  }, 300)
}

function onMouseLeave() {
  clearTimeout(hoverTimer.value!)
  if (!isHoverConfirmed.value) return       // 计时未完成，直接归位
  isVideoVisible.value = false              // 触发淡出过渡
  setTimeout(() => {
    videoRef.value?.pause()
    if (videoRef.value) videoRef.value.currentTime = 0
    isHoverConfirmed.value = false          // 卸载 <video> DOM
  }, 150)                                   // 等待淡出过渡完成再卸载
}
```

### 4.5 模板结构

```html
<article
  class="overflow-hidden rounded-2xl border bg-white shadow-soft ... cursor-pointer"
  @mouseenter="onMouseEnter"
  @mouseleave="onMouseLeave"
>
  <!-- 媒体容器：比例锁定 -->
  <div class="relative aspect-video overflow-hidden bg-slate-900">

    <!-- 层 1：封面图（始终存在） -->
    <img
      v-if="poster"
      :src="poster"
      :alt="title"
      class="absolute inset-0 h-full w-full object-cover transition-opacity duration-200"
      :class="isVideoVisible ? 'opacity-0' : 'opacity-100'"
      loading="lazy"
      draggable="false"
    />

    <!-- 封面缺省时的渐变占位（保持向后兼容） -->
    <div
      v-else
      class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"
    />

    <!-- 层 2：预览视频（仅悬停确认后挂载） -->
    <video
      v-if="isHoverConfirmed && preview"
      ref="videoRef"
      :src="preview"
      preload="none"
      muted
      loop
      playsinline
      class="absolute inset-0 h-full w-full object-cover transition-opacity duration-200"
      :class="isVideoVisible ? 'opacity-100' : 'opacity-0'"
    />

    <!-- 层 3：UI 覆盖物（播放图标 + 时长角标） -->
    <div
      class="absolute inset-0 flex items-center justify-center transition-opacity duration-200"
      :class="isVideoVisible ? 'opacity-0 pointer-events-none' : 'opacity-100'"
    >
      <!-- 播放图标按钮 -->
      ...
    </div>
    <span class="absolute bottom-2 right-2 rounded bg-black/60 ...">{{ duration }}</span>
  </div>

  <!-- 文字信息区 -->
  <div class="p-4">
    <h4>{{ title }}</h4>
    <p>{{ desc }}</p>
    <button>{{ watchLabel }}</button>
  </div>
</article>
```

---

## 五、CSS 过渡衔接方案

### 5.1 层叠结构（Z 轴）

```
z-index 层级（从下到上）：
  bg-slate-900（容器背景色）       ← 兜底，防止任何空隙闪白
  <img> 封面图                    ← 始终存在，opacity 动态控制
  <video> 预览视频                 ← 条件挂载，opacity 动态控制
  UI 覆盖物（图标 + 角标）         ← 最顶层，随视频出现而淡出
```

### 5.2 过渡时序

```
mouseenter + 300ms
       ↓
video DOM 挂载 (v-if = true)
       ↓ nextTick（DOM 已存在）
video.play() 调用
isVideoVisible = true
       ↓ CSS transition 150~200ms
封面 opacity: 1 → 0
视频 opacity: 0 → 1
UI  opacity: 1 → 0

mouseleave
       ↓ 立即
isVideoVisible = false
       ↓ CSS transition 150ms
封面 opacity: 0 → 1
视频 opacity: 1 → 0
       ↓ 150ms 后
video.pause(), currentTime = 0
v-if = false（卸载 DOM）
```

**关键设计**：`bg-slate-900` 作为容器背景色，确保封面淡出、视频淡入之间短暂透明时段不显示白色背景，保持视觉连续性。

### 5.3 Tailwind 类使用规范

```
过渡类：    transition-opacity duration-150（或 duration-200）
封面淡出：  :class="isVideoVisible ? 'opacity-0' : 'opacity-100'"
视频淡入：  :class="isVideoVisible ? 'opacity-100' : 'opacity-0'"
UI 淡出：   :class="isVideoVisible ? 'opacity-0 pointer-events-none' : 'opacity-100'"
```

无需引入额外的 Vue `<Transition>` 组件（条件挂载用 `v-if`，过渡用纯 CSS opacity），减少复杂度。

---

## 六、集成到 MuseumView

### 6.1 改动范围

| 文件 | 改动类型 | 说明 |
|------|----------|------|
| `src/components/VideoCard.vue` | **新建** | 视频卡片组件主体 |
| `src/data/museum.ts` | **小幅扩展** | `MuseumVideo` 类型增加 `poster?` / `preview?` 字段；`museumVideos` 数组填入资源路径 |
| `src/views/hub/MuseumView.vue` | **局部替换** | 视频区块内联 `<article>` 替换为 `<VideoCard>` 组件调用 |
| `public/covers/` | **新增目录** | 存放封面 WebP 图 |
| `public/previews/` | **新增目录** | 存放预览 MP4 视频 |

### 6.2 MuseumView 调用方式

```html
<!-- 改动前（内联 article） -->
<article v-for="(vid, index) in videos" :key="index" class="overflow-hidden ...">
  ...
</article>

<!-- 改动后 -->
<VideoCard
  v-for="(vid, index) in videos"
  :key="index"
  :title="vid.title"
  :duration="vid.duration"
  :desc="vid.desc"
  :poster="vid.poster"
  :preview="vid.preview"
  :watch-label="store.t.museumWatch"
/>
```

`videos` computed 的映射逻辑需同步补充 `poster` 和 `preview` 字段透传。

---

## 七、暗色模式适配

项目使用 `darkMode: 'class'`，VideoCard 中所有颜色类需同时提供 `dark:` 变体，与现有 MuseumView 风格一致：

- 卡片容器：`dark:border-slate-800 dark:bg-slate-900`
- 占位背景：`dark:from-slate-700 dark:to-slate-800`（与当前展览卡片一致）
- 文字层：`dark:text-white`、`dark:text-slate-400`
- 播放按钮：`dark:bg-slate-100`（与现有按钮一致）

---

## 八、可访问性注意事项

- `<img>` 封面需提供 `alt` 属性（使用 `title` 值）
- `<video>` 元素添加 `aria-hidden="true"`（预览视频不携带语义信息）
- 播放按钮保留 `aria-label`（使用 `store.t.museumWatch`）
- 键盘可聚焦的卡片需添加 `:focus-visible` 样式和对应的键盘激活逻辑（可作为后续迭代）

---

## 九、实现优先级

| 优先级 | 功能点 |
|--------|--------|
| P0 | 数据模型扩展（`poster` / `preview` 字段） |
| P0 | 300ms 防误触 Hover 延迟逻辑 |
| P0 | `v-if` + `preload="none"` 按需加载 |
| P0 | 封面 / 视频 opacity 层叠交叉淡入淡出 |
| P0 | `aspect-video` + `object-cover` 比例锁定 |
| P1 | 离开后 `currentTime = 0` 重置首帧 |
| P1 | 暗色模式样式适配 |
| P2 | 缺省封面时的渐变占位降级处理 |
| P2 | 无媒体资源时完全退化为当前占位样式（向后兼容） |
| P3 | 键盘交互 / 无障碍补全 |
| 暂缓 | 移动端触摸态交互 |
| 暂缓 | IntersectionObserver 视口懒加载 |
