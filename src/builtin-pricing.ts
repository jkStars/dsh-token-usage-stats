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
import type { ModelPricing } from './types.ts'

/** Currency of every {@link BUILTIN_PRICING} entry. */
export const BUILTIN_PRICING_CURRENCY = 'CNY'

/**
 * Default price book, keyed by this plugin's price key. Providers report many
 * upstream ids for one model; {@link resolveBuiltinPricingKey} maps them here.
 */
export const BUILTIN_PRICING: Readonly<Record<string, ModelPricing>> = {
  'deepseek-flash': { peak: { uncachedInputPerMillion: 2, cacheReadPerMillion: 0.04, outputPerMillion: 8 }, offpeak: { uncachedInputPerMillion: 1, cacheReadPerMillion: 0.02, outputPerMillion: 4 } },
  'deepseek-v4-pro': { peak: { uncachedInputPerMillion: 9, cacheReadPerMillion: 0.3, outputPerMillion: 27 }, offpeak: { uncachedInputPerMillion: 4.5, cacheReadPerMillion: 0.15, outputPerMillion: 13.5 } },
  'glm': { uncachedInputPerMillion: 8, cacheReadPerMillion: 2, outputPerMillion: 28 },
  'glm-5.3': { uncachedInputPerMillion: 8, cacheReadPerMillion: 2, outputPerMillion: 28 },
  'glm-5.3-flash': { uncachedInputPerMillion: 0.8, cacheReadPerMillion: 0.23, outputPerMillion: 2.8 },
  'glm-5.3-flashx': { uncachedInputPerMillion: 2, cacheReadPerMillion: 0.57, outputPerMillion: 7 },
  'glm-4.6': { uncachedInputPerMillion: 4, cacheReadPerMillion: 0.8, outputPerMillion: 16 },
  'glm-4.5-air': { uncachedInputPerMillion: 0.8, cacheReadPerMillion: 0.16, outputPerMillion: 2 },
  'glm-4.7': { uncachedInputPerMillion: 4, cacheReadPerMillion: 1, outputPerMillion: 16 },
  'glm-5-turbo': { uncachedInputPerMillion: 5, cacheReadPerMillion: 1.2, outputPerMillion: 22 },
  'glm-5.1': { uncachedInputPerMillion: 6, cacheReadPerMillion: 1.3, outputPerMillion: 24 },
  'glm-5v-turbo': { uncachedInputPerMillion: 5, cacheReadPerMillion: 1.2, outputPerMillion: 22 },
  'qwen-3.8-max': { uncachedInputPerMillion: 12, cacheReadPerMillion: 1.5, outputPerMillion: 36 },
  'qwen-3.8-flash': { uncachedInputPerMillion: 0.8, cacheReadPerMillion: 0.1, outputPerMillion: 2.7 },
  'qwen-3.8-27b': { uncachedInputPerMillion: 3, cacheReadPerMillion: 0.6, outputPerMillion: 12 },
  'qwen-max': { uncachedInputPerMillion: 12, cacheReadPerMillion: 1.2, outputPerMillion: 36 },
  'qwen-plus': { uncachedInputPerMillion: 0.8, cacheReadPerMillion: 0.08, outputPerMillion: 4.8 },
  'qwen-flash': { uncachedInputPerMillion: 0.2, cacheReadPerMillion: 0.02, outputPerMillion: 2 },
  'doubao': { uncachedInputPerMillion: 3.2, cacheReadPerMillion: 0.64, outputPerMillion: 16 },
  'doubao-mini': { uncachedInputPerMillion: 0.2, cacheReadPerMillion: 0.04, outputPerMillion: 2 },
  'doubao-1.6': { uncachedInputPerMillion: 0.8, cacheReadPerMillion: 0, outputPerMillion: 8 },
  'doubao-seed-evolving': { uncachedInputPerMillion: 6, cacheReadPerMillion: 1.2, outputPerMillion: 30 },
  'doubao-seed-2.1-pro': { uncachedInputPerMillion: 6, cacheReadPerMillion: 1.2, outputPerMillion: 30 },
  'doubao-seed-2.1-turbo': { uncachedInputPerMillion: 3, cacheReadPerMillion: 0.6, outputPerMillion: 15 },
  'doubao-seed-2.1-lite': { uncachedInputPerMillion: 0.8, cacheReadPerMillion: 0.16, outputPerMillion: 2.7 },
  'kimi': { uncachedInputPerMillion: 6.5, cacheReadPerMillion: 1.3, outputPerMillion: 27 },
  'kimi-k2.7-hs': { uncachedInputPerMillion: 13, cacheReadPerMillion: 2.6, outputPerMillion: 54 },
  'kimi-k2.6': { uncachedInputPerMillion: 6.5, cacheReadPerMillion: 1.1, outputPerMillion: 27 },
  'kimi-k3': { uncachedInputPerMillion: 20, cacheReadPerMillion: 2, outputPerMillion: 100 },
  'mimo-v2.6-pro': { uncachedInputPerMillion: 3, cacheReadPerMillion: 0.025, outputPerMillion: 6 },
  'mimo-v2.6-flash': { uncachedInputPerMillion: 1, cacheReadPerMillion: 0.02, outputPerMillion: 2 },
  'mimo-v2.6-pro-ultraspeed': { uncachedInputPerMillion: 30, cacheReadPerMillion: 0.25, outputPerMillion: 60 },
  'mimo-v2.5': { uncachedInputPerMillion: 1, cacheReadPerMillion: 0.02, outputPerMillion: 2 },
  'mimo-v2.5-pro': { uncachedInputPerMillion: 3, cacheReadPerMillion: 0.025, outputPerMillion: 6 },
  'minimax': { uncachedInputPerMillion: 2.1, cacheReadPerMillion: 0.42, outputPerMillion: 8.4 },
  'minimax-m2.7': { uncachedInputPerMillion: 2.1, cacheReadPerMillion: 0.42, outputPerMillion: 8.4 },
  'minimax-m2.7-highspeed': { uncachedInputPerMillion: 4.2, cacheReadPerMillion: 0.42, outputPerMillion: 16.8 },
  'ernie': { uncachedInputPerMillion: 4, cacheReadPerMillion: 0.4, outputPerMillion: 18 },
  'hunyuan': { uncachedInputPerMillion: 1, cacheReadPerMillion: 0.25, outputPerMillion: 4 },
  'hunyuan-hy4-preview': { uncachedInputPerMillion: 6, cacheReadPerMillion: 0.3, outputPerMillion: 18 },
  'hunyuan-t1': { uncachedInputPerMillion: 1, cacheReadPerMillion: 0.1, outputPerMillion: 4 },
  'yi': { uncachedInputPerMillion: 0.99, cacheReadPerMillion: 0.1, outputPerMillion: 0.99 },
  'step': { uncachedInputPerMillion: 1.35, cacheReadPerMillion: 0.27, outputPerMillion: 8.1 },
  'spark': { uncachedInputPerMillion: 5, cacheReadPerMillion: 0.5, outputPerMillion: 10 },
  'sensenova': { uncachedInputPerMillion: 4.5, cacheReadPerMillion: 0.45, outputPerMillion: 9 },
  'baichuan': { uncachedInputPerMillion: 5, cacheReadPerMillion: 0.5, outputPerMillion: 9 },
  'gpt-6-astra': { uncachedInputPerMillion: 67.9, cacheReadPerMillion: 6.79, outputPerMillion: 339.5 },
  'gpt-6-sol': { uncachedInputPerMillion: 13.58, cacheReadPerMillion: 1.358, outputPerMillion: 67.9 },
  'gpt-6-luna': { uncachedInputPerMillion: 0.679, cacheReadPerMillion: 0.0679, outputPerMillion: 3.395 },
  'gpt-5.6-sol': { uncachedInputPerMillion: 33.95, cacheReadPerMillion: 3.395, outputPerMillion: 203.7 },
  'gpt-5.6-terra': { uncachedInputPerMillion: 13.58, cacheReadPerMillion: 1.358, outputPerMillion: 81.48 },
  'gpt-5.6-luna': { uncachedInputPerMillion: 1.358, cacheReadPerMillion: 0.1358, outputPerMillion: 8.148 },
  'gemini-pro': { uncachedInputPerMillion: 13.58, cacheReadPerMillion: 1.358, outputPerMillion: 81.48 },
  'gemini-3.8-flash': { uncachedInputPerMillion: 10.185, cacheReadPerMillion: 1.0185, outputPerMillion: 50.925 },
  'gemini-3.7-flash': { uncachedInputPerMillion: 10.185, cacheReadPerMillion: 1.0185, outputPerMillion: 50.925 },
  'gemini-flash': { uncachedInputPerMillion: 10.185, cacheReadPerMillion: 1.0185, outputPerMillion: 50.925 },
  'grok-4.7': { uncachedInputPerMillion: 13.58, cacheReadPerMillion: 3.395, outputPerMillion: 40.74 },
  'grok': { uncachedInputPerMillion: 13.58, cacheReadPerMillion: 3.395, outputPerMillion: 40.74 },
  'grok-4.3': { uncachedInputPerMillion: 8.4875, cacheReadPerMillion: 1.358, outputPerMillion: 16.975 },
  'grok-build-0.1': { uncachedInputPerMillion: 6.79, cacheReadPerMillion: 1.358, outputPerMillion: 13.58 },
  'llama': { uncachedInputPerMillion: 1.358, cacheReadPerMillion: 0.3395, outputPerMillion: 4.074 },
  'llama-scout': { uncachedInputPerMillion: 0.679, cacheReadPerMillion: 0.16975, outputPerMillion: 2.037 },
  'claude-opus-4-6': { uncachedInputPerMillion: 33.95, cacheReadPerMillion: 3.395, outputPerMillion: 169.75 },
  'claude-sonnet-4-6': { uncachedInputPerMillion: 20.37, cacheReadPerMillion: 2.037, outputPerMillion: 101.85 },
  'claude-haiku-4-5': { uncachedInputPerMillion: 6.79, cacheReadPerMillion: 0.679, outputPerMillion: 33.95 },
  'claude-opus-5': { uncachedInputPerMillion: 33.95, cacheReadPerMillion: 3.395, outputPerMillion: 169.75 },
  'claude-sonnet-5': { uncachedInputPerMillion: 13.58, cacheReadPerMillion: 1.358, outputPerMillion: 67.9 },
  'claude-fable-5-1': { uncachedInputPerMillion: 67.9, cacheReadPerMillion: 1.6975, outputPerMillion: 339.5 },
  'claude-opus-5-5': { uncachedInputPerMillion: 27.16, cacheReadPerMillion: 1.358, outputPerMillion: 135.8 },
  'claude-sonnet-5-5': { uncachedInputPerMillion: 13.58, cacheReadPerMillion: 1.358, outputPerMillion: 67.9 },
  'mistral-large-2512': { uncachedInputPerMillion: 3.395, cacheReadPerMillion: 0.3395, outputPerMillion: 10.185 },
  'mistral-small-2603': { uncachedInputPerMillion: 1.0185, cacheReadPerMillion: 0.10185, outputPerMillion: 4.074 },
  'ministral-8b-latest': { uncachedInputPerMillion: 0.679, cacheReadPerMillion: 0.0679, outputPerMillion: 0.679 },
  'command-a-03-2025': { uncachedInputPerMillion: 16.975, cacheReadPerMillion: 1.6975, outputPerMillion: 67.9 },
  'command-r-08-2024': { uncachedInputPerMillion: 1.0185, cacheReadPerMillion: 0.10185, outputPerMillion: 4.074 },
  'longcat-2.0': { uncachedInputPerMillion: 4, cacheReadPerMillion: 0.8, outputPerMillion: 16 },
  'minicpm-v-4.5': { uncachedInputPerMillion: 1, cacheReadPerMillion: 0.2, outputPerMillion: 4 },
  'ernie-4.5': { uncachedInputPerMillion: 2, cacheReadPerMillion: 0.4, outputPerMillion: 8 },
  'dots-3-note-preview': { uncachedInputPerMillion: 2, cacheReadPerMillion: 0.4, outputPerMillion: 8 },
  'qwen3.7-plus': { uncachedInputPerMillion: 2, cacheReadPerMillion: 0.4, outputPerMillion: 8 },
  'qwen3.7-flash': { uncachedInputPerMillion: 0.2, cacheReadPerMillion: 0.02, outputPerMillion: 0.8 },
  'qwen3.6-max': { uncachedInputPerMillion: 9, cacheReadPerMillion: 0.9, outputPerMillion: 54 },
  'qwen3-coder-plus': { uncachedInputPerMillion: 4, cacheReadPerMillion: 0.8, outputPerMillion: 16 },
  'qwen3-coder': { uncachedInputPerMillion: 4, cacheReadPerMillion: 0.8, outputPerMillion: 16 },
  'glm-4.5-x': { uncachedInputPerMillion: 4, cacheReadPerMillion: 1, outputPerMillion: 16 },
  'glm-5': { uncachedInputPerMillion: 4, cacheReadPerMillion: 1, outputPerMillion: 18 },
  'glm-5.2-fast': { uncachedInputPerMillion: 16, cacheReadPerMillion: 4, outputPerMillion: 56 },
  'kimi-k3-fast': { uncachedInputPerMillion: 20, cacheReadPerMillion: 2, outputPerMillion: 100 },
  'kimi-k2.7-code-fast': { uncachedInputPerMillion: 6.5, cacheReadPerMillion: 1.3, outputPerMillion: 27 },
  'kimi-k2.8-preview': { uncachedInputPerMillion: 6.5, cacheReadPerMillion: 1.7, outputPerMillion: 27 },
  'kimi-k2.6-fast': { uncachedInputPerMillion: 6.5, cacheReadPerMillion: 1.1, outputPerMillion: 27 },
  'kimi-k2.6-turbo': { uncachedInputPerMillion: 6.5, cacheReadPerMillion: 1.1, outputPerMillion: 27 },
  'kimi-k2-thinking-turbo': { uncachedInputPerMillion: 8, cacheReadPerMillion: 1, outputPerMillion: 58 },
  'doubao-seed-2.0-code': { uncachedInputPerMillion: 3.2, cacheReadPerMillion: 0.64, outputPerMillion: 16 },
  'doubao-seed-2.0-lite': { uncachedInputPerMillion: 0.6, cacheReadPerMillion: 0.12, outputPerMillion: 3.6 },
  'other': { uncachedInputPerMillion: 0, cacheReadPerMillion: 0, outputPerMillion: 0 },
}

