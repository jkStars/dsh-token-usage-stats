/**
 * Built-in default price book, ported from @kenz1117/dsh-ui-usage-billing
 * v1.4.15 (MIT, https://github.com/kenz1117/dsh-ui-usage-billing), catalog of
 * 97 models with 70 id aliases.
 *
 * Prices are per 1,000,000 tokens. Conversion rules applied by the porter:
 *  - The source prices domestic providers in CNY and overseas ones in USD; USD
 *    entries are converted here at 6.79 (the same rate the source uses for
 *    display). Every entry below is therefore CNY, matching this plugin's
 *    single `currency` label, which is a label only and never converts.
 *  - Latency-tiered entries from the source (Gemini Standard/Flex, GPT-5.6
 *    Flex) are flattened to their standard band: this plugin prices by time of
 *    day and cannot observe which latency tier a request used.
 *  - The three DeepSeek entries keep the source's peak/off-peak bands, which
 *    match this plugin's own schedule (Beijing 09:00-12:00 / 14:00-18:00).
 *  - Time-limited launch promos are deliberately not applied: the list price is
 *    written, so no baked-in discount silently expires.
 *  - Entries the source marks `estimated` (vendor has not published per-token
 *    list price) and `retired` (superseded, kept so historical usage prices)
 *    are included as published.
 *
 * User configuration and persisted prices override these entries key by key.
 *
 * @module
 */
import type { ModelPricing } from './types.ts';
/** Currency of every {@link BUILTIN_PRICING} entry. */
export declare const BUILTIN_PRICING_CURRENCY = "CNY";
/**
 * Default price book, keyed by this plugin's price key. Providers report many
 * upstream ids for one model; {@link resolveBuiltinPricingKey} maps them here.
 */
export declare const BUILTIN_PRICING: Readonly<Record<string, ModelPricing>>;
/**
 * Upstream ids that providers report, mapped to a {@link BUILTIN_PRICING} key.
 *
 * Unlike the price book, keys here are matched verbatim (lowercased) before
 * the normalised and derived-candidate passes; see
 * {@link resolveBuiltinPricingKey}. Several entries exist only to normalise a
 * separator or suffix variant that the canonicalised index would otherwise miss.
 */
export declare const BUILTIN_PRICING_ALIASES: Readonly<Record<string, string>>;
/**
 * Canonical form of a model id: lowercased, parenthetical notes dropped, and
 * every non-alphanumeric character removed. This lets a reported id match a
 * key that differs only by separators or case (`Claude-Opus-5-5` ===
 * `claude-opus-5.5` === `claude-opus-5-5`).
 * @param id - raw model id.
 * @returns alphanumeric lowercase form.
 */
export declare function canonicalModelId(id: string): string;
/**
 * Resolve a provider-reported model id to a {@link BUILTIN_PRICING} key, or
 * `undefined` when the id is not in the built-in catalog. Never guesses: an
 * unknown id stays unpriced rather than being charged at another model's rate.
 *
 * Matching order is verbatim id, verbatim alias, canonical form, then derived
 * candidates (org prefix and snapshot suffix stripped).
 * @param id - raw provider model id.
 * @returns the price key, or undefined when unknown.
 */
export declare function resolveBuiltinPricingKey(id: string): string | undefined;
//# sourceMappingURL=builtin-pricing.d.ts.map