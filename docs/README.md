# 非遗文化互联平台（人机交互的软件工程方法 · 课程仓库）

面向协作者的说明：**日常开发以 `NeuHcl/` 为主**；根目录下的设计文档描述产品与技术决策；`digital-guigong-ball/` 为与《地图系统设计》对齐的基准/对照工程，功能可能与 `NeuHcl` 并行演进，合并或同步前请先与负责人对齐。

---

## 1. 技术栈

| 类别 | 选型 |
|------|------|
| 框架 | Vue 3（`<script setup>`） |
| 语言 | TypeScript |
| 构建 | Vite 8 |
| 样式 | Tailwind CSS v3 |
| 状态 | Pinia |
| 路由 | Vue Router |
| 地图 | 高德地图 JS API 2.0（`@amap/amap-jsapi-loader`） |
| 3D | Three.js |
| 工具 | VueUse 等 |

---

## 2. 环境要求

- **Node.js**：建议 **20 LTS** 或更高（与 Vite 8 常见实践一致）。
- **包管理**：使用 **npm**（仓库内已有 `package-lock.json`）。

---

## 3. 快速开始（主工程 `NeuHcl`）

```bash
cd NeuHcl
npm install
```

在项目根目录 `NeuHcl/` 下新建或编辑 `.env`（可参考仓库内已有 `.env` 注释，**勿将含真实 Key 的文件推送到公开远程**）：

```env
VITE_AMAP_KEY=你的高德_Web端_JS_API_Key
```

在 [高德开放平台](https://lbs.amap.com/) 申请 **Web 端（JS API）** Key。修改 `.env` 后需**重启** `npm run dev`。

```bash
npm run dev      # 本地开发，默认 Vite 开发服务器
npm run build    # 类型检查 + 生产构建
npm run preview  # 本地预览构建产物
```

开发服务器启动后，按终端提示访问（一般为 `http://localhost:5173`）。应用入口路由会将 `/` 重定向到 `/hub/dashboard`。

---

## 4. 仓库结构说明

| 路径 | 说明 |
|------|------|
| `NeuHcl/` | **主前端工程**（含独立 Git 仓库）。页面、地图、三维工坊等在此迭代。 |
| `digital-guigong-ball/` | 设计文档中的**基准代码**副本，可用于对照或实验；**不作为默认开发入口**。 |
| `MAP_SYSTEM_DESIGN.md` | 地图交互：可达性矩阵、视觉与数据规格、接口约定、降级策略。 |
| `ADAPTIVE_ARCHITECTURE.md` | 全站自适应：流体布局、组件抽取、改造优先级（P0–P3）。 |
| `NeuHcl/docs/VideoCard-design.md` | 视频卡片相关设计与实现说明。 |

### 4.1 `NeuHcl/src` 导读（便于定位代码）

- `router/index.ts`：路由表；`/hub/*` 为业务子页，`/atelier` 为三维场景。
- `layouts/HubLayout.vue`：Hub 整体布局（侧栏 / 底栏等）。
- `views/hub/`：各业务页（如 `ExploreView` 地图探索、`MuseumView` 博物馆等）。
- `stores/`：Pinia 状态（如地图、积分等）。
- `map/`：地图适配与类型（若存在 `AMapAdapter` 等，与《地图系统设计》中的 Provider 抽象对应）。

---

## 5. 协作规范

1. **以 `NeuHcl` 为提交单位**：克隆课程仓库后，进入 `NeuHcl` 进行分支与提交（若远程仅挂载子目录，按课程组实际流程操作）。
2. **分支与提交**：建议使用简短功能分支（如 `feature/explore-cluster`）；提交信息推荐 **Conventional Commits**（如 `feat:`、`fix:`、`docs:`），中文描述清晰即可。
3. **合并前自检**：至少本地执行 `npm run build`，确保 TypeScript 与构建通过。
4. **密钥与配置**：`.env` 仅本地或组内私有渠道共享，**不要**把真实 `VITE_AMAP_KEY` 写进 README 或提交到公开仓库。
5. **文档联动**：涉及地图行为、响应式大改时，同步更新或备注 `MAP_SYSTEM_DESIGN.md` / `ADAPTIVE_ARCHITECTURE.md` 中的版本与日期，便于后人追溯。

---

## 6. 开发过程、记录与进度

本节用于**人机交互与软件工程过程**的可追溯说明；**每次迭代后请更新「迭代记录」表格**（可在 PR 描述中写要点，合并时补一行）。

### 6.1 过程与方法（课程向）

- **需求与设计**：由用例与交互流程落实到页面与地图规格（见 `MAP_SYSTEM_DESIGN.md`）。
- **架构决策**：自适应与组件边界以 `ADAPTIVE_ARCHITECTURE.md` 为纲，按 P0→P1 逐步落地，避免一次性大重构。
- **实现与验证**：本地 `dev` 联调地图 Key；构建通过作为基线；重要交互可附截图或录屏到组内文档（可选）。

### 6.2 里程碑（按文档与当前代码归纳）

| 阶段 | 内容 | 状态 |
|------|------|------|
| M1 | Hub 多页面骨架、路由与基础布局 | 已具备 |
| M2 | 地图探索页、高德接入、主题与数据驱动展示 | 已具备（持续优化） |
| M3 | 三维工坊（Three.js）与业务页扩展 | 已具备（持续优化） |
| M4 | 地图深度能力：列表联动、聚合、活动图层等 | 见设计文档矩阵，部分项规划中 |
| M5 | 流体布局与组件级自适应（VideoCard 等） | 见 `ADAPTIVE_ARCHITECTURE.md` 优先级 |

### 6.3 迭代记录（维护此表）

| 日期 | 摘要 | 关联 |
|------|------|------|
| 2026-04-08 | 《地图系统设计》成稿：可达性矩阵与实现规格 | `MAP_SYSTEM_DESIGN.md` |
| 2026-04-09 | 《全站自适应架构》成稿：流体刻度与改造分级 | `ADAPTIVE_ARCHITECTURE.md` |
| 2026-04-12 | 根目录 README：协作入口、环境说明、进度与文档索引 | 本文件 |

### 6.4 当前焦点与建议下一步（可随迭代改写）

- **地图**：按 `MAP_SYSTEM_DESIGN.md` 中 ✅/⚠️ 项逐项落地（如 Marker 类别扩展、列表与地图联动、聚合策略）。
- **体验**：按 `ADAPTIVE_ARCHITECTURE.md` 推进 P0（流体刻度、卡片组件统一与输入类型感知）。
- **协作**：统一「以 `NeuHcl` 为准」的合并节奏，避免两目录长期分叉无说明。

---

## 7. 相关链接

- [Vue 3 文档](https://vuejs.org/)
- [Vite 文档](https://vite.dev/)
- [高德开放平台](https://lbs.amap.com/)
- [Tailwind CSS](https://tailwindcss.com/)

如有课程组统一的 Wiki / 飞书 / 钉钉文档，可在此节末尾由负责人补充一行 **「过程材料与会议纪要」** 链接。
