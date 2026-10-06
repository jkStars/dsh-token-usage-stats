# Changelog

All notable changes to this project will be documented in this file.

## [0.3.15] - 2026-10-06

### 🔧 适配 dsh 0.2.0-rc.2 (Install Compatibility with dsh 0.2.0-rc.2)
- **修复「无法安装到 dsh」**：dsh 宿主在安装与启动时用 `evaluatePluginCompatibility` 校验插件 `peerDependencies` 中每个 `@deepseek-ai/dsh*` 是否被运行时 dsh 版本满足。旧声明 `^0.1.1-rc.2` 等价于 `>=0.1.1-rc.2 <0.2.0`，而运行时是 `0.2.0-rc.2`，因此安装被直接拒绝（`installation rejected: Plugin dsh-token-usage-stats@0.3.14 is incompatible with dsh 0.2.0-rc.2`）；即使已写进 profile 的 `dsh.profile.bundles`，启动时该 bundle 也会被静默跳过而不加载。
  - `peerDependencies` 全量改为 `^0.2.0-rc.2`（满足 `0.2.0-rc.2` 及后续 `0.2.x`）。
  - `@deepseek-ai/cordis` peer 由 `^0.1.1-rc.2` 改为 `^4.0.4`，对齐 0.2.0-rc.2 实际携带的 cordis 4.0.4。
- **开发依赖对齐运行时**：`devDependencies` 不再 `link:` 到陈旧且版本错位的 `../deepseek-harness` 检出（0.1.7-rc.2），改为从 npm 安装 `0.2.0-rc.2` 的 `@deepseek-ai/dsh-*`，使类型检查面对宿主真正加载的那套 API；`@deepseek-ai/schemastery` 固定到 0.2.0-rc.2 携带的 3.18.4。
- **核对 API 漂移**：逐包比对 harness `dsh-v0.1.7-rc.2` 与 `dsh-v0.2.0-rc.2` 之间本插件用到的全部依赖（`dsh-session`、`dsh-llm`、`dsh-session-persistence`、`dsh-session-title`、`dsh-host-webserver`、`dsh-invariants`、`dsh-util-values` 与 `dsh-client-*`），差异均为纯新增（`MenuGroup`、`pointerModality`、`ToolCallRecovery`），没有移除或签名变更；`pnpm run typecheck` 与 `pnpm run build` 在 0.2.0-rc.2 上全部通过，宿主侧与浏览器侧源码无需改动。

---

## [0.3.14] - 2026-09-26

### 兼容性与运行环境升级 (Compatibility with dsh 0.1.7-rc.2)
- **适配 DSH 0.1.7 核心架构变更**：
  - 更新 `@deepseek-ai/dsh-util-values` 依赖规范为 `^0.1.1-rc.2`，解决 peerDependencies 精确版本不匹配问题。
  - 迁移客户端上下文体系：移除已弃用的 `@deepseek-ai/dsh-client-runtime`，切换为 `@deepseek-ai/dsh-client-ui-renderer` 与 `@deepseek-ai/cordis` 提供的标准 `Context` 和 `slots` 注入。
  - 兼容最新 `Session` 事件模型：适配新版 `session.snapshotEvents()` 与 `'assistant/message'` 统一用量携带机制，平滑兼容历史 `'assistant/chunk'`。

---

## [0.3.13] - 2026-09-12

### 💰 价格体系与模型配置更新 (Official Model Pricing & Alias Fallback)
- **同步 DeepSeek 官方最新双模型体系**：
  - 更新默认初始化配置与本地生效配置为官方两大核心模型：`deepseek-flash` (DeepSeek-V4.1-Flash) 与 `deepseek-v4-pro` (DeepSeek-V4-Pro-0813)；
  - 填入官方最新峰谷阶梯单价（`deepseek-flash` 闲时缓存命中 0.02 / 未命中 1.00 / 输出 4.00 元/M，高峰缓存命中 0.04 / 未命中 2.00 / 输出 8.00 元/M）。
- **历史模型别名智能平滑兼容**：
  - 底层引入 `_resolvePricing` 别名回退机制，历史日志中的 `deepseek-v4-flash*`、`deepseek-chat`、`deepseek-reasoner` 自动平滑采用 `deepseek-flash` 单价进行统计；
  - 优化全局 `totals.cost` 累加鲁棒性，杜绝因未定价异构模型导致整屏总金额变为 `undefined` 的问题，确保历史与当下所有会话均能 100% 精确计费。
- **配置优先级与持久化保障**：
  - 严格确保用户手动在界面添加的自定义模型（包括固定单价与分时峰谷计价）具备最高优先级，保存即落盘 `token-usage-pricing.json` 并实时生效，重启绝不丢失。

---

## [0.3.12] - 2026-09-08

