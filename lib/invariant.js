//#region lib/types/invariant.js
/**
* Package-owned invariant companion for `dsh-token-usage-stats`.
* @module dsh-token-usage-stats/invariant
*/
const PACKAGE_NAME = "dsh-token-usage-stats";
/** Cordis companion plugin name. */
const name = "token-usage-stats-invariant";
/** Service required before the companion can reserve package ownership. */
const inject = ["invariants"];
/**
* No runtime invariant: the plugin is an in-memory observer over the already
* durable session/event stream. It never changes session state, and its
* snapshots are derived read models whose shape is fixed by TypeScript and by
* the package's public types rather than by a runtime relationship worth
* observing.
*/
const install = () => {};
/**
* Register this package's invariant companion.
* @param ctx - Cordis context carrying the invariant service.
* @returns the installed registration's disposer after setup succeeds.
*/
const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
//#endregion
export { apply, inject, name };
