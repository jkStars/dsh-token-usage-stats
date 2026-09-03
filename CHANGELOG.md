# Changelog

All notable changes to this project will be documented in this file.

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
