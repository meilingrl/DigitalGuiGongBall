# 内外层参数编辑 · 2026-10-23

> 执行：subagent-driven-development，逐项实现与独立审查；用户已授权具体设计与本轮实现，不重复等待确认。本文合并设计、实施计划和交付记录，保留上一轮历史文档。

**Goal:** 最外层与最内层可独立修改纹样、密度、开孔，真实保存后刷新、重登和重启均完整还原。
**Architecture:** 新增配置 v2 与两个有语义的球壳设置；兼容原样读取/提交 v1。共享层解析函数连接前端、几何和预览，沿用原 API、SQLite JSON 持久化与版本/幂等流程。
**Tech Stack:** Vue 3、TypeScript、Three.js、Express、SQLite、node:test；Node >=22.13，不新增依赖。
**Spec:** 下方「设计与边界」即本轮规格，依据用户 2026-10-23 的逐层编辑授权。

起点 `9508f4f6f6470ef20b5cf60afc3535799c894e18`，开始 2026-10-23 02:17 SGT。复用已隔离工作区 `../DigitalGuiGongBall.worktrees/culture-creation-20261021`，新分支 `upgrade/layer-parameters-20261023`；原目录和上一轮分支保留。

## Global Constraints

- 只实现内外两层的纹样、密度、开孔编辑；不扩展撤销重做、分享、学习系统或其他业务。
- 最外层为 index 0，最内层为 index layers-1；中间层沿用根级模板、密度、开孔。改变层数后角色仍对应新的最外/最内层，不丢弃设置。
- 原配置 v1 的校验输出、请求摘要、pending 请求与 journal 重放不得自动补字段或升级；首次逐层编辑才返回 v2。
- SQLite 仍为 schema v3，无数据库结构迁移或全量重写旧记录；v1/v2 作品在同一服务共存。
- 同一舞台保留一个 WebGLRenderer；离屏预览按已确认配置捕获，借用几何须比较所有有效层纹样，失败恢复和资源所有权不削弱。
- 组件复制配置并发出更新，不修改嵌套 prop；编辑对象不自动改变观察参数，聚焦通过显式操作。
- 不增加运行时/测试依赖，不放宽类型门禁，不删除有效旧协议断言，不模拟后端成功。
- 实现代理不启动其他代理、不推送；主代理负责审查、浏览器验证、正常推送并核对远端。保留原始历史，不合并默认分支、不强推。

## 设计与边界

三种可能：逐层数组适合全部图层编辑，但带来增删层和迁移规则；无版本的可选字段会混淆旧请求与新语义；本轮选有版本的内外角色对象，界面和数据都限定为两层。未来如扩展任意层，再设计下一版格式。

v2 保留现有根级字段，新增必填且严格的 `layerPatterns: { outer, inner }`，每项为 `{ templateId, patternScale, aperture }`。纹样仍用 `linglong | ruyi | lianhua`，密度整数 8–24，开孔 0.35–0.8；仅纹样选择复用三种现有几何，整体模板、材料与来源不随之更换。旧模板默认 v1，首次改某一层时从原值完整初始化两层后只更改目标层。

共享代码职责：`layerPattern.ts` 定义球壳 schema/type；`design.ts` 定义 v1/v2 配置及旧类型导出；`layerDesign.ts` 只解析有效层参数和复制更新，不依赖页面或 Three。`getLayerPattern(config,index)` 返回独立的三字段值；`withLayerPattern(config,role,patch)` 返回 v2，独立复制两个角色，保持材料、观察和中间层默认值。

工坊中保留层数、观察和材料控件，新增「外层 / 内层」选择及纹样、密度、开孔，标明中间层规则；旧全局密度/开孔控件被替换，避免误以为仍修改全部球壳。提供「单独观察此层」显式调用既有聚焦能力，仍可用原下拉查看全部。详情分别列出两层设置，v1 仍显示原全局摘要。

## Task 1: 配置契约与真实持久化兼容

**Files:** 新增 `shared/layerPattern.ts`、`shared/layerDesign.ts`、`tests/layer-design.test.ts`、`server/tests/layer-design.test.ts`；修改 `shared/design.ts`、`scripts/verify-restart.mjs`；确需时补充 `tests/draft.test.ts` / `tests/draft-storage.test.ts`。
**Interfaces:** `LayerRole = 'outer' | 'inner'`；`LayerPattern` 三字段；`getLayerPattern(config: DesignConfig,index:number): LayerPattern`；`withLayerPattern(config: DesignConfig,role:LayerRole,patch:Partial<LayerPattern>): DesignConfigV2`。从 design 导出 `DesignConfigV1`、`DesignConfigV2`、union `DesignConfig`；默认模板明确为 v1。版本化严格对象保持 v1 字段顺序和输出，不使用 transform/default 注入新字段。

- [ ] RED：v2 完整配置可通过校验，缺失/未知角色、非法范围、小数密度、未知纹样/版本、未知字段被拒绝。v1 `deepEqual(parse(v1),v1)` 原样成立。
- [ ] RED：原值初始化两角色，修改外层不改内层/中间/原对象，反向同理；改变层数角色跟随；Vue reactive 配置可深拷贝、草稿可完整往返。
- [ ] 实现分版本严格 Zod schema，以及两个小型共享函数。示例有效差异：outer `{templateId:'lianhua',patternScale:10,aperture:.7}`，inner `{templateId:'ruyi',patternScale:20,aperture:.4}`。
- [ ] 用真实 workFixture HTTP/独立数据库验证 v2 创建、读取、更新、重启、复制和列表；未登录/另一用户不能读写，非法 v2 返回400且原记录不变。保留原 v1 请求重放场景，再证明同键 v2 重放正确、改变内层后同键409。
- [ ] 扩展编译后重启脚本：保留 v1 创建/重放，在原 update 处升级 v2；SIGKILL、重登、复制和恢复之后核对完整配置与来源，不减少原图片/归属断言。
- [ ] 聚焦测试、完整 typecheck、全量测试、build:all、test:restart 通过后提交；记录 RED/GREEN，不推送。