### 🚀 极速解析与精准去重 (High-speed Native Parsing & Idempotency)
- **剔除脆弱慢速的官方持久化调用**：
  - 彻底移除了导致启动与扫描耗时 13 秒的 `anyPersistence.inspect(id)` 调用（该调用会因跨项目或格式版本差异持续报错抛出 `TypeError` 并阻塞线程）。
  - 全面切换至插件原生的高效流式解压读取器，全量扫描 31 个会话耗时由 13,000ms 骤降至 **15ms**，100% 兼容多帧 Concatenated Zstandard 格式。
- **首次水合就绪栅栏 (Ready Gate)**：
  - 增加 `firstRehydratePromise` 阻塞等待保证，杜绝在服务启动初次请求 `/api/token-usage-stats` 时因异步未就绪而返回空或半截数据的问题。
- **请求记录强幂等去重**：
  - 为 `requestRecords` 补齐了 `${sessionId}:${turn}:${step}` 键级映射，多次扫描或增量重放数据严格幂等，彻底解决请求计数重复翻倍的问题。

---

## [0.3.11] - 2026-09-08

### 🚀 稳定性与全量会话恢复 (Full Session Recovery & Accuracy)
- **自主全工作区与多版本（v0/v1/v2）全量会话发现**：
  - 彻底解决官方底层 `sessionPersistence.list()` 仅检查旧版 `session.jsonl.zstd` 而漏扫全部现代 `session.v2.jsonl.zstd` 的硬伤。
  - 突破单一工作区（CWD）限制，自动跨项目（如 `StarsClaw`）无死角扫描所有子目录，无论何时重启服务或切换工作区，所有对话 Token 用量 100% 完整恢复。
- **Revision 毫秒级缓存守卫（0 I/O 阻塞）**：
  - 针对全量磁盘扫描引入文件修改时间与大小哈希守卫（`mtimeMs + size`），二次扫描仅耗时 ~14ms，前端内存快照查询仅 ~28ms，兼顾数据绝对准确与极致速度。
- **前端环境探测安全防御**：
  - `<script>` 顶层 `window.top` 嵌入检测加入 `try...catch` 异常保护，杜绝跨域沙箱与严格安全策略下 JS 崩溃导致数据停留在 `--` 初始态的问题。

### 💄 标题恢复与紧凑单行对齐 (Title Restoration & Single-line Alignment)
- **恢复大标题展示**：弹窗内层完整恢复「Token 用量统计」大标题，兼顾习惯与层级感。
- **像素级单行紧凑对齐**：
  - 精细优化 `<header>` 与 `.controls` 的内边距与元素间距，控件高度统一为 `30px`。
  - 保证「大标题 + 范围 + 粒度 + 模型 + 刷新 + 价格配置」全部保持在同一单行绝对水平平齐，在标准弹窗宽度下彻底杜绝折行与错位。

---

## [0.3.10] - 2026-09-08

### 💄 界面对齐与弹窗体验优化 (UI Alignment & Modal Experience)
- **解决顶部筛选栏折行错位**：重构 `<header>` 与 `.controls` 弹性布局，消除阶梯状右浮动下沉问题，确保所有筛选器与操作按钮始终保持在单行水平中心线。
- **弹窗嵌入自适应去重**：自动检测 iframe 嵌入环境，在弹窗模式下优雅隐藏内层多余的重复大标题，将完整横向宽度赋给控制栏，彻底杜绝换行。
- **像素级控件对齐**：所有 `<select>` 下拉框与操作按钮高度严格统一为 `32px`，`<label>` 文本与输入框实现严格垂直居中对齐，并对模型选择框限制最大宽度防止溢出。

---

## [0.3.9] - 2026-09-05

### ✨ 新特性与长周期体验优化 (Features & Long-range Downsampling)
- **新增「近 30 天」统计选项**：范围下拉菜单中新增「近 30 天」选项，与近 7 天保持一致，强制锁定为按天粒度展示（自动禁用小时选项）。
- **长周期自然阶梯自适应折叠 (日 $\to$ 周 $\to$ 月)**：
  - 当选择「全部」且数据天数较长时，图表立柱自动根据时间跨度进行自然阶梯下采样（≤30天按日，31~180天按周，>180天按月）。
  - 彻底解决大跨度时间下立柱缩成“细针/条形码”、鼠标难以悬停交互的视觉痛点，立柱总数永远优雅稳定在 30 根以内。
- **Token 与消费金额 100% 同步聚合**：
  - 「Tokens 趋势」和「消费金额趋势」两个 Tab 保持严格同步的聚合与时间对齐。
  - 多模型分色堆叠柱在自然周/月区间内精准汇总各模型费用，Tooltip 提示清晰语义化。

---

## [0.3.8] - 2026-09-04

