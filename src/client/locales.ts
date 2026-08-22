/** `usageStats` namespace dictionaries. */

/** Dictionary namespace owned by this plugin. */
export const NS = 'usageStats'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  label: '用量统计',
  open: '打开 Token 用量统计面板',
  close: '关闭',
  dialogTitle: 'Token 用量统计',
} as const

/** English dictionary, key-identical to the Chinese source of truth. */
export const en: Record<UsageStatsKey, string> = {
  label: 'Usage',
  open: 'Open token usage dashboard',
  close: 'Close',
  dialogTitle: 'Token usage',
}

/** Key domain of the `usageStats` namespace (zh is the source of truth). */
export type UsageStatsKey = keyof typeof zh
