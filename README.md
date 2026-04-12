# 数字鬼工球 · 非遗文化互联平台

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

## 开发方法

本项目对应**人机交互的软件工程方法**课程实践：在明确边界的前提下，用可交付的原型串联「需求—设计—实现—验证」，并用文档保证可讲解、可追溯。

### 过程模型（迭代 + 文档驱动）

1. **界定范围**：在 MVP 内排优先级，明确「做 / 暂缓 / 不做」（见 `docs/TEAM_WORKPLAN.md` 中的目标、非目标与阶段划分）。
2. **设计先行**：交互与结构先在设计文档中定型，再落到代码，避免无规格堆砌页面。
   - 地图相关：`docs/MAP_SYSTEM_DESIGN.md`（行为、数据、降级策略）。
   - 响应式与布局：`docs/ADAPTIVE_ARCHITECTURE.md`（流体刻度、组件优先级 P0–P3）。
   - 新模块草案：`docs/FEATURE_DESIGN_NEW_MODULES.md`；视频卡片：`docs/VideoCard-design.md`。
3. **增量实现**：按 Hub → 单页深化 → 横切能力（地图抽象层、主题、状态库）的顺序迭代；复杂能力允许先用**模拟数据与可信流程**代替完整后端（与团队计划一致）。
4. **验证与集成**：功能完成后在目标分辨率与主流浏览器下走通主路径；合并前至少 **`npm run build`** 通过，作为类型检查与构建基线。
5. **回顾与归档**：重要决策写入对应 `docs/*.md`（可注明日期）；答辩与汇报要点见 `docs/DEFENSE_REPORT_KEYPOINTS.md`。

### 协作与工程约定

- **分支与提交**：功能分支开发，合并进 `main`；提交信息推荐 **Conventional Commits**（`feat:` / `fix:` / `docs:` / `refactor:` 等），中文概要写清「做了什么」。
- **角色分工**（可一人多职）：产品把控范围与里程碑；Hub 前端负责路由、布局与业务页骨架；3D 负责 Atelier；UI/UX 统一令牌与交互文案；测试/集成负责清单与演示脚本（详见 `docs/TEAM_WORKPLAN.md`）。
- **密钥**：`.env` 仅本地或组内安全渠道共享，禁止写入 README 或提交到公开远程。

---

## 开发历程

下表按**时间顺序**归纳已记录的关键节点；后续迭代可在表格末尾追加行，并在相关设计文档中补充说明。

| 时间（约） | 阶段 / 事项 | 说明 | 关联文档 / 代码锚点 |
|------------|-------------|------|---------------------|
| 项目启动 | 工程脚手架与目录约定 | Vite + Vue 3 + TS，接入 Tailwind、Pinia、Vue Router；确立 `Hub` / `Atelier` 双模式与 MVP 边界。 | `docs/TEAM_WORKPLAN.md` |
| 迭代早中期 | Hub 多页与 Atelier 原型 | Dashboard、Workshop、Museum、Social、Stats、Settings 等页面骨架；三维工坊场景与导航联动；数据与文案从 `src/data` 驱动。 | `src/views/hub/`、`src/views/AtelierView.vue` |
| 2026-04-08 | 地图系统设计成稿 | 地图交互矩阵、视觉与数据规格、接口与降级策略文档化。 | `docs/MAP_SYSTEM_DESIGN.md` |
| 2026-04-09 | 全站自适应架构成稿 | 流体布局、组件抽取与改造优先级（P0–P3）。 | `docs/ADAPTIVE_ARCHITECTURE.md` |
| 持续 | 地图能力工程化 | 将高德接入与标注等逻辑收敛到 `src/map/` 与 `src/stores/map.ts`，探索页与数据层对齐设计文档。 | `src/map/`、`src/stores/map.ts` |
| 持续 | 业务扩展 | 探索 / 商城 / 社交等 Hub 子页与积分等状态；侧栏、底栏与主题切换等横切 UI。 | `src/views/hub/`、`src/stores/points.ts` |
| 2026-04-12 | 仓库与文档整理 | 以本仓库为唯一准线重建 Git 历史并推送远程；根目录 README 与 `docs/README.md` 按当前目录结构重写。 | 本文件、`docs/README.md` |

> **维护约定**：每次重要里程碑（设计定稿、大功能合入、演示前冻结）建议在本表增一行，并在 PR / 提交说明中引用对应 `docs` 或 Issue，便于课程过程材料对齐。

---

## 协作提示

- 合并或发版前建议本地执行 `npm run build`。
- 提交信息可使用 Conventional Commits（如 `feat:`、`fix:`、`docs:`）。
- 地图行为、响应式大改请同步维护 `docs/MAP_SYSTEM_DESIGN.md`、`docs/ADAPTIVE_ARCHITECTURE.md` 等文档。

---

## 相关链接

- [Vue 3](https://vuejs.org/) · [Vite](https://vite.dev/) · [高德开放平台](https://lbs.amap.com/) · [Tailwind CSS](https://tailwindcss.com/)