/**
 * Upstream ids that providers report, mapped to a {@link BUILTIN_PRICING} key.
 *
 * Unlike the price book, keys here are matched verbatim (lowercased) before
 * the normalised and derived-candidate passes; see
 * {@link resolveBuiltinPricingKey}. Several entries exist only to normalise a
 * separator or suffix variant that the canonicalised index would otherwise miss.
 */
export const BUILTIN_PRICING_ALIASES: Readonly<Record<string, string>> = {
  'deepseek-v4-flash': 'deepseek-flash',
  'deepseek-v4-flash-vision-exp': 'deepseek-flash',
  'deepseek-v4.1-flash': 'deepseek-flash',
  'deepseek-v4.1-flash-expires-on-0910': 'deepseek-flash',
  'glm-5.2': 'glm',
  'glm-4.5air': 'glm-4.5-air',
  'glm-5.3-flash-x': 'glm-5.3-flashx',
  'glm-5v.1': 'glm-5v-turbo',
  'claude-opus-4.6': 'claude-opus-4-6',
  'claude-sonnet-4.6': 'claude-sonnet-4-6',
  'claude-haiku-4.5': 'claude-haiku-4-5',
  'claude-fable-5.1': 'claude-fable-5-1',
  'claude-fable': 'claude-fable-5-1',
  'claude-opus-5.5': 'claude-opus-5-5',
  'claude-sonnet-5.5': 'claude-sonnet-5-5',
  'mistral-large-3': 'mistral-large-2512',
  'mistral-small-4': 'mistral-small-2603',
  'ministral-8b': 'ministral-8b-latest',
  'command-a': 'command-a-03-2025',
  'command-r': 'command-r-08-2024',
  'hy3': 'hunyuan',
  'hy4-preview': 'hunyuan-hy4-preview',
  'hy4': 'hunyuan-hy4-preview',
  'hunyuan-hy4': 'hunyuan-hy4-preview',
  'longcat-2': 'longcat-2.0',
  'minicpm-v-4.5-thinking': 'minicpm-v-4.5',
  'ernie-4.5-300b': 'ernie-4.5',
  'dots-3-note': 'dots-3-note-preview',
  'dots3-note-preview': 'dots-3-note-preview',
  'rednote-dots3': 'dots-3-note-preview',
  'doubao-seed-evolve': 'doubao-seed-evolving',
  'doubao-seed-2.1-pro-290000': 'doubao-seed-2.1-pro',
  'doubao-seed-2-1-turbo': 'doubao-seed-2.1-turbo',
  'doubao-seed-2-1-lite': 'doubao-seed-2.1-lite',
  'qwen3.8-max': 'qwen-3.8-max',
  'qwen3.8-flash': 'qwen-3.8-flash',
  'qwen3.8-27b': 'qwen-3.8-27b',
  'qwen3.7-max': 'qwen-max',
  'qwen3.6-max-preview': 'qwen3.6-max',
  'qwen3-coder-480b': 'qwen3-coder',
  'glm-4.5x': 'glm-4.5-x',
  'glm-5.2f': 'glm-5.2-fast',
  'kimi-k3f': 'kimi-k3-fast',
  'kimi-for-coding': 'kimi-k2.8-preview',
  'kimi-k2.7-code-f': 'kimi-k2.7-code-fast',
  'doubao-seed-2-0-code': 'doubao-seed-2.0-code',
  'doubao-seed-2-0-lite': 'doubao-seed-2.0-lite',
  'step-3.7-flash': 'step',
  'seed-2.0-mini': 'doubao-mini',
  'k3': 'kimi-k3',
  'kimi-k2.8': 'kimi-k2.8-preview',
  'kimi-k2-8-preview': 'kimi-k2.8-preview',
  'kimi-k2-8': 'kimi-k2.8-preview',
  'k2.8-preview': 'kimi-k2.8-preview',
  'k2.8': 'kimi-k2.8-preview',
  'minimax-m1': 'minimax',
  'minimax-m2': 'minimax',
  'minimax-m3': 'minimax',
  'minimax-m2.7-high-speed': 'minimax-m2.7-highspeed',
  'minimax-m2-7': 'minimax-m2.7',
  'minimax-m2-7-highspeed': 'minimax-m2.7-highspeed',
  'minimax-m2-7-high-speed': 'minimax-m2.7-highspeed',
  'gpt-6': 'gpt-6-astra',
  'gemini-3-8-flash': 'gemini-3.8-flash',
  'gemini-3-7-flash': 'gemini-3.7-flash',
  'grok-build': 'grok-build-0.1',
  'deepseek-v4.1-flash-sg': 'deepseek-flash',
  'sn-deepseek-v4-1-flash': 'deepseek-flash',
  'deepseek-chat': 'deepseek-flash',
  'deepseek-reasoner': 'deepseek-flash',
}

