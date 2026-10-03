import { Service } from "@deepseek-ai/cordis";
import z from "@deepseek-ai/schemastery";
import { deepFreeze } from "@deepseek-ai/dsh-util-values";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { zstdDecompress } from "node:zlib";
import os from "node:os";
import path from "node:path";
//#region lib/types/dashboard.js
/**
* HTML document rendered at `/token-usage-stats`.
* @param builtinPricing - the plugin's built-in price book, embedded as the
*   editor's fallback so the page still lists models when the JSON endpoint is
*   unreachable.
* @returns the complete self-contained dashboard document.
*/
function renderUsageDashboard(builtinPricing) {
	return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Token 用量统计</title>
<style>
  :root {
    color-scheme: light dark;
    --bg: #f6f7f9;
    --panel: #ffffff;
    --text: #1c2333;
    --muted: #6b7280;
    --line: #e5e7eb;
    --accent: #2563eb;
    --green: #16a34a;
    --amber: #d97706;
    --purple: #7c3aed;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #111827;
      --panel: #1f2937;
      --text: #f9fafb;
      --muted: #9ca3af;
      --line: #374151;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--text);
    font: 14px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif;
      overflow-x: hidden;
  }
  header {
    position: sticky;
    top: 0;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 10px 18px;
    background: var(--panel);
    border-bottom: 1px solid var(--line);
    box-sizing: border-box;
    flex-wrap: nowrap;
  }
  header h1 {
    font-size: 15px;
    font-weight: 600;
    margin: 0;
    white-space: nowrap;
    flex-shrink: 0;
    line-height: 30px;
  }
  .controls {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-left: auto;
    flex-wrap: nowrap;
    flex-shrink: 1;
  }
  .controls label {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    color: var(--muted);
    white-space: nowrap;
    line-height: 30px;
  }
  select {
    border: 1px solid var(--line);
    background: var(--panel);
    color: var(--text);
    border-radius: 6px;
    height: 30px;
    padding: 0 6px;
    font: inherit;
    font-size: 12px;
    outline: none;
    box-sizing: border-box;
    cursor: pointer;
  }
  select:focus {
    border-color: var(--accent);
  }
  #model {
    max-width: 120px;
    text-overflow: ellipsis;
  }
  button {
    border: 1px solid var(--line);
    background: var(--panel);
    color: var(--text);
    border-radius: 6px;
    font: inherit;
    cursor: pointer;
  }
  @media (max-width: 680px) {
    header {
      flex-wrap: wrap;
      padding: 10px 14px;
    }
    .controls {
      flex-wrap: wrap;
      gap: 6px;
    }
    #model {
      max-width: 110px;
    }
  }
  main { padding: 20px 24px 32px; display: grid; gap: 16px; max-width: 1200px; margin: 0 auto; }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; }
  .card { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 16px; }
  .card h2 { margin: 0 0 12px; font-size: 15px; }
  .metric .label { color: var(--muted); font-size: 12px; }
  .metric .value { font-size: 26px; font-weight: 600; margin-top: 6px; }
  .metric .unit { color: var(--muted); font-size: 12px; margin-top: 2px; }
  .chart { min-height: 0; }
  .chart-tabs {
    display: flex;
    gap: 8px;
    margin: 0 0 12px;
    border-bottom: 1px solid var(--line);
  }
  .chart-tab {
    border: 0;
    border-bottom: 2px solid transparent;
    background: none;
    color: var(--muted);
    padding: 6px 10px;
    margin-bottom: -1px;
    border-radius: 0;
    font: inherit;
    cursor: pointer;
  }
  .chart-tab.active {
    color: var(--text);
    border-bottom-color: var(--accent);
    font-weight: 600;
  }
  .chart-panel[hidden] { display: none; }
  .chart svg { width: 100%; height: 230px; display: block; }
  .axis { stroke: var(--line); }
  .axis text { fill: var(--muted); font-size: 10px; }
  .bar { fill: var(--accent); }
  .bar:hover { opacity: 0.85; }
  .chart-wrap { position: relative; }
  .chart-tip {
    position: absolute;
    pointer-events: none;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 12px;
    box-shadow: 0 6px 18px rgba(0,0,0,0.14);
    opacity: 0;
    transition: opacity 0.1s;
    z-index: 5;
    white-space: nowrap;
  }
  .chart-tip .tip-head { font-weight: 600; margin-bottom: 6px; display: flex; gap: 16px; justify-content: space-between; }
  .chart-tip .tip-row { display: flex; align-items: center; gap: 6px; margin-top: 3px; }
  .chart-tip .dot { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }
  .chart-tip .tip-val { margin-left: auto; padding-left: 16px; font-variant-numeric: tabular-nums; }

  .empty { color: var(--muted); padding: 40px 0; text-align: center; }
  .bars { display: grid; gap: 10px; }
  .bar-row { display: grid; grid-template-columns: 130px 1fr 175px; gap: 10px; align-items: center; font-size: 12px; }
  .bar-row .name { color: var(--muted); }
  .bar-track { height: 14px; background: var(--line); border-radius: 7px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 7px; }
  .bar-row .value { text-align: right; font-variant-numeric: tabular-nums; }
  .bar-row .pct { color: var(--muted); font-size: 11px; margin-left: 10px; white-space: nowrap; }
  .tableWrap { width: 100%; overflow: hidden; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; table-layout: fixed; }
  th, td { text-align: right; padding: 6px 8px; border-bottom: 1px solid var(--line); overflow-wrap: anywhere; word-break: break-word; }
  th:first-child, td:first-child { text-align: left; }
  th { color: var(--muted); font-weight: 500; }
  tbody tr:hover { background: color-mix(in srgb, var(--accent) 6%, transparent); }
  .foot { color: var(--muted); font-size: 12px; }

  /* 统一 Header 与操作按钮 */
  .ui-icon {
    width: 14px !important;
    height: 14px !important;
    min-width: 14px;
    min-height: 14px;
    max-width: 14px;
    max-height: 14px;
    display: inline-block !important;
    vertical-align: middle;
    flex-shrink: 0;
  }
  .modal-title-row .ui-icon {
    width: 18px !important;
    height: 18px !important;
    min-width: 18px;
    min-height: 18px;
    max-width: 18px;
    max-height: 18px;
  }
  .btn-text .ui-icon, .btn-icon-danger .ui-icon, .tier-badge .ui-icon {
    width: 12px !important;
    height: 12px !important;
    min-width: 12px;
    min-height: 12px;
    max-width: 12px;
    max-height: 12px;
  }

  .btn-header {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    height: 30px;
    padding: 0 9px;
    font-size: 12px;
    font-weight: 500;
    border: 1px solid var(--line);
    background: var(--panel);
    color: var(--text);
    border-radius: 6px;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s ease;
  }
  .btn-header:hover {
    border-color: var(--accent);
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 6%, var(--panel));
  }
  .btn-header .ui-icon {
    transition: transform 0.25s ease;
  }
  #refresh:hover .ui-icon {
    transform: rotate(180deg);
  }

  .btn-secondary {
    background: var(--panel);
    color: var(--text);
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 6px 14px;
    font-size: 13px;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s ease;
  }
  .btn-secondary:hover {
    background: color-mix(in srgb, var(--line) 30%, transparent);
  }

  .btn-text {
    background: none;
    border: none;
    color: var(--accent);
    padding: 4px 8px;
    font-size: 12px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    font-weight: 500;
    border-radius: 4px;
    transition: background 0.15s;
  }
  .btn-text:hover {
    background: color-mix(in srgb, var(--accent) 10%, transparent);
  }

  .btn-icon-danger {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: none;
    border: 1px solid transparent;
    color: var(--muted);
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .btn-icon-danger:hover {
    color: #ef4444;
    border-color: rgba(239, 68, 68, 0.25);
    background: rgba(239, 68, 68, 0.08);
  }
  .btn-icon-restore {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--muted);
    border: 1px solid var(--line);
    background: transparent;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .btn-icon-restore:hover {
    color: var(--accent);
    border-color: color-mix(in srgb, var(--accent) 35%, transparent);
    background: color-mix(in srgb, var(--accent) 8%, transparent);
  }

  /* 模型条目的来源标记：内置默认 / 已覆盖 / 自定义 */
  .model-badge {
    display: inline-flex;
    align-items: center;
    padding: 1px 7px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 500;
    white-space: nowrap;
  }
  .model-badge-builtin {
    color: var(--muted);
    background: color-mix(in srgb, var(--muted) 12%, transparent);
    border: 1px solid var(--line);
  }
  .model-badge-override {
    color: #d97706;
    background: rgba(217, 119, 6, 0.12);
    border: 1px solid rgba(217, 119, 6, 0.28);
  }
  .model-card-title {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .btn-save {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--accent);
    color: #ffffff;
    border: 1px solid transparent;
    padding: 7px 18px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(37, 99, 235, 0.3);
    transition: all 0.15s ease;
  }
  .btn-save:hover {
    filter: brightness(1.1);
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
  }

  /* 模态框 Modal */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 999;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(6px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }
  .modal-backdrop[hidden] { display: none !important; }
  .modal-dialog {
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 12px;
    width: 100%;
    max-width: 780px;
    max-height: 88vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 48px rgba(0, 0, 0, 0.4);
    animation: modalIn 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  }
  @keyframes modalIn {
    from { opacity: 0; transform: scale(0.96) translateY(8px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
  .modal-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 16px 22px;
    border-bottom: 1px solid var(--line);
  }
  .modal-title-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .modal-title-row h2 { margin: 0; font-size: 16px; font-weight: 600; }
  .modal-subtitle {
    margin: 4px 0 0;
    font-size: 12px;
    color: var(--muted);
  }
  .modal-close {
    background: none;
    border: none;
    font-size: 20px;
    line-height: 1;
    color: var(--muted);
    padding: 4px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .modal-close:hover { color: var(--text); background: var(--line); }
  .modal-body {
    padding: 20px 22px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .modal-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 22px;
    border-top: 1px solid var(--line);
    background: color-mix(in srgb, var(--panel) 92%, var(--bg));
    border-bottom-left-radius: 12px;
    border-bottom-right-radius: 12px;
  }

  /* 时段与模型配置内部组件 */
  .schedule-box {
    background: color-mix(in srgb, var(--bg) 60%, transparent);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 14px 16px;
  }
  .schedule-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    font-size: 13px;
    font-weight: 500;
  }
  .schedule-title {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .interval-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    font-size: 13px;
  }
  .time-input {
    width: 76px;
    text-align: center;
    padding: 4px 6px;
    font-variant-numeric: tabular-nums;
    border: 1px solid var(--line);
    border-radius: 4px;
    background: var(--panel);
    color: var(--text);
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .time-input.input-invalid,
  .model-name-input.input-invalid {
    border-color: #ef4444 !important;
    box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.25) !important;
    background-color: rgba(239, 68, 68, 0.05) !important;
  }

  .model-card {
    background: color-mix(in srgb, var(--bg) 50%, transparent);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 14px 16px;
    margin-bottom: 12px;
  }
  .pricing-filter-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
  }
  .pricing-filter-row .model-search-input {
    flex: 1;
    min-width: 0;
    padding: 6px 10px;
    font-size: 13px;
    border: 1px solid var(--line);
    border-radius: 5px;
    background: var(--panel);
    color: var(--text);
  }
  .pricing-count {
    flex: none;
    font-size: 12px;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }
  .pricing-hint {
    margin: 0 0 12px;
    font-size: 12px;
    line-height: 1.6;
    color: var(--muted);
  }
  .pricing-hint code {
    font-size: 11px;
    padding: 1px 4px;
    border-radius: 3px;
    background: color-mix(in srgb, var(--bg) 70%, transparent);
    border: 1px solid var(--line);
  }

  .model-card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    gap: 12px;
    flex-wrap: wrap;
  }
  .model-name-input {
    font-weight: 600;
    font-size: 13px;
    width: 220px;
    padding: 5px 10px;
    border: 1px solid var(--line);
    border-radius: 5px;
    background: var(--panel);
    color: var(--text);
  }
  
  /* 精致分段胶囊控制 Segmented Control */
  .segmented-control {
    display: inline-flex;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 2px;
    gap: 2px;
  }
  .segmented-control label {
    display: inline-flex;
    align-items: center;
    cursor: pointer;
    margin: 0;
  }
  .segmented-control input[type="radio"] {
    display: none;
  }
  .segmented-control .seg-btn {
    padding: 3px 10px;
    font-size: 12px;
    color: var(--muted);
    border-radius: 4px;
    transition: all 0.15s;
    user-select: none;
  }
  .segmented-control input[type="radio"]:checked + .seg-btn {
    background: var(--accent);
    color: #ffffff;
    font-weight: 500;
  }

  .pricing-grids-container {
    display: grid;
    gap: 12px;
  }
  .pricing-grids-container.is-split {
    grid-template-columns: 1fr 1fr;
  }
  @media (max-width: 640px) {
    .pricing-grids-container.is-split { grid-template-columns: 1fr; }
  }
  .tier-block {
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 12px 14px;
  }
  .tier-block-title {
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
  }

  /* 标签徽标 */
  .tier-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
  }
  .tier-badge-peak {
    background: rgba(245, 158, 11, 0.12);
    color: #f59e0b;
    border: 1px solid rgba(245, 158, 11, 0.25);
  }
  .tier-badge-offpeak {
    background: rgba(139, 92, 246, 0.12);
    color: #8b5cf6;
    border: 1px solid rgba(139, 92, 246, 0.25);
  }
  .tier-badge-flat {
    background: rgba(59, 130, 246, 0.12);
    color: #3b82f6;
    border: 1px solid rgba(59, 130, 246, 0.25);
  }

  .field-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
  .price-field {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .price-field label {
    font-size: 11px;
    color: var(--muted);
  }
  .price-field input {
    width: 100%;
    padding: 5px 8px;
    font-variant-numeric: tabular-nums;
    border: 1px solid var(--line);
    border-radius: 4px;
    background: var(--bg);
    color: var(--text);
  }

  /* Toast 提示 */
  .toast {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: #10b981;
    color: #ffffff;
    padding: 8px 18px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 500;
    box-shadow: 0 4px 14px rgba(0,0,0,0.25);
    z-index: 1000;
    animation: toastFade 0.2s ease-out;
  }
  .toast.error { background: #ef4444; }
  .toast[hidden] { display: none !important; }
</style>
</head>
<body>
<header>
  <h1>Token 用量统计</h1>
  <div class="controls">
    <label>范围
      <select id="range">
        <option value="today">今天</option>
        <option value="3d">近 3 天</option>
        <option value="7d">近 7 天</option>
        <option value="30d">近 30 天</option>
        <option value="all">全部</option>
      </select>
    </label>
    <label>粒度
      <select id="granularity">
        <option value="hour">按小时</option>
        <option value="day">按天</option>
      </select>
    </label>
    <label>模型
      <select id="model"><option value="">全部</option></select>
    </label>
    <button id="refresh" class="btn-header" type="button" title="刷新数据">
      <svg class="ui-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
        <path d="M3 3v5h5"/>
        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
        <path d="M16 21h5v-5"/>
      </svg>
      <span>刷新</span>
    </button>
    <button id="openPricingModal" class="btn-header" type="button" title="配置模型价格与峰谷时段">
      <svg class="ui-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
      <span>价格配置</span>
    </button>
  </div>
</header>
<main>
  <section class="cards">
    <article class="card metric">
      <div class="label">消费金额</div>
      <div class="value" id="cost">--</div>
      <div class="unit" id="currency"></div>
    </article>
    <article class="card metric">
      <div class="label">API 请求次数</div>
      <div class="value" id="requests">--</div>
      <div class="unit">次</div>
    </article>
    <article class="card metric">
      <div class="label">Tokens</div>
      <div class="value" id="totalTokens">--</div>
      <div class="unit">输入 + 输出 + 缓存</div>
    </article>
    <article class="card metric">
      <div class="label">输出 Tokens</div>
      <div class="value" id="outputTokens">--</div>
      <div class="unit">输出</div>
    </article>
  </section>

  <section class="card chart">
    <div class="chart-tabs" role="tablist" aria-label="趋势图">
      <button id="tabTokens" class="chart-tab active" type="button" role="tab" aria-selected="true" aria-controls="series">Tokens 趋势</button>
      <button id="tabCost" class="chart-tab" type="button" role="tab" aria-selected="false" aria-controls="costChart">消费金额（<span id="costCurrency" style="text-transform:uppercase">CNY</span>）</button>
    </div>
    <div id="series" class="chart-panel" role="tabpanel" aria-labelledby="tabTokens"></div>
    <div id="costChart" class="chart-panel" role="tabpanel" aria-labelledby="tabCost" hidden></div>
  </section>

  <section class="card">
    <h2>Token 构成</h2>
    <div class="bars" id="breakdown"></div>
  </section>

  <section class="card">
    <h2>按模型统计</h2>
    <div class="tableWrap">
        <table>
      <thead>
        <tr>
          <th>模型</th>
          <th>Provider</th>
          <th>请求数</th>
          <th>输入（未命中）</th>
          <th>输入（命中缓存）</th>
          <th>输出</th>
          <th>Tokens</th>
          <th>成本</th>
        </tr>
      </thead>
      <tbody id="modelRows"></tbody>
    </table>
      </div>
  </section>

  <section class="card">
    <h2>消耗 TOP 5 对话</h2>
    <div class="tableWrap">
        <table>
      <thead>
        <tr>
          <th>会话</th>
          <th>最后请求</th>
          <th>请求数</th>
          <th>输入（未命中）</th>
          <th>输入（命中缓存）</th>
          <th>输出</th>
          <th>Tokens</th>
          <th>成本</th>
        </tr>
      </thead>
      <tbody id="topSessions"></tbody>
    </table>
      </div>
  </section>

  <p class="foot">数据来自当前进程内的 <code>ctx.tokenUsageStats</code>，页面自动每 10 秒刷新一次。成本按插件内置价目表计算，未收录的模型显示「未配置定价」。</p>
</main>

<div id="pricingModal" class="modal-backdrop" hidden>
  <div class="modal-dialog">
    <div class="modal-header">
      <div class="modal-title-group">
        <div class="modal-title-row">
          <svg class="ui-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <h2>模型价格策略配置</h2>
        </div>
        <p class="modal-subtitle">自定义各模型的 Token 计费单价及高峰/闲时分时规则</p>
      </div>
      <button type="button" class="modal-close" id="closePricingModal" aria-label="关闭">&times;</button>
    </div>
    <div class="modal-body">
      <div style="display:flex;align-items:center;gap:16px;">
        <span style="font-weight:600;font-size:13px;">计费货币：</span>
        <div class="segmented-control">
          <label><input type="radio" name="pricingCurrency" value="CNY" checked><span class="seg-btn">人民币 (CNY / ¥)</span></label>
          <label><input type="radio" name="pricingCurrency" value="USD"><span class="seg-btn">美元 (USD / $)</span></label>
        </div>
      </div>

      <div class="schedule-box">
        <div class="schedule-head">
          <div class="schedule-title">
            <svg class="ui-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span>峰谷分时时段规则（仅对开启分时计价的模型生效）</span>
          </div>
          <label style="cursor:pointer;font-weight:normal;display:inline-flex;align-items:center;gap:4px;font-size:12px;">
            <input type="checkbox" id="weekendOffpeak" checked> 周末全天视为闲时
          </label>
        </div>
        <div id="intervalsList"></div>
        <button type="button" class="btn-text" id="addIntervalBtn" style="margin-top:6px;">
          <svg class="ui-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>添加高峰时段</span>
        </button>
      </div>

      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:10px;flex-wrap:wrap;">
          <h3 style="margin:0;font-size:13px;font-weight:600;">模型计费配置（每 1,000,000 Tokens）</h3>
          <button type="button" class="btn-text" id="addModelBtn">
            <svg class="ui-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>添加模型</span>
          </button>
        </div>
        <div class="pricing-filter-row">
          <input type="search" id="modelSearch" class="model-search-input" placeholder="搜索模型名称，如 claude / deepseek / glm">
          <span class="pricing-count" id="modelCount"></span>
        </div>
        <p class="pricing-hint">
          插件内置默认价目表，未修改的模型直接按内置价计费，无需配置。带「已覆盖」标记的条目会随保存写入 <code>token-usage-pricing.json</code>，并覆盖内置价；「恢复默认」可撤销覆盖。
        </p>
        <div id="modelList"></div>
      </div>
    </div>
    <div class="modal-footer">
      <button type="button" id="resetDefaultBtn" class="btn-secondary">恢复官方默认</button>
      <div style="display:flex;gap:8px;">
        <button type="button" id="cancelPricingBtn" class="btn-secondary">取消</button>
        <button type="button" id="savePricingBtn" class="btn-save">
          <svg class="ui-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>保存并立即生效</span>
        </button>
      </div>
    </div>
  </div>
</div>
<div id="toast" class="toast" hidden></div>

<script>
(function () {
  'use strict'
  try {
    if (window.self !== window.top) {
      document.body.classList.add('is-embedded')
    }
  } catch (_) {
    document.body.classList.add('is-embedded')
  }
  function $(id) { return document.getElementById(id) }
  function esc(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
    })
  }
  function number(value) { return Number(value || 0).toLocaleString('en-US') }
  function costText(snapshot, totals) {
    if (totals.cost === undefined) return '未配置定价'
    var prefix = snapshot.currency === 'CNY' ? '¥' : ''
    return prefix + Number(totals.cost).toFixed(2) + (snapshot.currency ? ' ' + esc(snapshot.currency) : '')
  }
  function bucketLabel(startTime, granularity) {
    var d = new Date(startTime)
    if (granularity === 'month') {
      return (d.getMonth() + 1) + '月'
    }
    if (granularity === 'week') {
      return (d.getMonth() + 1) + '/' + d.getDate()
    }
    if (granularity === 'day') {
      return (d.getMonth() + 1) + '/' + d.getDate()
    }
    return String(d.getHours()).padStart(2, '0') + ':00'
  }
  function tooltipHead(p, granularity) {
    var d = new Date(p.startTime)
    if (granularity === 'month') {
      return d.getFullYear() + '年' + (d.getMonth() + 1) + '月'
    }
    if (granularity === 'week') {
      var endD = new Date(p.endTime - 1)
      return (d.getMonth() + 1) + '/' + d.getDate() + ' ~ ' + (endD.getMonth() + 1) + '/' + endD.getDate() + ' (周)'
    }
    var start = bucketLabel(p.startTime, granularity)
    if (granularity === 'day') return start
    return start + ' ~ ' + bucketLabel(p.endTime, granularity)
  }
  function renderBreakdown(totals) {
    var rows = [
      ['输入（命中缓存）', totals.cacheReadTokens],
      ['输入（未命中缓存）', totals.uncachedInputTokens],
      ['输出', totals.outputTokens],
    ]
    var total = rows.reduce(function (sum, row) { return sum + row[1] }, 0)
    var max = Math.max(1, total)
    $('breakdown').innerHTML = rows.map(function (row) {
      var label = row[0]
      var value = row[1]
      var pct = total > 0 ? value / max * 100 : 0
      var width = value > 0 ? Math.max(0.8, pct) : 0
      return '<div class="bar-row">'
        + '<div class="name">' + esc(label) + '</div>'
        + '<div class="bar-track"><div class="bar-fill" style="width:' + width + '%;background:' + tokenColor(label) + '"></div></div>'
        + '<div class="value">' + number(value) + '<span class="pct">' + pct.toFixed(1) + '%</span></div>'
        + '</div>'
    }).join('')
  }
  function tokenColor(label) {
    var palette = { '输入（命中缓存）': '#7cb8e8', '输入（未命中缓存）': '#3b82f6', '输出': '#1d4ed8' }
    return palette[label] || '#3b82f6'
  }
  function renderSeries(series, granularity) {
    var host = $('series')
    if (!series || series.length === 0) {
      host.innerHTML = '<div class="empty">当前范围暂无数据</div>'
      return
    }
    var width = 900
    var height = 220
    var padX = 44
    var padY = 22
    var max = Math.max.apply(null, series.map(function (point) { return point.totals.totalTokens }))
    if (max <= 0) max = 1
    var step = (width - padX * 2) / Math.max(1, series.length - 1)
    var points = series.map(function (point, index) {
      var x = padX + step * index
      var y = height - padY - point.totals.totalTokens / max * (height - padY * 2)
      return { x: x, y: y, point: point }
    })
    var barWidth = Math.min(step * 0.72, 48)
    var bars = points.map(function (entry, index) {
      var barHeight = height - padY - entry.y
      var x = entry.x - barWidth / 2
      return '<rect class="bar" data-index="' + index + '" x="' + x.toFixed(1) + '" y="' + entry.y.toFixed(1) + '" width="' + barWidth.toFixed(1) + '" height="' + Math.max(0.5, barHeight).toFixed(1) + '" rx="2"></rect>'
    }).join('')
    var labelEvery = Math.max(1, Math.ceil(points.length / 12))
    var labels = points.filter(function (_, index) { return index % labelEvery === 0 }).map(function (entry) {
      return '<text x="' + entry.x.toFixed(1) + '" y="' + (height - 5) + '" text-anchor="middle" fill="var(--muted)" font-size="10">'
        + esc(bucketLabel(entry.point.startTime, granularity)) + '</text>'
    }).join('')
    host.innerHTML = '<div class="chart-wrap">'
      + '<svg viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="Tokens 趋势">'
      + '<line class="axis" x1="' + padX + '" y1="' + (height - padY) + '" x2="' + (width - padX) + '" y2="' + (height - padY) + '"></line>'
      + bars + labels + '</svg>'
      + '<div class="chart-tip" id="seriesTip"></div></div>'
    var wrap = host.querySelector('.chart-wrap')
    var tip = $('seriesTip')
    function showTip(index) {
      var p = series[index]
      var t = p.totals
      var head = tooltipHead(p, granularity)
      var rows = [
        ['输入（命中缓存）', t.cacheReadTokens],
        ['输入（未命中缓存）', t.uncachedInputTokens],
        ['输出', t.outputTokens],
      ].filter(function (row) { return row[1] > 0 }).map(function (row) {
        return '<div class="tip-row"><span class="dot" style="background:' + tokenColor(row[0]) + '"></span>'
          + esc(row[0]) + '<span class="tip-val">' + number(row[1]) + '</span></div>'
      }).join('')
      tip.innerHTML = '<div class="tip-head"><span>' + esc(head) + '</span><span>' + number(t.totalTokens) + '</span></div>' + rows
      tip.style.opacity = '1'
    }
    Array.prototype.forEach.call(host.querySelectorAll('rect.bar'), function (rect) {
      rect.addEventListener('mouseover', function () { showTip(Number(rect.getAttribute('data-index'))) })
      rect.addEventListener('mouseout', function () { tip.style.opacity = '0' })
      rect.addEventListener('mousemove', function (e) {
        var r = wrap.getBoundingClientRect()
        tip.style.left = (Math.min(e.clientX - r.left + 12, r.width - tip.offsetWidth - 8)) + 'px'
        tip.style.top = (e.clientY - r.top - tip.offsetHeight - 10) + 'px'
      })
    })
  }
  function renderModels(snapshot) {
    var select = $('model')
    var current = select.value
    var options = '<option value="">全部</option>'
    snapshot.models.forEach(function (entry) {
      var sel = entry.model === current ? ' selected' : ''
      options += '<option value="' + esc(entry.model) + '"' + sel + '>' + esc(entry.model) + '</option>'
    })
    select.innerHTML = options

    var host = $('modelRows')
    if (!snapshot.models || snapshot.models.length === 0) {
      host.innerHTML = '<tr><td colspan="8" class="empty">暂无数据</td></tr>'
      return
    }
    host.innerHTML = snapshot.models.map(function (entry) {
      var t = entry.totals
      return '<tr>'
        + '<td style="text-align:left">' + esc(entry.model) + '</td>'
        + '<td style="text-align:left">' + esc(entry.provider) + '</td>'
        + '<td>' + number(t.requestCount) + '</td>'
        + '<td>' + number(t.uncachedInputTokens) + '</td>'
        + '<td>' + number(t.cacheReadTokens) + '</td>'
        + '<td>' + number(t.outputTokens) + '</td>'
        + '<td>' + number(t.totalTokens) + '</td>'
        + '<td>' + esc(costText(snapshot, t)) + '</td>'
        + '</tr>'
    }).join('')
  }
  function modelColor(index) {
    var palette = [
      '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6',
      '#06b6d4', '#84cc16', '#f97316', '#a855f7', '#14b8a6',
    ]
    return palette[index % palette.length]
  }
  function renderCostChart(series, granularity, snapshot) {
    var host = $('costChart')
    $('costCurrency').textContent = snapshot.currency || 'CNY'
    if (!series || series.length === 0) {
      host.innerHTML = '<div class="empty">当前范围暂无数据</div>'
      return
    }
    var hasCost = series.some(function (p) { return p.totals.cost !== undefined && p.totals.cost > 0 })
    if (!hasCost) {
      host.innerHTML = '<div class="empty">当前范围未产生费用（或未配置模型定价）</div>'
      return
    }
    var width = 900
    var height = 220
    var padX = 44
    var padY = 22
    var modelColorMap = {}
    var colorIndex = 0
    series.forEach(function (p) {
      (p.models || []).forEach(function (m) {
        if (modelColorMap[m.model] === undefined) {
          modelColorMap[m.model] = modelColor(colorIndex++)
        }
      })
    })
    var max = Math.max.apply(null, series.map(function (p) { return p.totals.cost || 0 }))
    if (max <= 0) max = 1
    var step = (width - padX * 2) / Math.max(1, series.length - 1)
    var barWidth = Math.min(step * 0.72, 48)
    var bars = series.map(function (point, index) {
      var x = padX + step * index - barWidth / 2
      var stackY = height - padY
      var segments = (point.models || []).filter(function (m) { return m.cost > 0 }).map(function (m) {
        var segHeight = (m.cost / max) * (height - padY * 2)
        stackY -= segHeight
        return '<rect class="bar" data-index="' + index + '" x="' + x.toFixed(1) + '" y="' + stackY.toFixed(1) + '" width="' + barWidth.toFixed(1) + '" height="' + Math.max(0.5, segHeight).toFixed(1) + '" fill="' + modelColorMap[m.model] + '" rx="1"></rect>'
      }).join('')
      return segments
    }).join('')
    var labelEvery = Math.max(1, Math.ceil(series.length / 12))
    var labels = series.filter(function (_, index) { return index % labelEvery === 0 }).map(function (p, index) {
      var origIndex = index * labelEvery
      var x = padX + step * origIndex
      return '<text x="' + x.toFixed(1) + '" y="' + (height - 5) + '" text-anchor="middle" fill="var(--muted)" font-size="10">'
        + esc(bucketLabel(p.startTime, granularity)) + '</text>'
    }).join('')
    host.innerHTML = '<div class="chart-wrap">'
      + '<svg viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="消费金额趋势">'
      + '<line class="axis" x1="' + padX + '" y1="' + (height - padY) + '" x2="' + (width - padX) + '" y2="' + (height - padY) + '"></line>'
      + bars + labels + '</svg>'
      + '<div class="chart-tip" id="costTip"></div></div>'
    var wrap = host.querySelector('.chart-wrap')
    var tip = $('costTip')
    var prefix = snapshot.currency === 'CNY' ? '¥' : ''
    function showTip(index) {
      var p = series[index]
      var head = tooltipHead(p, granularity)
      var total = p.totals.cost || 0
      var rows = (p.models || []).filter(function (m) { return m.cost > 0 }).map(function (m) {
        return '<div class="tip-row"><span class="dot" style="background:' + modelColorMap[m.model] + '"></span>'
          + esc(m.model) + '<span class="tip-val">' + prefix + m.cost.toFixed(4) + '</span></div>'
      }).join('')
      tip.innerHTML = '<div class="tip-head"><span>' + esc(head) + '</span><span>' + prefix + Number(total).toFixed(4) + '</span></div>' + rows
      tip.style.opacity = '1'
    }
    Array.prototype.forEach.call(host.querySelectorAll('rect.bar'), function (rect) {
      rect.addEventListener('mouseover', function () { showTip(Number(rect.getAttribute('data-index'))) })
      rect.addEventListener('mouseout', function () { tip.style.opacity = '0' })
      rect.addEventListener('mousemove', function (e) {
        var r = wrap.getBoundingClientRect()
        tip.style.left = (Math.min(e.clientX - r.left + 12, r.width - tip.offsetWidth - 8)) + 'px'
        tip.style.top = (e.clientY - r.top - tip.offsetHeight - 10) + 'px'
      })
    })
  }
  function adaptSeriesForDisplay(rawSeries, currentGranularity, range) {
    if (!rawSeries || rawSeries.length <= 30 || range !== 'all' || currentGranularity !== 'day') {
      return { series: rawSeries || [], granularity: currentGranularity }
    }
    if (rawSeries.length <= 180) {
      return { series: aggregateSeriesByWeek(rawSeries), granularity: 'week' }
    }
    return { series: aggregateSeriesByMonth(rawSeries), granularity: 'month' }
  }

  function aggregateSeriesByWeek(series) {
    var groups = new Map()
    for (var i = 0; i < series.length; i++) {
      var p = series[i]
      var d = new Date(p.startTime)
      d.setHours(0, 0, 0, 0)
      var day = d.getDay()
      var diff = (day === 0 ? -6 : 1) - day
      d.setDate(d.getDate() + diff)
      var weekStart = d.getTime()
      var group = groups.get(weekStart)
      if (!group) {
        group = {
          startTime: weekStart,
          endTime: weekStart + 7 * 86400000,
          totals: {
            requestCount: 0,
            uncachedInputTokens: 0,
            cacheReadTokens: 0,
            cacheWriteTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
          },
          modelsMap: {},
        }
        groups.set(weekStart, group)
      }
      var gt = group.totals
      var pt = p.totals
      gt.requestCount += pt.requestCount || 0
      gt.uncachedInputTokens += pt.uncachedInputTokens || 0
      gt.cacheReadTokens += pt.cacheReadTokens || 0
      gt.cacheWriteTokens += pt.cacheWriteTokens || 0
      gt.outputTokens += pt.outputTokens || 0
      gt.totalTokens += pt.totalTokens || 0
      if (pt.cost !== undefined) {
        gt.cost = (gt.cost || 0) + pt.cost
      }
      if (p.models) {
        for (var j = 0; j < p.models.length; j++) {
          var m = p.models[j]
          group.modelsMap[m.model] = (group.modelsMap[m.model] || 0) + (m.cost || 0)
        }
      }
    }
    var result = []
    groups.forEach(function (group) {
      var models = []
      for (var modelName in group.modelsMap) {
        models.push({ model: modelName, cost: group.modelsMap[modelName] })
      }
      result.push({
        startTime: group.startTime,
        endTime: group.endTime,
        totals: group.totals,
        models: models,
      })
    })
    result.sort(function (a, b) { return a.startTime - b.startTime })
    return result
  }

  function aggregateSeriesByMonth(series) {
    var groups = new Map()
    for (var i = 0; i < series.length; i++) {
      var p = series[i]
      var d = new Date(p.startTime)
      var monthStart = new Date(d.getFullYear(), d.getMonth(), 1).getTime()
      var monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime()
      var group = groups.get(monthStart)
      if (!group) {
        group = {
          startTime: monthStart,
          endTime: monthEnd,
          totals: {
            requestCount: 0,
            uncachedInputTokens: 0,
            cacheReadTokens: 0,
            cacheWriteTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
          },
          modelsMap: {},
        }
        groups.set(monthStart, group)
      }
      var gt = group.totals
      var pt = p.totals
      gt.requestCount += pt.requestCount || 0
      gt.uncachedInputTokens += pt.uncachedInputTokens || 0
      gt.cacheReadTokens += pt.cacheReadTokens || 0
      gt.cacheWriteTokens += pt.cacheWriteTokens || 0
      gt.outputTokens += pt.outputTokens || 0
      gt.totalTokens += pt.totalTokens || 0
      if (pt.cost !== undefined) {
        gt.cost = (gt.cost || 0) + pt.cost
      }
      if (p.models) {
        for (var j = 0; j < p.models.length; j++) {
          var m = p.models[j]
          group.modelsMap[m.model] = (group.modelsMap[m.model] || 0) + (m.cost || 0)
        }
      }
    }
    var result = []
    groups.forEach(function (group) {
      var models = []
      for (var modelName in group.modelsMap) {
        models.push({ model: modelName, cost: group.modelsMap[modelName] })
      }
      result.push({
        startTime: group.startTime,
        endTime: group.endTime,
        totals: group.totals,
        models: models,
      })
    })
    result.sort(function (a, b) { return a.startTime - b.startTime })
    return result
  }

  function render(snapshot) {
    $('cost').textContent = costText(snapshot, snapshot.totals)
    $('currency').textContent = snapshot.currency || ''
    $('requests').textContent = number(snapshot.totals.requestCount)
    $('totalTokens').textContent = number(snapshot.totals.totalTokens)
    $('outputTokens').textContent = number(snapshot.totals.outputTokens)
    renderBreakdown(snapshot.totals)
    var range = $('range').value
    var adapted = adaptSeriesForDisplay(snapshot.series, $('granularity').value, range)
    renderSeries(adapted.series, adapted.granularity)
    renderCostChart(adapted.series, adapted.granularity, snapshot)
    renderModels(snapshot)
    renderTopSessions(snapshot)
  }
  function renderTopSessions(snapshot) {
    var host = $('topSessions')
    var rows = snapshot.topSessions || []
    if (rows.length === 0) {
      host.innerHTML = '<tr><td colspan="8" class="empty">暂无对话数据</td></tr>'
      return
    }
    host.innerHTML = rows.map(function (entry) {
      var t = entry.totals
      var label = entry.title ? entry.title : ('会话 ' + String(entry.id).replace(/^session-/, '').slice(0, 8))
      var when = entry.lastTime
        ? new Date(entry.lastTime).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : ''
      return '<tr>'
        + '<td style="text-align:left; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="' + esc(label) + '">' + esc(label) + '</td>'
        + '<td>' + esc(when) + '</td>'
        + '<td>' + number(t.requestCount) + '</td>'
        + '<td>' + number(t.uncachedInputTokens) + '</td>'
        + '<td>' + number(t.cacheReadTokens) + '</td>'
        + '<td>' + number(t.outputTokens) + '</td>'
        + '<td>' + number(t.totalTokens) + '</td>'
        + '<td>' + esc(costText(snapshot, t)) + '</td>'
        + '</tr>'
    }).join('')
  }
  function initChartTabs() {
    var tabs = [
      { tab: $('tabTokens'), panel: $('series') },
      { tab: $('tabCost'), panel: $('costChart') },
    ]
    function select(tabId) {
      tabs.forEach(function (entry) {
        var active = entry.tab.id === tabId
        entry.tab.classList.toggle('active', active)
        entry.tab.setAttribute('aria-selected', active ? 'true' : 'false')
        entry.panel.hidden = !active
      })
    }
    tabs.forEach(function (entry) {
      entry.tab.addEventListener('click', function () { select(entry.tab.id) })
    })
    select('tabTokens')
  }
  function rangeParams() {
    var range = $('range').value
    if (range === 'all') return new URLSearchParams()
    var from = new Date()
    from.setHours(0, 0, 0, 0)
    if (range === '3d') from.setDate(from.getDate() - 2)
    if (range === '7d') from.setDate(from.getDate() - 6)
    if (range === '30d') from.setDate(from.getDate() - 29)
    return new URLSearchParams({ from: String(from.getTime()) })
  }
  var rangeForcedDay = false
  function syncGranularity() {
    var g = $('granularity')
    var range = $('range').value
    var hourOpt = g.querySelector('option[value="hour"]')
    if (range === 'all' || range === '7d' || range === '30d') {
      rangeForcedDay = true
      if (hourOpt) hourOpt.disabled = true
      g.value = 'day'
      g.disabled = true
    } else {
      if (hourOpt) hourOpt.disabled = false
      g.disabled = false
      if (rangeForcedDay) {
        g.value = 'hour'
        rangeForcedDay = false
      }
    }
  }
  async function load() {
    try {
      syncGranularity()
      var granularity = $('granularity').value
      var model = $('model').value
      var params = rangeParams()
      params.set('granularity', granularity)
      if (model) params.set('model', model)
      var response = await fetch('/api/token-usage-stats?' + params.toString(), { cache: 'no-store' })
      if (!response.ok) throw new Error('HTTP ' + response.status)
      render(await response.json())
    } catch (error) {
      console.error(error)
    }
  }

  // 内置价目表随页面下发，兜底 JSON 接口不可用时编辑器仍能列出全部模型
  var builtinPricingFallback = ${JSON.stringify(builtinPricing).replace(/</g, "\\u003c")}

  // 价格配置 Modal 控制逻辑
  var defaultPricingConfig = {
    currency: 'CNY',
    peakSchedule: {
      weekendOffpeak: true,
      intervals: [
        { start: '09:00', end: '12:00' },
        { start: '14:00', end: '18:00' }
      ]
    },
    pricing: builtinPricingFallback
  }

  /** 内置价目表：判断「已覆盖」与「恢复默认」的基准。 */
  var builtinPricing = builtinPricingFallback

  /** 当前编辑中的完整价目表（内置 + 用户覆盖），按模型名索引。 */
  var currentPricing = {}

  /** 数值比较：缺省字段等价于 0，与宿主的判定保持一致。 */
  function sameTier(a, b) {
    var keys = ['uncachedInputPerMillion', 'cacheReadPerMillion', 'cacheWritePerMillion', 'outputPerMillion']
    for (var i = 0; i < keys.length; i++) {
      if ((Number(a && a[keys[i]]) || 0) !== (Number(b && b[keys[i]]) || 0)) return false
    }
    return true
  }

  function samePricing(a, b) {
    a = a || {}
    b = b || {}
    var tieredA = !!(a.peak || a.offpeak)
    var tieredB = !!(b.peak || b.offpeak)
    if (tieredA !== tieredB) return false
    if (tieredA && (!sameTier(a.peak, b.peak) || !sameTier(a.offpeak, b.offpeak))) return false
    return sameTier(a, b)
  }

  /** 「已覆盖」= 用户配置与内置价不同；不在内置表中的自建模型同样算已覆盖。 */
  function isOverridden(model) {
    var builtin = builtinPricing[model]
    var current = currentPricing[model]
    if (current === undefined) return false
    if (builtin === undefined) return true
    return !samePricing(current, builtin)
  }

  function showToast(msg, isError) {
    var t = $('toast')
    t.textContent = msg
    t.className = isError ? 'toast error' : 'toast'
    t.hidden = false
    clearTimeout(t._timer)
    t._timer = setTimeout(function () { t.hidden = true }, 2800)
  }

  function normalizeTime(str) {
    if (!str) return null
    var s = String(str).replace(/：/g, ':').trim().replace(/\s+/g, '')
    if (!s) return null
    var parts = s.split(':')
    if (parts.length === 1) {
      var h = parseInt(parts[0], 10)
      if (!isNaN(h) && h >= 0 && h <= 23) {
        return String(h).padStart(2, '0') + ':00'
      }
    } else if (parts.length === 2) {
      var h = parseInt(parts[0], 10)
      var m = parseInt(parts[1], 10)
      if (!isNaN(h) && h >= 0 && h <= 23 && !isNaN(m) && m >= 0 && m <= 59) {
        return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0')
      }
    }
    return null
  }

  function renderIntervals(intervals) {
    var container = $('intervalsList')
    if (!intervals || intervals.length === 0) {
      container.innerHTML = '<div style="color:var(--muted);font-size:12px;padding:6px 0;">当前未设置高峰时段（全天按闲时计费）</div>'
      return
    }
    container.innerHTML = intervals.map(function (it, idx) {
      return '<div class="interval-row" data-idx="' + idx + '">'
        + '<span style="font-size:12px;color:var(--muted);">时段 ' + (idx + 1) + '：</span>'
        + '<input type="text" class="time-input start-time" value="' + esc(it.start) + '" placeholder="09:00" maxlength="5">'
        + '<span style="color:var(--muted);font-size:12px;">至</span>'
        + '<input type="text" class="time-input end-time" value="' + esc(it.end) + '" placeholder="12:00" maxlength="5">'
        + '<button type="button" class="btn-icon-danger del-interval-btn" data-idx="' + idx + '" title="删除此时段">'
        + '  <svg class="ui-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
        + '    <polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>'
        + '  </svg>'
        + '  <span>删除</span>'
        + '</button>'
        + '</div>'
    }).join('')

    // 绑定删除按钮
    container.querySelectorAll('.del-interval-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.getAttribute('data-idx'), 10)
        var res = collectIntervals()
        res.intervals.splice(idx, 1)
        renderIntervals(res.intervals)
      })
    })

    // 绑定时段输入框失焦自动规范化
    container.querySelectorAll('.time-input').forEach(function (inp) {
      inp.addEventListener('blur', function () {
        var val = inp.value.trim()
        if (!val) {
          inp.classList.remove('input-invalid')
          return
        }
        var norm = normalizeTime(val)
        if (norm) {
          inp.value = norm
          inp.classList.remove('input-invalid')
        }
      })
      inp.addEventListener('input', function () {
        inp.classList.remove('input-invalid')
      })
    })
  }

  function collectIntervals() {
    var rows = document.querySelectorAll('#intervalsList .interval-row')
    var result = []
    var hasInvalid = false
    rows.forEach(function (row) {
      var startInput = row.querySelector('.start-time')
      var endInput = row.querySelector('.end-time')
      startInput.classList.remove('input-invalid')
      endInput.classList.remove('input-invalid')

      var rawStart = startInput.value.trim()
      var rawEnd = endInput.value.trim()

      // 若整行均留空，视作用户已清空该时段，平滑忽略不报错
      if (!rawStart && !rawEnd) return

      var normStart = normalizeTime(rawStart)
      var normEnd = normalizeTime(rawEnd)

      if (!normStart) {
        startInput.classList.add('input-invalid')
        hasInvalid = true
      } else {
        startInput.value = normStart
      }

      if (!normEnd) {
        endInput.classList.add('input-invalid')
        hasInvalid = true
      } else {
        endInput.value = normEnd
      }

      if (normStart && normEnd) {
        result.push({ start: normStart, end: normEnd })
      }
    })
    return { intervals: result, hasInvalid: hasInvalid }
  }

  function renderPriceFields(prefix, tier) {
    var t = tier || {}
    return '<div class="field-grid">'
      + '<div class="price-field"><label>未缓存输入</label><input type="number" step="any" min="0" class="inp-' + prefix + '-uncached" value="' + (t.uncachedInputPerMillion != null ? t.uncachedInputPerMillion : '') + '"></div>'
      + '<div class="price-field"><label>缓存命中读取</label><input type="number" step="any" min="0" class="inp-' + prefix + '-cache-read" value="' + (t.cacheReadPerMillion != null ? t.cacheReadPerMillion : '') + '"></div>'
      + '<div class="price-field"><label>缓存写入</label><input type="number" step="any" min="0" class="inp-' + prefix + '-cache-write" value="' + (t.cacheWritePerMillion != null ? t.cacheWritePerMillion : '0') + '"></div>'
      + '<div class="price-field"><label>思考 / 输出</label><input type="number" step="any" min="0" class="inp-' + prefix + '-output" value="' + (t.outputPerMillion != null ? t.outputPerMillion : '') + '"></div>'
      + '</div>'
  }

  /** 把当前 DOM 中可见卡片的值写回 currentPricing；隐藏的条目保持不变。 */
  function syncFromDom() {
    var cards = document.querySelectorAll('#modelList .model-card')
    cards.forEach(function (card) {
      var nameInput = card.querySelector('.model-name-input')
      var name = nameInput ? nameInput.value.trim() : ''
      // 名称为空或已被拒绝时，沿用卡片当前的键，避免把整张卡片写丢
      if (!name || nameInput.classList.contains('input-invalid')) {
        name = card.getAttribute('data-model') || ''
      }
      if (!name) return
      var original = card.getAttribute('data-model') || ''
      if (original !== '' && original !== name) delete currentPricing[original]
      var mode = currentMode(card)
      if (mode === 'tiered') {
        currentPricing[name] = {
          peak: collectTierFromFields(card, 'peak'),
          offpeak: collectTierFromFields(card, 'offpeak'),
        }
      } else {
        currentPricing[name] = collectTierFromFields(card, 'flat')
      }
    })
    return currentPricing
  }

  function matchesQuery(model, query) {
    if (query === '') return true
    return model.toLowerCase().indexOf(query) !== -1
  }

  /** 读取某张卡片当前的计价模式。 */
  function currentMode(card) {
    var radio = card.querySelector('.segmented-control input:checked, .tier-mode-toggle input:checked')
    return radio ? radio.value : 'flat'
  }

  /** 徽标与操作按钮：整表重绘和就地改名共用同一份生成逻辑。 */
  function cardChrome(model) {
    var inBuiltin = builtinPricing[model] !== undefined
    var overridden = isOverridden(model)
    var badge = !inBuiltin
      ? '<span class="model-badge model-badge-override">自定义</span>'
      : (overridden
        ? '<span class="model-badge model-badge-override">已覆盖</span>'
        : '<span class="model-badge model-badge-builtin">内置默认</span>')

    // 内置价目表里的模型删除即等于回退默认价，因此提供「恢复默认」；
    // 自建模型没有内置价可回退，仍是删除。
    var action = inBuiltin
      ? (overridden
        ? '<button type="button" class="btn-icon-restore restore-model-btn" data-model="' + esc(model) + '" title="恢复该模型的内置默认价">'
          + '<svg class="ui-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
          + '  <path d="M3 12a9 9 0 1 0 3-6.7L3 8"></path><path d="M3 3v5h5"></path>'
          + '</svg>'
          + '<span>恢复默认</span>'
          + '</button>'
        : '')
      : '<button type="button" class="btn-icon-danger del-model-btn" data-model="' + esc(model) + '" title="删除该自建模型">'
        + '<svg class="ui-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
        + '  <polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>'
        + '</svg>'
        + '<span>删除</span>'
        + '</button>'
    return { badge: badge, action: action }
  }

  /** 就地刷新单张卡片的徽标与操作按钮，不重排列表。 */
  function refreshCardChrome(card) {
    var chrome = cardChrome(card.getAttribute('data-model') || '')
    var title = card.querySelector('.model-card-title')
    if (title) {
      var oldBadge = title.querySelector('.model-badge')
      if (oldBadge) oldBadge.parentNode.removeChild(oldBadge)
      if (chrome.badge) title.insertAdjacentHTML('beforeend', chrome.badge)
    }
    var head = card.querySelector('.model-card-head')
    if (head) {
      var oldAction = head.querySelector('.restore-model-btn, .del-model-btn')
      if (oldAction) oldAction.parentNode.removeChild(oldAction)
      if (chrome.action) head.insertAdjacentHTML('beforeend', chrome.action)
    }
  }

  /** 刷新「共 N 个模型」计数，供整表重绘与就地改名共用。 */
  function updateModelCount() {
    var count = $('modelCount')
    if (!count) return
    var names = Object.keys(currentPricing)
    var search = $('modelSearch')
    var query = search ? search.value.trim().toLowerCase() : ''
    if (query === '') {
      count.textContent = '共 ' + names.length + ' 个模型，' + names.filter(isOverridden).length + ' 个已覆盖'
    } else {
      count.textContent = '匹配 ' + names.filter(function (name) { return matchesQuery(name, query) }).length
        + ' / ' + names.length + ' 个模型'
    }
  }

  /**
   * 提交模型改名。列表按名称排序，若在此整表重绘，刚添加的卡片会立刻跳到
   * 排序后的位置并滚出视野，看起来就像"卡片消失"；因此改为就地改名：只
   * 更新该卡片的键、单选项分组与徽标，列表顺序和焦点都保持不变。
   */
  function commitModelRename(card) {
    var input = card.querySelector('.model-name-input')
    if (!input) return
    var prev = card.getAttribute('data-model') || ''
    var next = input.value.trim()
    input.classList.remove('input-invalid')

    if (next === prev) {
      input._rejected = ''
      return
    }

    // 失焦与 change 会为同一次编辑各触发一次，错误提示只报一次
    var announce = input._rejected !== next
    input._rejected = next

    if (!next) {
      input.classList.add('input-invalid')
      if (announce) showToast('模型名称不能为空，请填写后再移开焦点', true)
      return
    }

    // 同名条目会互相覆盖，先拦下来，避免静默丢掉其中一个的价格。
    // 只标红提示、不抢焦点：失焦时强行 focus 会把焦点锁死在输入框里。
    // 该卡片仍以 data-model 为准，保存前的校验也会再次拦截。
    if (Object.prototype.hasOwnProperty.call(currentPricing, next)) {
      input.classList.add('input-invalid')
      if (announce) showToast('模型名称「' + next + '」已存在，请换一个名称', true)
      return
    }

    input._rejected = ''
    syncFromDom()
    card.setAttribute('data-model', next)
    card.querySelectorAll('input[type="radio"]').forEach(function (radio) {
      radio.setAttribute('name', 'mode_' + next)
    })
    refreshCardChrome(card)

    // 改名后可能不再匹配当前搜索词，只有这种情况才需要重绘
    var search = $('modelSearch')
    var query = search ? search.value.trim().toLowerCase() : ''
    if (query !== '' && !matchesQuery(next, query)) {
      renderModelCards()
    } else {
      updateModelCount()
    }
  }

  function renderModelCards() {
    var container = $('modelList')
    var search = $('modelSearch')
    var query = search ? search.value.trim().toLowerCase() : ''
    var names = Object.keys(currentPricing).sort()
    var shown = names.filter(function (name) { return matchesQuery(name, query) })

    updateModelCount()

    if (shown.length === 0) {
      container.innerHTML = names.length === 0
        ? '<div style="color:var(--muted);font-size:12px;padding:12px 0;">暂无模型配置，点击上方「添加模型」添加</div>'
        : '<div style="color:var(--muted);font-size:12px;padding:12px 0;">没有匹配「' + esc(query) + '」的模型</div>'
      return
    }

    container.innerHTML = shown.map(function (model) {
      var val = currentPricing[model] || {}
      var isTiered = !!(val.peak || val.offpeak)
      var flat = !isTiered ? val : (val.peak || {})
      var peak = val.peak || {}
      var offpeak = val.offpeak || {}
      var chrome = cardChrome(model)
      var badge = chrome.badge
      var action = chrome.action

      return '<div class="model-card" data-model="' + esc(model) + '">'
        + '<div class="model-card-head">'
        + '  <div class="model-card-title">'
        + '    <input type="text" class="model-name-input" value="' + esc(model) + '" placeholder="模型名称 (如 deepseek-chat)">'
        + badge
        + '  </div>'
        + '  <div class="segmented-control">'
        + '    <label><input type="radio" name="mode_' + esc(model) + '" value="flat" ' + (!isTiered ? 'checked' : '') + '><span class="seg-btn">统一固定价格</span></label>'
        + '    <label><input type="radio" name="mode_' + esc(model) + '" value="tiered" ' + (isTiered ? 'checked' : '') + '><span class="seg-btn">分时峰谷计价</span></label>'
        + '  </div>'
        + action
        + '</div>'
        + '<div class="pricing-grids-container ' + (isTiered ? 'is-split' : '') + '">'
        + (isTiered
          ? ('<div class="tier-block">'
            + '<div class="tier-block-title">'
            + '  <span class="tier-badge tier-badge-peak">'
            + '    <svg class="ui-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
            + '      <circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>'
            + '    </svg>'
            + '    高峰时段单价'
            + '  </span>'
            + '</div>'
            + renderPriceFields('peak', peak)
            + '</div>'
            + '<div class="tier-block">'
            + '<div class="tier-block-title">'
            + '  <span class="tier-badge tier-badge-offpeak">'
            + '    <svg class="ui-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
            + '      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>'
            + '    </svg>'
            + '    闲时 / 周末单价'
            + '  </span>'
            + '</div>'
            + renderPriceFields('offpeak', offpeak)
            + '</div>')
          : ('<div class="tier-block">'
            + '<div class="tier-block-title">'
            + '  <span class="tier-badge tier-badge-flat">全天统一单价</span>'
            + '</div>'
            + renderPriceFields('flat', flat)
            + '</div>')
        )
        + '</div>'
        + '</div>'
    }).join('')

  }

  /**
   * 列表内的事件全部走事件委托：卡片会被就地改名并重建徽标/按钮，逐个绑定
   * 会在下次重绘或就替换节点后失效。此函数只在启动时调用一次。
   */
  function bindModelListEvents() {
    var container = $('modelList')

    container.addEventListener('click', function (e) {
      var restore = e.target.closest ? e.target.closest('.restore-model-btn') : null
      if (restore) {
        var restoreName = restore.getAttribute('data-model')
        syncFromDom()
        if (builtinPricing[restoreName] !== undefined) currentPricing[restoreName] = builtinPricing[restoreName]
        renderModelCards()
        return
      }
      var del = e.target.closest ? e.target.closest('.del-model-btn') : null
      if (del) {
        var delName = del.getAttribute('data-model')
        syncFromDom()
        delete currentPricing[delName]
        renderModelCards()
      }
    })

    container.addEventListener('change', function (e) {
      var target = e.target
      if (target.classList && target.classList.contains('model-name-input')) {
        commitModelRename(target.closest('.model-card'))
        return
      }
      if (target.type === 'radio') {
        syncFromDom()
        renderModelCards()
      }
    })

    // 改名只在失焦/回车时落盘，逐字输入不重绘，避免编辑过程被打断
    container.addEventListener('blur', function (e) {
      var target = e.target
      if (target.classList && target.classList.contains('model-name-input')) {
        commitModelRename(target.closest('.model-card'))
      }
    }, true)

    container.addEventListener('keydown', function (e) {
      var target = e.target
      if (e.key === 'Enter' && target.classList && target.classList.contains('model-name-input')) {
        e.preventDefault()
        target.blur()
      }
    })
  }

  function collectTierFromFields(card, prefix) {
    var uncached = parseFloat(card.querySelector('.inp-' + prefix + '-uncached') ? card.querySelector('.inp-' + prefix + '-uncached').value : NaN)
    var cacheRead = parseFloat(card.querySelector('.inp-' + prefix + '-cache-read') ? card.querySelector('.inp-' + prefix + '-cache-read').value : NaN)
    var cacheWrite = parseFloat(card.querySelector('.inp-' + prefix + '-cache-write') ? card.querySelector('.inp-' + prefix + '-cache-write').value : NaN)
    var output = parseFloat(card.querySelector('.inp-' + prefix + '-output') ? card.querySelector('.inp-' + prefix + '-output').value : NaN)
    var res = {}
    if (!isNaN(uncached)) res.uncachedInputPerMillion = uncached
    if (!isNaN(cacheRead)) res.cacheReadPerMillion = cacheRead
    if (!isNaN(cacheWrite)) res.cacheWritePerMillion = cacheWrite
    if (!isNaN(output)) res.outputPerMillion = output
    return res
  }

  async function openPricingModal() {
    try {
      var resp = await fetch('/api/token-usage-stats/pricing', { cache: 'no-store' })
      var data = resp.ok ? await resp.json() : defaultPricingConfig
      populateModalForm(data)
      $('pricingModal').hidden = false
    } catch (e) {
      populateModalForm(defaultPricingConfig)
      $('pricingModal').hidden = false
    }
  }

  function closePricingModal() {
    $('pricingModal').hidden = true
  }

  function populateModalForm(data) {
    var curr = data.currency || 'CNY'
    var radios = document.querySelectorAll('input[name="pricingCurrency"]')
    radios.forEach(function (r) { r.checked = (r.value === curr) })

    var ps = data.peakSchedule || defaultPricingConfig.peakSchedule
    $('weekendOffpeak').checked = ps.weekendOffpeak !== false
    renderIntervals(ps.intervals || defaultPricingConfig.peakSchedule.intervals)

    // 接口下发的是「生效价目表」（内置 + 覆盖）与内置表本身；两者都拿到时
    // 才能准确标记「已覆盖」。若宿主未下发内置表（旧版本），以页面内置的
    // 价目表为底再叠加配置项，仍能列出全部模型。
    var hasBuiltin = !!data.builtinPricing
    builtinPricing = data.builtinPricing || builtinPricingFallback
    var configured = data.pricing || {}
    // 浅拷贝一层，避免编辑中的价目表与内置基准共享顶层引用
    currentPricing = hasBuiltin ? Object.assign({}, configured) : Object.assign({}, builtinPricing, configured)
    var search = $('modelSearch')
    if (search) search.value = ''
    renderModelCards()
  }

  bindModelListEvents()

  $('addIntervalBtn').addEventListener('click', function () {
    var res = collectIntervals()
    res.intervals.push({ start: '09:00', end: '12:00' })
    renderIntervals(res.intervals)
  })

  $('modelSearch').addEventListener('input', function () {
    syncFromDom()
    renderModelCards()
  })

  $('addModelBtn').addEventListener('click', function () {
    syncFromDom()
    var index = 1
    var newKey = 'custom-model-' + index
    while (currentPricing[newKey] !== undefined) {
      index += 1
      newKey = 'custom-model-' + index
    }
    currentPricing[newKey] = {
      uncachedInputPerMillion: 2.0,
      cacheReadPerMillion: 0.5,
      cacheWritePerMillion: 0,
      outputPerMillion: 8.0,
    }
    // 新建的模型可能被当前搜索词过滤掉，清空搜索保证它可见
    var search = $('modelSearch')
    if (search) search.value = ''
    renderModelCards()

    // 自动聚焦新模型卡片的输入框并全选名称，提升输入体验
    setTimeout(function () {
      var firstInput = document.querySelector('#modelList .model-card[data-model="' + newKey + '"] .model-name-input')
      if (firstInput) {
        firstInput.focus()
        firstInput.select()
        firstInput.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 40)
  })

  $('resetDefaultBtn').addEventListener('click', function () {
    if (confirm('确认把所有模型恢复为内置默认价与默认时段配置吗？')) {
      populateModalForm(defaultPricingConfig)
    }
  })

  $('savePricingBtn').addEventListener('click', async function () {
    var currencyRadio = document.querySelector('input[name="pricingCurrency"]:checked')
    var currency = currencyRadio ? currencyRadio.value : 'CNY'
    var weekendOffpeak = $('weekendOffpeak').checked
    var intervalResult = collectIntervals()

    // 检查是否有任何模型处于分时峰谷计价模式
    var hasTieredModel = false
    var cards = document.querySelectorAll('#modelList .model-card')
    cards.forEach(function (card) {
      var modeRadio = card.querySelector('.segmented-control input:checked, .tier-mode-toggle input:checked')
      if (modeRadio && modeRadio.value === 'tiered') hasTieredModel = true
    })

    // 如果有时段输入不合法：高亮标红并平滑滚动到出错位置
    if (intervalResult.hasInvalid) {
      var firstInvalid = document.querySelector('#intervalsList .input-invalid')
      if (firstInvalid) {
        firstInvalid.focus()
        firstInvalid.select()
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      showToast('高峰时段格式错误，已自动定位标红输入框，请输入正确时间（如 09:00）', true)
      return
    }

    // 校验模型名称是否填入
    var nameInputs = document.querySelectorAll('#modelList .model-name-input')
    var seenNames = {}
    for (var i = 0; i < nameInputs.length; i++) {
      var inp = nameInputs[i]
      inp.classList.remove('input-invalid')
      var trimmed = inp.value.trim()
      if (!trimmed) {
        inp.classList.add('input-invalid')
        inp.focus()
        inp.scrollIntoView({ behavior: 'smooth', block: 'center' })
        showToast('模型名称不能为空，请填写标红的模型名称', true)
        return
      }
      // 同名条目会互相覆盖，必须拦下来
      if (Object.prototype.hasOwnProperty.call(seenNames, trimmed)) {
        inp.classList.add('input-invalid')
        inp.focus()
        inp.select()
        inp.scrollIntoView({ behavior: 'smooth', block: 'center' })
        showToast('模型名称「' + trimmed + '」重复，请修改标红的名称', true)
        return
      }
      seenNames[trimmed] = true
    }

    // 提交完整生效价目表；宿主会剔除与内置价相同的条目，只存真正的覆盖。
    var pricing = syncFromDom()
    var payload = {
      currency: currency,
      peakSchedule: {
        weekendOffpeak: weekendOffpeak,
        intervals: intervalResult.intervals
      },
      pricing: pricing
    }

    try {
      var resp = await fetch('/api/token-usage-stats/pricing', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      })
      var res = await resp.json()
      if (res.ok) {
        showToast('✅ 价格策略已保存并立即生效！', false)
        closePricingModal()
        load()
      } else {
        showToast('保存失败：' + (res.error || '未知错误'), true)
      }
    } catch (err) {
      showToast('网络保存失败：' + String(err), true)
    }
  })

  $('openPricingModal').addEventListener('click', openPricingModal)
  $('closePricingModal').addEventListener('click', closePricingModal)
  $('cancelPricingBtn').addEventListener('click', closePricingModal)
  $('pricingModal').addEventListener('click', function (e) {
    if (e.target === $('pricingModal')) closePricingModal()
  })

  initChartTabs()
  $('refresh').addEventListener('click', load)
  $('range').addEventListener('change', load)
  $('granularity').addEventListener('change', load)
  $('model').addEventListener('change', load)
  load()
  setInterval(load, 10000)
})()
<\/script>
</body>
</html>
`;
}
//#endregion
//#region lib/types/routes.js
/**
* Dashboard API query parsing for `dsh-token-usage-stats`.
*
* @module dsh-token-usage-stats/routes
*/
/** Parse one optional finite-number query parameter. */
function finiteParam(value) {
	if (value === null || value.trim() === "") return void 0;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : void 0;
}
/**
* Build a snapshot query from the dashboard API's URL parameters.
* Invalid numbers are ignored rather than guessed; an unsupported granularity
* falls back to the service default (`hour`).
* @param params - parsed URL search parameters.
* @returns a validated query for {@link TokenUsageStatsQuery}.
*/
function parseTokenUsageStatsQuery(params) {
	const from = finiteParam(params.get("from"));
	const to = finiteParam(params.get("to"));
	const model = params.get("model");
	const granularity = params.get("granularity");
	return {
		...from === void 0 ? {} : { from },
		...to === void 0 ? {} : { to },
		...model === null || model === "" ? {} : { model },
		...granularity === "day" || granularity === "hour" ? { granularity } : {}
	};
}
//#endregion
//#region lib/types/builtin-pricing.js
/**
* Default price book, keyed by this plugin's price key. Providers report many
* upstream ids for one model; {@link resolveBuiltinPricingKey} maps them here.
*/
const BUILTIN_PRICING = {
	"deepseek-flash": {
		peak: {
			uncachedInputPerMillion: 2,
			cacheReadPerMillion: .04,
			outputPerMillion: 8
		},
		offpeak: {
			uncachedInputPerMillion: 1,
			cacheReadPerMillion: .02,
			outputPerMillion: 4
		}
	},
	"deepseek-v4-pro": {
		peak: {
			uncachedInputPerMillion: 9,
			cacheReadPerMillion: .3,
			outputPerMillion: 27
		},
		offpeak: {
			uncachedInputPerMillion: 4.5,
			cacheReadPerMillion: .15,
			outputPerMillion: 13.5
		}
	},
	"glm": {
		uncachedInputPerMillion: 8,
		cacheReadPerMillion: 2,
		outputPerMillion: 28
	},
	"glm-5.3": {
		uncachedInputPerMillion: 8,
		cacheReadPerMillion: 2,
		outputPerMillion: 28
	},
	"glm-5.3-flash": {
		uncachedInputPerMillion: .8,
		cacheReadPerMillion: .23,
		outputPerMillion: 2.8
	},
	"glm-5.3-flashx": {
		uncachedInputPerMillion: 2,
		cacheReadPerMillion: .57,
		outputPerMillion: 7
	},
	"glm-4.6": {
		uncachedInputPerMillion: 4,
		cacheReadPerMillion: .8,
		outputPerMillion: 16
	},
	"glm-4.5-air": {
		uncachedInputPerMillion: .8,
		cacheReadPerMillion: .16,
		outputPerMillion: 2
	},
	"glm-4.7": {
		uncachedInputPerMillion: 4,
		cacheReadPerMillion: 1,
		outputPerMillion: 16
	},
	"glm-5-turbo": {
		uncachedInputPerMillion: 5,
		cacheReadPerMillion: 1.2,
		outputPerMillion: 22
	},
	"glm-5.1": {
		uncachedInputPerMillion: 6,
		cacheReadPerMillion: 1.3,
		outputPerMillion: 24
	},
	"glm-5v-turbo": {
		uncachedInputPerMillion: 5,
		cacheReadPerMillion: 1.2,
		outputPerMillion: 22
	},
	"qwen-3.8-max": {
		uncachedInputPerMillion: 12,
		cacheReadPerMillion: 1.5,
		outputPerMillion: 36
	},
	"qwen-3.8-flash": {
		uncachedInputPerMillion: .8,
		cacheReadPerMillion: .1,
		outputPerMillion: 2.7
	},
	"qwen-3.8-27b": {
		uncachedInputPerMillion: 3,
		cacheReadPerMillion: .6,
		outputPerMillion: 12
	},
	"qwen-max": {
		uncachedInputPerMillion: 12,
		cacheReadPerMillion: 1.2,
		outputPerMillion: 36
	},
	"qwen-plus": {
		uncachedInputPerMillion: .8,
		cacheReadPerMillion: .08,
		outputPerMillion: 4.8
	},
	"qwen-flash": {
		uncachedInputPerMillion: .2,
		cacheReadPerMillion: .02,
		outputPerMillion: 2
	},
	"doubao": {
		uncachedInputPerMillion: 3.2,
		cacheReadPerMillion: .64,
		outputPerMillion: 16
	},
	"doubao-mini": {
		uncachedInputPerMillion: .2,
		cacheReadPerMillion: .04,
		outputPerMillion: 2
	},
	"doubao-1.6": {
		uncachedInputPerMillion: .8,
		cacheReadPerMillion: 0,
		outputPerMillion: 8
	},
	"doubao-seed-evolving": {
		uncachedInputPerMillion: 6,
		cacheReadPerMillion: 1.2,
		outputPerMillion: 30
	},
	"doubao-seed-2.1-pro": {
		uncachedInputPerMillion: 6,
		cacheReadPerMillion: 1.2,
		outputPerMillion: 30
	},
	"doubao-seed-2.1-turbo": {
		uncachedInputPerMillion: 3,
		cacheReadPerMillion: .6,
		outputPerMillion: 15
	},
	"doubao-seed-2.1-lite": {
		uncachedInputPerMillion: .8,
		cacheReadPerMillion: .16,
		outputPerMillion: 2.7
	},
	"kimi": {
		uncachedInputPerMillion: 6.5,
		cacheReadPerMillion: 1.3,
		outputPerMillion: 27
	},
	"kimi-k2.7-hs": {
		uncachedInputPerMillion: 13,
		cacheReadPerMillion: 2.6,
		outputPerMillion: 54
	},
	"kimi-k2.6": {
		uncachedInputPerMillion: 6.5,
		cacheReadPerMillion: 1.1,
		outputPerMillion: 27
	},
	"kimi-k3": {
		uncachedInputPerMillion: 20,
		cacheReadPerMillion: 2,
		outputPerMillion: 100
	},
	"mimo-v2.6-pro": {
		uncachedInputPerMillion: 3,
		cacheReadPerMillion: .025,
		outputPerMillion: 6
	},
	"mimo-v2.6-flash": {
		uncachedInputPerMillion: 1,
		cacheReadPerMillion: .02,
		outputPerMillion: 2
	},
	"mimo-v2.6-pro-ultraspeed": {
		uncachedInputPerMillion: 30,
		cacheReadPerMillion: .25,
		outputPerMillion: 60
	},
	"mimo-v2.5": {
		uncachedInputPerMillion: 1,
		cacheReadPerMillion: .02,
		outputPerMillion: 2
	},
	"mimo-v2.5-pro": {
		uncachedInputPerMillion: 3,
		cacheReadPerMillion: .025,
		outputPerMillion: 6
	},
	"minimax": {
		uncachedInputPerMillion: 2.1,
		cacheReadPerMillion: .42,
		outputPerMillion: 8.4
	},
	"minimax-m2.7": {
		uncachedInputPerMillion: 2.1,
		cacheReadPerMillion: .42,
		outputPerMillion: 8.4
	},
	"minimax-m2.7-highspeed": {
		uncachedInputPerMillion: 4.2,
		cacheReadPerMillion: .42,
		outputPerMillion: 16.8
	},
	"ernie": {
		uncachedInputPerMillion: 4,
		cacheReadPerMillion: .4,
		outputPerMillion: 18
	},
	"hunyuan": {
		uncachedInputPerMillion: 1,
		cacheReadPerMillion: .25,
		outputPerMillion: 4
	},
	"hunyuan-hy4-preview": {
		uncachedInputPerMillion: 6,
		cacheReadPerMillion: .3,
		outputPerMillion: 18
	},
	"hunyuan-t1": {
		uncachedInputPerMillion: 1,
		cacheReadPerMillion: .1,
		outputPerMillion: 4
	},
	"yi": {
		uncachedInputPerMillion: .99,
		cacheReadPerMillion: .1,
		outputPerMillion: .99
	},
	"step": {
		uncachedInputPerMillion: 1.35,
		cacheReadPerMillion: .27,
		outputPerMillion: 8.1
	},
	"spark": {
		uncachedInputPerMillion: 5,
		cacheReadPerMillion: .5,
		outputPerMillion: 10
	},
	"sensenova": {
		uncachedInputPerMillion: 4.5,
		cacheReadPerMillion: .45,
		outputPerMillion: 9
	},
	"baichuan": {
		uncachedInputPerMillion: 5,
		cacheReadPerMillion: .5,
		outputPerMillion: 9
	},
	"gpt-6-astra": {
		uncachedInputPerMillion: 67.9,
		cacheReadPerMillion: 6.79,
		outputPerMillion: 339.5
	},
	"gpt-6-sol": {
		uncachedInputPerMillion: 13.58,
		cacheReadPerMillion: 1.358,
		outputPerMillion: 67.9
	},
	"gpt-6-luna": {
		uncachedInputPerMillion: .679,
		cacheReadPerMillion: .0679,
		outputPerMillion: 3.395
	},
	"gpt-5.6-sol": {
		uncachedInputPerMillion: 33.95,
		cacheReadPerMillion: 3.395,
		outputPerMillion: 203.7
	},
	"gpt-5.6-terra": {
		uncachedInputPerMillion: 13.58,
		cacheReadPerMillion: 1.358,
		outputPerMillion: 81.48
	},
	"gpt-5.6-luna": {
		uncachedInputPerMillion: 1.358,
		cacheReadPerMillion: .1358,
		outputPerMillion: 8.148
	},
	"gemini-pro": {
		uncachedInputPerMillion: 13.58,
		cacheReadPerMillion: 1.358,
		outputPerMillion: 81.48
	},
	"gemini-3.8-flash": {
		uncachedInputPerMillion: 10.185,
		cacheReadPerMillion: 1.0185,
		outputPerMillion: 50.925
	},
	"gemini-3.7-flash": {
		uncachedInputPerMillion: 10.185,
		cacheReadPerMillion: 1.0185,
		outputPerMillion: 50.925
	},
	"gemini-flash": {
		uncachedInputPerMillion: 10.185,
		cacheReadPerMillion: 1.0185,
		outputPerMillion: 50.925
	},
	"grok-4.7": {
		uncachedInputPerMillion: 13.58,
		cacheReadPerMillion: 3.395,
		outputPerMillion: 40.74
	},
	"grok": {
		uncachedInputPerMillion: 13.58,
		cacheReadPerMillion: 3.395,
		outputPerMillion: 40.74
	},
	"grok-4.3": {
		uncachedInputPerMillion: 8.4875,
		cacheReadPerMillion: 1.358,
		outputPerMillion: 16.975
	},
	"grok-build-0.1": {
		uncachedInputPerMillion: 6.79,
		cacheReadPerMillion: 1.358,
		outputPerMillion: 13.58
	},
	"llama": {
		uncachedInputPerMillion: 1.358,
		cacheReadPerMillion: .3395,
		outputPerMillion: 4.074
	},
	"llama-scout": {
		uncachedInputPerMillion: .679,
		cacheReadPerMillion: .16975,
		outputPerMillion: 2.037
	},
	"claude-opus-4-6": {
		uncachedInputPerMillion: 33.95,
		cacheReadPerMillion: 3.395,
		outputPerMillion: 169.75
	},
	"claude-sonnet-4-6": {
		uncachedInputPerMillion: 20.37,
		cacheReadPerMillion: 2.037,
		outputPerMillion: 101.85
	},
	"claude-haiku-4-5": {
		uncachedInputPerMillion: 6.79,
		cacheReadPerMillion: .679,
		outputPerMillion: 33.95
	},
	"claude-opus-5": {
		uncachedInputPerMillion: 33.95,
		cacheReadPerMillion: 3.395,
		outputPerMillion: 169.75
	},
	"claude-sonnet-5": {
		uncachedInputPerMillion: 13.58,
		cacheReadPerMillion: 1.358,
		outputPerMillion: 67.9
	},
	"claude-fable-5-1": {
		uncachedInputPerMillion: 67.9,
		cacheReadPerMillion: 1.6975,
		outputPerMillion: 339.5
	},
	"claude-opus-5-5": {
		uncachedInputPerMillion: 27.16,
		cacheReadPerMillion: 1.358,
		outputPerMillion: 135.8
	},
	"claude-sonnet-5-5": {
		uncachedInputPerMillion: 13.58,
		cacheReadPerMillion: 1.358,
		outputPerMillion: 67.9
	},
	"mistral-large-2512": {
		uncachedInputPerMillion: 3.395,
		cacheReadPerMillion: .3395,
		outputPerMillion: 10.185
	},
	"mistral-small-2603": {
		uncachedInputPerMillion: 1.0185,
		cacheReadPerMillion: .10185,
		outputPerMillion: 4.074
	},
	"ministral-8b-latest": {
		uncachedInputPerMillion: .679,
		cacheReadPerMillion: .0679,
		outputPerMillion: .679
	},
	"command-a-03-2025": {
		uncachedInputPerMillion: 16.975,
		cacheReadPerMillion: 1.6975,
		outputPerMillion: 67.9
	},
	"command-r-08-2024": {
		uncachedInputPerMillion: 1.0185,
		cacheReadPerMillion: .10185,
		outputPerMillion: 4.074
	},
	"longcat-2.0": {
		uncachedInputPerMillion: 4,
		cacheReadPerMillion: .8,
		outputPerMillion: 16
	},
	"minicpm-v-4.5": {
		uncachedInputPerMillion: 1,
		cacheReadPerMillion: .2,
		outputPerMillion: 4
	},
	"ernie-4.5": {
		uncachedInputPerMillion: 2,
		cacheReadPerMillion: .4,
		outputPerMillion: 8
	},
	"dots-3-note-preview": {
		uncachedInputPerMillion: 2,
		cacheReadPerMillion: .4,
		outputPerMillion: 8
	},
	"qwen3.7-plus": {
		uncachedInputPerMillion: 2,
		cacheReadPerMillion: .4,
		outputPerMillion: 8
	},
	"qwen3.7-flash": {
		uncachedInputPerMillion: .2,
		cacheReadPerMillion: .02,
		outputPerMillion: .8
	},
	"qwen3.6-max": {
		uncachedInputPerMillion: 9,
		cacheReadPerMillion: .9,
		outputPerMillion: 54
	},
	"qwen3-coder-plus": {
		uncachedInputPerMillion: 4,
		cacheReadPerMillion: .8,
		outputPerMillion: 16
	},
	"qwen3-coder": {
		uncachedInputPerMillion: 4,
		cacheReadPerMillion: .8,
		outputPerMillion: 16
	},
	"glm-4.5-x": {
		uncachedInputPerMillion: 4,
		cacheReadPerMillion: 1,
		outputPerMillion: 16
	},
	"glm-5": {
		uncachedInputPerMillion: 4,
		cacheReadPerMillion: 1,
		outputPerMillion: 18
	},
	"glm-5.2-fast": {
		uncachedInputPerMillion: 16,
		cacheReadPerMillion: 4,
		outputPerMillion: 56
	},
	"kimi-k3-fast": {
		uncachedInputPerMillion: 20,
		cacheReadPerMillion: 2,
		outputPerMillion: 100
	},
	"kimi-k2.7-code-fast": {
		uncachedInputPerMillion: 6.5,
		cacheReadPerMillion: 1.3,
		outputPerMillion: 27
	},
	"kimi-k2.8-preview": {
		uncachedInputPerMillion: 6.5,
		cacheReadPerMillion: 1.7,
		outputPerMillion: 27
	},
	"kimi-k2.6-fast": {
		uncachedInputPerMillion: 6.5,
		cacheReadPerMillion: 1.1,
		outputPerMillion: 27
	},
	"kimi-k2.6-turbo": {
		uncachedInputPerMillion: 6.5,
		cacheReadPerMillion: 1.1,
		outputPerMillion: 27
	},
	"kimi-k2-thinking-turbo": {
		uncachedInputPerMillion: 8,
		cacheReadPerMillion: 1,
		outputPerMillion: 58
	},
	"doubao-seed-2.0-code": {
		uncachedInputPerMillion: 3.2,
		cacheReadPerMillion: .64,
		outputPerMillion: 16
	},
	"doubao-seed-2.0-lite": {
		uncachedInputPerMillion: .6,
		cacheReadPerMillion: .12,
		outputPerMillion: 3.6
	},
	"other": {
		uncachedInputPerMillion: 0,
		cacheReadPerMillion: 0,
		outputPerMillion: 0
	}
};
/**
* Upstream ids that providers report, mapped to a {@link BUILTIN_PRICING} key.
*
* Unlike the price book, keys here are matched verbatim (lowercased) before
* the normalised and derived-candidate passes; see
* {@link resolveBuiltinPricingKey}. Several entries exist only to normalise a
* separator or suffix variant that the canonicalised index would otherwise miss.
*/
const BUILTIN_PRICING_ALIASES = {
	"deepseek-v4-flash": "deepseek-flash",
	"deepseek-v4-flash-vision-exp": "deepseek-flash",
	"deepseek-v4.1-flash": "deepseek-flash",
	"deepseek-v4.1-flash-expires-on-0910": "deepseek-flash",
	"glm-5.2": "glm",
	"glm-4.5air": "glm-4.5-air",
	"glm-5.3-flash-x": "glm-5.3-flashx",
	"glm-5v.1": "glm-5v-turbo",
	"claude-opus-4.6": "claude-opus-4-6",
	"claude-sonnet-4.6": "claude-sonnet-4-6",
	"claude-haiku-4.5": "claude-haiku-4-5",
	"claude-fable-5.1": "claude-fable-5-1",
	"claude-fable": "claude-fable-5-1",
	"claude-opus-5.5": "claude-opus-5-5",
	"claude-sonnet-5.5": "claude-sonnet-5-5",
	"mistral-large-3": "mistral-large-2512",
	"mistral-small-4": "mistral-small-2603",
	"ministral-8b": "ministral-8b-latest",
	"command-a": "command-a-03-2025",
	"command-r": "command-r-08-2024",
	"hy3": "hunyuan",
	"hy4-preview": "hunyuan-hy4-preview",
	"hy4": "hunyuan-hy4-preview",
	"hunyuan-hy4": "hunyuan-hy4-preview",
	"longcat-2": "longcat-2.0",
	"minicpm-v-4.5-thinking": "minicpm-v-4.5",
	"ernie-4.5-300b": "ernie-4.5",
	"dots-3-note": "dots-3-note-preview",
	"dots3-note-preview": "dots-3-note-preview",
	"rednote-dots3": "dots-3-note-preview",
	"doubao-seed-evolve": "doubao-seed-evolving",
	"doubao-seed-2.1-pro-290000": "doubao-seed-2.1-pro",
	"doubao-seed-2-1-turbo": "doubao-seed-2.1-turbo",
	"doubao-seed-2-1-lite": "doubao-seed-2.1-lite",
	"qwen3.8-max": "qwen-3.8-max",
	"qwen3.8-flash": "qwen-3.8-flash",
	"qwen3.8-27b": "qwen-3.8-27b",
	"qwen3.7-max": "qwen-max",
	"qwen3.6-max-preview": "qwen3.6-max",
	"qwen3-coder-480b": "qwen3-coder",
	"glm-4.5x": "glm-4.5-x",
	"glm-5.2f": "glm-5.2-fast",
	"kimi-k3f": "kimi-k3-fast",
	"kimi-for-coding": "kimi-k2.8-preview",
	"kimi-k2.7-code-f": "kimi-k2.7-code-fast",
	"doubao-seed-2-0-code": "doubao-seed-2.0-code",
	"doubao-seed-2-0-lite": "doubao-seed-2.0-lite",
	"step-3.7-flash": "step",
	"seed-2.0-mini": "doubao-mini",
	"k3": "kimi-k3",
	"kimi-k2.8": "kimi-k2.8-preview",
	"kimi-k2-8-preview": "kimi-k2.8-preview",
	"kimi-k2-8": "kimi-k2.8-preview",
	"k2.8-preview": "kimi-k2.8-preview",
	"k2.8": "kimi-k2.8-preview",
	"minimax-m1": "minimax",
	"minimax-m2": "minimax",
	"minimax-m3": "minimax",
	"minimax-m2.7-high-speed": "minimax-m2.7-highspeed",
	"minimax-m2-7": "minimax-m2.7",
	"minimax-m2-7-highspeed": "minimax-m2.7-highspeed",
	"minimax-m2-7-high-speed": "minimax-m2.7-highspeed",
	"gpt-6": "gpt-6-astra",
	"gemini-3-8-flash": "gemini-3.8-flash",
	"gemini-3-7-flash": "gemini-3.7-flash",
	"grok-build": "grok-build-0.1",
	"deepseek-v4.1-flash-sg": "deepseek-flash",
	"sn-deepseek-v4-1-flash": "deepseek-flash",
	"deepseek-chat": "deepseek-flash",
	"deepseek-reasoner": "deepseek-flash"
};
/**
* Canonical form of a model id: lowercased, parenthetical notes dropped, and
* every non-alphanumeric character removed. This lets a reported id match a
* key that differs only by separators or case (`Claude-Opus-5-5` ===
* `claude-opus-5.5` === `claude-opus-5-5`).
* @param id - raw model id.
* @returns alphanumeric lowercase form.
*/
function canonicalModelId(id) {
	return id.toLowerCase().replace(/\([^)]*\)/g, "").replace(/[^a-z0-9]+/g, "");
}
/** Canonical form -> price key, built once from keys and verbatim aliases. */
const CANONICAL_INDEX = (() => {
	const index = /* @__PURE__ */ new Map();
	const add = (candidate, target) => {
		const canonical = canonicalModelId(candidate);
		if (canonical !== "" && !index.has(canonical)) index.set(canonical, target);
	};
	for (const key of Object.keys(BUILTIN_PRICING)) add(key, key);
	for (const [alias, key] of Object.entries(BUILTIN_PRICING_ALIASES)) add(alias, key);
	return index;
})();
/**
* Derived candidates for an unmatched id: the segment after the last slash
* (`cline-api/openai/gpt-6-sol` -> `gpt-6-sol`), plus either form with a
* trailing 3+-digit snapshot suffix removed (`gpt-6-sol-202605` ->
* `gpt-6-sol`). Keys that already match verbatim never reach this pass.
* @param id - raw model id.
* @returns candidate ids, most specific first.
*/
function derivedCandidates(id) {
	const out = [];
	const push = (value) => {
		if (value !== "" && !out.includes(value)) out.push(value);
	};
	const stripTrailingDigits = (value) => {
		let base = value;
		for (;;) {
			const next = base.replace(/[-_]\d{3,}$/u, "");
			if (next === base || next === "") return;
			base = next;
			push(base);
		}
	};
	const slash = id.lastIndexOf("/");
	if (slash > 0 && slash < id.length - 1) {
		const bare = id.slice(slash + 1);
		push(bare);
		stripTrailingDigits(bare);
	}
	stripTrailingDigits(id);
	return out;
}
/** Look one candidate up verbatim, then canonically. */
function lookupBuiltinKey(candidate) {
	const alias = BUILTIN_PRICING_ALIASES[candidate];
	if (alias !== void 0) return alias;
	const canonical = canonicalModelId(candidate);
	return canonical === "" ? void 0 : CANONICAL_INDEX.get(canonical);
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
function resolveBuiltinPricingKey(id) {
	const lower = id.toLowerCase();
	if (BUILTIN_PRICING[lower] !== void 0) return lower;
	const direct = lookupBuiltinKey(lower);
	if (direct !== void 0) return direct;
	for (const candidate of derivedCandidates(lower)) {
		const hit = lookupBuiltinKey(candidate);
		if (hit !== void 0) return hit;
	}
}
//#endregion
//#region lib/types/index.js
/**
* Cross-session token usage, request count, and optional cost analytics, with
* a self-contained web dashboard served from the same plugin.
*
* @module dsh-token-usage-stats
*/
function getPricingStoragePath() {
	const dshDir = path.join(os.homedir(), ".dsh");
	if (!existsSync(dshDir)) try {
		mkdirSync(dshDir, { recursive: true });
	} catch {}
	return path.join(dshDir, "token-usage-pricing.json");
}
function loadPersistedPricing() {
	try {
		const file = getPricingStoragePath();
		if (existsSync(file)) {
			const raw = readFileSync(file, "utf8").replace(/^\uFEFF/, "");
			return JSON.parse(raw);
		}
	} catch (err) {
		console.error("[token-usage-stats] failed to read token-usage-pricing.json:", err);
	}
}
function savePersistedPricing(payload) {
	writeFileSync(getPricingStoragePath(), JSON.stringify(payload, null, 2), "utf8");
}
const ZSTD_MAGIC = 4247762216;
function scanConcatenatedZstdFrames(buffer) {
	const frames = [];
	let offset = 0;
	while (offset < buffer.length) {
		const start = offset;
		if (buffer.length - offset < 4) break;
		if (buffer.readUInt32LE(offset) !== ZSTD_MAGIC) break;
		offset += 4;
		if (offset === buffer.length) break;
		const descriptor = buffer.readUInt8(offset);
		offset += 1;
		const contentSizeFlag = descriptor >>> 6;
		const singleSegment = (descriptor & 32) !== 0;
		const checksum = (descriptor & 4) !== 0;
		const dictionaryFlag = descriptor & 3;
		const dictionaryBytes = dictionaryFlag === 3 ? 4 : dictionaryFlag;
		const contentSizeBytes = contentSizeFlag === 0 ? singleSegment ? 1 : 0 : 1 << contentSizeFlag;
		const remainingHeaderBytes = (singleSegment ? 0 : 1) + dictionaryBytes + contentSizeBytes;
		if (buffer.length - offset < remainingHeaderBytes) break;
		offset += remainingHeaderBytes;
		for (;;) {
			if (buffer.length - offset < 3) break;
			const blockHeader = buffer.readUIntLE(offset, 3);
			offset += 3;
			const lastBlock = (blockHeader & 1) !== 0;
			const blockType = blockHeader >>> 1 & 3;
			const blockSize = blockHeader >>> 3;
			const payloadBytes = blockType === 1 ? 1 : blockSize;
			if (buffer.length - offset < payloadBytes) break;
			offset += payloadBytes;
			if (lastBlock) break;
		}
		if (checksum) {
			if (buffer.length - offset < 4) break;
			offset += 4;
		}
		frames.push({
			start,
			end: offset
		});
	}
	return frames;
}
async function decompressConcatenatedZstd(buffer) {
	const frames = scanConcatenatedZstdFrames(buffer);
	if (frames.length === 0) return await new Promise((resolve) => {
		zstdDecompress(buffer, (err, out) => {
			if (err || !out) resolve("");
			else resolve(out.toString("utf8"));
		});
	});
	let result = "";
	for (const f of frames) {
		const slice = buffer.subarray(f.start, f.end);
		const chunk = await new Promise((resolve) => {
			zstdDecompress(slice, (err, out) => {
				if (err || !out) resolve("");
				else resolve(out.toString("utf8"));
			});
		});
		result += chunk;
	}
	return result;
}
const DEFAULT_PEAK_INTERVALS = [{
	start: "09:00",
	end: "12:00"
}, {
	start: "14:00",
	end: "18:00"
}];
function parseTimeString(timeStr, field) {
	if (typeof timeStr !== "string") throw new Error(`TokenUsageStatsConfig: peakSchedule interval "${field}" must be a string, got ${typeof timeStr}`);
	const clean = timeStr.replace(/：/g, ":").trim().replace(/\s+/g, "");
	const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(clean);
	if (!match) throw new Error(`TokenUsageStatsConfig: peakSchedule interval "${field}" must be "HH:MM" (00:00 - 23:59), got "${timeStr}"`);
	const h = Number.parseInt(match[1], 10);
	const m = Number.parseInt(match[2], 10);
	const formatted = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
	return {
		minutes: h * 60 + m,
		formatted
	};
}
/** The four per-million price fields, in a stable order for comparisons. */
const PRICING_KEY_LIST = [
	"uncachedInputPerMillion",
	"cacheReadPerMillion",
	"cacheWritePerMillion",
	"outputPerMillion"
];
const PRICING_KEYS = new Set(PRICING_KEY_LIST);
/**
* Compare two price entries by the numbers that can bill a request. An omitted
* field equals an explicit `0`, so a user who writes `cacheWritePerMillion: 0`
* over a default that leaves it out still counts as unchanged.
*/
function samePricing(left, right) {
	const tieredLeft = left.peak !== void 0 || left.offpeak !== void 0;
	if (tieredLeft !== (right.peak !== void 0 || right.offpeak !== void 0)) return false;
	if (tieredLeft) {
		for (const tier of ["peak", "offpeak"]) {
			const a = left[tier];
			const b = right[tier];
			if (a === void 0 || b === void 0) {
				if (a !== b) return false;
				continue;
			}
			for (const key of PRICING_KEY_LIST) if ((a[key] ?? 0) !== (b[key] ?? 0)) return false;
		}
		return true;
	}
	for (const key of PRICING_KEY_LIST) if ((left[key] ?? 0) !== (right[key] ?? 0)) return false;
	return true;
}
/**
* Drop configured prices that merely restate the built-in default.
*
* The dashboard editor shows the whole effective book, so a save would
* otherwise persist all ~96 defaults and pin them against future plugin
* updates. Only genuine differences (and keys the built-in book does not
* know) are kept; costing is unchanged because the built-in book supplies the
* dropped values.
*/
function pruneRedundantPricing(pricing) {
	const kept = {};
	for (const [model, price] of Object.entries(pricing)) {
		const builtin = BUILTIN_PRICING[model];
		if (builtin === void 0 || !samePricing(price, builtin)) kept[model] = price;
	}
	return kept;
}
/**
* Upper bound on series buckets. Guards the unauthenticated API against
* range amplification (`from=0&granularity=hour` alone would allocate ~496k
* buckets from epoch). Hourly buckets cover ~13 months and daily ~27 years,
* so legitimate dashboard ranges stay under the cap; an explicit or implied
* wider range is rejected as a query error.
*/
const MAX_SERIES_BUCKETS = 1e4;
function isNonNegativeFinite(value) {
	return typeof value === "number" && Number.isFinite(value) && value >= 0;
}
/** Reject stale or misspelled keys and malformed pricing before defaults can hide them. */
function validateConfig(config) {
	if (typeof config !== "object" || Array.isArray(config)) throw new Error("TokenUsageStatsConfig: config must be an object");
	const allowed = /* @__PURE__ */ new Set([
		"currency",
		"pricing",
		"peakSchedule"
	]);
	for (const key of Object.keys(config)) if (!allowed.has(key)) throw new Error(`TokenUsageStatsConfig: unknown key "${key}"`);
	const currency = config.currency ?? "CNY";
	if (typeof currency !== "string" || currency.length === 0) throw new Error("TokenUsageStatsConfig: currency must be a non-empty string");
	let weekendOffpeak = true;
	const intervals = [];
	if (config.peakSchedule !== void 0) {
		if (typeof config.peakSchedule !== "object" || Array.isArray(config.peakSchedule)) throw new Error("TokenUsageStatsConfig: peakSchedule must be an object");
		if (config.peakSchedule.weekendOffpeak !== void 0) {
			if (typeof config.peakSchedule.weekendOffpeak !== "boolean") throw new Error("TokenUsageStatsConfig: peakSchedule.weekendOffpeak must be a boolean");
			weekendOffpeak = config.peakSchedule.weekendOffpeak;
		}
		const rawIntervals = config.peakSchedule.intervals ?? DEFAULT_PEAK_INTERVALS;
		if (!Array.isArray(rawIntervals)) throw new Error("TokenUsageStatsConfig: peakSchedule.intervals must be an array");
		for (let i = 0; i < rawIntervals.length; i++) {
			const item = rawIntervals[i];
			if (typeof item !== "object" || item === null) throw new Error(`TokenUsageStatsConfig: peakSchedule.intervals[${i}] must be an object`);
			const parsedStart = parseTimeString(item.start, `intervals[${i}].start`);
			const parsedEnd = parseTimeString(item.end, `intervals[${i}].end`);
			intervals.push({
				start: parsedStart.formatted,
				end: parsedEnd.formatted,
				startMinutes: parsedStart.minutes,
				endMinutes: parsedEnd.minutes
			});
		}
	} else for (const item of DEFAULT_PEAK_INTERVALS) intervals.push({
		start: item.start,
		end: item.end,
		startMinutes: parseTimeString(item.start, "default.start").minutes,
		endMinutes: parseTimeString(item.end, "default.end").minutes
	});
	const parseTier = (value, path) => {
		for (const key of Object.keys(value)) if (!PRICING_KEYS.has(key)) throw new Error(`TokenUsageStatsConfig: pricing "${path}" has unknown key "${key}"`);
		const tier = {};
		const check = (key) => {
			const entry = value[key];
			if (entry !== void 0) {
				if (!isNonNegativeFinite(entry)) throw new Error(`TokenUsageStatsConfig: pricing "${path}.${key}" must be a non-negative finite number`);
				tier[key] = entry;
			}
		};
		check("uncachedInputPerMillion");
		check("cacheReadPerMillion");
		check("cacheWritePerMillion");
		check("outputPerMillion");
		return tier;
	};
	const pricing = {};
	if (config.pricing !== void 0) {
		if (typeof config.pricing !== "object" || Array.isArray(config.pricing)) throw new Error("TokenUsageStatsConfig: pricing must be a record");
		for (const [model, value] of Object.entries(config.pricing)) {
			if (model.length === 0) throw new Error("TokenUsageStatsConfig: pricing model must be a non-empty string");
			if (typeof value !== "object" || Array.isArray(value)) throw new Error(`TokenUsageStatsConfig: pricing for "${model}" must be an object`);
			const keys = Object.keys(value);
			const hasTier = keys.includes("peak") || keys.includes("offpeak");
			const allowed = new Set(hasTier ? [
				...PRICING_KEYS,
				"peak",
				"offpeak"
			] : [...PRICING_KEYS]);
			for (const key of keys) if (!allowed.has(key)) throw new Error(`TokenUsageStatsConfig: pricing for "${model}" has unknown key "${key}"`);
			const price = {};
			if (hasTier) {
				if (value.peak !== void 0) {
					if (typeof value.peak !== "object" || Array.isArray(value.peak)) throw new Error(`TokenUsageStatsConfig: pricing "${model}.peak" must be an object`);
					price.peak = deepFreeze(parseTier(value.peak, `${model}.peak`));
				}
				if (value.offpeak !== void 0) {
					if (typeof value.offpeak !== "object" || Array.isArray(value.offpeak)) throw new Error(`TokenUsageStatsConfig: pricing "${model}.offpeak" must be an object`);
					price.offpeak = deepFreeze(parseTier(value.offpeak, `${model}.offpeak`));
				}
			} else {
				const tier = parseTier(value, model);
				if (tier.uncachedInputPerMillion !== void 0) price.uncachedInputPerMillion = tier.uncachedInputPerMillion;
				if (tier.cacheReadPerMillion !== void 0) price.cacheReadPerMillion = tier.cacheReadPerMillion;
				if (tier.cacheWritePerMillion !== void 0) price.cacheWritePerMillion = tier.cacheWritePerMillion;
				if (tier.outputPerMillion !== void 0) price.outputPerMillion = tier.outputPerMillion;
			}
			pricing[model] = deepFreeze(price);
		}
	}
	return deepFreeze({
		...currency === void 0 ? {} : { currency },
		peakSchedule: deepFreeze({
			weekendOffpeak,
			intervals: deepFreeze(intervals)
		}),
		pricing: deepFreeze(pricing)
	});
}
/** Floor a timestamp to a UTC hour or day boundary. */
function startOfBucket(time, granularity) {
	const date = new Date(time);
	if (granularity === "day") date.setUTCHours(0, 0, 0, 0);
	else date.setUTCMinutes(0, 0, 0);
	return date.getTime();
}
/**
* Replay-aware cross-session usage analytics service.
*
* The service observes `session/event`, replays already-live sessions on mount,
* and keeps per-step usage samples so a later final `assistant/message` replaces
* an earlier usage chunk instead of double counting. Request counts come from
* each completed `assistant/message` (one per model call).
*/
var TokenUsageStats = class extends Service {
	static inject = ["sessions"];
	static Config = z.object({});
	config;
	usageByStep = /* @__PURE__ */ new Map();
	usageRecords = [];
	requestByStep = /* @__PURE__ */ new Map();
	requestRecords = [];
	states = /* @__PURE__ */ new WeakMap();
	persistedSeq = /* @__PURE__ */ new Map();
	persistedRevisions = /* @__PURE__ */ new Map();
	/** Latest folded `session/title` text per session (last-wins). */
	titles = /* @__PURE__ */ new Map();
	/** Persistent map from sessionId to last detected model/provider. */
	sessionModels = /* @__PURE__ */ new Map();
	persistence;
	lastRehydrateTime = 0;
	rehydrating;
	firstRehydratePromise;
	isFirstRehydrated = false;
	/** Trigger non-blocking background rehydration throttled to at most once per 4 seconds. */
	async _scheduleRehydrate() {
		const now = Date.now();
		if (now - this.lastRehydrateTime < 4e3 || this.rehydrating !== void 0) return;
		this.lastRehydrateTime = now;
		try {
			this.rehydrating = this._rehydrate();
			await this.rehydrating;
		} catch {} finally {
			this.rehydrating = void 0;
		}
	}
	constructor(ctx, config = {}) {
		super(ctx, "tokenUsageStats");
		const persisted = loadPersistedPricing();
		const merged = persisted ? {
			...config,
			...persisted,
			pricing: {
				...config.pricing ?? {},
				...persisted.pricing ?? {}
			}
		} : config;
		this.config = validateConfig(merged);
		for (const session of ctx.sessions.list()) this._sync(session);
		this.firstRehydratePromise = this._rehydrate().then(() => {
			this.isFirstRehydrated = true;
		}, (error) => {
			this.isFirstRehydrated = true;
			this.ctx.logger.warn(`token usage stats: initial rehydration failed: ${String(error)}`);
		});
		ctx.inject(["sessionPersistence"], (persistenceCtx) => {
			this.persistence = persistenceCtx.sessionPersistence;
		});
		ctx.inject(["webServer"], (webCtx) => {
			webCtx.effect(() => {
				const removePage = webCtx.webServer.register({
					kind: "exact",
					path: "/token-usage-stats",
					handler: (req, res) => {
						if (req.method !== "GET" && req.method !== "HEAD") {
							res.writeHead(405);
							res.end();
							return;
						}
						res.writeHead(200, {
							"content-type": "text/html; charset=utf-8",
							"cache-control": "no-store"
						});
						if (req.method === "HEAD") res.end();
						else res.end(renderUsageDashboard(BUILTIN_PRICING));
					}
				});
				const removeApi = webCtx.webServer.register({
					kind: "exact",
					path: "/api/token-usage-stats",
					handler: async (req, res) => {
						if (req.method !== "GET" && req.method !== "HEAD") {
							res.writeHead(405);
							res.end();
							return;
						}
						if (!this.isFirstRehydrated && this.firstRehydratePromise) await this.firstRehydratePromise;
						this._scheduleRehydrate();
						const url = new URL(req.url ?? "/", "http://x");
						let snapshot;
						try {
							snapshot = this.snapshot(parseTokenUsageStatsQuery(url.searchParams));
						} catch (error) {
							res.writeHead(400, {
								"content-type": "application/json; charset=utf-8",
								"cache-control": "no-store"
							});
							res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
							return;
						}
						res.writeHead(200, {
							"content-type": "application/json; charset=utf-8",
							"cache-control": "no-store"
						});
						if (req.method === "HEAD") res.end();
						else res.end(JSON.stringify(snapshot));
					}
				});
				const removePricingApi = webCtx.webServer.register({
					kind: "exact",
					path: "/api/token-usage-stats/pricing",
					handler: (req, res) => {
						if (req.method === "GET") {
							res.writeHead(200, {
								"content-type": "application/json; charset=utf-8",
								"cache-control": "no-store"
							});
							res.end(JSON.stringify(this.getPricingConfigView()));
							return;
						}
						if (req.method === "POST") {
							let body = "";
							req.setEncoding("utf8");
							req.on("data", (chunk) => {
								body += chunk;
							});
							req.on("end", () => {
								try {
									const payload = JSON.parse(body);
									this.updatePricingConfig(payload);
									res.writeHead(200, {
										"content-type": "application/json; charset=utf-8",
										"cache-control": "no-store"
									});
									res.end(JSON.stringify({ ok: true }));
								} catch (error) {
									res.writeHead(400, {
										"content-type": "application/json; charset=utf-8",
										"cache-control": "no-store"
									});
									res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
								}
							});
							return;
						}
						res.writeHead(405);
						res.end();
					}
				});
				return () => {
					removePage();
					removeApi();
					removePricingApi();
				};
			}, "token-usage-stats: dashboard routes");
		});
		ctx.on("session/event", (session) => {
			this._sync(session);
		});
	}
	/** Return the currently effective pricing settings and schedule. */
	getPricingConfig() {
		const rawPricing = {};
		for (const [model, p] of Object.entries(this.config.pricing)) rawPricing[model] = p;
		return {
			...this.config.currency === void 0 ? {} : { currency: this.config.currency },
			peakSchedule: {
				weekendOffpeak: this.config.peakSchedule.weekendOffpeak,
				intervals: this.config.peakSchedule.intervals.map(({ start, end }) => ({
					start,
					end
				}))
			},
			pricing: rawPricing
		};
	}
	/**
	* Return the price book as the dashboard editor needs it: every key that can
	* bill a request, with the built-in defaults alongside so the page can badge
	* user overrides.
	*
	* Unlike {@link getPricingConfig}, `pricing` here is the effective book —
	* built-in defaults with configuration and persisted prices layered on top —
	* matching what {@link _resolvePricing} actually charges.
	*/
	getPricingConfigView() {
		const config = this.config.pricing;
		const effective = {};
		for (const [model, price] of Object.entries(BUILTIN_PRICING)) effective[model] = price;
		for (const [model, price] of Object.entries(config)) effective[model] = price;
		const overriddenModels = [];
		for (const [model, price] of Object.entries(config)) {
			const builtin = BUILTIN_PRICING[model];
			if (builtin === void 0 || !samePricing(price, builtin)) overriddenModels.push(model);
		}
		return {
			...this.getPricingConfig(),
			pricing: effective,
			builtinPricing: { ...BUILTIN_PRICING },
			overriddenModels
		};
	}
	/** Atomically persist and immediately apply updated pricing rules. */
	updatePricingConfig(payload) {
		const pricing = pruneRedundantPricing(payload.pricing);
		const resolved = validateConfig({
			...payload.currency === void 0 ? {} : { currency: payload.currency },
			...payload.peakSchedule === void 0 ? {} : { peakSchedule: payload.peakSchedule },
			pricing
		});
		savePersistedPricing({
			...payload.currency === void 0 ? {} : { currency: payload.currency },
			...payload.peakSchedule === void 0 ? {} : { peakSchedule: payload.peakSchedule },
			pricing
		});
		this.config = resolved;
	}
	/**
	* Return a detached immutable analytics snapshot.
	* @param query - optional time/model/granularity filters.
	* @returns aggregate totals, per-model totals, and time-bucketed series.
	* @throws RangeError when the filtered series range would exceed the
	*   {@link MAX_SERIES_BUCKETS} bucket cap (an explicit from/to spanning too
	*   wide, or records so far apart they imply more buckets than the cap).
	*/
	snapshot(query = {}) {
		const from = query.from;
		const to = query.to;
		const model = query.model;
		const granularity = query.granularity ?? "hour";
		const inRange = (time) => (from === void 0 || time >= from) && (to === void 0 || time <= to);
		const matches = (value) => model === void 0 || value === model;
		const usageRecords = this.usageRecords.filter((record) => inRange(record.time) && matches(record.model));
		const requestRecords = this.requestRecords.filter((record) => inRange(record.time) && matches(record.model));
		return deepFreeze({
			...this.config.currency === void 0 ? {} : { currency: this.config.currency },
			totals: this._totals(usageRecords, requestRecords.length),
			models: this._models(usageRecords, requestRecords),
			series: this._series(usageRecords, requestRecords, from, to, granularity),
			topSessions: this._topSessions(usageRecords, requestRecords)
		});
	}
	/** Catch one session's fold up to the current durable tail. */
	_sync(session) {
		let state = this.states.get(session);
		if (state === void 0) {
			const remembered = this.sessionModels.get(session.id);
			state = {
				consumedEvents: this.persistedSeq.get(session.id) ?? 0,
				provider: remembered?.provider,
				model: remembered?.model
			};
			this.states.set(session, state);
		}
		const events = session.events ?? session.snapshotEvents();
		if (!state.model && events.length > 0) {
			for (let i = 0; i < events.length; i++) {
				const ev = events[i];
				if (ev?.type === "request/context") {
					state.provider = ev.data.provider;
					state.model = ev.data.model;
					if (state.model) break;
				} else if (ev?.type === "request/header") {
					state.provider = ev.data.header.config.provider;
					state.model = ev.data.header.config.model;
					if (state.model) break;
				}
			}
			if (state.model) this.sessionModels.set(session.id, {
				provider: state.provider,
				model: state.model
			});
		}
		while (state.consumedEvents < events.length) {
			const event = events[state.consumedEvents];
			this._foldEvent(session.id, state, event);
			state.consumedEvents += 1;
		}
	}
	/**
	* Directly read and parse session events from a specific log file,
	* handling concatenated Zstandard frames and plain JSONL.
	*/
	async _readEventsFromFile(targetFile) {
		const isZstd = targetFile.endsWith(".zstd");
		let rawText = "";
		try {
			if (isZstd) rawText = await decompressConcatenatedZstd(readFileSync(targetFile));
			else rawText = readFileSync(targetFile, "utf8");
		} catch {
			return [];
		}
		if (!rawText) return [];
		const lines = rawText.trim().split("\n");
		const events = [];
		for (let i = 1; i < lines.length; i++) {
			const line = lines[i].trim();
			if (!line) continue;
			try {
				const ev = JSON.parse(line);
				if (ev && typeof ev === "object" && typeof ev.type === "string") events.push(ev);
			} catch {}
		}
		return events;
	}
	/**
	* Discover all stored sessions across all workspace project directories and all
	* format generations (session.jsonl.zstd, session.v1.jsonl, session.v2.jsonl.zstd, etc.).
	*/
	_discoverAllPersistedSessions() {
		const root = this.persistence?.root ?? path.join(os.homedir(), ".dsh", "sessions");
		if (!existsSync(root)) return [];
		const targets = [];
		const seenIds = /* @__PURE__ */ new Set();
		let projects = [];
		try {
			projects = readdirSync(root);
		} catch {
			return [];
		}
		for (const p of projects) {
			const pPath = path.join(root, p);
			try {
				if (!statSync(pPath).isDirectory()) continue;
			} catch {
				continue;
			}
			let sDirs = [];
			try {
				sDirs = readdirSync(pPath);
			} catch {
				continue;
			}
			for (const s of sDirs) {
				if (seenIds.has(s)) continue;
				const sPath = path.join(pPath, s);
				try {
					if (!statSync(sPath).isDirectory()) continue;
					const files = readdirSync(sPath).filter((f) => f.startsWith("session") && (f.endsWith(".zstd") || f.endsWith(".jsonl")));
					if (files.length === 0) continue;
					files.sort().reverse();
					const targetFile = path.join(sPath, files[0]);
					const st = statSync(targetFile);
					const revision = `${Math.floor(st.mtimeMs)}-${st.size}`;
					seenIds.add(s);
					targets.push({
						id: s,
						filePath: targetFile,
						revision
					});
				} catch {}
			}
		}
		return targets;
	}
	/**
	* Replay materialized persisted sessions so a process restart keeps the
	* aggregate. Live sessions are skipped: their constructor-time sync already
	* counted the same log, and a persisted session opened later starts its live
	* fold after the replayed seq.
	*/
	async _rehydrate(sessionPersistence) {
		const sp = sessionPersistence ?? this.persistence;
		if (sp) this.persistence = sp;
		const discovered = this._discoverAllPersistedSessions();
		for (const item of discovered) {
			const id = item.id;
			const rev = item.revision;
			const lastRev = this.persistedRevisions.get(id);
			const lastSeq = this.persistedSeq.get(id) ?? 0;
			if (rev !== void 0 && lastRev !== void 0 && lastRev === rev && lastSeq > 0) continue;
			await new Promise((resolve) => setImmediate(resolve));
			const events = await this._readEventsFromFile(item.filePath);
			if (rev !== void 0) this.persistedRevisions.set(id, rev);
			if (events.length <= lastSeq) continue;
			this.persistedSeq.set(id, events.length);
			const live = this.ctx.sessions.get(id);
			if (live !== void 0) {
				const liveState = this.states.get(live);
				if (liveState !== void 0 && liveState.consumedEvents >= events.length) continue;
			}
			const remembered = this.sessionModels.get(id);
			const state = {
				consumedEvents: lastSeq,
				provider: remembered?.provider,
				model: remembered?.model
			};
			if (!state.model && events.length > 0) {
				for (let i = 0; i < events.length; i++) {
					const ev = events[i];
					if (ev?.type === "request/context") {
						state.provider = ev.data.provider;
						state.model = ev.data.model;
						if (state.model) break;
					} else if (ev?.type === "request/header") {
						state.provider = ev.data.header.config.provider;
						state.model = ev.data.header.config.model;
						if (state.model) break;
					}
				}
				if (state.model) this.sessionModels.set(id, {
					provider: state.provider,
					model: state.model
				});
			}
			for (let i = lastSeq; i < events.length; i++) {
				this._foldEvent(id, state, events[i]);
				state.consumedEvents += 1;
			}
		}
	}
	/** Fold one event into route state and aggregate records. */
	_foldEvent(session, state, event) {
		switch (event.type) {
			case "request/header": {
				const config = event.data.header.config;
				state.provider = config.provider;
				state.model = config.model;
				if (state.model) this.sessionModels.set(session, {
					provider: state.provider,
					model: state.model
				});
				break;
			}
			case "request/context":
				state.provider = event.data.provider;
				state.model = event.data.model;
				if (state.model) this.sessionModels.set(session, {
					provider: state.provider,
					model: state.model
				});
				break;
			case "assistant/message":
				this._recordRequest(session, state, event.time, event.data.turn, event.data.step);
				if (event.data.usage !== void 0) this._recordUsage(session, state, event.time, event.data.turn, event.data.step, event.data.usage);
				break;
			case "session/title":
				this.titles.set(session, event.data.title);
				break;
			default: {
				const rawEvent = event;
				if (rawEvent.type === "assistant/chunk" && rawEvent.data?.chunk?.type === "usage" && rawEvent.data.chunk.usage) this._recordUsage(session, state, rawEvent.time, rawEvent.data.turn ?? 0, rawEvent.data.step ?? 0, rawEvent.data.chunk.usage);
				break;
			}
		}
	}
	/** Record one provider usage sample, replacing any earlier same-step sample. */
	_recordUsage(sessionId, state, time, turn, step, usage) {
		const key = `${sessionId}:${turn}:${step}`;
		const record = {
			sessionId,
			time,
			provider: state.provider ?? "unknown",
			model: state.model ?? "unknown",
			turn,
			step,
			usage
		};
		const existingIndex = this.usageByStep.get(key);
		if (existingIndex !== void 0) this.usageRecords[existingIndex] = record;
		else {
			this.usageByStep.set(key, this.usageRecords.length);
			this.usageRecords.push(record);
		}
	}
	/** Record one dispatched request for count bucketing, replacing any earlier same-step record. */
	_recordRequest(sessionId, state, time, turn, step) {
		const key = `${sessionId}:${turn ?? "0"}:${step ?? "0"}`;
		const record = {
			sessionId,
			time,
			provider: state.provider ?? "unknown",
			model: state.model ?? "unknown"
		};
		const existingIndex = this.requestByStep.get(key);
		if (existingIndex !== void 0) this.requestRecords[existingIndex] = record;
		else {
			this.requestByStep.set(key, this.requestRecords.length);
			this.requestRecords.push(record);
		}
	}
	/**
	* True during configured peak intervals.
	* Weekends (Beijing Saturday/Sunday) are off-peak when weekendOffpeak is true.
	* Beijing time is fixed UTC+8, so reading UTC fields of a +8-shifted epoch
	* yields the Beijing wall-clock date, hour, and minute.
	* @param time - the usage record's time (Unix ms).
	*/
	_isPeak(time) {
		const beijing = new Date(time + 8 * 36e5);
		const day = beijing.getUTCDay();
		if (this.config.peakSchedule.weekendOffpeak && (day === 0 || day === 6)) return false;
		const minutes = beijing.getUTCHours() * 60 + beijing.getUTCMinutes();
		for (const interval of this.config.peakSchedule.intervals) if (minutes >= interval.startMinutes && minutes < interval.endMinutes) return true;
		return false;
	}
	/**
	* Resolve pricing for a provider-reported model id.
	*
	* Precedence: the user's own configuration first — both the verbatim id and
	* the built-in key it resolves to, so a configured `deepseek-flash` also
	* covers a provider that reports `deepseek-v4.1-flash` — then the built-in
	* price book. An id in neither stays unpriced rather than being charged at
	* another model's rate.
	* @param model - provider-reported model id.
	*/
	_resolvePricing(model) {
		const direct = this.config.pricing[model];
		if (direct !== void 0) return direct;
		const key = resolveBuiltinPricingKey(model);
		if (key === void 0) return void 0;
		return this.config.pricing[key] ?? BUILTIN_PRICING[key];
	}
	/**
	* Look up a model's configured price key, picking peak/off-peak when
	* the model is tiered, else the flat top-level key.
	* @param model - provider model id.
	* @param time - the usage record's time (Unix ms) used to pick the tier.
	* @param key - the price key to read.
	*/
	_price(model, time, key) {
		const price = this._resolvePricing(model);
		if (price === void 0) return void 0;
		if (price.peak !== void 0 || price.offpeak !== void 0) return (this._isPeak(time) ? price.peak ?? price.offpeak : price.offpeak ?? price.peak)?.[key];
		return price[key];
	}
	/** Compute cost for one usage record, or undefined when no pricing is configured. */
	_costFor(model, usage, time) {
		if (this._resolvePricing(model) === void 0) return void 0;
		return (usage.inputTokens * (this._price(model, time, "uncachedInputPerMillion") ?? 0) + (usage.cacheReadTokens ?? 0) * (this._price(model, time, "cacheReadPerMillion") ?? 0) + (usage.cacheWriteTokens ?? 0) * (this._price(model, time, "cacheWritePerMillion") ?? 0) + usage.outputTokens * (this._price(model, time, "outputPerMillion") ?? 0)) / 1e6;
	}
	/** Aggregate a set of usage records and a request count. */
	_totals(usageRecords, requestCount) {
		const totals = {
			requestCount,
			uncachedInputTokens: 0,
			cacheReadTokens: 0,
			cacheWriteTokens: 0,
			outputTokens: 0,
			totalTokens: 0
		};
		let cost;
		for (const record of usageRecords) {
			totals.uncachedInputTokens += record.usage.inputTokens;
			totals.cacheReadTokens += record.usage.cacheReadTokens ?? 0;
			totals.cacheWriteTokens += record.usage.cacheWriteTokens ?? 0;
			totals.outputTokens += record.usage.outputTokens;
			const recordCost = this._costFor(record.model, record.usage, record.time);
			if (recordCost !== void 0) cost = (cost ?? 0) + recordCost;
		}
		totals.totalTokens = totals.uncachedInputTokens + totals.cacheReadTokens + totals.cacheWriteTokens + totals.outputTokens;
		if (cost !== void 0) totals.cost = cost;
		return totals;
	}
	/** Group usage and request records by provider/model pair. */
	_models(usageRecords, requestRecords) {
		const grouped = /* @__PURE__ */ new Map();
		for (const record of requestRecords) {
			const key = `${record.provider}\u0000${record.model}`;
			let group = grouped.get(key);
			if (group === void 0) {
				group = {
					provider: record.provider,
					model: record.model,
					requestCount: 0,
					usageRecords: []
				};
				grouped.set(key, group);
			}
			group.requestCount += 1;
		}
		for (const record of usageRecords) {
			const key = `${record.provider}\u0000${record.model}`;
			let group = grouped.get(key);
			if (group === void 0) {
				group = {
					provider: record.provider,
					model: record.model,
					requestCount: 0,
					usageRecords: []
				};
				grouped.set(key, group);
			}
			group.usageRecords.push(record);
		}
		return [...grouped.values()].map((group) => ({
			provider: group.provider,
			model: group.model,
			totals: this._totals(group.usageRecords, group.requestCount)
		}));
	}
	/** Bucket filtered records into contiguous UTC hour/day bins. */
	_series(usageRecords, requestRecords, from, to, granularity) {
		if (usageRecords.length === 0 && requestRecords.length === 0) return [];
		const times = [...usageRecords.map((record) => record.time), ...requestRecords.map((record) => record.time)];
		const minTime = Math.min(...times);
		const maxTime = Math.max(...times);
		const start = from ?? minTime;
		const end = to ?? maxTime;
		const bucketSize = granularity === "day" ? 864e5 : 36e5;
		const firstStart = startOfBucket(start, granularity);
		const bucketCount = Math.max(1, Math.floor((end - firstStart) / bucketSize) + 1);
		if (bucketCount > MAX_SERIES_BUCKETS) throw new RangeError(`token usage stats: series range spans ${bucketCount} ${granularity} buckets, exceeding the ${MAX_SERIES_BUCKETS} bucket limit (narrow the from/to range or choose a coarser granularity)`);
		const buckets = Array.from({ length: bucketCount }, (_, index) => ({
			startTime: firstStart + index * bucketSize,
			usageRecords: [],
			requestCount: 0
		}));
		for (const record of usageRecords) buckets[Math.min(buckets.length - 1, Math.max(0, Math.floor((record.time - firstStart) / bucketSize)))]?.usageRecords.push(record);
		for (const record of requestRecords) {
			const bucket = buckets[Math.min(buckets.length - 1, Math.max(0, Math.floor((record.time - firstStart) / bucketSize)))];
			if (bucket !== void 0) bucket.requestCount += 1;
		}
		return buckets.map((bucket) => {
			const byModel = /* @__PURE__ */ new Map();
			for (const record of bucket.usageRecords) {
				const cost = this._costFor(record.model, record.usage, record.time);
				if (cost !== void 0) byModel.set(record.model, (byModel.get(record.model) ?? 0) + cost);
			}
			return {
				startTime: bucket.startTime,
				endTime: bucket.startTime + bucketSize,
				totals: this._totals(bucket.usageRecords, bucket.requestCount),
				models: [...byModel.entries()].map(([model, cost]) => ({
					model,
					cost
				}))
			};
		});
	}
	/** Group filtered records by session and return the richest first (top 5). */
	_topSessions(usageRecords, requestRecords) {
		const bySession = /* @__PURE__ */ new Map();
		for (const record of usageRecords) {
			let entry = bySession.get(record.sessionId);
			if (entry === void 0) {
				entry = {
					usage: [],
					requests: 0,
					last: 0
				};
				bySession.set(record.sessionId, entry);
			}
			entry.usage.push(record);
			if (record.time > entry.last) entry.last = record.time;
		}
		for (const record of requestRecords) {
			const entry = bySession.get(record.sessionId);
			if (entry !== void 0) {
				entry.requests += 1;
				if (record.time > entry.last) entry.last = record.time;
			}
		}
		return [...bySession.entries()].map(([id, entry]) => ({
			id: String(id),
			title: this.titles.get(id) ?? null,
			lastTime: entry.last,
			totals: this._totals(entry.usage, entry.requests)
		})).sort((left, right) => (right.totals.cost ?? 0) - (left.totals.cost ?? 0) || right.totals.totalTokens - left.totals.totalTokens).slice(0, 5);
	}
};
//#endregion
export { TokenUsageStats, TokenUsageStats as default };
