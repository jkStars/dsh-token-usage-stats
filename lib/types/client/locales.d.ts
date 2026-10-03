/** `usageStats` namespace dictionaries. */
/** Dictionary namespace owned by this plugin. */
export declare const NS = "usageStats";
/** Simplified Chinese dictionary (the key-set source of truth). */
export declare const zh: {
    readonly label: "用量统计";
    readonly open: "打开 Token 用量统计面板";
    readonly close: "关闭";
    readonly dialogTitle: "Token 用量统计";
};
/** English dictionary, key-identical to the Chinese source of truth. */
export declare const en: Record<UsageStatsKey, string>;
/** Key domain of the `usageStats` namespace (zh is the source of truth). */
export type UsageStatsKey = keyof typeof zh;
//# sourceMappingURL=locales.d.ts.map