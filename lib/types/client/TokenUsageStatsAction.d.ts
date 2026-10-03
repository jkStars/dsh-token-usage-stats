import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import { NS } from './locales.ts';
/** Full props for the sidebar footer usage-stats action. */
export type TokenUsageStatsActionProps = PropsRuntime<'sidebar.footer.action'> & PropsLocale<typeof NS>;
/**
 * Sidebar footer trigger for the token usage dashboard. Clicking opens an
 * in-page modal that embeds the host-served dashboard page, so desktop users
 * stay in the same application window.
 * @param props - footer slot share (wide/rail state) plus the namespace translator.
 * @returns the trigger button and the controlled modal.
 */
export declare function TokenUsageStatsAction({ wide, t }: TokenUsageStatsActionProps): import("react").JSX.Element;
//# sourceMappingURL=TokenUsageStatsAction.d.ts.map