/**
 * Canonical form of a model id: lowercased, parenthetical notes dropped, and
 * every non-alphanumeric character removed. This lets a reported id match a
 * key that differs only by separators or case (`Claude-Opus-5-5` ===
 * `claude-opus-5.5` === `claude-opus-5-5`).
 * @param id - raw model id.
 * @returns alphanumeric lowercase form.
 */
export function canonicalModelId(id: string): string {
  return id.toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z0-9]+/g, '')
}

/** Canonical form -> price key, built once from keys and verbatim aliases. */
const CANONICAL_INDEX: ReadonlyMap<string, string> = (() => {
  const index = new Map<string, string>()
  const add = (candidate: string, target: string): void => {
    const canonical = canonicalModelId(candidate)
    if (canonical !== '' && !index.has(canonical)) index.set(canonical, target)
  }
  for (const key of Object.keys(BUILTIN_PRICING)) add(key, key)
  for (const [alias, key] of Object.entries(BUILTIN_PRICING_ALIASES)) add(alias, key)
  return index
})()

/**
 * Derived candidates for an unmatched id: the segment after the last slash
 * (`cline-api/openai/gpt-6-sol` -> `gpt-6-sol`), plus either form with a
 * trailing 3+-digit snapshot suffix removed (`gpt-6-sol-202605` ->
 * `gpt-6-sol`). Keys that already match verbatim never reach this pass.
 * @param id - raw model id.
 * @returns candidate ids, most specific first.
 */
