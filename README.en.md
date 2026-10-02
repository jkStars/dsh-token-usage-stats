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
dsh plugin --profile web add dsh-token-usage-stats@0.3.15
```

The package's `cordis.patch.yml` inserts the plugin row; the browser half loads from the `dsh.client` manifest. Restart the host (or reload the GUI) after installing.

To update to a newer release:

```sh
dsh plugin --profile web add dsh-token-usage-stats@latest
```

### Install from the repository (optional)

You can also install a commit that has not been published to npm yet:

```sh
dsh plugin --profile web add github:jkStars/dsh-token-usage-stats#<branch-or-tag>
```

Specify `#<branch-or-tag>` explicitly: without it pnpm resolves the repository's default branch, which may not be the version you want.

### Compatible dsh versions

Supports dsh 0.1.7-rc.2 up to but not including 0.3.0 (including 0.2.0-rc.1 and 0.2.0-rc.2).

dsh validates a plugin's peer dependencies against the running runtime version and refuses to install a mismatch. On a newer dsh, wait for a matching plugin release, or grant an exact-version exemption yourself (risking crashes or data loss):

```sh
dsh plugin --profile web allow-version dsh-token-usage-stats@0.3.15 \
  --dsh-version <exact runtime version> --accept-risk
```

## Usage

Open the dashboard from the sidebar footer entry, or browse directly to `http://<host>:<port>/token-usage-stats`. The page defaults to today's hourly view and offers today / 3-day / 7-day / 30-day / all ranges, where the 7-day, 30-day, and all ranges show the daily view (the all-range view automatically downsamples to weekly or monthly intervals over longer spans to keep the charts readable and uncluttered). It auto-refreshes every 10 seconds. Cost figures appear only when model pricing is configured.

## Config

The inserted row accepts `config.currency` (report cost in this currency) and `config.pricing` (per-model per-million-token prices). Cost is computed with a **peak/off-peak split**: peak hours are Beijing time 09:00-12:00 and 14:00-18:00, every other Beijing hour is off-peak; weekends (Beijing Saturday/Sunday) are always off-peak. A model priced with a `peak`/`offpeak` pair uses the matching tier by the usage record's time; a model priced with only the four flat keys uses that price at any hour. The default row ships `currency: CNY` and peak/off-peak pricing for `deepseek-flash` and `deepseek-v4-pro`. `deepseek-flash` is DeepSeek-V4.1-Flash and `deepseek-v4-pro` is DeepSeek-V4-Pro-0813; the upstream ids that providers report (`deepseek-v4.1-flash`, `deepseek-v4.1-flash-sg`, `deepseek-v4-flash*`, `deepseek-chat`, `deepseek-reasoner`, …) resolve to the matching price, case-insensitively.

Example override in the profile's own `cordis.patch.yml`:

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