## Task 2: 实时几何与预览使用同一层参数

**Files:** `src/three/ornament.ts`、`src/three/preview.ts`、必要时 `AtelierStage.ts`；`tests/ornament.test.ts`、`tests/preview-render.test.ts`。
**Interfaces:** `createShellGeometry` 的三字段输入不变；每个球壳通过 `getLayerPattern(config,index)` 选参数。`sameTopology(a,b)` 按层数与各层实际三字段比较，忽略材料/观察；捕获外部 API 和资源接口不变。

- [ ] RED：不同角色真实生成不同几何，改变外层三字段只改变外层几何，内层与中间层保持；两层/多层均有递减半径和原资源释放行为。
- [ ] RED：同层数但角色纹样/密度/开孔变化不复用错误几何；相同有效参数（包括 v1 与等价 v2）可复用；材料/观察变化不重建。临时快照按旧 retry 配置重建，借用对象不被释放。
- [ ] 接入共享解析；保留已有 debounce、相机和几何预算，不引入第二 renderer 或几何缓存框架。检查 Stage 的配置快照是否需要深克隆以避免 v2 嵌套参数后续变更污染 renderedConfig；采用已有 cloneDesign，而非复制私有状态测试。
- [ ] 聚焦几何/预览测试、全部类型/测试、生产构建通过后提交；报告浏览器需验证项，不推送。

## Task 3: 工坊编辑和作品回看

**Files:** 新增 `src/components/atelier/LayerPatternEditor.vue`；修改 `AtelierParameters.vue`、`src/views/hub/WorkDetailView.vue` 和必要的工坊局部样式；补充编辑/草稿行为测试；不改旧课程页面。
**Interfaces:** 新组件 `v-model<DesignConfig>`，内部只保留待编辑角色，使用 `getLayerPattern` 读取与 `withLayerPattern` 更新；不访问 API、router、账号或 storage。全部输入依旧受父 fieldset 的恢复禁用规则约束。

- [ ] 主代理先在基线浏览器确认没有内外层编辑入口，作为 UI RED；实现前若可直接复用既有真实组件编译/渲染测试则使用，不新增为测试而存在的假 UI 框架。
- [ ] 层选择显示各角色当前纹样摘要；表单提供三纹样选择、密度8–24、开孔35–80%；动态 aria-label 含外层/内层。选择编辑对象不更改配置，不产生 dirty；调参复制更新，保留另一角色、材料、观察和来源。
- [ ] 保留层数/观察/材料；移除活动工坊原全局密度/开孔控件，注明中间层使用原模板参数。提供显式「单独观察外层/内层」按钮设置原 activeLayer；切换层数后继续正确定位角色。
- [ ] 详情按 v2 显示两角色纹样、密度、开孔以及中间层沿用规则，v1 显示原有摘要；标题所属模板不被伪装成所有球壳纹样。
- [ ] 真实 composable/Storage 行为检查 v2 保存、恢复、期间编辑与原 pending 请求隔离；测试应保护行为，不按控件数量或源码文本写断言。既有行为已覆盖时保留通过证据，不造人为失败。
- [ ] 类型检查、全量测试和生产构建通过后提交；主代理实际浏览器走完整流程，再保存桌面/移动截图并检查控制台。

## 集成与交付

- 三项逐项审查；最终整轮审查从 `9508f4f` 起。只为重要问题修复，不顺手扩展新功能。
- Node 22/当前 Node 类型/测试、前后端构建、SIGTERM/SIGKILL；浏览器分别设置明显不同的内外参数，保存→列表→详情→重开→刷新→重登→重启，逐字段核对；另检查 v1 作品打开升级。
- 立即改拓扑并保存、预览重生成与角色聚焦须实际加载 WebGL。桌面/移动 viewport 检查，无真机性能承诺。
- 更新 README、PROJECT_GUIDE 与本文的状态/证据、配置格式和回滚说明；保留旧日期事实。开发分支分批普通推送，核对远端 SHA 与最终 CI。
- 最迟开始后第5小时停止新开发，第6小时交付；达到目标可提前。暂缓任意层编辑、逐层材质、旋转、撤销重做和新业务。

## 基线与执行记录

基线干净，远端起点一致；Node 26.4.0 完整类型检查、246/246 测试与前后端构建通过。原目录未修改。3011/3012 当前均无监听，后续服务由本轮明确启动。

升级前一致性快照 `backups/pre-layer-20261023.sqlite`，SQLite v3，954368 字节，SHA-256 `a742dd30c063b554cdb76cfc25db800e6219bbe1ec4064a76ff78ff2c84bfcb1`。该私有文件被忽略、不推送。配置 v2 的作品不能交给只识别 v1 的旧代码；回滚应选原工作区或本快照恢复出的新文件，不删除 v2 数据。

状态：范围与方案已依据用户授权确定，按三项顺序执行。
