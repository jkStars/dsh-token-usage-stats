/**
 * Token-usage dashboard plugin, browser half: registers one sidebar footer
 * action that links to the host-served dashboard page.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import { type UsageStatsKey } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** Token-usage dashboard entry copy. */
        usageStats: UsageStatsKey;
    }
}
export type { TokenUsageStatsActionProps } from './TokenUsageStatsAction.tsx';
/** Required services for locale registration and the sidebar footer slot. */
export declare const inject: string[];
/**
 * Client plugin body: register the dictionaries and the footer action.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map