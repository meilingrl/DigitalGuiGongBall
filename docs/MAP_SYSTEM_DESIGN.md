# 非遗文化互联平台 · 深度定制地图交互系统设计文档

> 版本：v1.0 | 日期：2026-04-08  
> 基准代码：`digital-guigong-ball`（Vue 3 + AMap JS API 2.0 + Three.js + Pinia）  
> 本文档含：可达性评估矩阵 → 实现级设计规格 → 接口约定 → 降级策略

---

## 〇、可达性总评矩阵

> 评级说明：✅ 完全可达（可进入代码实现） / ⚠️ 部分可达（有约束，可达原型级别） / ❌ 本轮不可达（架构复杂度超出课程周期）


| 需求编号     | 原始需求              | 评级     | 当前基础                                   | 核心约束                                                   | 推荐方案                                 |
| -------- | ----------------- | ------ | -------------------------------------- | ------------------------------------------------------ | ------------------------------------ |
| **1.1**  | 文化质感自定义底图样式       | ✅      | `mapStyle: 'amap://styles/whitesmoke'` | 需申请高德样式编辑器权限                                           | 用高德云图样式 + 参数化配置                      |
| **1.2**  | CSS 混合模式主题融合      | ⚠️     | 已有 dark/light 双主题切换                    | AMap Canvas 层无法被真正 `mix-blend-mode` 穿透；仅 container 层可用 | Overlay CSS filter + 主题响应层           |
| **1.3**  | 3D 建筑与昼夜光影        | ⚠️     | Three.js 已在项目中                         | 无真实建筑 GLB 模型，AMap Buildings 插件可用                       | AMap 内置 3D 楼栋层 + 模拟光源                |
| **2.1**  | 按非遗类别的数据驱动 Marker | ✅      | HTML 自定义 Marker 已实现                    | 需扩展 Venue 数据结构加 `ichCategory` 字段                       | SVG 图标工厂 + 类别映射表                     |
| **2.2**  | 业务级"信息名片"系统       | ✅      | 侧边面板已实现                                | 原生 InfoWindow 已弃用，当前面板可升级                              | 浮动卡片组件 + 预约进度条                       |
| **2.3**  | 地图-列表-详情三联动       | ✅      | 无侧边列表，仅有 Map+Panel                     | 需新增 Venue 列表列 + bounds 监听                              | Pinia mapStore + `map.on('moveend')` |
| **3.1**  | 时间轴活动筛选 + 动画      | ✅      | 有活动日历，但未与地图联动                          | 需在地图层新增活动 Marker 图层                                    | 双重图层（venues + activities）            |
| **3.2**  | 路径规划（最后一百米）       | ⚠️     | 无                                      | 需 AMap Driving/Walking API + 用户定位                      | 模拟路径展示 + 浏览器 Geolocation             |
| **3.2b** | 地理围栏自动签到          | ⚠️     | 签到为手动触发                                | 浏览器 GPS 精度有限；Web 环境无后台围栏监听                             | 前台轮询 Geolocation + 距离阈值判断            |
| **3.3**  | 室内外平滑切换           | ❌      | 无                                      | 需高德室内地图商业协议 + 室内图纸资产                                   | 设计稿中展示概念；代码降级为楼层选择 UI                |
| **4.1**  | 点聚合 / Canvas 渲染   | ✅      | 单点 HTML Marker                         | 需加载 `AMap.MarkerClusterer` 插件                          | 阈值动态切换（< 20点用HTML，≥ 20用Cluster）      |
| **4.2**  | 可插拔地图 Provider 架构 | ✅      | AMap 硬耦合                               | 无运行时换库需求，但抽象接口可设计                                      | `MapAdapter` 接口 + AMapAdapter 实现类    |
| **4.3**  | 60FPS 渲染          | ✅（已满足） | AMap 2.0 WebGL 渲染                      | HTML Marker 数量超 500 时需注意                               | 当前 4 场馆无性能压力                         |


---

## 一、视觉系统设计

### 1.1 文化质感底图样式

**目标**：去除商业 POI 噪声，建立低饱和度、纸张/墨色调的非遗主题地图视觉语言。

#### 高德自定义样式参数规格

高德地图样式可通过两种方式定制：