function derivedCandidates(id: string): string[] {
  const out: string[] = []
  const push = (value: string): void => {
    if (value !== '' && !out.includes(value)) out.push(value)
  }
  const stripTrailingDigits = (value: string): void => {
    let base = value
    for (;;) {
      const next = base.replace(/[-_]\d{3,}$/u, '')
      if (next === base || next === '') return
      base = next
      push(base)
    }
  }
  const slash = id.lastIndexOf('/')
  if (slash > 0 && slash < id.length - 1) {
    const bare = id.slice(slash + 1)
    push(bare)
    stripTrailingDigits(bare)
  }
  stripTrailingDigits(id)
  return out
}

/** Look one candidate up verbatim, then canonically. */
function lookupBuiltinKey(candidate: string): string | undefined {
  const alias = BUILTIN_PRICING_ALIASES[candidate]
  if (alias !== undefined) return alias
  const canonical = canonicalModelId(candidate)
  return canonical === '' ? undefined : CANONICAL_INDEX.get(canonical)
}

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
export function resolveBuiltinPricingKey(id: string): string | undefined {
  const lower = id.toLowerCase()
  if (BUILTIN_PRICING[lower] !== undefined) return lower
  const direct = lookupBuiltinKey(lower)
  if (direct !== undefined) return direct
  for (const candidate of derivedCandidates(lower)) {
    const hit = lookupBuiltinKey(candidate)
    if (hit !== undefined) return hit
  }
  return undefined
}
