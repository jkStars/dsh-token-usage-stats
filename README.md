# dsh-token-usage-stats

[简体中文](README.md) | [English](README.en.md)

DSH Web 插件：跨会话的 Token 用量、请求次数与可选成本统计（`ctx.tokenUsageStats`），自带独立仪表盘页面（`/token-usage-stats`，JSON 数据源 `/api/token-usage-stats`）以及侧边栏底部入口（页内模态框打开仪表盘）。

## 截图

**侧边栏底部入口 — 点击「用量统计」打开仪表盘**

![使用入口](https://raw.githubusercontent.com/jkStars/dsh-token-usage-stats/main/docs/images/usage-entry.png)

**仪表盘 - 今天视图**（成本堆叠、token 趋势、构成占比、按模型与 TOP 对话表）

![仪表盘 - 今天](https://raw.githubusercontent.com/jkStars/dsh-token-usage-stats/main/docs/images/dashboard.png)

**构成明细悬浮提示**（悬停柱子查看分类明细）

![仪表盘 - 悬浮提示](https://raw.githubusercontent.com/jkStars/dsh-token-usage-stats/main/docs/images/dashboard-cost-tooltip.png)

**全部范围 - 按天视图**

![仪表盘 - 全部范围](https://raw.githubusercontent.com/jkStars/dsh-token-usage-stats/main/docs/images/dashboard-all.png)

> **说明**：目前仅统计 DeepSeek 官方 API 的费用（token 用量、请求次数与成本基于本地 Harness 会话日志回放），不包含其它提供商/渠道的 API 费用。

## 安装

```sh
dsh plugin --profile web add dsh-token-usage-stats@0.3.16
```

插件的 `cordis.patch.yml` 会插入插件行；浏览器半区通过 `dsh.client` 清单自动加载。安装后重启宿主（或刷新 GUI）。

更新到新版本：

```sh
dsh plugin --profile web add dsh-token-usage-stats@latest
```

### 从仓库安装（可选）

也可以直接安装尚未发布到 npm 的提交：

```sh
dsh plugin --profile web add github:jkStars/dsh-token-usage-stats#<分支或标签>
```

请显式指定 `#<分支或标签>`：省略时 pnpm 解析的是仓库默认分支，可能不是你想安装的版本。

### 兼容的 dsh 版本

支持 dsh 0.1.7-rc.2 起至 0.3.0 之前的版本（含 0.2.0-rc.1 / 0.2.0-rc.2）。

dsh 会校验插件的 peer 依赖是否匹配当前运行时版本，不匹配时会拒绝安装。若你使用的 dsh 高于此范围，请等待本插件发布对应版本，或自行授权精确版本豁免（存在崩溃或数据丢失风险）：

```sh
dsh plugin --profile web allow-version dsh-token-usage-stats@0.3.16 \
  --dsh-version <当前运行时版本> --accept-risk
```

## 使用

从侧边栏底部入口打开仪表盘，或直接访问 `http://<host>:<port>/token-usage-stats`。

页面默认显示「今天」的按小时视图，可切换 今天 / 近 3 天 / 近 7 天 / 近 30 天 / 全部 范围，其中「近 7 天」、「近 30 天」和「全部」显示按天视图（「全部」在跨度较长时会自动按自然周或自然月折叠展示，确保图表清晰不拥挤）。每 10 秒自动刷新一次。成本按插件内置价目表计算。

点击右上角「价格配置」可打开编辑器，按模型调整单价与峰谷时段。编辑器列出内置价目表的全部模型并支持搜索：未修改的条目显示「内置默认」，跟随插件的后续版本更新；改过价的条目显示「已覆盖」，并提供「恢复默认」按钮撤销。保存时只写入与内置价不一致的条目，「全部恢复默认」会清空自定义价格。

「添加模型」可录入价目表之外的模型（显示为「自定义」），模型名即计价用的键，重名或留空会被拦下并标红提示。模型名修改在离开输入框时生效，条目位置与焦点保持不变。

## 配置

插入行支持 `config.currency`（成本显示货币）与 `config.pricing`（各模型每百万 token 的价格）。成本按**高峰/闲时两档**计价：高峰为北京时间 09:00-12:00、14:00-18:00，其余北京时段为闲时；**周末（北京时间周六/周日）全天按闲时**。用 `peak`/`offpeak` 两档的模型按使用时间取对应档位；只用四个平档键（`uncachedInputPerMillion` / `cacheReadPerMillion` / `cacheWritePerMillion` / `outputPerMillion`）的模型任意时段同价。

**无需配置即可看到成本。** 插件内置一份默认价目表（96 个模型，价格以人民币 / 每百万 token 计），未配置时自动生效；`config.pricing` 里的条目按模型逐键覆盖内置价。默认表覆盖 DeepSeek、智谱 GLM、通义千问、豆包、Kimi、MiniMax、腾讯混元，以及 OpenAI GPT、Anthropic Claude、Google Gemini、xAI Grok、Mistral、Cohere 等，并内含模型 id 别名解析：provider 上报的上游 id（`deepseek-v4.1-flash`、`deepseek-v4.1-flash-sg`、`deepseek-chat`、`claude-opus-5.5`、`openai/gpt-6-sol` 等）会自动归入对应条目——大小写、连字符与点号差异忽略，组织前缀（`openai/`）与快照日期后缀（`-202605`）会被剥离。完全无法识别的模型保持不计费，不会套用其它模型的价格。

价目表按 [@kenz1117/dsh-ui-usage-billing](https://github.com/kenz1117/dsh-ui-usage-billing)（MIT）的内置目录整理；美元计价条目按 6.79 折算为人民币，限时促销按刊例价（不固化会过期的折扣）。

在该插件行下配置 `currency` 可切换成本显示货币；内置价目表以人民币计价，`currency` 只是显示标签，不会换算。`pricing` 用于按模型覆盖内置价，写法见下例。

```yaml
- patch:
    - id: token-usage-stats
      config:
        currency: USD
        pricing:
          deepseek-flash:
            peak:
              uncachedInputPerMillion: 2.0
              cacheReadPerMillion: 0.04
              cacheWritePerMillion: 0
              outputPerMillion: 8.0
            offpeak:
              uncachedInputPerMillion: 1.0
              cacheReadPerMillion: 0.02
              cacheWritePerMillion: 0
              outputPerMillion: 4.0
```

## 开发

```sh
pnpm install   # devDependencies 通过 link: 指向本地 deepseek-harness checkout
pnpm run build # tsc -> lib/types, tsdown -> lib/index.js + lib/client.js
```

`devDependencies` 通过 `link:` 条目解析 `@deepseek-ai/dsh-*` 的类型，要求 harness checkout 位于本包上一级目录 `../deepseek-harness`。运行时 peer 依赖由 dsh 宿主提供，不从 npm 安装。

## 发布

```sh
npm run build
npm publish    # 自动执行 prepublishOnly（npm run build）
```

## 仓库与反馈

- npm：<https://www.npmjs.com/package/dsh-token-usage-stats>
- 源码：<https://github.com/jkStars/dsh-token-usage-stats>

欢迎提 Issue 或 PR。
