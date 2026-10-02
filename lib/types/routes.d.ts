/**
 * Dashboard API query parsing for `dsh-token-usage-stats`.
 *
 * @module dsh-token-usage-stats/routes
 */
import type { TokenUsageStatsQuery } from './types.ts';
/**
 * Build a snapshot query from the dashboard API's URL parameters.
 * Invalid numbers are ignored rather than guessed; an unsupported granularity
 * falls back to the service default (`hour`).
 * @param params - parsed URL search parameters.
 * @returns a validated query for {@link TokenUsageStatsQuery}.
 */
export declare function parseTokenUsageStatsQuery(params: URLSearchParams): TokenUsageStatsQuery;
//# sourceMappingURL=routes.d.ts.map