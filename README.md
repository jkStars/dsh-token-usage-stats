# dsh-token-usage-stats

[English](README.md) | [简体中文](README.zh-CN.md)

DSH web plugin: cross-session token usage, request count, and optional cost
analytics (`ctx.tokenUsageStats`), with a self-contained dashboard page at
`/token-usage-stats` (JSON feed at `/api/token-usage-stats`) and a sidebar
footer entry opening the dashboard in an in-page modal.

## Screenshots

**Today view** (default hourly, with range switcher and cost cards)

![Dashboard - today view](https://raw.githubusercontent.com/jkStars/dsh-token-usage-stats/main/docs/images/dashboard-today.png)

**All-range view** (multi-day trend and per-model breakdown)

![Dashboard - all ranges](https://raw.githubusercontent.com/jkStars/dsh-token-usage-stats/main/docs/images/dashboard-all.png)

## Install

```sh
dsh plugin --profile web add dsh-token-usage-stats@0.1.1
```

The package's `cordis.patch.yml` inserts the plugin row; the browser half
loads from the `dsh.client` manifest. Restart the host (or reload the GUI)
after installing.

To update to a newer release:

```sh
dsh plugin --profile web add dsh-token-usage-stats@latest
```

## Usage

Open the dashboard from the sidebar footer entry, or browse directly to
`http://<host>:<port>/token-usage-stats`. The page defaults to today's hourly
view and offers 今天 / 近 3 天 / 全部 ranges; it auto-refreshes every 10
seconds. Cost figures appear only when model pricing is configured.

## Config

The inserted row accepts `config.currency` (report cost in this currency) and
`config.pricing` (per-model per-million-token prices). The default row ships
`currency: CNY` and pricing for `deepseek-v4-flash` / `deepseek-v4-pro`.

Example override in the profile's own `cordis.patch.yml`:

```yaml
- patch:
    - id: token-usage-stats
      config:
        currency: USD
```

## Development

```sh
pnpm install   # devDependencies link the local deepseek-harness checkout
pnpm run build # tsc -> lib/types, tsdown -> lib/index.js + lib/client.js
```

The `devDependencies` resolve the `@deepseek-ai/dsh-*` type surface through
`link:` entries that expect the harness checkout at `../deepseek-harness`
relative to this package. Runtime peers are provided by the dsh host, not
installed from npm.

## Publish

```sh
npm run build
npm publish    # runs prepublishOnly (npm run build) automatically
```
