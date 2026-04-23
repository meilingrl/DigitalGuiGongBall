# 设计文档索引

本目录存放产品与交互相关的说明材料。**运行项目、目录总览与快速开始见仓库根目录 [README.md](../README.md)。**  
**开发方法（过程模型、协作约定）与开发历程（里程碑表）** 已写在根目录 README 中，与下表设计文档交叉引用。

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


---

## 与代码的对应关系（便于检索）

- **地图探索页** → `src/views/hub/ExploreView.vue`，地图抽象 → `src/map/`、`src/stores/map.ts`
- **Hub 布局与导航** → `src/layouts/HubLayout.vue`，侧栏/底栏组件 → `src/components/HubSidebarDock.vue`、`HubBottomBar.vue`
- **三维工坊** → `src/views/AtelierView.vue`、`src/components/AtelierScene.vue`
- **积分等业务状态** → `src/stores/points.ts` 等
- **各 Hub 子页数据** → `src/data/*.ts`

更新文档时建议在文内注明日期或版本，便于课程作业与协作追溯。