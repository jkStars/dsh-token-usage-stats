/**
 * Package-owned invariant companion for `dsh-token-usage-stats`.
 * @module dsh-token-usage-stats/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = 'dsh-token-usage-stats'

/** Cordis companion plugin name. */
export const name = 'token-usage-stats-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: the plugin is an in-memory observer over the already
 * durable session/event stream. It never changes session state, and its
 * snapshots are derived read models whose shape is fixed by TypeScript and by
 * the package's public types rather than by a runtime relationship worth
 * observing.
 */
const install: InvariantInstaller = () => {}

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
/* jscpd:ignore-end */
