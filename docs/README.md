# 设计文档索引

本目录存放产品与交互相关的说明材料。**运行项目、目录总览与快速开始见仓库根目录 [README.md](../README.md)。**  
2026-10-21 文化与创作整合见 [INTEGRATION_20261021.md](./INTEGRATION_20261021.md)；2026-10-16 全栈升级记录见 [UPGRADE_20261016.md](./UPGRADE_20261016.md)，项目理解与简历依据见 [PROJECT_GUIDE.md](./PROJECT_GUIDE.md)。原课程 README 保存为 [COURSE_README.md](./COURSE_README.md)，以下历史计划不再限制本轮已授权的全栈范围。

---

## 文档一览


| 文件                                                               | 内容概要                    |
| ---------------------------------------------------------------- | ----------------------- |
| [MAP_SYSTEM_DESIGN.md](./MAP_SYSTEM_DESIGN.md)                   | 地图系统：交互规格、数据与接口约定、降级策略等 |
| [ADAPTIVE_ARCHITECTURE.md](./ADAPTIVE_ARCHITECTURE.md)           | 全站自适应：流体布局、组件边界、改造优先级   |
| [FEATURE_DESIGN_NEW_MODULES.md](./FEATURE_DESIGN_NEW_MODULES.md) | 新模块功能设计草案               |
| [DEFENSE_REPORT_KEYPOINTS.md](./DEFENSE_REPORT_KEYPOINTS.md)     | 答辩/汇报要点整理               |
| [TEAM_WORKPLAN.md](./TEAM_WORKPLAN.md)                           | 团队工作计划                  |
| [VideoCard-design.md](./VideoCard-design.md)                     | 视频卡片组件设计与实现说明           |
| [NEXT_ITERATION_BACKLOG.md](./NEXT_ITERATION_BACKLOG.md)         | 下一轮迭代：需求对齐与任务评估           |
| [ASSET_IMAGE_PROMPTS.md](./ASSET_IMAGE_PROMPTS.md)                 | 博物馆 / 探索 / 商城等生图英文 prompt 备忘 |
| [素材规范](../src/assets/materials/ASSET_SPEC.md)                  | `materials` 目录约定、命名、公开资源迁移记录   |


---

## 与代码的对应关系（便于检索）

- **地图探索页** → `src/views/hub/ExploreView.vue`，地图抽象 → `src/map/`、`src/stores/map.ts`
- **Hub 布局与导航** → `src/layouts/HubLayout.vue`，旧侧栏/底栏组件保留为历史实现；当前核心导航在 HubLayout 中
- **三维工坊** → `src/views/AtelierView.vue`、`src/components/AtelierScene.vue`
- **当前程序化镂空几何与渲染** → `src/three/`；后端和共享契约 → `server/`、`shared/`
- **历史程序化 3D 资产** → `tools/blender/*.py`，发布模型与元数据 → `src/assets/materials/models/`、`documents/`
- **积分等业务状态** → `src/stores/points.ts` 等
- **各 Hub 子页数据** → `src/data/*.ts`

更新文档时建议在文内注明日期或版本，便于课程作业与协作追溯。
