/* =========================================================
   动态效果开关（性能开关）
   ---------------------------------------------------------
   背景：低配置电脑上，本站的几层特效是卡顿的主要来源——
         · 首屏两片 WebGL（液态流体 + 波浪）每帧一次模拟/渲染 pass
         · 全屏 canvas 拖尾每帧 clear + 上百个粒子的路径绘制
         · 卡片 3D 倾斜与手电筒光效每帧读 getBoundingClientRect 并写内联样式
   这里提供逐项开关（另有「全部关闭」），设置存 localStorage，跨页面 / PJAX 保持。

   三条硬约束（改这个文件前先看）：
   1. **本文件必须排在其它特效脚本之前**（extend_head.html 里第一个 defer）。
      特效模块一执行就会读 window.__hnFx.enabled()，晚了就会先建一遍 WebGL 上下文
      或全屏画布，再拆掉——低配机上那一下正是最卡的。
   2. 关闭态要同时表达两次：<html> 上的 fx-off-<key> 类（CSS 立刻遮蔽，无延迟）
      **和** 特效模块里停掉 rAF（只靠 CSS 隐藏的话主线程仍在每帧算，白烧 CPU）。
   3. 面板挂在 body 上。PJAX 只替换 <main>，所以换页后面板、开关状态都不重建；
      状态本身在 localStorage 里，跨页面天然一致。

   新增一项特效时：在 ITEMS 里加一行、在对应的 CSS/JS 里读 enabled(key) 即可，
   面板会自己长出新开关。
   ========================================================= */
