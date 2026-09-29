/* =========================================================
   /stats/ 站点统计页：读取 Umami 公开分享接口并渲染
   ---------------------------------------------------------
   为什么这么写：
   1) 不能用 iframe——Umami 的 CSP 是 frame-ancestors 'self'，博客域下嵌不进来；
      API 侧则开了 CORS（Access-Control-Allow-Origin: *），所以直接 fetch。
   2) pjax.js 用 innerHTML 换页，页内内联 <script> 不会执行 → 逻辑放全局文件，
      监听 pjax:done 重新初始化（与 site.js 的模式一致）。
   3) 数据获取与视图拼装分离：compose() 是纯函数（无 DOM），
      可直接用真实接口返回做单元测试；render() 只负责把结果写进 DOM。
   4) 每一个请求单独兜底，任何一个接口挂掉都不该让整页空掉。
   ========================================================= */
(function () {
  'use strict';

  /* ---------------- 纯函数层（可单测） ---------------- */

  /* Umami 的 totaltime 单位是秒 */
  function fmtDuration(seconds) {
    var s = Math.round(Number(seconds) || 0);
    if (s < 60) return s + ' 秒';
    var m = Math.floor(s / 60);
    if (m < 60) return m + ' 分 ' + (s % 60) + ' 秒';
    var h = Math.floor(m / 60);
    return h + ' 时 ' + (m % 60) + ' 分';
  }

  function fmtNumber(n) {
    var v = Number(n) || 0;
    return v.toLocaleString('zh-CN');
  }

  /* 百分比：whole 为 0 时返回 0，避免 NaN */
  function pct(part, whole) {
    var w = Number(whole) || 0;
    if (!w) return 0;
    return Math.round((Number(part) || 0) / w * 1000) / 10;
  }

  /* 与上一周期的对比：返回 null（无从比较）或 {dir:'up'|'down'|'flat', text:'+12.5%'} */
  function delta(current, previous) {
    var c = Number(current) || 0;
    var p = Number(previous) || 0;
    if (!p) return c ? { dir: 'up', text: '新增' } : null;
    var d = (c - p) / p * 100;
    var rounded = Math.round(d * 10) / 10;
    if (rounded === 0) return { dir: 'flat', text: '持平' };
    return { dir: rounded > 0 ? 'up' : 'down', text: (rounded > 0 ? '+' : '') + rounded + '%' };
  }

  /* 百分号编码路径还原为可读文本（与 track.js 的 readable() 同语义） */
  function readable(value) {
    var s = String(value == null ? '' : value);
    try {
      s = decodeURIComponent(s);
    } catch (err) { /* 保留原值 */ }
    return s.length > 120 ? s.slice(0, 120) + '…' : s;
  }

  var COUNTRY = {
    CN: '中国', US: '美国', JP: '日本', HK: '中国香港', TW: '中国台湾', SG: '新加坡',
    GB: '英国', DE: '德国', FR: '法国', CA: '加拿大', AU: '澳大利亚', RU: '俄罗斯',
    KR: '韩国', IN: '印度', BR: '巴西', NL: '荷兰', SE: '瑞典', CH: '瑞士',
    IT: '意大利', ES: '西班牙', MY: '马来西亚', TH: '泰国', VN: '越南', PH: '菲律宾',
  };

  /* metrics 接口统一返回 [{x,y}]；取出前 limit 条并算出相对最大值的条形宽度 */
  function toRows(list, limit, labeller) {
    var arr = Array.isArray(list) ? list.slice(0, limit) : [];
    var max = arr.reduce(function (m, r) { return Math.max(m, Number(r && r.y) || 0); }, 0);
    return arr.map(function (r) {
      var value = Number(r && r.y) || 0;
      var label = labeller ? labeller(r.x) : String(r && r.x);
      return {
        label: label,
        value: value,
        width: max ? Math.max(1, Math.round(value / max * 100)) : 0,
      };
    });
  }

  /* 把 8 个接口的返回拼成视图模型 */
  function compose(data) {
    var d = data || {};
    var stats = d.stats || {};
    var cmp = stats.comparison || {};
    var visits = Number(stats.visits) || 0;

    var cards = [
      { key: 'pageviews', label: '浏览量', value: fmtNumber(stats.pageviews), delta: delta(stats.pageviews, cmp.pageviews) },
      { key: 'visitors', label: '访客数', value: fmtNumber(stats.visitors), delta: delta(stats.visitors, cmp.visitors) },
      { key: 'visits', label: '会话数', value: fmtNumber(stats.visits), delta: delta(stats.visits, cmp.visits) },
      { key: 'bounces', label: '跳出率', value: pct(stats.bounces, visits) + '%', delta: null },
      { key: 'duration', label: '平均停留', value: fmtDuration(visits ? (Number(stats.totaltime) || 0) / visits : 0), delta: null },
    ];

    /* 趋势图：按天 */
    var pv = (d.pageviews && d.pageviews.pageviews) || [];
    var maxPv = pv.reduce(function (m, r) { return Math.max(m, Number(r.y) || 0); }, 0);
    var chart = pv.map(function (r) {
      var v = Number(r.y) || 0;
      return {
        label: String(r.x || '').slice(5, 10),
        value: v,
        height: maxPv ? Math.max(1, Math.round(v / maxPv * 100)) : 0,
      };
    });

    return {
      online: Number((d.active && d.active.visitors) || 0),
      cards: cards,
      chart: chart,
      chartRange: chart.length ? chart[0].label + ' – ' + chart[chart.length - 1].label : '',
      tables: [
        { title: '热门页面', icon: 'file', rows: toRows(d.path, 8, readable) },
        { title: '来源', icon: 'link', rows: toRows(d.referrer, 8, function (x) { return x ? readable(x) : '（直接访问）'; }) },
        { title: '地区', icon: 'globe', rows: toRows(d.country, 8, function (x) { return COUNTRY[x] ? COUNTRY[x] + ' · ' + x : x; }) },
        { title: '浏览器', icon: 'monitor', rows: toRows(d.browser, 6, String) },
        { title: '设备', icon: 'smartphone', rows: toRows(d.device, 4, function (x) { return x === 'mobile' ? '手机' : x === 'laptop' ? '笔记本' : x === 'desktop' ? '台式机' : x === 'tablet' ? '平板' : String(x); }) },
        { title: '事件', icon: 'target', rows: toRows(d.event, 8, String) },
      ].filter(function (t) { return t.rows.length > 0; }),
    };
  }

  /* ---------------- DOM 渲染层 ---------------- */

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function cardsHtml(cards) {
    return cards.map(function (c) {
      var d = c.delta
        ? '<span class="stats-delta is-' + c.delta.dir + '">' + esc(c.delta.text) + '</span>'
        : '';
      return '<div class="stats-card"><span class="stats-card-label">' + esc(c.label) + '</span>' +
        '<span class="stats-card-value">' + esc(c.value) + '</span>' + d + '</div>';
    }).join('');
  }

  function chartHtml(model) {
    if (!model.chart.length) return '<p class="stats-empty">这段时间还没有访问数据。</p>';
    var bars = model.chart.map(function (b) {
      return '<span class="stats-bar" style="height:' + b.height + '%" title="' + esc(b.label + ' · ' + b.value + ' 次浏览') + '"></span>';
    }).join('');
    return '<div class="stats-chart" role="img" aria-label="访问趋势 ' + esc(model.chartRange) + '">' + bars + '</div>' +
      '<div class="stats-chart-axis"><span>' + esc(model.chartRange.split(' – ')[0] || '') + '</span><span>' + esc(model.chartRange.split(' – ')[1] || '') + '</span></div>';
  }

  function tableHtml(t) {
    var rows = t.rows.map(function (r) {
      return '<tr><td class="stats-cell-label" title="' + esc(r.label) + '">' + esc(r.label) + '</td>' +
        '<td class="stats-cell-bar"><span style="width:' + r.width + '%"></span></td>' +
        '<td class="stats-cell-num">' + esc(fmtNumber(r.value)) + '</td></tr>';
    }).join('');
    return '<section class="stats-panel"><h2 class="stats-panel-title">' + esc(t.title) + '</h2>' +
      '<table class="stats-table"><tbody>' + rows + '</tbody></table></section>';
  }

  function render(root, model) {
    var body = root.querySelector('#stats-body');
    if (!body) return;
    var online = model.online > 0
      ? '<span class="stats-online"><i></i>当前在线 ' + model.online + ' 人</span>'
      : '';
    body.innerHTML =
      '<div class="stats-cards">' + cardsHtml(model.cards) + '</div>' +
      '<section class="stats-panel"><h2 class="stats-panel-title">访问趋势<span class="stats-panel-hint">按天 · ' + esc(model.chartRange) + '</span>' + online + '</h2>' + chartHtml(model) + '</section>' +
      '<div class="stats-grid">' + model.tables.map(tableHtml).join('') + '</div>';
  }

  function fail(root, message) {
    var body = root.querySelector('#stats-body');
    if (!body) return;
    body.innerHTML = '<p class="stats-error">' + esc(message) + '（可先看 <a href="' + esc(root.dataset.shareUrl || '#') + '" target="_blank" rel="noopener">完整分享看板 ↗</a>）</p>';
  }

  /* ---------------- 数据获取 ---------------- */

  function load(api, slug, days, timezone) {
    var end = Date.now();
    var start = end - days * 86400000;
    var qs = 'startAt=' + start + '&endAt=' + end + '&timezone=' + encodeURIComponent(timezone);
    var wid = '';

    return fetch(api + '/api/share/' + slug, { credentials: 'omit' })
      .then(function (r) { if (!r.ok) throw new Error('分享接口 ' + r.status); return r.json(); })
      .then(function (meta) {
        if (!meta || !meta.token || !meta.websiteId) throw new Error('分享信息不完整');
        wid = meta.websiteId;
        var headers = { 'x-umami-share-token': meta.token, 'x-umami-share-context': 'share' };
        function get(path, key) {
          return fetch(api + path, { headers: headers, credentials: 'omit' })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (json) { return [key, json]; })
            .catch(function () { return [key, null]; });
        }
        var base = '/api/websites/' + wid;
        return Promise.all([
          get(base + '/stats?' + qs, 'stats'),
          get(base + '/pageviews?' + qs + '&unit=day', 'pageviews'),
          get(base + '/metrics?' + qs + '&type=path&limit=8', 'path'),
          get(base + '/metrics?' + qs + '&type=referrer&limit=8', 'referrer'),
          get(base + '/metrics?' + qs + '&type=country&limit=8', 'country'),
          get(base + '/metrics?' + qs + '&type=browser&limit=6', 'browser'),
          get(base + '/metrics?' + qs + '&type=device&limit=4', 'device'),
          get(base + '/metrics?' + qs + '&type=event&limit=8', 'event'),
          get(base + '/active', 'active'),
        ]);
      })
      .then(function (pairs) {
        var data = {};
        pairs.forEach(function (p) { data[p[0]] = p[1]; });
        if (!data.stats) throw new Error('统计数据不可用');
        return data;
      });
  }

  /* ---------------- 初始化 ---------------- */

  var busy = false;

  function init() {
    var root = document.getElementById('stats-root');
    if (!root || busy) return;
    var body = root.querySelector('#stats-body');
    if (!body) return;

    var api = root.dataset.endpoint;
    var slug = root.dataset.slug;
    var timezone = root.dataset.timezone || 'Asia/Shanghai';
    if (!api || !slug) return;

    var btns = root.querySelectorAll('.stats-range');

    /* 首次初始化时允许用 ?days=7|30|90 指定范围（可分享的深链）；
       之后用户点按钮切换时不再读 URL，否则会把刚点的按钮又改回去。 */
    if (!root.dataset.rangeInit) {
      root.dataset.rangeInit = '1';
      var want = Number(new URLSearchParams(location.search).get('days'));
      if (want && [7, 30, 90].indexOf(want) !== -1) {
        btns.forEach(function (b) { b.classList.toggle('is-active', Number(b.dataset.days) === want); });
      }
    }

    /* 当前选中的时间范围（按钮上带 is-active） */
    var active = root.querySelector('.stats-range.is-active') || btns[0];
    var days = Number(active && active.dataset.days) || 30;

    btns.forEach(function (btn) {
      if (btn.__statsBound) return;
      btn.__statsBound = true;
      btn.addEventListener('click', function () {
        btns.forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        init();
      });
    });

    busy = true;
    if (!body.dataset.loaded) body.innerHTML = '<p class="stats-loading">正在加载统计数据…</p>';

    load(api, slug, days, timezone)
      .then(function (data) {
        render(root, compose(data));
        body.dataset.loaded = '1';
      })
      .catch(function (err) {
        fail(root, '统计数据暂时取不到：' + (err && err.message ? err.message : '网络异常'));
      })
      .then(function () { busy = false; });
  }

  window.__hnStatsInit = init;
  window.__hnStatsModel = {
    fmtDuration: fmtDuration, fmtNumber: fmtNumber, pct: pct, delta: delta,
    readable: readable, toRows: toRows, compose: compose,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  document.addEventListener('pjax:done', init);
})();
