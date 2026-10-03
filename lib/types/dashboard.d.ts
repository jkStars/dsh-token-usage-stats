/**
 * Static dashboard page for token-usage-stats. The page is deliberately
 * dependency-free: one HTML document fetches the sibling JSON endpoint and
 * renders cards, a series chart, a bucket breakdown, and a per-model table.
 *
 * @module @deepseek-ai/dsh-token-usage-stats-web/dashboard
 */
import type { ModelPricing } from './types.ts';
/**
 * HTML document rendered at `/token-usage-stats`.
 * @param builtinPricing - the plugin's built-in price book, embedded as the
 *   editor's fallback so the page still lists models when the JSON endpoint is
 *   unreachable.
 * @returns the complete self-contained dashboard document.
 */
export declare function renderUsageDashboard(builtinPricing: Readonly<Record<string, ModelPricing>>): string;
//# sourceMappingURL=dashboard.d.ts.map