(function () {
  'use strict';

  var KEY = 'hn-fx';
  var ROOT_CLASS_PREFIX = 'fx-off-';

  /* 面板里的顺序 = 用户感知的"从最轻到最重"，不是执行顺序。
     desc 写给非技术用户看：说清"关了会少什么"，而不是讲实现。 */
  var ITEMS = [
    { key: 'click', label: '鼠标点击效果', desc: '点击时扩散的圆环与粒子' },
    { key: 'trail', label: '鼠标移动拖尾', desc: '指针划过的光带与星点' },
    { key: 'ring', label: '跟随光标环', desc: '标题上放大的反色圆环' },
    { key: 'glow', label: '卡片光效', desc: '跟着指针的手电筒光斑与边框高亮' },
    { key: 'tilt', label: '卡片 3D 倾斜', desc: '指针移到卡片上时的立体转动' },
    { key: 'grid', label: '背景网格', desc: '首屏随指针弹动的网格点线' },
    /* 平滑滚动引擎（Lenis）本身也是常驻 rAF：即使其它特效全关，它仍每帧在跑
       （2026-10-25 实测：全部关闭后剩下的 181 帧/秒就是它）。所以它必须能单独关。
       关掉 = 直接把引擎拆掉、滚轮监听一并掐断，滚动交回浏览器（见 motion.js 的
       applySmoothPref / teardownLenis），不是拿 CSS 藏一下。 */
    { key: 'smooth', label: '平滑滚动', desc: '滚轮的惯性缓动；关掉后一松手就停，最省电' },
    { key: 'liquid', label: '液态背景', desc: '首屏流动的 WebGL 渐变（最耗性能）' }
  ];

  var state = {};
  var subs = [];
  var revision = 0;

  function defaults() {
    var o = {};
    for (var i = 0; i < ITEMS.length; i++) o[ITEMS[i].key] = true;
    return o;
  }

  function load() {
    state = defaults();
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (err) { return; } // 隐私模式：全开
    if (!raw) return;
    var saved = null;
    try { saved = JSON.parse(raw); } catch (err) { return; } // 坏数据：按默认全开
    if (!saved || typeof saved !== 'object') return;
    for (var i = 0; i < ITEMS.length; i++) {
      var k = ITEMS[i].key;
      if (typeof saved[k] === 'boolean') state[k] = saved[k];
    }
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (err) { /* 隐私模式：本次有效即可 */ }
  }

  /* 关闭态以 <html> 的类表达：CSS 侧据此立刻隐藏画布/光效，
     即使某个模块还没来得及响应，视觉上也不会残留。 */
  function applyClasses() {
    var root = document.documentElement;
    for (var i = 0; i < ITEMS.length; i++) {
      var k = ITEMS[i].key;
      root.classList.toggle(ROOT_CLASS_PREFIX + k, state[k] === false);
    }
    root.classList.toggle('fx-off-any', countOff() > 0);
    root.classList.toggle('fx-off-all', countOff() === ITEMS.length);
  }

  function countOff() {
    var n = 0;
    for (var i = 0; i < ITEMS.length; i++) if (state[ITEMS[i].key] === false) n++;
    return n;
  }

  function notify(key) {
    revision++;
    for (var i = 0; i < subs.length; i++) {
      try { subs[i](key, api); } catch (err) { /* 订阅方自行兜错，不阻断其它订阅 */ }
    }
    paint();
  }

  function commit(key) {
    save();
    applyClasses();
    notify(key);
  }

  /* ---------- 对外 API ----------
     特效模块只依赖 enabled(key)；需要运行时响应（而不是刷新页面）的模块
     用 onChange 订阅，收到通知后自己停/启 rAF。 */
  var api = {
    items: ITEMS,
    enabled: function (key) { return state[key] !== false; },
    get: function () {
      var o = {};
      for (var i = 0; i < ITEMS.length; i++) o[ITEMS[i].key] = state[ITEMS[i].key] !== false;
      return o;
    },
    set: function (key, on) {
      on = !!on;
      if (state[key] === on) return;
      state[key] = on;
      commit(key);
    },
    setAll: function (on) {
      on = !!on;
      var changed = false;
      for (var i = 0; i < ITEMS.length; i++) {
        if (state[ITEMS[i].key] !== on) { state[ITEMS[i].key] = on; changed = true; }
      }
      if (changed) commit(null);
    },
    reset: function () {
      state = defaults();
      commit(null);
    },
    countOff: countOff,
    revision: function () { return revision; },
    onChange: function (fn) {
      if (typeof fn === 'function') subs.push(fn);
    }
  };

  load();
  applyClasses();
  window.__hnFx = api;

  /* =========================================================
     设置面板（悬浮按钮 + 开关列表）
     ========================================================= */
  var ui = null;      // 外层容器
  var fab = null;
  var panel = null;
  var open = false;

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function buildRow(item) {
    var row = el('div', 'fx-row');
    var txt = el('div', 'fx-row-txt');
    var lb = el('span', 'fx-row-label');
    lb.textContent = item.label;
    var ds = el('span', 'fx-row-desc');
    ds.textContent = item.desc;
    txt.appendChild(lb);
    txt.appendChild(ds);

    var sw = el('button', 'fx-sw');
    sw.type = 'button';
    sw.setAttribute('role', 'switch');
    sw.setAttribute('aria-checked', 'true');
    sw.setAttribute('aria-label', item.label);
    sw.setAttribute('data-fx-key', item.key);

    row.appendChild(txt);
    row.appendChild(sw);
    return row;
  }

  function build() {
    if (ui) return;

    ui = el('div', 'fx-ui');
    fab = el('button', 'fx-fab');
    fab.type = 'button';
    fab.setAttribute('aria-expanded', 'false');
    fab.setAttribute('aria-controls', 'fx-panel');
    fab.setAttribute('aria-label', '动态效果设置');
    fab.title = '动态效果设置（低配设备卡顿时可关掉）';
    fab.innerHTML =
      '<svg class="fx-fab-ico" viewBox="0 0 24 24" width="15" height="15" fill="none"' +
      ' stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"' +
      ' aria-hidden="true">' +
      '<circle cx="12" cy="12" r="3.4"></circle>' +
      '<path d="M12 2.6v3M12 18.4v3M4.4 4.4l2.1 2.1M17.5 17.5l2.1 2.1M2.6 12h3M18.4 12h3M4.4 19.6l2.1-2.1M17.5 6.5l2.1-2.1"></path>' +
      '</svg><span class="fx-fab-txt">特效</span>';

    panel = el('div', 'fx-panel');
    panel.id = 'fx-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', '动态效果设置');
    panel.hidden = true;

    var head = el('div', 'fx-head');
    var headTxt = el('div', 'fx-head-txt');
    var title = el('strong', 'fx-title');
    title.textContent = '动态效果';
    var sub = el('span', 'fx-sub');
    sub.setAttribute('data-fx-sub', '');
    headTxt.appendChild(title);
    headTxt.appendChild(sub);

    var bulkOff = el('button', 'fx-bulk');
    bulkOff.type = 'button';
    bulkOff.setAttribute('data-fx-all', 'off');
    bulkOff.textContent = '全部关闭';
    var bulkOn = el('button', 'fx-bulk');
    bulkOn.type = 'button';
    bulkOn.setAttribute('data-fx-all', 'on');
    bulkOn.textContent = '全部开启';

    head.appendChild(headTxt);
    head.appendChild(bulkOff);
    head.appendChild(bulkOn);

    var rows = el('div', 'fx-rows');
    for (var i = 0; i < ITEMS.length; i++) rows.appendChild(buildRow(ITEMS[i]));

    var note = el('p', 'fx-note');
    note.textContent = '卡顿时点「全部关闭」即可。设置只保存在这台设备。';

    panel.appendChild(head);
    panel.appendChild(rows);
    panel.appendChild(note);

    /* 系统「减少动态效果」已开着时给一句说明：
       这类用户的位移/缩放本来就播不了，免得他们以为开关失灵。 */
    var rm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
    if (rm && rm.matches) {
      var rmNote = el('p', 'fx-note fx-note-rm');
      rmNote.textContent = '系统已开启「减少动态效果」，位移与缩放类动效本来就不会播放。';
      panel.appendChild(rmNote);
    }

    ui.appendChild(fab);
    ui.appendChild(panel);
    document.body.appendChild(ui);

    fab.addEventListener('click', function () { setOpen(!open); });

    panel.addEventListener('click', function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      var sw = t.closest('[data-fx-key]');
      if (sw) {
        api.set(sw.getAttribute('data-fx-key'), sw.getAttribute('aria-checked') !== 'true');
        return;
      }
      var bulk = t.closest('[data-fx-all]');
      if (bulk) api.setAll(bulk.getAttribute('data-fx-all') === 'on');
    });

    /* 点面板外面关闭。用 pointerdown 而不是 click：
       click 在鼠标按下-抬起跨过两个元素时目标可能变成共同祖先，判断会漏。 */
    document.addEventListener('pointerdown', function (e) {
      if (!open) return;
      if (ui.contains(e.target)) return;
      setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (open && (e.key === 'Escape' || e.key === 'Esc')) {
        setOpen(false);
        if (fab) fab.focus();
      }
    });

    paint();
  }

  function setOpen(next) {
    if (!ui) return;
    open = !!next;
    if (open) {
      panel.hidden = false;
      /* 先脱离 display:none 再挂类，过渡才会从起点播（否则同一帧内直接跳到终态） */
      void panel.offsetWidth;
      panel.classList.add('is-open');
      fab.setAttribute('aria-expanded', 'true');
      ui.classList.add('is-open');
      var first = panel.querySelector('button');
      if (first) first.focus();
    } else {
      panel.classList.remove('is-open');
      fab.setAttribute('aria-expanded', 'false');
      ui.classList.remove('is-open');
      /* 等收起过渡结束再 display:none；减少动态 / 无过渡时立刻收 */
      var done = function () { if (!open) panel.hidden = true; };
      window.setTimeout(done, 180);
    }
  }

  function paint() {
    if (!panel) return;
    for (var i = 0; i < ITEMS.length; i++) {
      var k = ITEMS[i].key;
      var sw = panel.querySelector('[data-fx-key="' + k + '"]');
      if (sw) sw.setAttribute('aria-checked', state[k] === false ? 'false' : 'true');
    }
    var off = countOff();
    var sub = panel.querySelector('[data-fx-sub]');
    if (sub) {
      sub.textContent = off === 0 ? '全部开启中' : (off === ITEMS.length ? '已全部关闭' : '已关闭 ' + off + ' 项');
    }
    if (ui) ui.classList.toggle('is-lite', off === ITEMS.length);
    if (ui) ui.classList.toggle('is-custom', off > 0);
    /* 全部关闭状态下按钮给一点提示色，让"我现在是省电状态"一眼可见 */
    if (fab) {
      fab.setAttribute('aria-label', off === ITEMS.length ? '动态效果已全部关闭，点击调整' : '动态效果设置');
    }
  }

  /* defer 脚本执行时 body 一般已存在；万一被放到 head 里也兜住。 */
  if (document.body) {
    build();
  } else {
    document.addEventListener('DOMContentLoaded', build);
  }
})();
