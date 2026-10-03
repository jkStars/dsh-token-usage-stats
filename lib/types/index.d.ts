/**
 * Cross-session token usage, request count, and optional cost analytics, with
 * a self-contained web dashboard served from the same plugin.
 *
 * @module dsh-token-usage-stats
 */
import { Service } from '@deepseek-ai/cordis';
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import type { PricingConfigPayload, PricingConfigView, TokenUsageStatsConfig, TokenUsageStatsQuery, TokenUsageStatsSnapshot } from './types.ts';
export type * from './types.ts';
declare module '@deepseek-ai/cordis' {
    interface Context {
        tokenUsageStats: TokenUsageStats;
    }
}
/**
 * Replay-aware cross-session usage analytics service.
 *
 * The service observes `session/event`, replays already-live sessions on mount,
 * and keeps per-step usage samples so a later final `assistant/message` replaces
 * an earlier usage chunk instead of double counting. Request counts come from
 * each completed `assistant/message` (one per model call).
 */
export declare class TokenUsageStats extends Service {
    static inject: string[];
    static Config: z<TokenUsageStatsConfig>;
    private config;
    private readonly usageByStep;
    private readonly usageRecords;
    private readonly requestByStep;
    private readonly requestRecords;
    private readonly states;
    private readonly persistedSeq;
    private readonly persistedRevisions;
    /** Latest folded `session/title` text per session (last-wins). */
    private readonly titles;
    /** Persistent map from sessionId to last detected model/provider. */
    private readonly sessionModels;
    private persistence;
    private lastRehydrateTime;
    private rehydrating;
    private firstRehydratePromise;
    private isFirstRehydrated;
    /** Trigger non-blocking background rehydration throttled to at most once per 4 seconds. */
    private _scheduleRehydrate;
    constructor(ctx: Context, config?: TokenUsageStatsConfig);
    /** Return the currently effective pricing settings and schedule. */
    getPricingConfig(): PricingConfigPayload;
    /**
     * Return the price book as the dashboard editor needs it: every key that can
     * bill a request, with the built-in defaults alongside so the page can badge
     * user overrides.
     *
     * Unlike {@link getPricingConfig}, `pricing` here is the effective book —
     * built-in defaults with configuration and persisted prices layered on top —
     * matching what {@link _resolvePricing} actually charges.
     */
    getPricingConfigView(): PricingConfigView;
    /** Atomically persist and immediately apply updated pricing rules. */
    updatePricingConfig(payload: PricingConfigPayload): void;
    /**
     * Return a detached immutable analytics snapshot.
     * @param query - optional time/model/granularity filters.
     * @returns aggregate totals, per-model totals, and time-bucketed series.
     * @throws RangeError when the filtered series range would exceed the
     *   {@link MAX_SERIES_BUCKETS} bucket cap (an explicit from/to spanning too
     *   wide, or records so far apart they imply more buckets than the cap).
     */
    snapshot(query?: TokenUsageStatsQuery): TokenUsageStatsSnapshot;
    /** Catch one session's fold up to the current durable tail. */
    private _sync;
    /**
     * Directly read and parse session events from a specific log file,
     * handling concatenated Zstandard frames and plain JSONL.
     */
    private _readEventsFromFile;
    /**
     * Discover all stored sessions across all workspace project directories and all
     * format generations (session.jsonl.zstd, session.v1.jsonl, session.v2.jsonl.zstd, etc.).
     */
    private _discoverAllPersistedSessions;
    /**
     * Replay materialized persisted sessions so a process restart keeps the
     * aggregate. Live sessions are skipped: their constructor-time sync already
     * counted the same log, and a persisted session opened later starts its live
     * fold after the replayed seq.
     */
    private _rehydrate;
    /** Fold one event into route state and aggregate records. */
    private _foldEvent;
    /** Record one provider usage sample, replacing any earlier same-step sample. */
    private _recordUsage;
    /** Record one dispatched request for count bucketing, replacing any earlier same-step record. */
    private _recordRequest;
    /**
     * True during configured peak intervals.
     * Weekends (Beijing Saturday/Sunday) are off-peak when weekendOffpeak is true.
     * Beijing time is fixed UTC+8, so reading UTC fields of a +8-shifted epoch
     * yields the Beijing wall-clock date, hour, and minute.
     * @param time - the usage record's time (Unix ms).
     */
    private _isPeak;
    /**
     * Resolve pricing for a provider-reported model id.
     *
     * Precedence: the user's own configuration first — both the verbatim id and
     * the built-in key it resolves to, so a configured `deepseek-flash` also
     * covers a provider that reports `deepseek-v4.1-flash` — then the built-in
     * price book. An id in neither stays unpriced rather than being charged at
     * another model's rate.
     * @param model - provider-reported model id.
     */
    private _resolvePricing;
    /**
     * Look up a model's configured price key, picking peak/off-peak when
     * the model is tiered, else the flat top-level key.
     * @param model - provider model id.
     * @param time - the usage record's time (Unix ms) used to pick the tier.
     * @param key - the price key to read.
     */
    private _price;
    /** Compute cost for one usage record, or undefined when no pricing is configured. */
    private _costFor;
    /** Aggregate a set of usage records and a request count. */
    private _totals;
    /** Group usage and request records by provider/model pair. */
    private _models;
    /** Bucket filtered records into contiguous UTC hour/day bins. */
    private _series;
    /** Group filtered records by session and return the richest first (top 5). */
    private _topSessions;
}
export default TokenUsageStats;
//# sourceMappingURL=index.d.ts.map