- **方式A（推荐）**：高德地图样式编辑器（[https://lbs.amap.com/dev/mapstyle/index），导出样式](https://lbs.amap.com/dev/mapstyle/index），导出样式) JSON，以 `amap://styles/{style_id}` 引用
- **方式B（备选）**：通过 `AMap.Map` 的 `features` 参数屏蔽特定图层

```typescript
// 推荐样式配置（文化质感模式）
const mapStyleConfig = {
  light: 'amap://styles/whitesmoke',   // 当前：浅灰底图
  dark: 'amap://styles/dark',          // 当前：暗色底图
  // 升级目标：
  lightCustom: 'amap://styles/{custom_light_id}',  // 宣纸质感
  darkCustom: 'amap://styles/{custom_dark_id}',    // 水墨质感
}

// 屏蔽商业 POI 图层
const MAP_FEATURES = ['bg', 'road', 'building', 'point'] as const
// 从中移除 'point' 可去掉所有商业标注点

mapInstance = new AMap.Map('amap-container', {
  zoom: 5,
  center: [108.0, 35.5],
  mapStyle: mapStyleConfig[store.theme],
  features: ['bg', 'road', 'building'],  // 不含 point
})
```

#### 自定义样式关键参数表


| 图层        | 当前           | 目标（文化质感）              |
| --------- | ------------ | --------------------- |
| 背景色（陆地）   | 灰白 `#f5f5f5` | 宣纸米白 `#f7f3e9`        |
| 水域颜色      | 蓝灰           | 青墨 `#b8cfd9`（降饱和）     |
| 道路主干      | 中灰           | 浅褐 `#d4c5a9`（50% 透明）  |
| 道路支路      | 浅灰           | 隐藏（opacity: 0.2）      |
| 建筑 2D 底面  | 白/灰          | 古纸色 `#ede8df`         |
| 商业 POI 标注 | 显示           | 关闭（features 移除 point） |
| 边界线       | 灰色实线         | 细虚线 `#c9b99a`         |


### 1.2 CSS 层融合与主题联动

**约束说明**：高德地图本质是 Canvas + WebGL 渲染，DOM 层上方的 CSS `mix-blend-mode` **无法穿透 Canvas 内部像素**。可达的融合效果仅限于：

1. 地图容器 `<div>` 层应用 CSS filter（实现主题色调调整）
2. Web Overlay 层（标注、面板、时间轴）与地图的视觉协调
3. 页面背景色与地图边缘的无缝衔接

```typescript
// 在 ExploreView 中动态绑定地图容器滤镜
const mapFilter = computed(() => {
  if (store.theme === 'dark') {
    return 'brightness(0.85) saturate(0.7) sepia(0.15)'
  }
  return 'saturate(0.75) sepia(0.08) brightness(1.02)'
})
```

```html
<!-- 地图容器绑定 filter -->
<div
  id="amap-container"
  :style="{ filter: mapFilter }"
  class="h-full w-full"
/>
```

**主题切换联动**：当 `store.theme` 变化时，同步调用 `map.setMapStyle()` 切换底图，同时触发 filter 过渡动画（CSS `transition: filter 0.4s ease`）。

### 1.3 3D 地标模型与光影

**可达方案**：使用 AMap 2.0 内置 `AMap.Buildings` 插件实现城市级别 3D 建筑挤压效果，并为非遗场馆叠加自定义 3D 标注。

```typescript
// 加载 3D 楼栋图层
async function init3DBuildings(AMap: any) {
  const buildings = new AMap.Buildings({
    zIndex: 10,
    zooms: [14, 20],         // 仅在 zoom ≥ 14 时显示 3D
    merge: false,
    sort: false,
  })
  mapInstance.add(buildings)
}

// 非遗场馆 3D 标注（使用 AMap.Marker 叠加 3D SVG 图标）
function addLandmarkMarker(venue: Venue, AMap: any) {
  const el = document.createElement('div')
  el.innerHTML = `
    <div class="landmark-3d">
      <svg viewBox="0 0 32 48" width="32" height="48">
        <!-- 建筑剪影 SVG -->
        <path d="M4 48 L4 16 L16 4 L28 16 L28 48 Z" fill="rgba(15,118,110,0.9)" />
        <rect x="11" y="28" width="10" height="20" fill="rgba(255,255,255,0.3)" />
      </svg>
      <div class="landmark-shadow"></div>
    </div>
  `
  const marker = new AMap.Marker({
    position: [venue.lng, venue.lat],
    content: el,
    anchor: 'bottom-center',
    zIndex: 200,
  })
  mapInstance.add(marker)
}
```

**昼夜光影模拟**：通过切换地图样式 + 3D 建筑颜色参数实现，不依赖真实光线计算引擎（Three.js 场景内有此能力，但地图层不支持物理光照）。

---

## 二、交互与组件逻辑

### 2.1 数据驱动的分类 Marker 系统

#### 数据结构扩展

在 `Venue` 接口中新增 `ichCategory` 字段：

```typescript
// src/data/explore.ts 扩展
export type IchCategory =
  | 'craft'       // 传统手工艺（雕刻、刺绣、核雕等）
  | 'performing'  // 表演艺术（粤剧、变脸、醒狮等）
  | 'festival'    // 节庆民俗
  | 'culinary'    // 传统饮食
  | 'museum'      // 综合博物馆

export interface Venue {
  id: string
  // ...existing fields...
  ichCategory: IchCategory    // 新增
  ichCategoryLabelZh: string  // 新增
  ichCategoryLabelEn: string  // 新增
}
```

#### Marker 图标工厂

```typescript
// src/utils/markerFactory.ts
import type { IchCategory } from '../data/explore'

const CATEGORY_CONFIG: Record<IchCategory, {
  color: string
  darkColor: string
  iconSvg: string
  labelZh: string
  labelEn: string
}> = {
  craft: {
    color: '#0f766e',       // teal-700
    darkColor: '#14b8a6',   // teal-400
    iconSvg: `<path d="M12 3C9 3 7 5 7 8c0 4 5 9 5 9s5-5 5-9c0-3-2-5-5-5zm0 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/>`,
    labelZh: '手工艺',
    labelEn: 'Craft',
  },
  performing: {
    color: '#c2410c',       // orange-700
    darkColor: '#fb923c',   // orange-400
    iconSvg: `<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>`,
    labelZh: '表演艺术',
    labelEn: 'Performing',
  },
  festival: {
    color: '#7c3aed',       // violet-700
    darkColor: '#a78bfa',   // violet-400
    iconSvg: `<path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888..."/>`,
    labelZh: '节庆民俗',
    labelEn: 'Festival',
  },
  culinary: {
    color: '#92400e',       // amber-800
    darkColor: '#fbbf24',   // amber-400
    iconSvg: `<path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293..."/>`,
    labelZh: '传统饮食',
    labelEn: 'Culinary',
  },
  museum: {
    color: '#1e3a5f',       // navy
    darkColor: '#93c5fd',   // blue-300
    iconSvg: `<path d="M3 21h18M3 10h18M3 7l9-4 9 4M4 10v11M8 10v11M12 10v11M16 10v11M20 10v11"/>`,
    labelZh: '博物馆',
    labelEn: 'Museum',
  },
}