### 🚀 稳定性与统计恢复 (Stability & Data Recovery)
- **底层会话解密与容错兜底**：当官方 `sessionPersistence.open()` 因旧版会话迁移校验失败（如 `subagent/descriptor` 格式升级异常）时，自动无损降级至原生多帧 Zstandard 解压扫描器直接提取原始事件行，彻底解决历史会话丢失导致 5000+ 次请求和数亿 Token 未被统计的问题。
- **杜绝 Event Loop 阻塞卡顿**：
  - 遇到异常会话统一登记 revision，避免后续每 4 秒轮询或前端请求时无谓重复打开解密大文件。
  - 在全量会话回放过程中引入微任务让出机制（`setImmediate`），彻底消除打开面板长达 26 秒的主线程假死。
- **跨会话模型记忆机制**：新增持久化模型记忆映射（`sessionModels`），彻底解决增量重放时因跳过头部 `request/context` 事件导致模型丢失沦为 `unknown`、计算费用为 0 的问题。

---

## [0.3.7] - 2026-09-03

### 🐛 问题修复与体验强化 (Bug Fixes & UX)
- **时段格式智能容错**：输入高峰时段支持自动纠错与补全，支持单数字小时（如 `9:00` 自动转为 `09:00`）、全角中文冒号（如 `14：00` 自动转为 `14:00`），失焦即时标准化。
- **精准错误定位与动效高亮**：时段输入错误时，自动给具体出错的输入框添加红框样式（`.input-invalid`），并平滑滚动视口、自动聚焦并全选出错文本，彻底消除与操作脱节的迷惑感。
- **空白时段智能忽略**：被用户清空的时段行平滑跳过，不再因误触清空触发无谓的错误校验。
- **纯固定价格模型友好兼容**：前后端全面增强宽容度，在未启用分时计价的场景下不再被时段严格约束阻断保存。

---
## [0.3.6] - 2026-09-03

### 🚀 性能优化 (Performance)
- **非阻塞异步同步**：查询接口立即返回常驻内存快照，将页面切换与交互响应时间从 ~3000ms 降低至 ~16ms（提速近 200 倍）。
- **Revision 缓存守卫**：在磁盘同步中比对 session 文件的 `revision`，未修改的历史文件无需打开或解压，消除大量无谓的 I/O 阻塞。
- **后台防抖调度**：外部终端产生新日志时，后台自动静默增量同步，不影响前端交互流畅度。

### 🐛 问题修复 (Bug Fixes)
- **活跃会话热修复**：修复了 Web 客户端已挂载的活跃会话（Active Session）在全量水合时被错误跳过的问题，确保当天实时用量精准统计。
- **全局 CSS 隔离**：限定 `.chart svg` 样式作用域，杜绝内联 SVG 图标被撑大的问题。
- **分时定价默认恢复**：恢复 `deepseek-v4-flash`、`deepseek-v4-flash-vision-exp`、`deepseek-v4-pro` 的官方高峰/闲时阶梯配置。

### 🎨 界面与体验 (UI / UX)
- **精致 SVG 矢量图标**：全面剔除 emoji 表情符号，统一采用 14px 细腻线性 SVG 图标与平滑悬停微动效。
- **分段胶囊控制 (Segmented Control)**：模型定价模式切换升级为现代 iOS/macOS 风格的分段控制器。
- **新模型置顶与自动聚焦**：点击「添加模型」后，新卡片置顶至列表第一项并自动聚焦选中名称输入框。

### ✨ 新增功能 (Features)
- **动态价格与时段配置**：新增可视化模态框，支持在网页端直接调整模型价格（固定单价 / 峰谷阶梯）及高峰时间段，点击保存即刻生效并持久化到本地 `~/.dsh/token-usage-pricing.json`。

---

## [0.3.5] - 2026-08-23

### 🛠️ 架构与兼容 (Compatibility)
- 适配 `session-persistence` 最新的 handle API 规范，并保持对旧版 inspect 模式的优雅向下兼容。

### 📊 图表与功能 (Features)
- 合并 Token 趋势与费用趋势为单一 Tab 切换图表，减少页面纵向空间占用。
- 默认启用周末全天闲时（Off-peak）计费策略。

---

## [0.3.0] ~ [0.3.4] - 2026-08-22

### ✨ 特性
- 支持 DeepSeek 官方峰谷分时定价策略（工作日 09:00-12:00 / 14:00-18:00 高峰期，其余时段及周末闲时）。
- 新增 Token 消耗最多的 Top 会话排行榜及跳转能力。
- 完善中英双语文档与侧边栏入口说明。

---

## [0.1.0] ~ [0.2.x] - 2026-08-21 ~ 2026-08-22

### 🚀 初始化
- DSH Token Usage Stats Web 插件基础骨架。
- 跨会话日志回放、Token 统计与聚合计算。
- 提供 `/token-usage-stats` 仪表盘与 `/api/token-usage-stats` 数据接口。

