# 后续方向与工程结构检查 · 2026-10-21

核查基线：`56ebef1e1588caad73abbe93d9608d77d46497ce`，分支 `upgrade/culture-creation-20261021`，工作区 `../DigitalGuiGongBall.worktrees/culture-creation-20261021`。本轮是检查与记录，未修改产品代码、数据库、依赖或运行中的服务。

**结论：先进行一轮小范围工程收敛，暂不扩展新功能。** 发现测试类型门禁缺口和一个保存后导航异常的状态边界问题；三维预览也是后续修改的主要耦合热点。未发现需要重写全站、全量拆页或引入通用 Repository/依赖注入框架的依据。

后续状态：用户已授权实施重构，执行与修复结果见 [工程重构记录](REFACTOR_20261021.md)。下文保留检查时的文件形态、失败结果和建议，不能当作重构后仍未修复的问题清单。

## 拓展候选（仅记录，未开工）

1. **逐层创作**：独立设置球层纹样、密度、开孔与角度，配套撤销/重做；先以两件有明显层间差异的示范作品验证价值。涉及配置升级和三维重建，不能直接作为小改动开工。
2. **文化创作练习**：将“外疏内密”“孔洞错位”等观察变成少量可操作练习，继续使用现有导览与创作主线，不扩展积分或学习平台。
3. **作品分享**：用户主动生成可撤回的单件作品分享链接，访客可观察模型和来源；先定义私有/分享边界，不同时展开社交系统。

先修下述 P2 问题；改三维前收敛预览接缝。之后每轮只选择一个小范围能力，不同时推进三项。

## 检查范围与判断方法

主代理检查活动前后端、共享契约、测试与构建配置；两个独立只读代理分别审查前端和后端/测试。保留旧课程模块，不因归档文件很长而重写它们。行数、最长行和 import 图只作为线索，结论结合职责、调用方与故障注入。

- 静态 import 分析涵盖 107 个 TS/Vue/MJS 文件、245 条本地相对 import；另独立核查前端的字面量动态 import。未发现运行时依赖环，未发现 shared → 前后端、server → src 或 lib/composables/three → 页面/路由的反向依赖。
- 有一组**类型引用环**：`shared/design.ts:2` 与 `shared/inspirations.ts:2`。两边均为 `import type`，不产生运行时环；如果要求类型依赖也完全单向，可在下一次契约修改时将稳定 ID 类型收敛到更低层模块。
- `useAtelierDocument` 已用 request、storage、clock 和导航回调隔离外部依赖；`AtelierScene` 是 Vue 与 Three.js 的适配边界。函数参数和 TypeScript 结构类型也是接口，不需要每个模块额外创建 interface 文件。

## 需要先处理的两项（P2）

### 1. 测试运行全绿，但测试代码没有类型门禁

`tsconfig.app.json` 仅包含 src，`tsconfig.server.json` 排除 server/tests；`tsx --test` 运行时转译不会检查测试类型。`tests/editor-lifecycle.test.ts:27` 与 `tests/work-collection.test.ts:7` 的通用 Work 夹具已缺少必填的 `inspirationId`、`previewVersion`。这说明契约已经变化，测试仍能以旧形状运行。

主代理与独立代理分别执行以下**额外审计命令**，均退出 2，得到 36 条诊断；这是基线已存在的问题，不是本轮新增失败：

```bash
./node_modules/.bin/tsc --noEmit --strict --target ES2023 \
  --module ESNext --moduleResolution Bundler --skipLibCheck --types node \
  tests/*.ts server/tests/*.ts
```

| 文件 | 诊断数 | 主要原因 |
| --- | ---: | --- |
| server/tests/maintenance.test.ts | 6 | 注入的文件操作回调参数缺类型 |
| tests/api-client.test.ts | 19 | `Parameters<typeof createServer>[0]` 取到 options 重载，继而参数推断失效 |
| tests/editor-lifecycle.test.ts | 1 | 通用 Work 夹具缺字段 |
| tests/preview-render.test.ts | 9 | Three.js 子对象未收窄、WebGL 替身常量类型 |
| tests/work-collection.test.ts | 1 | 通用 Work 夹具缺字段 |

36 条诊断不是 36 个独立业务缺陷，多条来自同一个类型推断根因；但足以说明当前绿色 CI 没有覆盖测试代码的类型一致性。

最小改进：增加独立测试 noEmit 配置并接入现有 CI，使用完整且有类型的 Work 默认夹具，回调用真正的 RequestListener/操作签名；不加 any、ts-ignore 或放宽 strict 来消除诊断。

特别保留 `server/tests/preview.test.ts:152` 的旧 journal 响应和 `tests/editor-lifecycle.test.ts:282` 的旧 pending 请求。它们刻意验证旧协议，不能被通用夹具自动灌注新字段。

