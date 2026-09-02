/**
 * Static dashboard page for token-usage-stats. The page is deliberately
 * dependency-free: one HTML document fetches the sibling JSON endpoint and
 * renders cards, a series chart, a bucket breakdown, and a per-model table.
 *
 * @module @deepseek-ai/dsh-token-usage-stats-web/dashboard
 */

/**
 * HTML document rendered at `/token-usage-stats`.
 * @returns the complete self-contained dashboard document.
 */
export function renderUsageDashboard(): string {
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
    gap: 16px;
    padding: 14px 24px;
    background: var(--panel);
    border-bottom: 1px solid var(--line);
    flex-wrap: wrap;
  }
  header h1 { font-size: 18px; margin: 0; }
  .controls { display: flex; gap: 10px; align-items: center; margin-left: auto; flex-wrap: wrap; }
  select, button {
    border: 1px solid var(--line);
    background: var(--panel);
    color: var(--text);
    border-radius: 6px;
    padding: 6px 10px;
    font: inherit;
  }
  button { cursor: pointer; }
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
  svg { width: 100%; height: 230px; display: block; }
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

  /* 按钮与通用控件 */
  .btn-primary {
    background: var(--accent);
    color: #fff;
    border: 1px solid var(--accent);
    font-weight: 500;
  }
  .btn-primary:hover { opacity: 0.9; }
  .btn-secondary {
    background: var(--panel);
    color: var(--text);
  }
  .btn-secondary:hover { background: color-mix(in srgb, var(--line) 30%, transparent); }
  .btn-text {
    background: none;
    border: none;
    color: var(--accent);
    padding: 4px 8px;
    font-size: 13px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
  }
  .btn-text:hover { text-decoration: underline; }
  .btn-danger-text {
    background: none;
    border: none;
    color: #ef4444;
    padding: 4px 6px;
    font-size: 12px;
    cursor: pointer;
  }
  .btn-danger-text:hover { text-decoration: underline; }

  /* 模态框 Modal */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 999;
    background: rgba(0, 0, 0, 0.65);
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
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35);
    animation: modalIn 0.15s ease-out;
  }
  @keyframes modalIn {
    from { opacity: 0; transform: scale(0.97); }
    to { opacity: 1; transform: scale(1); }
  }
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--line);
  }
  .modal-header h2 { margin: 0; font-size: 16px; font-weight: 600; }
  .modal-close {
    background: none;
    border: none;
    font-size: 22px;
    line-height: 1;
    color: var(--muted);
    padding: 0 4px;
    cursor: pointer;
  }
  .modal-close:hover { color: var(--text); }
  .modal-body {
    padding: 20px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .modal-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px;
    border-top: 1px solid var(--line);
    background: color-mix(in srgb, var(--panel) 90%, var(--bg));
    border-bottom-left-radius: 12px;
    border-bottom-right-radius: 12px;
  }

  /* 时段与模型配置内部组件 */
  .schedule-box {
    background: color-mix(in srgb, var(--line) 20%, transparent);
    border: 1px dashed var(--line);
    border-radius: 8px;
    padding: 12px 16px;
  }
  .schedule-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    font-size: 13px;
    font-weight: 500;
  }
  .interval-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    font-size: 13px;
  }
  .time-input {
    width: 80px;
    text-align: center;
    padding: 4px 6px;
    font-variant-numeric: tabular-nums;
  }

  .model-card {
    background: color-mix(in srgb, var(--bg) 60%, transparent);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 14px;
    margin-bottom: 12px;
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
    font-size: 14px;
    width: 220px;
    padding: 4px 8px;
    border: 1px solid var(--line);
    border-radius: 4px;
    background: var(--panel);
    color: var(--text);
  }
  .tier-mode-toggle {
    display: flex;
    gap: 12px;
    font-size: 12px;
    color: var(--muted);
  }
  .tier-mode-toggle label { display: flex; align-items: center; gap: 4px; cursor: pointer; }
  .tier-mode-toggle input:checked + span { color: var(--accent); font-weight: 600; }

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
    padding: 10px 12px;
  }
  .tier-block-title {
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
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
    padding: 4px 6px;
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
    <button id="refresh">刷新</button>
    <button id="openPricingModal" class="btn-primary" type="button">⚙️ 价格配置</button>
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

  <p class="foot">数据来自当前进程内的 <code>ctx.tokenUsageStats</code>，页面自动每 10 秒刷新一次。成本只有在配置了模型定价时才会显示。</p>
</main>

<div id="pricingModal" class="modal-backdrop" hidden>
  <div class="modal-dialog">
    <div class="modal-header">
      <h2>⚙️ 模型价格策略配置</h2>
      <button type="button" class="modal-close" id="closePricingModal" aria-label="关闭">&times;</button>
    </div>
    <div class="modal-body">
      <div style="display:flex;align-items:center;gap:16px;">
        <label style="font-weight:600;font-size:13px;">计费货币：</label>
        <label style="cursor:pointer;display:inline-flex;align-items:center;gap:4px;"><input type="radio" name="pricingCurrency" value="CNY" checked> 人民币 (CNY / ¥)</label>
        <label style="cursor:pointer;display:inline-flex;align-items:center;gap:4px;"><input type="radio" name="pricingCurrency" value="USD"> 美元 (USD / $)</label>
      </div>

      <div class="schedule-box">
        <div class="schedule-head">
          <span>⏰ 峰谷时段规则定义（仅对开启分时计价的模型生效）</span>
          <label style="cursor:pointer;font-weight:normal;display:inline-flex;align-items:center;gap:4px;">
            <input type="checkbox" id="weekendOffpeak" checked> 周末全天视为闲时
          </label>
        </div>
        <div id="intervalsList"></div>
        <button type="button" class="btn-text" id="addIntervalBtn" style="margin-top:6px;">➕ 添加高峰时段</button>
      </div>

      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <h3 style="margin:0;font-size:14px;">模型价格列表（单位：货币 / 百万 Tokens）</h3>
          <button type="button" class="btn-text" id="addModelBtn">➕ 添加模型配置</button>
        </div>
        <div id="modelList"></div>
      </div>
    </div>
    <div class="modal-footer">
      <button type="button" id="resetDefaultBtn" class="btn-secondary">恢复官方默认</button>
      <div style="display:flex;gap:8px;">
        <button type="button" id="cancelPricingBtn" class="btn-secondary">取消</button>
        <button type="button" id="savePricingBtn" class="btn-primary">💾 保存并立即生效</button>
      </div>
    </div>
  </div>
</div>
<div id="toast" class="toast" hidden></div>

<script>
(function () {
  'use strict'
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
    if (granularity === 'day') {
      return (d.getMonth() + 1) + '/' + d.getDate()
    }
    return String(d.getHours()).padStart(2, '0') + ':00'
  }
  function tooltipHead(p, granularity) {
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
  function render(snapshot) {
    $('cost').textContent = costText(snapshot, snapshot.totals)
    $('currency').textContent = snapshot.currency || ''
    $('requests').textContent = number(snapshot.totals.requestCount)
    $('totalTokens').textContent = number(snapshot.totals.totalTokens)
    $('outputTokens').textContent = number(snapshot.totals.outputTokens)
    renderBreakdown(snapshot.totals)
    renderSeries(snapshot.series, $('granularity').value)
    renderCostChart(snapshot.series, $('granularity').value, snapshot)
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
    return new URLSearchParams({ from: String(from.getTime()) })
  }
  var rangeForcedDay = false
  function syncGranularity() {
    var g = $('granularity')
    var range = $('range').value
    var hourOpt = g.querySelector('option[value="hour"]')
    if (range === 'all' || range === '7d') {
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

  // --- 价格配置 Modal 控制逻辑 ---
  var defaultPricingConfig = {
    currency: 'CNY',
    peakSchedule: {
      weekendOffpeak: true,
      intervals: [
        { start: '09:00', end: '12:00' },
        { start: '14:00', end: '18:00' }
      ]
    },
    pricing: {
      'deepseek-v4-flash': {
        peak: {
          uncachedInputPerMillion: 3.0,
          cacheReadPerMillion: 0.1,
          cacheWritePerMillion: 0,
          outputPerMillion: 9.0
        },
        offpeak: {
          uncachedInputPerMillion: 1.5,
          cacheReadPerMillion: 0.05,
          cacheWritePerMillion: 0,
          outputPerMillion: 4.5
        }
      },
      'deepseek-chat': {
        uncachedInputPerMillion: 2.0,
        cacheReadPerMillion: 0.5,
        cacheWritePerMillion: 0,
        outputPerMillion: 8.0
      },
      'deepseek-reasoner': {
        uncachedInputPerMillion: 4.0,
        cacheReadPerMillion: 1.0,
        cacheWritePerMillion: 0,
        outputPerMillion: 16.0
      }
    }
  }

  function showToast(msg, isError) {
    var t = $('toast')
    t.textContent = msg
    t.className = isError ? 'toast error' : 'toast'
    t.hidden = false
    clearTimeout(t._timer)
    t._timer = setTimeout(function () { t.hidden = true }, 2800)
  }

  function renderIntervals(intervals) {
    var container = $('intervalsList')
    if (!intervals || intervals.length === 0) {
      container.innerHTML = '<div style="color:var(--muted);font-size:12px;padding:6px 0;">当前未设置高峰时段（全天按闲时计费）</div>'
      return
    }
    container.innerHTML = intervals.map(function (it, idx) {
      return '<div class="interval-row" data-idx="' + idx + '">'
        + '<span>高峰时段 ' + (idx + 1) + '：</span>'
        + '<input type="text" class="time-input start-time" value="' + esc(it.start) + '" placeholder="09:00" maxlength="5">'
        + '<span>至</span>'
        + '<input type="text" class="time-input end-time" value="' + esc(it.end) + '" placeholder="12:00" maxlength="5">'
        + '<button type="button" class="btn-danger-text del-interval-btn" data-idx="' + idx + '">删除</button>'
        + '</div>'
    }).join('')

    container.querySelectorAll('.del-interval-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.getAttribute('data-idx'), 10)
        var list = collectIntervals()
        list.splice(idx, 1)
        renderIntervals(list)
      })
    })
  }

  function collectIntervals() {
    var rows = document.querySelectorAll('#intervalsList .interval-row')
    var result = []
    rows.forEach(function (row) {
      var start = row.querySelector('.start-time').value.trim()
      var end = row.querySelector('.end-time').value.trim()
      if (start && end) {
        result.push({ start: start, end: end })
      }
    })
    return result
  }

  function renderPriceFields(prefix, tier) {
    var t = tier || {}
    return '<div class="field-grid">'
      + '<div class="price-field"><label>未缓存输入</label><input type="number" step="any" min="0" class="inp-' + prefix + '-uncached" value="' + (t.uncachedInputPerMillion != null ? t.uncachedInputPerMillion : '') + '"></div>'
      + '<div class="price-field"><label>缓存读取命中</label><input type="number" step="any" min="0" class="inp-' + prefix + '-cache-read" value="' + (t.cacheReadPerMillion != null ? t.cacheReadPerMillion : '') + '"></div>'
      + '<div class="price-field"><label>缓存写入</label><input type="number" step="any" min="0" class="inp-' + prefix + '-cache-write" value="' + (t.cacheWritePerMillion != null ? t.cacheWritePerMillion : '0') + '"></div>'
      + '<div class="price-field"><label>思考 / 输出</label><input type="number" step="any" min="0" class="inp-' + prefix + '-output" value="' + (t.outputPerMillion != null ? t.outputPerMillion : '') + '"></div>'
      + '</div>'
  }

  function renderModelCards(pricing) {
    var container = $('modelList')
    var entries = Object.entries(pricing)
    if (entries.length === 0) {
      container.innerHTML = '<div style="color:var(--muted);font-size:12px;padding:12px 0;">暂无模型配置，点击上方「➕ 添加模型配置」添加</div>'
      return
    }

    container.innerHTML = entries.map(function (item, idx) {
      var model = item[0]
      var val = item[1] || {}
      var isTiered = !!(val.peak || val.offpeak)
      var flat = !isTiered ? val : (val.peak || {})
      var peak = val.peak || {}
      var offpeak = val.offpeak || {}

      return '<div class="model-card" data-model-idx="' + idx + '">'
        + '<div class="model-card-head">'
        + '  <input type="text" class="model-name-input" value="' + esc(model) + '" placeholder="模型名称 (如 deepseek-chat)">'
        + '  <div class="tier-mode-toggle">'
        + '    <label><input type="radio" name="mode_' + idx + '" value="flat" ' + (!isTiered ? 'checked' : '') + '> <span>统一固定价格</span></label>'
        + '    <label><input type="radio" name="mode_' + idx + '" value="tiered" ' + (isTiered ? 'checked' : '') + '> <span>分时峰谷计价</span></label>'
        + '  </div>'
        + '  <button type="button" class="btn-danger-text del-model-btn" data-idx="' + idx + '">删除模型</button>'
        + '</div>'
        + '<div class="pricing-grids-container ' + (isTiered ? 'is-split' : '') + '">'
        + (isTiered
          ? ('<div class="tier-block">'
            + '<div class="tier-block-title">☀️ 高峰时段单价</div>'
            + renderPriceFields('peak', peak)
            + '</div>'
            + '<div class="tier-block">'
            + '<div class="tier-block-title">🌙 闲时/周末单价</div>'
            + renderPriceFields('offpeak', offpeak)
            + '</div>')
          : ('<div class="tier-block">'
            + '<div class="tier-block-title">⚡ 全天统一单价</div>'
            + renderPriceFields('flat', flat)
            + '</div>')
        )
        + '</div>'
        + '</div>'
    }).join('')

    container.querySelectorAll('.del-model-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.getAttribute('data-idx'), 10)
        var list = collectPricing()
        delete list[Object.keys(list)[idx]]
        renderModelCards(list)
      })
    })

    container.querySelectorAll('.model-card').forEach(function (card) {
      var radios = card.querySelectorAll('.tier-mode-toggle input[type="radio"]')
      radios.forEach(function (r) {
        r.addEventListener('change', function () {
          var p = collectPricing()
          renderModelCards(p)
        })
      })
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

  function collectPricing() {
    var cards = document.querySelectorAll('#modelList .model-card')
    var result = {}
    cards.forEach(function (card) {
      var name = card.querySelector('.model-name-input').value.trim()
      if (!name) return
      var modeRadio = card.querySelector('.tier-mode-toggle input:checked')
      var mode = modeRadio ? modeRadio.value : 'flat'
      if (mode === 'tiered') {
        result[name] = {
          peak: collectTierFromFields(card, 'peak'),
          offpeak: collectTierFromFields(card, 'offpeak'),
        }
      } else {
        result[name] = collectTierFromFields(card, 'flat')
      }
    })
    return result
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

    var pricing = data.pricing || defaultPricingConfig.pricing
    renderModelCards(pricing)
  }

  $('addIntervalBtn').addEventListener('click', function () {
    var list = collectIntervals()
    list.push({ start: '09:00', end: '12:00' })
    renderIntervals(list)
  })

  $('addModelBtn').addEventListener('click', function () {
    var list = collectPricing()
    var newKey = 'custom-model-' + (Object.keys(list).length + 1)
    list[newKey] = {
      uncachedInputPerMillion: 2.0,
      cacheReadPerMillion: 0.5,
      cacheWritePerMillion: 0,
      outputPerMillion: 8.0,
    }
    renderModelCards(list)
  })

  $('resetDefaultBtn').addEventListener('click', function () {
    if (confirm('确认恢复官方默认价格与时段配置吗？')) {
      populateModalForm(defaultPricingConfig)
    }
  })

  $('savePricingBtn').addEventListener('click', async function () {
    var currencyRadio = document.querySelector('input[name="pricingCurrency"]:checked')
    var currency = currencyRadio ? currencyRadio.value : 'CNY'
    var weekendOffpeak = $('weekendOffpeak').checked
    var intervals = collectIntervals()

    var timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/
    for (var i = 0; i < intervals.length; i++) {
      if (!timeRegex.test(intervals[i].start) || !timeRegex.test(intervals[i].end)) {
        showToast('高峰时段格式必须为 HH:MM (例如 09:00)', true)
        return
      }
    }

    var pricing = collectPricing()
    var payload = {
      currency: currency,
      peakSchedule: {
        weekendOffpeak: weekendOffpeak,
        intervals: intervals
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
</script>
</body>
</html>
`
}
