/**
 * Public configuration and analytics vocabulary for cross-session token usage
 * statistics.
 *
 * @module @deepseek-ai/dsh-token-usage-stats/types
 */

/** Optional per-million-token prices used to project a cost figure. */
export interface ModelPricing {
  /** CNY (or configured currency) per 1,000,000 uncached input tokens. */
  readonly uncachedInputPerMillion?: number
  /** Per 1,000,000 cache-read input tokens. */
  readonly cacheReadPerMillion?: number
  /** Per 1,000,000 cache-write input tokens. */
  readonly cacheWritePerMillion?: number
  /** Per 1,000,000 output tokens. */
  readonly outputPerMillion?: number
}

/**
 * Token-usage analytics plugin configuration.
 *
 * `pricing` is optional and keyed by model id. When a model has no pricing
 * entry, that model's cost stays absent rather than being reported as zero.
 */
export interface TokenUsageStatsConfig {
  /** Display currency label for computed costs; omitted when no pricing is configured. */
  readonly currency?: string
  /** Optional per-model price book; keys are provider model ids. */
  readonly pricing?: Readonly<Record<string, Readonly<ModelPricing>>>
}

/** Aggregate counters for one model, time bucket, or the whole snapshot. */
export interface UsageTotals {
  /** Number of logged request/header events in scope. */
  readonly requestCount: number
  /** Provider-reported uncached input tokens. */
  readonly uncachedInputTokens: number
  /** Provider-reported cache-read input tokens. */
  readonly cacheReadTokens: number
  /** Provider-reported cache-write input tokens. */
  readonly cacheWriteTokens: number
  /** Provider-reported output tokens. */
  readonly outputTokens: number
  /** Sum of the four disjoint token buckets. */
  readonly totalTokens: number
  /**
   * Computed cost; absent when any contributing usage record's model has no
   * pricing entry. A partially priced scope never reports a partial sum as the
   * full cost.
   */
  readonly cost?: number
}

/** One provider/model pair's aggregate usage. */
export interface ModelUsage {
  /** Provider route that served the requests. */
  readonly provider: string
  /** Provider model id. */
  readonly model: string
  /** Aggregated counters for this route. */
  readonly totals: UsageTotals
}

/** One time-bucket aggregate for a chart. */
export interface UsageSeriesPoint {
  /** Bucket start (UTC ms). */
  readonly startTime: number
  /** Bucket end (exclusive, UTC ms). */
  readonly endTime: number
  /** Aggregated counters in the bucket. */
  readonly totals: UsageTotals
}

/** Immutable analytics snapshot served by {@link TokenUsageStats}. */
export interface TokenUsageStatsSnapshot {
  /** Optional display currency label from configuration. */
  readonly currency?: string
  /** All-scope aggregate counters. */
  readonly totals: UsageTotals
  /** Per-provider/model aggregate counters. */
  readonly models: readonly ModelUsage[]
  /** Time-bucketed aggregate counters. */
  readonly series: readonly UsageSeriesPoint[]
}

/** Filter and bucketing options for {@link TokenUsageStatsService.snapshot}. */
export interface TokenUsageStatsQuery {
  /** Inclusive lower bound (Unix epoch ms). */
  readonly from?: number
  /** Inclusive upper bound (Unix epoch ms). */
  readonly to?: number
  /** Restrict to one model id. */
  readonly model?: string
  /** Series bucket size; defaults to `'hour'`. */
  readonly granularity?: 'hour' | 'day'
}
