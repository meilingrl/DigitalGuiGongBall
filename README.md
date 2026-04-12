# 数字桂工球 · 非遗文化互联平台

Vue 3 + TypeScript 前端：Hub 多业务页、高德地图探索、三维工坊（Three.js）、积分与主题等。设计说明见 `docs/`。

---

## 技术栈

| 类别 | 选型 |
|------|------|
| 框架 | Vue 3（`<script setup>`） |
| 语言 | TypeScript |
| 构建 | Vite 8 |
| 样式 | Tailwind CSS v3 |
| 状态 | Pinia |
| 路由 | Vue Router |
| 地图 | 高德 JS API（`@amap/amap-jsapi-loader`） |
| 3D | Three.js |
| 工具 | VueUse 等 |

---

## 环境要求

- **Node.js**：建议 20 LTS 或更高。
- **包管理**：npm（仓库含 `package-lock.json`）。

---

## 快速开始

```bash
npm install
```

在项目根目录创建 `.env`（勿将含真实 Key 的 `.env` 提交到远程）：

```env
VITE_AMAP_KEY=你的高德_Web端_JS_API_Key
```

在 [高德开放平台](https://lbs.amap.com/) 申请 **Web 端（JS API）** Key。修改 `.env` 后需重启开发服务器。

```bash
npm run dev      # 默认 http://localhost:5173，/ 会重定向到 /hub/dashboard
npm run build    # 类型检查 + 生产构建
npm run preview  # 预览构建产物
```

---

## 仓库目录结构

```
digital-guigong-ball/
├── docs/                          # 设计文档（地图、自适应、功能规划等）
│   ├── README.md                  # 文档索引
│   ├── MAP_SYSTEM_DESIGN.md
│   ├── ADAPTIVE_ARCHITECTURE.md
│   ├── FEATURE_DESIGN_NEW_MODULES.md
│   ├── DEFENSE_REPORT_KEYPOINTS.md
│   ├── TEAM_WORKPLAN.md
│   └── VideoCard-design.md
├── index.html                     # HTML 入口
├── package.json
├── package-lock.json
├── vite.config.ts                 # Vite 配置
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json                  # TypeScript 工程配置
├── tsconfig.app.json
├── tsconfig.node.json
└── src/
    ├── main.ts                    # 应用入口
    ├── App.vue
    ├── style.css                  # 全局样式
    ├── assets/                    # 静态资源（图片、SVG 等）
    ├── components/              # 通用组件
    │   ├── AtelierScene.vue      # 三维场景封装
    │   ├── VideoCard.vue
    │   ├── HubSidebarDock.vue
    │   ├── HubBottomBar.vue
    │   ├── TemplateCard.vue
    │   ├── ThemeToggle.vue
    │   └── HelloWorld.vue
    ├── composables/             # 组合式函数
    │   └── usePointerType.ts
    ├── data/                    # 展示用数据与文案
    │   ├── content.ts
    │   ├── explore.ts
    │   ├── mall.ts
    │   ├── museum.ts
    │   ├── social.ts
    │   └── stats.ts
    ├── layouts/
    │   └── HubLayout.vue         # Hub 整体布局（侧栏、底栏等）
    ├── map/                     # 地图抽象层（适配高德、类型、标注工厂）
    │   ├── AMapAdapter.ts
    │   ├── markerFactory.ts
    │   └── types.ts
    ├── router/
    │   └── index.ts             # 路由表
    ├── stores/                  # Pinia
    │   ├── app.ts
    │   ├── map.ts
    │   └── points.ts
    ├── theme/
    │   └── syncThemeDom.ts
    └── views/
        ├── AtelierView.vue      # 路由 /atelier
        └── hub/                 # 路由前缀 /hub/*
            ├── DashboardView.vue    # /hub/dashboard
            ├── WorkshopView.vue     # /hub/workshop
            ├── MuseumView.vue       # /hub/museum
            ├── SocialView.vue       # /hub/social
            ├── ExploreView.vue      # /hub/explore（地图）
            ├── MallView.vue         # /hub/mall
            ├── StatsView.vue        # /hub/stats
            └── SettingsView.vue     # /hub/settings
```

构建产物 `dist/`、`node_modules/`、`.env` 等由 `.gitignore` 忽略，不在版本库中列出。

---

## 协作提示

- 合并或发版前建议本地执行 `npm run build`。
- 提交信息可使用 Conventional Commits（如 `feat:`、`fix:`、`docs:`）。
- 地图行为、响应式大改请同步维护 `docs/MAP_SYSTEM_DESIGN.md`、`docs/ADAPTIVE_ARCHITECTURE.md` 等文档。

---

## 相关链接

- [Vue 3](https://vuejs.org/) · [Vite](https://vite.dev/) · [高德开放平台](https://lbs.amap.com/) · [Tailwind CSS](https://tailwindcss.com/)
