/**
 * Dashboard API query parsing for `dsh-token-usage-stats`.
 *
 * @module dsh-token-usage-stats/routes
 */

import type { TokenUsageStatsQuery } from './types.ts'

/** Parse one optional finite-number query parameter. */
function finiteParam(value: string | null): number | undefined {
  if (value === null || value.trim() === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

/**
 * Build a snapshot query from the dashboard API's URL parameters.
 * Invalid numbers are ignored rather than guessed; an unsupported granularity
 * falls back to the service default (`hour`).
 * @param params - parsed URL search parameters.
 * @returns a validated query for {@link TokenUsageStatsQuery}.
 */
export function parseTokenUsageStatsQuery(params: URLSearchParams): TokenUsageStatsQuery {
  const from = finiteParam(params.get('from'))
  const to = finiteParam(params.get('to'))
  const model = params.get('model')
  const granularity = params.get('granularity')
  return {
    ...(from === undefined ? {} : { from }),
    ...(to === undefined ? {} : { to }),
    ...(model === null || model === '' ? {} : { model }),
    ...(granularity === 'day' || granularity === 'hour' ? { granularity } : {}),
  }
}
