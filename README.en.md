# dsh-token-usage-stats

[English](README.en.md) | [简体中文](README.md)

DSH web plugin: cross-session token usage, request count, and optional cost analytics (`ctx.tokenUsageStats`), with a self-contained dashboard page at `/token-usage-stats` (JSON feed at `/api/token-usage-stats`) and a sidebar footer entry opening the dashboard in an in-page modal.

## Screenshots

**Sidebar footer entry — click 「用量统计」 to open the dashboard**

![Usage entry](https://raw.githubusercontent.com/jkStars/dsh-token-usage-stats/main/docs/images/usage-entry.png)

**Dashboard — today view** (cost stack, token trend, breakdown, per-model and top-session tables)

![Dashboard - today](https://raw.githubusercontent.com/jkStars/dsh-token-usage-stats/main/docs/images/dashboard.png)

**Breakdown tooltip** (hover a bar for per-category details)

![Dashboard - cost tooltip](https://raw.githubusercontent.com/jkStars/dsh-token-usage-stats/main/docs/images/dashboard-cost-tooltip.png)

**All-range daily view**

![Dashboard - all ranges](https://raw.githubusercontent.com/jkStars/dsh-token-usage-stats/main/docs/images/dashboard-all.png)

> **Note**: Only DeepSeek official API costs are currently counted (token usage, request counts, and cost are replayed from local Harness session logs); it does not include API costs from other providers or channels.

## Install

```sh
dsh plugin --profile web add dsh-token-usage-stats@0.3.7
```

The package's `cordis.patch.yml` inserts the plugin row; the browser half loads from the `dsh.client` manifest. Restart the host (or reload the GUI) after installing.

To update to a newer release:

```sh
dsh plugin --profile web add dsh-token-usage-stats@latest
```

## Usage

Open the dashboard from the sidebar footer entry, or browse directly to `http://<host>:<port>/token-usage-stats`. The page defaults to today's hourly view and offers today / 3-day / 7-day / all ranges, where the 7-day and all ranges show the daily view. It auto-refreshes every 10 seconds. Cost figures appear only when model pricing is configured.

## Config

The inserted row accepts `config.currency` (report cost in this currency) and `config.pricing` (per-model per-million-token prices). Cost is computed with a **peak/off-peak split**: peak hours are Beijing time 09:00-12:00 and 14:00-18:00, every other Beijing hour is off-peak; weekends (Beijing Saturday/Sunday) are always off-peak. A model priced with a `peak`/`offpeak` pair uses the matching tier by the usage record's time; a model priced with only the four flat keys uses that price at any hour. The default row ships `currency: CNY` and peak/off-peak pricing for `deepseek-v4-flash`, `deepseek-v4-pro`, and `deepseek-v4-flash-vision-exp`.

Example override in the profile's own `cordis.patch.yml`:

```yaml
- patch:
    - id: token-usage-stats
      config:
        currency: USD
        pricing:
          deepseek-v4-flash:
            peak:
              uncachedInputPerMillion: 3.0
              cacheReadPerMillion: 0.10
              cacheWritePerMillion: 0
              outputPerMillion: 9.0
            offpeak:
              uncachedInputPerMillion: 1.5
              cacheReadPerMillion: 0.05
              cacheWritePerMillion: 0
              outputPerMillion: 4.5
```

## Development

```sh
pnpm install   # devDependencies link the local deepseek-harness checkout
pnpm run build # tsc -> lib/types, tsdown -> lib/index.js + lib/client.js
```

The `devDependencies` resolve the `@deepseek-ai/dsh-*` type surface through `link:` entries that expect the harness checkout at `../deepseek-harness` relative to this package. Runtime peers are provided by the dsh host, not installed from npm.

## Publish

```sh
npm run build
npm publish    # runs prepublishOnly (npm run build) automatically
```

## Repository

- npm: <https://www.npmjs.com/package/dsh-token-usage-stats>
- Source: <https://github.com/jkStars/dsh-token-usage-stats>

Issues and pull requests are welcome.
