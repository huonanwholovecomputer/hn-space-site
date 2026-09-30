/* ============================================================================
 * motion.js —— 动效层脚本（第一批）
 * ----------------------------------------------------------------------------
 * 只做一件事：把「纯文本标题」按视觉行拆开，交给 CSS 做逐行遮罩上推。
 * 样式与参数在 assets/css/extended/motion.css。
 *
 * 为什么不用 SplitText/SplitType：本批只需要「按行」，
 * 用 Range.getClientRects() 自己量一下即可，约 1KB，不引入依赖。
 *
 * 与 site.js 的分工和时序：
 *   · 本脚本在 site.js 之前加载（extend_head.html 里排在前面），
 *     所以拆分发生在 site.js 绑定滚动入场之前；
 *   · pjax:done 也是本脚本先注册、site.js 后注册，新页面同样是"先拆行、再入场"。
 *
 * 安全降级：
 *   · prefers-reduced-motion: reduce → 完全不介入（不拆行、不加任何隐藏态）；
 *   · 无 IntersectionObserver → 同样不介入；
 *   · 标题里含元素子节点（如草稿标记 <span class="entry-hint">）→ 跳过该元素，
 *     保持原样，只是没有逐行动效。
 * ========================================================================== */
(function () {
  'use strict';

  /* 目前只对首页章节标题启用。要扩大范围（例如文章页 H1）时加选择器即可，
     但必须确认这些元素是「纯文本」或只含可忽略的子元素。 */
  var HOSTS = '[data-reveal].section-title';

  var LINE_STAGGER = 60; /* 行间错峰（ms），与 motion.css 的 --line-i 计算一致 */

  /* site.js 的 revealEl() 用「同级第几个 × 70ms」做错峰，这里沿用同一节奏，
     好让标题的行遮罩与小标题/按钮的入场顺序自然接上。
     若 site.js 改了那个 70，这里也要跟着改。 */
  var SIBLING_STAGGER = 70;
  var SIBLING_MAX = 5;

  var io = null;
  var resizeTimer = null;

  function reduceMotion() {
    return (
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  /* 该元素是否值得拆：必须是元素子节点为空的纯文本（允许空白文本节点） */
  function directTextNode(el) {
    var text = null;
    var kids = el.childNodes;
    for (var i = 0; i < kids.length; i++) {
      var n = kids[i];
      if (n.nodeType === 3) {
        if (n.nodeValue && n.nodeValue.trim() !== '') {
          if (text) return null; /* 多个非空文本节点：情况复杂，放弃 */
          text = n;
        }
      } else if (n.nodeType === 1) {
        return null; /* 含元素子节点（图标等）→ 跳过，宁可不动它 */
      }
    }
    return text;
  }

  /* 量出这个文本节点被浏览器排版成了几行，返回每行起止下标 */
  function measureLines(tn) {
    var text = tn.nodeValue;
    var len = text.length;
    if (!len) return [];

    var range = document.createRange();
    var bounds = [];
    var prevRects = 1; /* 从 1 开始：范围覆盖第一行时只有 1 个矩形 */

    for (var i = 1; i <= len; i++) {
      range.setStart(tn, 0);
      range.setEnd(tn, i);
      var rects = range.getClientRects().length;
      if (rects > prevRects) {
        bounds.push(i - 1); /* 第 i-1 个字符起是新的一行 */
        prevRects = rects;
      }
    }

    var lines = [];
    var start = 0;
    for (var b = 0; b < bounds.length; b++) {
      lines.push([start, bounds[b]]);
      start = bounds[b];
    }
    lines.push([start, len]);
    return lines;
  }

  /* 拆行：成功返回 true */
  function split(el) {
    if (el.classList.contains('mask-split')) return true;

    var tn = directTextNode(el);
    if (!tn) return false;

    var lines = measureLines(tn);
    if (!lines.length) return false;

    var text = tn.nodeValue;
    var frag = document.createDocumentFragment();
    var box;

    for (var i = 0; i < lines.length; i++) {
      var seg = text.slice(lines[i][0], lines[i][1]);
      if (seg === '') continue;
      box = document.createElement('span');
      box.className = 'mask-line';
      var inner = document.createElement('span');
      inner.className = 'mask-line-inner';
      inner.style.setProperty('--line-i', String(i));
      inner.textContent = seg;
      box.appendChild(inner);
      frag.appendChild(box);
    }

    if (!frag.childNodes.length) return false;

    /* 同级错峰：与 site.js 同一公式，写成内联变量交给 CSS 的 calc() 用 */
    var parent = el.parentElement;
    var index = parent
      ? Array.prototype.indexOf.call(parent.children, el)
      : 0;
    var delay = Math.min(Math.max(index, 0), SIBLING_MAX) * SIBLING_STAGGER;
    el.style.setProperty('--mask-delay', delay + 'ms');

    el.replaceChild(frag, tn);
    el.classList.add('mask-split');
    return true;
  }

  /* 还原成纯文本（仅在尚未入场时需要，用于窗口尺寸变化后重新量行） */
  function unsplit(el) {
    var parts = el.querySelectorAll('.mask-line-inner');
    var text = '';
    for (var i = 0; i < parts.length; i++) text += parts[i].textContent;
    el.textContent = text;
    el.classList.remove('mask-split');
    el.style.removeProperty('--mask-delay');
  }

  function init() {
    if (reduceMotion() || !('IntersectionObserver' in window)) return;

    if (io) io.disconnect();
    io = new IntersectionObserver(
      function (entries) {
        for (var i = 0; i < entries.length; i++) {
          if (!entries[i].isIntersecting) continue;
          var el = entries[i].target;
          el.classList.add('mask-in');
          io.unobserve(el);
        }
      },
      /* 触发口径与 site.js 一致：进入视口即播（阈值 0） */
      { threshold: 0, rootMargin: '0px 0px -5% 0px' }
    );

    var hosts = document.querySelectorAll(HOSTS);
    for (var i = 0; i < hosts.length; i++) {
      var el = hosts[i];
      if (el.classList.contains('mask-in')) continue; /* 已入场：不再动 DOM */
      if (!el.classList.contains('mask-split') && !split(el)) continue;
      io.observe(el);
    }
  }

  /* 窗口尺寸变化：只处理「还没入场」的标题——已入场的行已是终态，
     重新拆行反而会把它打回隐藏态。 */
  function onResize() {
    if (resizeTimer) window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      if (reduceMotion()) return;
      var hosts = document.querySelectorAll(HOSTS + '.mask-split:not(.mask-in)');
      for (var i = 0; i < hosts.length; i++) {
        unsplit(hosts[i]);
      }
      init();
    }, 200);
  }

  window.__motionInit = init;

  /* 首屏：DOM 已解析（defer 脚本在解析完成后按序执行） */
  init();

  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);

  /* PJAX 换页：本监听先于 site.js 的同名监听注册（脚本顺序），
     所以新页面永远是"先拆行 → 再入场" */
  document.addEventListener('pjax:done', function () {
    init();
  });
})();
