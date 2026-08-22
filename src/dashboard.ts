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
  .chart { min-height: 280px; }
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
    <h2>消费金额（<span id="costCurrency" style="text-transform:uppercase">CNY</span>）</h2>
    <div id="costChart"></div>
  </section>

  <section class="card chart">
    <h2>Tokens 趋势</h2>
    <div id="series"></div>
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
  function compact(value) {
    var n = Number(value || 0)
    if (n < 1000) return String(n)
    if (n < 1000000) return (n / 1000).toFixed(n < 10000 ? 1 : 0) + 'K'
    if (n < 1000000000) return (n / 1000000).toFixed(n < 10000000 ? 1 : 0) + 'M'
    return (n / 1000000000).toFixed(1) + 'B'
  }
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
  // Tooltip head: one date for the day view (the bucket is a whole day), or a
  // start ~ end hour range for the hourly view.
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
      // A tiny value must stay visible: floor the bar at 0.8% (a visible sliver)
      // so a dominant category doesn't make the others vanish, and always label
      // the exact percentage next to the value.
      var width = value > 0 ? Math.max(0.8, pct) : 0
      return '<div class="bar-row">'
        + '<div class="name">' + esc(label) + '</div>'
        + '<div class="bar-track"><div class="bar-fill" style="width:' + width + '%;background:' + tokenColor(label) + '"></div></div>'
        + '<div class="value">' + number(value) + '<span class="pct">' + pct.toFixed(1) + '%</span></div>'
        + '</div>'
    }).join('')
  }
  function tokenColor(label) {
    // Blue family matching the provider dashboard tooltip.
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
    var rows = snapshot.models || []
    $('modelRows').innerHTML = rows.length === 0
      ? '<tr><td colspan="8" class="empty">暂无模型数据</td></tr>'
      : rows.map(function (entry) {
        var t = entry.totals
        return '<tr>'
          + '<td>' + esc(entry.model) + '</td>'
          + '<td>' + esc(entry.provider) + '</td>'
          + '<td>' + number(t.requestCount) + '</td>'
          + '<td>' + number(t.uncachedInputTokens) + '</td>'
          + '<td>' + number(t.cacheReadTokens) + '</td>'
          + '<td>' + number(t.outputTokens) + '</td>'
          + '<td>' + number(t.totalTokens) + '</td>'
          + '<td>' + esc(costText(snapshot, t)) + '</td>'
          + '</tr>'
      }).join('')
    var select = $('model')
    var selected = select.value
    var options = ['<option value="">全部</option>']
    rows.forEach(function (entry) {
      var selectedText = entry.model === selected ? ' selected' : ''
      options.push('<option value="' + esc(entry.model) + '"' + selectedText + '>' + esc(entry.model) + '</option>')
    })
    select.innerHTML = options.join('')
  }
  function modelColor(model, models) {
    var palette = ['#f97316', '#ea580c', '#fb923c', '#c2410c', '#fdba74', '#e8590c']
    var i = models.indexOf(model)
    return palette[(i < 0 ? 0 : i) % palette.length]
  }
  function costPrefix(snapshot) {
    var c = snapshot.currency
    return c === 'CNY' ? '¥' : (c ? c + ' ' : '')
  }
  // Stacked cost-by-model bars with a hover breakdown, mirroring the provider
  // dashboard: one bar per bucket, each segment a model's cost, tooltip shows
  // the bucket range, the total, and each model's contribution.
  function renderCostChart(series, granularity, snapshot) {
    var host = $('costChart')
    var prefix = costPrefix(snapshot)
    $('costCurrency').textContent = snapshot.currency || 'CNY'
    if (!series || series.length === 0) { host.innerHTML = '<div class="empty">当前范围暂无数据</div>'; return }
    var models = []
    var hasCost = false
    series.forEach(function (p) {
      (p.models || []).forEach(function (m) {
        if (models.indexOf(m.model) === -1) models.push(m.model)
        if (m.cost > 0) hasCost = true
      })
    })
    if (!hasCost) { host.innerHTML = '<div class="empty">当前范围暂无消费</div>'; return }
    var width = 900
    var height = 220
    var padX = 44
    var padY = 22
    var max = Math.max.apply(null, series.map(function (p) { return p.totals.cost || 0 }))
    if (!(max > 0)) max = 1
    var step = (width - padX * 2) / Math.max(1, series.length - 1)
    var barWidth = Math.min(step * 0.62, 48)
    var labelEvery = Math.max(1, Math.ceil(series.length / 12))
    var bars = []
    var labels = []
    series.forEach(function (p, index) {
      var x = padX + step * index
      var yCursor = height - padY
      var segs = (p.models || []).map(function (m) {
        var h = (m.cost || 0) / max * (height - padY * 2)
        var y = yCursor - h
        yCursor = y
        return '<rect class="bar" data-index="' + index + '" x="' + (x - barWidth/2).toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + barWidth.toFixed(1) + '" height="' + (h < 0.5 ? 0.5 : h).toFixed(1) + '" rx="2" style="fill:' + modelColor(m.model, models) + '"></rect>'
      }).join('')
      bars.push(segs)
      if (index % labelEvery === 0) {
        labels.push('<text x="' + x.toFixed(1) + '" y="' + (height - 5) + '" text-anchor="middle" fill="var(--muted)" font-size="10">' + esc(bucketLabel(p.startTime, granularity)) + '</text>')
      }
    })
    host.innerHTML = '<div class="chart-wrap">'
      + '<svg viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="消费金额趋势">'
      + '<line class="axis" x1="' + padX + '" y1="' + (height - padY) + '" x2="' + (width - padX) + '" y2="' + (height - padY) + '"></line>'
      + bars.join('') + labels.join('') + '</svg>'
      + '<div class="chart-tip" id="costTip"></div></div>'
    var wrap = host.querySelector('.chart-wrap')
    var tip = $('costTip')
    function showTip(index) {
      var p = series[index]
      var head = tooltipHead(p, granularity)
      var total = p.totals.cost || 0
      var rows = (p.models || []).map(function (m) {
        return '<div class="tip-row"><span class="dot" style="background:' + modelColor(m.model, models) + '"></span>'
          + esc(m.model) + '<span class="tip-val">' + prefix + number(m.cost) + '</span></div>'
      }).join('')
      tip.innerHTML = '<div class="tip-head"><span>' + esc(head) + '</span><span>' + prefix + number(total) + '</span></div>' + rows
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
  function rangeParams() {
    var range = $('range').value
    if (range === 'all') return new URLSearchParams()
    // Local midnight of today (or two/six days ago for the 3/7-day windows);
    // the service buckets on UTC-aligned hours, which align with whole-hour
    // local offsets, so the chart's hour labels match the user's clock.
    var from = new Date()
    from.setHours(0, 0, 0, 0)
    if (range === '3d') from.setDate(from.getDate() - 2)
    if (range === '7d') from.setDate(from.getDate() - 6)
    return new URLSearchParams({ from: String(from.getTime()) })
  }
  var rangeForcedDay = false
  // When the range is 近 7 天 or 全部, hourly buckets across many days are
  // unreadable, so force the daily view and disable the hourly option;
  // leaving those ranges restores the hourly default.
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