export function createMarkerElement(
  category: IchCategory,
  isDark: boolean,
  hasActivity: boolean,
): HTMLElement {
  const cfg = CATEGORY_CONFIG[category]
  const color = isDark ? cfg.darkColor : cfg.color
  const el = document.createElement('div')
  el.className = 'venue-marker'
  el.style.cssText = 'position:relative;cursor:pointer;'
  el.innerHTML = `
    <div class="marker-pin" style="
      width: 36px; height: 36px; border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      background: ${color};
      border: 2.5px solid rgba(255,255,255,0.9);
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s;
    ">
      <svg style="transform:rotate(45deg)" width="18" height="18"
           viewBox="0 0 24 24" fill="none"
           stroke="white" stroke-width="2" stroke-linecap="round">
        ${cfg.iconSvg}
      </svg>
    </div>
    ${hasActivity ? `
    <span style="
      position:absolute; top:-4px; right:-4px;
      width:10px; height:10px; border-radius:50%;
      background:#ef4444; border:2px solid white;
      animation: pulse 2s infinite;
    "></span>` : ''}
    <div class="marker-label" style="
      position:absolute; top:-30px; left:50%; transform:translateX(-50%);
      background:${color}; color:white;
      padding:2px 8px; border-radius:8px;
      font-size:11px; white-space:nowrap;
      pointer-events:none; opacity:0;
      transition: opacity 0.15s;
    "></div>
  `
  return el
}

export { CATEGORY_CONFIG }
```

### 2.2 业务级"信息名片"系统

**设计目标**：替代原生 `AMap.InfoWindow`，实现一套以经纬度为锚点、内容完全 Vue 化的浮动卡片。

#### 卡片结构规格

```
┌─────────────────────────────────────────────────┐
│ [类别徽章]  场馆名称                    [×关闭]  │
│ ─────────────────────────────────────────────── │
│ [城市·类型]                                      │
│ ─────────────────────────────────────────────── │
│ 近期活动列表（最多2条）：                        │
│  ● 活动名称        日期        [剩余N/总N]       │
│    预约进度条 ████████░░░░ 65%                   │
│  ● 活动名称        日期        [剩余N/总N]       │
│ ─────────────────────────────────────────────── │
│  [查看全部活动]            [导航到这里]          │
└─────────────────────────────────────────────────┘
```

#### 经纬度锚定实现方案

AMap 提供 `map.lngLatToContainer(lngLat)` 将地理坐标转换为容器像素坐标，结合 `map.on('mapmove')` 和 `map.on('zoomchange')` 事件实现卡片跟随地图移动。

```typescript
// src/composables/useMapOverlay.ts
import type { Venue } from '../data/explore'

export function useMapOverlay(mapInstance: Ref<any>) {
  const cardPosition = ref({ x: 0, y: 0 })
  const pinnedVenue = ref<Venue | null>(null)

  function pinVenue(venue: Venue) {
    pinnedVenue.value = venue
    updateCardPosition(venue)
  }

  function updateCardPosition(venue: Venue) {
    if (!mapInstance.value || !venue) return
    const pixel = mapInstance.value.lngLatToContainer(
      new AMap.LngLat(venue.lng, venue.lat)
    )
    // Offset: card appears above-right of the pin
    cardPosition.value = {
      x: pixel.x + 20,
      y: pixel.y - 180,
    }
  }

  // Re-compute position on every map move
  function bindMapEvents() {
    if (!mapInstance.value) return
    mapInstance.value.on('mapmove', () => {
      if (pinnedVenue.value) updateCardPosition(pinnedVenue.value)
    })
    mapInstance.value.on('zoomchange', () => {
      if (pinnedVenue.value) updateCardPosition(pinnedVenue.value)
    })
  }

  return { cardPosition, pinnedVenue, pinVenue, bindMapEvents }
}
```

#### 预约进度条组件

```vue
<!-- 在卡片内展示活动预约进度 -->
<template>
  <div v-if="activity.quota" class="mt-1.5">
    <div class="mb-0.5 flex justify-between text-[10px] text-slate-400">
      <span>{{ locale === 'zh' ? '已预约' : 'Booked' }}</span>
      <span>{{ activity.quota - (activity.remaining ?? 0) }}/{{ activity.quota }}</span>
    </div>
    <div class="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
      <div
        class="h-full rounded-full bg-teal-500 transition-all duration-500"
        :style="{ width: `${bookingRatio}%` }"
        :class="bookingRatio > 80 ? 'bg-amber-500' : 'bg-teal-500'"
      />
    </div>
  </div>
</template>
```

### 2.3 地图-列表-详情三联动架构

#### 状态管理设计

```typescript
// src/stores/map.ts（新增）
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { venues, activities, type Venue } from '../data/explore'

export const useMapStore = defineStore('map', () => {
  // 地图实例引用（非响应式，直接持有）
  let _mapInstance: any = null

  // 当前可视范围内的场馆（由 map.on('moveend') 驱动）
  const visibleVenueIds = ref<Set<string>>(new Set(venues.map((v) => v.id)))

  // 激活的场馆（列表高亮 + 地图 Marker 放大 + 详情面板展开）
  const activeVenueId = ref<string | null>(null)

  // 时间轴筛选范围
  const timelineRange = ref<[string, string]>(['2026-04-01', '2026-04-30'])

  // 活动类别筛选
  const activeCategories = ref<Set<string>>(new Set())

  const activeVenue = computed(() =>
    venues.find((v) => v.id === activeVenueId.value) ?? null,
  )

  const visibleVenues = computed(() =>
    venues.filter((v) => visibleVenueIds.value.has(v.id)),
  )

  const filteredActivities = computed(() => {
    const [from, to] = timelineRange.value
    return activities.filter((a) => a.date >= from && a.date <= to)
  })

  const visibleActivityVenueIds = computed(() =>
    new Set(filteredActivities.value.map((a) => a.venueId)),
  )

  function setMapInstance(instance: any) {
    _mapInstance = instance
  }

  function setActiveVenue(id: string | null) {
    activeVenueId.value = id
    // Pan map to venue
    if (id && _mapInstance) {
      const venue = venues.find((v) => v.id === id)
      if (venue) {
        _mapInstance.panTo([venue.lng, venue.lat])
        _mapInstance.setZoom(12, true)
      }
    }
  }

  function updateVisibleVenues() {
    if (!_mapInstance) return
    const bounds = _mapInstance.getBounds()
    if (!bounds) return
    const visible = new Set(
      venues
        .filter((v) => bounds.contains([v.lng, v.lat]))
        .map((v) => v.id),
    )
    visibleVenueIds.value = visible
  }

  function setTimelineRange(from: string, to: string) {
    timelineRange.value = [from, to]
  }

  return {
    activeVenueId,
    activeVenue,
    visibleVenues,
    visibleVenueIds,
    filteredActivities,
    visibleActivityVenueIds,
    timelineRange,
    activeCategories,
    setMapInstance,
    setActiveVenue,
    updateVisibleVenues,
    setTimelineRange,
  }
})
```

#### 三联动布局结构

```
┌─────────────────────────────────────────────────────────────────┐
│  ExploreView  (地图 Tab)                                        │
│ ┌────────────────────┐  ┌──────────────────┐  ┌─────────────┐  │
│ │                    │  │ 场馆列表          │  │ 详情面板     │  │
│ │                    │  │ ─────────────── │  │ (激活时展开) │  │
│ │   AMap 地图画布    │  │ ● 场馆A  [活动2] │  │             │  │
│ │                    │  │ ● 场馆B  [活动1] │  │  场馆名称   │  │
│ │  [Marker-craft]    │  │ ○ 场馆C  (不可见)│  │  地址信息   │  │
│ │  [Marker-museum]   │  │ ─────────────── │  │  活动列表   │  │
│ │                    │  │ 视野内 2 / 共4个 │  │  预约按钮   │  │
│ └────────────────────┘  └──────────────────┘  └─────────────┘  │
│           ↑ mapmove/zoomchange 同步                              │
│           ↑ activeVenueId 联动                                    │
└─────────────────────────────────────────────────────────────────┘
```

**"视野内搜索"交互规格**：

- `map.on('moveend')` → 调用 `mapStore.updateVisibleVenues()`
- 场馆列表实时过滤为 `visibleVenues`，视野外场馆置灰
- 列表项点击 → `setActiveVenue(id)` → 地图平移 + Marker 激活 + 详情面板展开

---

## 三、业务功能设计

### 3.1 时间轴活动筛选

#### 组件规格

```
时间轴控件（TimelineSlider）：

  [← 4月1日]─────●────────────●──────[4月30日 →]
                  ↑ 开始日期    ↑ 结束日期（双柄滑块）

  地图上：
  - 在时间范围内有活动的场馆：Marker 正常显示 + 红色活动徽标
  - 不在范围内的场馆：Marker 降低不透明度（opacity: 0.3）
  - 范围变化时：Marker 的 opacity 过渡动画 0.25s
```

#### 活动 Marker 图层

独立于场馆 Marker，在每个活动的所属场馆坐标附近（偏移 +0.001 经度）渲染活动标注：

```typescript
function syncActivityMarkers(AMap: any, activities: Activity[]) {
  // 清除旧的 activity markers
  activityMarkers.forEach((m) => mapInstance.remove(m))
  activityMarkers = []

  activities.forEach((a) => {
    const venue = venues.find((v) => v.id === a.venueId)
    if (!venue) return
    const el = createActivityMarkerElement(a)
    el.addEventListener('click', () => {
      mapStore.setActiveVenue(a.venueId)
      activeTab.value = 'calendar'
      selectedActivity.value = a
    })
    const marker = new AMap.Marker({
      position: [venue.lng + 0.001, venue.lat + 0.001],
      content: el,
      anchor: 'center',
      zIndex: 150,
    })
    mapInstance.add(marker)
    activityMarkers.push(marker)
  })
}
```

### 3.2 路径规划与地理围栏

#### 路径规划（可达方案）

使用高德 `AMap.Driving` 或 `AMap.Walking` API，从用户当前位置到场馆绘制路线。

```typescript
async function showRouteToVenue(venue: Venue, mode: 'driving' | 'walking' = 'walking') {
  // 1. 获取用户当前位置
  const position = await getUserPosition()  // 封装 navigator.geolocation

  // 2. 加载路径规划插件
  const plugin = mode === 'walking' ? 'AMap.Walking' : 'AMap.Driving'
  await AMapLoader.load({ plugins: [plugin] })

  // 3. 规划路线
  const planner = mode === 'walking'
    ? new AMap.Walking({ map: mapInstance })
    : new AMap.Driving({ map: mapInstance })

  planner.search(
    new AMap.LngLat(position.lng, position.lat),
    new AMap.LngLat(venue.lng, venue.lat),
    (status: string, result: any) => {
      if (status === 'complete') {
        showRoutePanel(result, mode)
      }
    }
  )
}

async function getUserPosition(): Promise<{ lng: number; lat: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lng: pos.coords.longitude, lat: pos.coords.latitude }),
      (err) => reject(err),
      { timeout: 8000, maximumAge: 30000 }
    )
  })
}
```

#### 地理围栏签到（可达降级方案）

由于 Web 浏览器无法在后台持续监听 GPS，采用"用户主动触发 + 前台距离判断"方案：

```typescript
// 距离计算（Haversine 公式）
function calcDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000  // meters
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
    * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const GEOFENCE_RADIUS_METERS = 500  // 500m 围栏半径

async function tryGeoCheckin(venue: Venue, activityId: string) {
  try {
    const pos = await getUserPosition()
    const dist = calcDistance(pos.lat, pos.lng, venue.lat, venue.lng)
    if (dist <= GEOFENCE_RADIUS_METERS) {
      // 在围栏内，自动签到
      pointsStore.completeTask(TASK_IDS.EVENT_CHECKIN)
      emit('checkin-success', { activityId, distance: dist })
    } else {
      // 不在围栏内，提示距离
      emit('checkin-fail', {
        message: `距场馆约 ${Math.round(dist)}m，需到达 ${GEOFENCE_RADIUS_METERS}m 内才能签到`,
        distance: dist,
      })
    }
  } catch {
    // GPS 不可用，降级为手动签到
    emit('checkin-manual')
  }
}
```

### 3.3 室内外切换（降级设计）

**本轮不实现真实室内图**。设计降级方案：当 zoom ≥ 16 时，在场馆位置叠加"楼层选择器"UI，展示场馆的示意性楼层图（静态图片）。

```
zoom < 14  →  全国视角，场馆 Marker 聚合显示
zoom 14-16 →  城市视角，场馆 Marker 展开，3D 建筑层激活
zoom ≥ 16  →  场馆特写，叠加"楼层导览"入口按钮
             点击后展示静态楼层示意图 Overlay（非真实室内图）
```

---

## 四、技术性能架构

### 4.1 点聚合方案

```typescript
// 阈值动态切换策略
const CLUSTER_THRESHOLD = 20  // 超过此数量启用聚合

async function initMarkers(AMap: any, venueList: Venue[]) {
  if (venueList.length < CLUSTER_THRESHOLD) {
    // 少量点位：HTML Marker，视觉效果好
    venueList.forEach((v) => addHtmlMarker(AMap, v))
  } else {
    // 大量点位：MarkerClusterer
    await AMapLoader.load({ plugins: ['AMap.MarkerClusterer'] })
    const markers = venueList.map((v) => {
      return new AMap.Marker({ position: [v.lng, v.lat] })
    })
    new AMap.MarkerClusterer(mapInstance, markers, {
      gridSize: 60,
      renderClusterMarker: renderCustomCluster,
    })
  }
}

function renderCustomCluster({ count, marker }: { count: number; marker: any }) {
  const el = document.createElement('div')
  el.style.cssText = `
    width:40px; height:40px; border-radius:50%;
    background:rgba(15,118,110,0.85); color:white;
    display:flex; align-items:center; justify-content:center;
    font-size:14px; font-weight:600;
    box-shadow: 0 4px 12px rgba(15,118,110,0.4);
  `
  el.textContent = String(count)
  marker.setContent(el)
}
```

### 4.2 可插拔 Provider 架构

本方案以"接口契约先行"为原则，当前实现 `AMapAdapter`，预留 `MapboxAdapter` 接口位置。

```typescript
// src/map/types.ts
export interface LatLng {
  lng: number
  lat: number
}

export interface BoundsRect {
  northeast: LatLng
  southwest: LatLng
  contains(point: LatLng): boolean
}

export interface MapAdapter {
  // 生命周期
  init(containerId: string, options: MapInitOptions): Promise<void>
  destroy(): void

  // 视图控制
  setCenter(lngLat: LatLng): void
  setZoom(zoom: number, animate?: boolean): void
  panTo(lngLat: LatLng): void
  getBounds(): BoundsRect | null
  getZoom(): number

  // 样式
  setStyle(styleName: 'light' | 'dark' | string): void
  setFeatures(features: string[]): void

  // 标注管理
  addMarker(id: string, lngLat: LatLng, element: HTMLElement): void
  removeMarker(id: string): void
  updateMarkerElement(id: string, element: HTMLElement): void

  // 坐标转换
  lngLatToPixel(lngLat: LatLng): { x: number; y: number } | null

  // 事件
  on(event: 'moveend' | 'zoomend' | 'click', handler: Function): void
  off(event: string, handler: Function): void
}

export interface MapInitOptions {
  zoom: number
  center: LatLng
  style?: string
  features?: string[]
  pitch?: number        // 3D 俯仰角
  rotation?: number
}
```

```typescript
// src/map/AMapAdapter.ts
import type { MapAdapter, LatLng, BoundsRect, MapInitOptions } from './types'
import AMapLoader from '@amap/amap-jsapi-loader'

export class AMapAdapter implements MapAdapter {
  private map: any = null
  private AMap: any = null
  private markerMap = new Map<string, any>()

  async init(containerId: string, options: MapInitOptions) {
    const key = import.meta.env.VITE_AMAP_KEY as string
    this.AMap = await AMapLoader.load({ key, version: '2.0' })
    this.map = new this.AMap.Map(containerId, {
      zoom: options.zoom,
      center: [options.center.lng, options.center.lat],
      mapStyle: options.style ?? 'amap://styles/whitesmoke',
      features: options.features ?? ['bg', 'road', 'building'],
      viewMode: '3D',
      pitch: options.pitch ?? 0,
    })
  }

  destroy() { this.map?.destroy(); this.map = null }

  setCenter(lngLat: LatLng) {
    this.map?.setCenter([lngLat.lng, lngLat.lat])
  }

  setZoom(zoom: number, animate = false) {
    this.map?.setZoom(zoom, animate)
  }

  panTo(lngLat: LatLng) {
    this.map?.panTo([lngLat.lng, lngLat.lat])
  }

  getBounds(): BoundsRect | null {
    const b = this.map?.getBounds()
    if (!b) return null
    return {
      northeast: { lng: b.getNorthEast().getLng(), lat: b.getNorthEast().getLat() },
      southwest: { lng: b.getSouthWest().getLng(), lat: b.getSouthWest().getLat() },
      contains: (p: LatLng) => b.contains([p.lng, p.lat]),
    }
  }

  getZoom() { return this.map?.getZoom() ?? 5 }

  setStyle(styleName: string) {
    const styleMap: Record<string, string> = {
      light: 'amap://styles/whitesmoke',
      dark: 'amap://styles/dark',
    }
    this.map?.setMapStyle(styleMap[styleName] ?? styleName)
  }

  setFeatures(features: string[]) {
    this.map?.setFeatures(features)
  }

  addMarker(id: string, lngLat: LatLng, element: HTMLElement) {
    if (this.markerMap.has(id)) this.removeMarker(id)
    const marker = new this.AMap.Marker({
      position: [lngLat.lng, lngLat.lat],
      content: element,
      anchor: 'bottom-center',
    })
    this.map?.add(marker)
    this.markerMap.set(id, marker)
  }

  removeMarker(id: string) {
    const m = this.markerMap.get(id)
    if (m) { this.map?.remove(m); this.markerMap.delete(id) }
  }

  updateMarkerElement(id: string, element: HTMLElement) {
    this.markerMap.get(id)?.setContent(element)
  }

  lngLatToPixel(lngLat: LatLng) {
    const p = this.map?.lngLatToContainer(
      new this.AMap.LngLat(lngLat.lng, lngLat.lat)
    )
    if (!p) return null
    return { x: p.x, y: p.y }
  }

  on(event: string, handler: Function) {
    this.map?.on(event, handler)
  }

  off(event: string, handler: Function) {
    this.map?.off(event, handler)
  }
}
```

---

## 五、实施优先级与工作量评估

### 优先级分级

**P0（核心演示链路，必须完成）**


| 任务                   | 估时   | 依赖                   |
| -------------------- | ---- | -------------------- |
| 自定义底图样式（高德样式编辑器）     | 2h   | VITE_AMAP_KEY        |
| CSS filter 主题联动      | 0.5h | 无                    |
| MarkerFactory 分类图标体系 | 3h   | Venue.ichCategory 字段 |
| mapStore（三联动状态层）     | 2h   | 无                    |
| 场馆侧边列表 + 视野内过滤       | 3h   | mapStore             |
| 浮动信息卡（含预约进度条）        | 3h   | mapStore             |


**P1（完整演示，建议完成）**


| 任务                      | 估时  | 依赖                      |
| ----------------------- | --- | ----------------------- |
| 时间轴滑块 + 活动 Marker 图层    | 4h  | mapStore                |
| 路径规划（步行/驾车模式）           | 3h  | AMap Walking/Driving 插件 |
| AMapAdapter 接口封装        | 4h  | 无（重构现有代码）               |
| 3D 建筑图层（AMap.Buildings） | 1h  | zoom ≥ 14 触发            |


**P2（可选增强，时间充裕时添加）**


| 任务                      | 估时  | 依赖              |
| ----------------------- | --- | --------------- |
| 地理围栏签到（Haversine 距离判断）  | 2h  | Geolocation API |
| 点聚合（MarkerClusterer 插件） | 1h  | 无               |
| 楼层选择降级 UI               | 2h  | 静态楼层图资产         |
| 标注进场/退场 CSS 动画          | 1h  | 无               |


---

## 六、当前代码改造路径

### 对 ExploreView.vue 的最小改造清单


| 改造项                                                    | 类型   | 说明                       |
| ------------------------------------------------------ | ---- | ------------------------ |
| 引入 `mapStore`                                          | 新增   | 替代局部 `selectedVenue` ref |
| `initMap()` 调用 `mapStore.setMapInstance()`             | 修改   | 1行                       |
| `map.on('moveend')` → `mapStore.updateVisibleVenues()` | 新增   | 5行                       |
| 新增场馆侧边列表列                                              | 新增组件 | 约 80 行 HTML              |
| Marker 创建改用 `createMarkerElement(v.ichCategory)`       | 修改   | 替换现有 dot 创建逻辑            |
| CSS filter 绑定                                          | 修改   | 2行                       |


### 对 explore.ts 的数据补充

```typescript
// 每个 venue 新增字段（示例）
{
  id: 'v001',
  ichCategory: 'museum',        // 新增
  ichCategoryLabelZh: '综合博物馆', // 新增
  ichCategoryLabelEn: 'Museum', // 新增
  hasActiveActivity: true,      // 新增（由 computed 派生更好）
  // ...existing fields
}
```

---

## 七、不可达需求的降级记录


| 需求                      | 不可达原因                                      | 文档中的处理方式                                     |
| ----------------------- | ------------------------------------------ | -------------------------------------------- |
| **室内楼层图**               | 需高德室内地图商业协议 + 室内平面图 CAD 资产，两者均不具备          | 设计降级 UI（楼层选择器 + 静态图片 Overlay），在答辩中作为"设计愿景"展示 |
| **真实 3D 建筑精模**          | 无建筑 GLB/GLTF 资产，无法通过 Three.js 加载真实建筑       | 使用 AMap 内置 3D 楼栋层（程序化挤压），标注"原型层面的 3D 表达"     |
| **后台地理围栏监听**            | Web 浏览器安全策略限制，无法在页面不可见时持续运行 JS             | 降级为"主动触发 + 前台距离计算"，答辩中说明真实 App 场景可用原生推送实现    |
| **mix-blend-mode 底图穿透** | AMap Canvas 渲染不暴露 DOM 层，CSS 混合模式无法影响地图内容像素 | 用 CSS filter 替代，实现色调/亮度调节，视觉效果接近，方案已在第1.2节说明 |
| **即时通讯入口**              | 无 IM 后端                                    | 信息卡内放置"联系场馆"按钮，链接至 `tel:` 或模拟对话弹窗            |


---

## 八、与现有系统的集成约定

### 积分联动保持不变

地图系统不改变 `usePointsStore` 的接口。地理围栏签到成功后仍调用：

```typescript
pointsStore.completeTask(TASK_IDS.EVENT_CHECKIN)
```

### 路由无新增

地图作为 `ExploreView.vue` 的子功能，不新增路由，不影响 Hub 的导航结构。

### 主题响应

mapAdapter 的 `setStyle()` 在 `watch(store.theme, ...)` 中调用，与整站主题联动，实现地图层跟随全局昼/夜切换。

```typescript
watch(() => store.theme, (theme) => {
  mapAdapter?.setStyle(theme)
  // CSS filter 由 computed mapFilter 自动响应
})
```

