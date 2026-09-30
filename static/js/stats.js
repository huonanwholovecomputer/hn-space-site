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
      return '<div class="stats-card" data-reveal><span class="stats-card-label">' + esc(c.label) + '</span>' +
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
    return '<section class="stats-panel" data-reveal><h2 class="stats-panel-title">' + esc(t.title) + '</h2>' +
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
      '<section class="stats-panel" data-reveal><h2 class="stats-panel-title">访问趋势<span class="stats-panel-hint">按天 · ' + esc(model.chartRange) + '</span>' + online + '</h2>' + chartHtml(model) + '</section>' +
      '<div class="stats-grid">' + model.tables.map(tableHtml).join('') + '</div>';

    /* 复用全站的入场动画与鼠标光效机制：新插入的元素交给 site.js 重新扫描。
       __siteInitReveal 负责入场动画（IntersectionObserver + 同级错峰），
       __siteInitTilt 负责绑定卡片并注入 .ds-glow-border 光效层 —— 它默认只在
       脚本执行时扫一遍，而这里的卡片是异步渲染的，必须显式再调一次。 */
    if (typeof window.__siteInitReveal === 'function') {
      window.__siteInitReveal();
    }
    if (typeof window.__siteInitTilt === 'function') {
      window.__siteInitTilt();
    }
    /* 数字滚动：卡片数值从 0 滚到终值（motion.js 提供；未加载时静默跳过） */
    if (typeof window.__motionCountUp === 'function') {
      window.__motionCountUp();
    }
  }

  function fail(root, message, shareUrl) {
    var body = root.querySelector('#stats-body');
    if (!body) return;
    var more = shareUrl
      ? '（可先看 <a href="' + esc(shareUrl) + '" target="_blank" rel="noopener">完整分享看板 ↗</a>）'
      : '';
    body.innerHTML = '<p class="stats-error">' + esc(message) + more + '</p>';
  }

  /* ---------------- sessionStorage 缓存 ----------------
     目的：同一标签页内来回翻页、切换时间范围时不重复打接口。
     一律带 TTL；取不到、过期、隐私模式抛错都当"没有缓存"降级处理。 */
  var CACHE_PREFIX = 'hn-stats:';

  function cacheGet(key) {
    try {
      var raw = window.sessionStorage.getItem(CACHE_PREFIX + key);
      if (!raw) return null;
      var box = JSON.parse(raw);
      if (!box || typeof box.e !== 'number' || box.e < Date.now()) {
        window.sessionStorage.removeItem(CACHE_PREFIX + key);
        return null;
      }
      return box.v;
    } catch (err) {
      return null;
    }
  }

  function cacheSet(key, value, ttlMs) {
    try {
      window.sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ v: value, e: Date.now() + (ttlMs || 0) }));
    } catch (err) { /* 配额满 / 隐私模式：忽略 */ }
  }

  function cacheDrop(key) {
    try { window.sessionStorage.removeItem(CACHE_PREFIX + key); } catch (err) { /* 忽略 */ }
  }

  /* ---------------- 配置与分享令牌 ---------------- */

  var TTL = { token: 10 * 60e3, stats: 5 * 60e3, views: 10 * 60e3 };

  /* 配置只在 extend_head.html 声明一次（window.__HN_STATS），
     /stats 页与文章页浏览量共用，避免两处硬编码漂移。 */
  function statsConfig() {
    var c = window.__HN_STATS || {};
    if (!c.endpoint || !c.slug) return null;
    return {
      endpoint: String(c.endpoint).replace(/\/+$/, ''),
      slug: c.slug,
      timezone: c.timezone || 'Asia/Shanghai',
      shareUrl: c.shareUrl || '',
    };
  }

  function rangeQuery(days, timezone) {
    var end = Date.now();
    var start = end - days * 86400000;
    return 'startAt=' + start + '&endAt=' + end + '&timezone=' + encodeURIComponent(timezone);
  }

  /* 分享令牌带缓存；显式 noCache 时强制重取（令牌失效/接口报错时用） */
  function shareMeta(conf, noCache) {
    var key = 'share:' + conf.slug;
    if (!noCache) {
      var hit = cacheGet(key);
      if (hit) return Promise.resolve(hit);
    }
    return fetch(conf.endpoint + '/api/share/' + conf.slug, { credentials: 'omit' })
      .then(function (r) {
        if (!r.ok) throw new Error('分享接口 ' + r.status);
        return r.json();
      })
      .then(function (meta) {
        if (!meta || !meta.token || !meta.websiteId) throw new Error('分享信息不完整');
        cacheSet(key, meta, TTL.token);
        return meta;
      });
  }

  function shareHeaders(meta) {
    return { 'x-umami-share-token': meta.token, 'x-umami-share-context': 'share' };
  }

  /* ---------------- 文章页「本文浏览量」：纯函数部分 ---------------- */

  /* 浏览量要看该路径的历史总量，给足够长的窗口（3 年） */
  var VIEW_DAYS = 1095;

  function viewsQuery(pathname, days, timezone) {
    return rangeQuery(days || VIEW_DAYS, timezone) + '&path=eq.' + encodeURIComponent(pathname);
  }

  function viewsLabel(n) {
    return '浏览 ' + fmtNumber(n) + ' 次';
  }

  /* ---------------- 数据获取 ---------------- */

  function load(conf, days, noCache) {
    var qs = rangeQuery(days, conf.timezone);

    return shareMeta(conf, noCache).then(function (meta) {
      var headers = shareHeaders(meta);
      function get(path, key) {
        return fetch(conf.endpoint + path, { headers: headers, credentials: 'omit' })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (json) { return [key, json]; })
          .catch(function () { return [key, null]; });
      }
      var base = '/api/websites/' + meta.websiteId;
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

  /* ---------------- 文章页「本文浏览量」：DOM 部分 ---------------- */

  function injectViews(metaEl, n) {
    if (metaEl.querySelector('.post-views')) return;
    var el = document.createElement('span');
    el.className = 'post-views';
    el.textContent = viewsLabel(n);
    metaEl.appendChild(document.createTextNode('\u00a0·\u00a0'));
    metaEl.appendChild(el);
  }

  /* 只在文章页生效：PaperMod 的列表页/归档页也有 .post-meta（在 article.post-entry 内），
     这里把选择器限定到 article.post-single 下的那一个，杜绝误伤列表摘要。 */
  function initPostViews() {
    var conf = statsConfig();
    var metaEl = document.querySelector('article.post-single .post-header .post-meta');
    if (!conf || !metaEl) return;
    if (metaEl.querySelector('.post-views') || metaEl.dataset.viewsPending) return;
    metaEl.dataset.viewsPending = '1';

    var done = function () { metaEl.dataset.viewsPending = ''; };
    var key = 'views:' + location.pathname;

    /* 命中缓存：直接注入，零请求（来回翻页时的主要优化点） */
    var hit = cacheGet(key);
    if (hit !== null) {
      injectViews(metaEl, hit);
      done();
      return;
    }

    shareMeta(conf)
      .then(function (m) {
        var url = conf.endpoint + '/api/websites/' + m.websiteId + '/stats?' +
          viewsQuery(location.pathname, VIEW_DAYS, conf.timezone);
        return fetch(url, { headers: shareHeaders(m), credentials: 'omit' });
      })
      .then(function (r) { if (!r.ok) throw new Error('stats ' + r.status); return r.json(); })
      .then(function (json) {
        var n = Number(json && json.pageviews) || 0;
        cacheSet(key, n, TTL.views);
        /* PJAX 可能已经换页，旧元素脱落后就不要再插 */
        if (metaEl.isConnected) injectViews(metaEl, n);
        done();
      })
      .catch(function () {
        /* 静默降级：取不到就不显示，绝不干扰阅读 */
        done();
      });
  }

  /* ---------------- 初始化 ---------------- */

  var busy = false;

  function init() {
    var root = document.getElementById('stats-root');
    if (!root || busy) return;
    var body = root.querySelector('#stats-body');
    if (!body) return;

    var conf = statsConfig();
    if (!conf) return;

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

    /* 缓存命中：直接渲染，一个请求都不发（切换范围来回点时很省） */
    var cacheKey = 'stats:' + conf.slug + ':' + days;
    var cached = cacheGet(cacheKey);
    if (cached) {
      render(root, compose(cached));
      body.dataset.loaded = '1';
      return;
    }

    busy = true;
    if (!body.dataset.loaded) body.innerHTML = '<p class="stats-loading">正在加载统计数据…</p>';

    load(conf, days)
      .then(function (data) {
        cacheSet(cacheKey, data, TTL.stats);
        render(root, compose(data));
        body.dataset.loaded = '1';
      })
      .catch(function (err) {
        fail(root, '统计数据暂时取不到：' + (err && err.message ? err.message : '网络异常'), conf.shareUrl);
      })
      .then(function () { busy = false; });
  }

  window.__hnStatsInit = init;
  window.__hnStatsInitPostViews = initPostViews;
  window.__hnStatsModel = {
    fmtDuration: fmtDuration, fmtNumber: fmtNumber, pct: pct, delta: delta,
    readable: readable, toRows: toRows, compose: compose,
    statsConfig: statsConfig, rangeQuery: rangeQuery, viewsQuery: viewsQuery,
    viewsLabel: viewsLabel, cacheGet: cacheGet, cacheSet: cacheSet,
  };

  function boot() {
    init();
    initPostViews();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  document.addEventListener('pjax:done', boot);
})();