### 2. 保存确认与页面导航共用失败处理，职责边界泄漏

`src/composables/useAtelierDocument.ts:161–198` 在确认 HTTP 写入、推进 baseline 并清除 pendingSave 后，仍在同一个 try/catch 中等待 `replaceWorkId`。导航适配器若抛错，会将 `saved` 改为 `idle`，并把导航异常放进保存错误。

主代理与前端代理分别通过 effectScope、内存 Storage、成功的 request 和故意拒绝的 replaceWorkId 复现；未调用真实后端、未修改数据。结果为：

```text
work.id = 已确认作品的 ID
pendingSave = null
dirty = false
saveState = idle
saveError = navigation failed after acknowledgment
```

最小改进：将数据库确认完成和后续导航的异常边界分开；保留 saved 与作品 ID，导航失败单独提示并允许打开已保存作品。新增一个行为回归场景，不把 214 行的文档生命周期机械拆成多份状态容器。

## 维护热点与暂不处理项（P3）

- **三维预览导出**：`AtelierStage.ts` 共 417 行；`exportPreview` 约百行，负责渲染状态快照、临时模型、相机、HDR 输出、Canvas 编码和恢复。`tests/preview-render.test.ts:169–194` 绕过构造器并注入十余个私有字段，测试与类的内部存储布局绑定。下一次改三维前，抽出接受明确场景上下文与小型 renderer 接口的捕获操作，保留成功/失败恢复与 GPU 资源所有权检查；不建立第二个 WebGL 上下文，也不删除这些重要断言。
- **重复的模型规格**：球层半径公式同时出现在 `ornament.ts:137`、`preview.ts:39` 和 `layout.ts:18`，材质与旋转也在实时/预览装配中重复。逐层创作会同时触及这些位置，应先统一这些实际变化点，避免实时模型、预览与取景出现差异。
- **事务所有权**：`server/works.ts` 的 list/savePreview 自带事务，update/duplicate/changeState 依赖 app 的 executeMutation。当前调用正确；新增 CLI/组合用例前，应明确事务内操作边界并保持低层方法私有，避免嵌套事务或部分提交。现在无需为唯一 SQLite 实现铺通用仓储层。
- **可读性**：AtelierView 113 行却有约 12KB 内容，WorkDetailView 60 行约 8KB，最长模板行分别达 1168/1849 字符。职责已大体由 composables 承接，但压缩排版妨碍审查。下次触及控件时恢复多行结构，再按“结构控件、观察控件、作品状态”判断组件边界，不按固定行数切组件；不混入全仓格式化。
- **新旧状态仍有连接**：活动页面为 theme 使用 `useAppStore`，该 store 又同步加载课程 content，包含旧模板、模拟雕刻和协作者状态；ThemeToggle 也读取旧翻译表。没有形成环，但存档与新产品尚未完全独立。后续可提取小型主题状态，让旧 store 委托，保留历史内容。
- **课程大文件**：Explore 1548 行、Social 1161 行、LegacyMuseum 812 行均为明确存档入口。它们确实较长，但不在当前真实作品业务主线上；不作为本轮重构范围，不删除课程材料。

## 已有结构与测试应继续保留

`server/app.ts` 157 行、works 111 行、idempotency 61 行；当前模块规模可控。maintenance 的路径校验、数据库验证和发布围绕同一快照职责组织，不因 297 行而拆分安全流程。前端正式保存、设备草稿、列表操作和图片上传已分开管理，核心模块不直接依赖页面或 Pinia。

测试已经按 HTTP、维护、几何、编辑生命周期、设备草稿、列表、预览等分类；真实数据库/HTTP/进程测试覆盖不同风险。Storage 替身中“允许枚举”“禁止枚举”“配额故障”有不同验证目的，不能为消除重复而合并成万能测试框架。测试增长的实际问题在类型门禁和预览私有状态耦合，不在 207 这个数量本身。

## 本轮验证与交接

- 基线重新执行 `npm test`：207/207；`npm run typecheck`：通过。
- 新增审计 noEmit：36 条诊断、退出 2；保存后导航失败：内存故障注入已复现。未把原门禁通过描述成“没有结构问题”。
- 本轮只提交此记录和文档入口，未启动新功能、实施大规模重构或改变既有验收结论；原工作区、当前演示库和 3011 服务保持原状。
- 下一轮最小范围：先补测试类型门禁并消除真实诊断，再分离保存/导航异常边界；保留全部现有行为检查、补一个失败场景，执行类型检查、测试和构建后提交。三维捕获接缝和重复规格在涉及三维的下一轮处理，不要求先消除所有 P3 才能开发任何小功能。
- 原始核查基线为上方 SHA；本记录提交后可用 `git log -1 --format='%H %s'` 获取文档检查点，远端推送状态随本次汇报。
