import { useState } from 'react'
import { Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { NS } from './locales.ts'
import css from './TokenUsageStatsAction.module.css'

/** Full props for the sidebar footer usage-stats action. */
export type TokenUsageStatsActionProps =
  PropsRuntime<'sidebar.footer.action'> & PropsLocale<typeof NS>

/** Minimal bar-chart glyph used on the collapsed sidebar rail. */
function ChartGlyph({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M2.5 13.5V9.5H4V13.5H2.5Z"
        fill="currentColor"
      />
      <path
        d="M6 13.5V5.5H7.5V13.5H6Z"
        fill="currentColor"
      />
      <path
        d="M9.5 13.5V7.5H11V13.5H9.5Z"
        fill="currentColor"
      />
      <path
        d="M13 13.5V3H14.5V13.5H13Z"
        fill="currentColor"
      />
      <path d="M1.5 14.5H15V16H1.5V14.5Z" fill="currentColor" />
    </svg>
  )
}

/**
 * Sidebar footer trigger for the token usage dashboard. Clicking opens an
 * in-page modal that embeds the host-served dashboard page, so desktop users
 * stay in the same application window.
 * @param props - footer slot share (wide/rail state) plus the namespace translator.
 * @returns the trigger button and the controlled modal.
 */
export function TokenUsageStatsAction({ wide, t }: TokenUsageStatsActionProps) {
  const [open, setOpen] = useState(false)
  const label = t('label')
  return (
    <>
      <button
        type="button"
        className={wide ? css.root : `${css.root} ${css.railOnly}`}
        aria-label={t('open')}
        title={t('open')}
        onClick={() => { setOpen(true) }}
      >
        <ChartGlyph size={wide ? 14 : 18} />
        {wide ? <span className={css.label}>{label}</span> : null}
      </button>
      <Modal
        open={open}
        onClose={() => { setOpen(false) }}
        title={t('dialogTitle')}
        closeLabel={t('close')}
        className={css.dialog ?? ''}
        contentClassName={css.dialogBody ?? ''}
      >
        <iframe src="/token-usage-stats" title={t('dialogTitle')} className={css.frame} />
      </Modal>
    </>
  )
}
