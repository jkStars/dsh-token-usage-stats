/**
 * Token-usage dashboard plugin, browser half: registers one sidebar footer
 * action that links to the host-served dashboard page.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { TokenUsageStatsAction } from './TokenUsageStatsAction.tsx'
import { en, NS, zh, type UsageStatsKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Token-usage dashboard entry copy. */
    usageStats: UsageStatsKey
  }
}

export type { TokenUsageStatsActionProps } from './TokenUsageStatsAction.tsx'

/** Required services for locale registration and the sidebar footer slot. */
export const inject = ['slots', 'locale']

/**
 * Client plugin body: register the dictionaries and the footer action.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-token-usage-stats: dictionaries')
  ctx.slots.inject(
    'sidebar.footer.action',
    () => ctx.slots.register({
      name: 'sidebar.footer.action',
      id: 'token-usage-stats',
      order: 10,
      locale: NS,
    }, TokenUsageStatsAction),
  )
}
