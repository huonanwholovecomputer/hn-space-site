/* ============================================================================
 * motion.js —— 动效层脚本（第一批）
 * ----------------------------------------------------------------------------
 * 两件事：
 *   1) 把「纯文本标题」按视觉行拆开，交给 CSS 做逐行遮罩上推；
 *   2) 文章页目录的滚动高亮（scrollspy）。
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
 *   · prefers-reduced-motion: reduce → 不拆行、不加任何隐藏态
 *     （目录高亮属功能性指示，保留）；
 *   · 无 IntersectionObserver → 同样不拆行；
 *   · 标题里含元素子节点（如草稿标记 <span class="entry-hint">）→ 跳过该元素，
 *     保持原样，只是没有逐行动效。
 * ========================================================================== */
(function () {
  'use strict';

  /* 目前只对首页章节标题与文章页 H1 启用。要扩大范围时加选择器即可，
     但必须是「纯文本」或只含可忽略子元素（见 directTextNode 的判定）。 */
  var HOSTS = '[data-reveal].section-title, .post-title';

  /* 目录高亮的判定线：距视口顶部 100px（页头 44px + 顶部 10px，锚点偏移 84px） */
  var TOC_LINE = 100;

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

  /* 拆行：成功返回 true。
     注意最后是包进一个 .mask-lines 块级容器再替换——宿主可能是 flex 容器
     （文章 H1 的 .entry-hint-parent），直接放多个块级行会被当成并排 flex item。 */
  function split(el) {
    if (el.classList.contains('mask-split')) return true;

    var tn = directTextNode(el);
    if (!tn) return false;

    var lines = measureLines(tn);
    if (!lines.length) return false;

    var text = tn.nodeValue;
    var wrap = document.createElement('span');
    wrap.className = 'mask-lines';
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
      wrap.appendChild(box);
    }

    if (!wrap.childNodes.length) return false;

    /* 同级错峰：与 site.js 同一公式，写成内联变量交给 CSS 的 calc() 用 */
    var parent = el.parentElement;
    var index = parent
      ? Array.prototype.indexOf.call(parent.children, el)
      : 0;
    var delay = Math.min(Math.max(index, 0), SIBLING_MAX) * SIBLING_STAGGER;
    el.style.setProperty('--mask-delay', delay + 'ms');

    el.replaceChild(wrap, tn);
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

  /* --------------------------------------------------------------------------
   * 目录滚动高亮（scrollspy）
   * 判定口径：当前小节 = 「最后一个已越过 100px 判定线」的标题。
   * 触发方式：scroll 监听 + 100ms 节流，触发时全局重新判定。
   *   （一开始用的是 IntersectionObserver 窄带，但大跨度跳转——比如滚轮猛滑、
   *    点击目录锚点——会在同一帧内"进入又离开"窄带，浏览器只结算最终状态、
   *    不产生交集变化，回调就不触发，高亮会停在上一个小节。改成节流 scroll
   *    后不管怎么跳都按真实位置重算。）
   * ------------------------------------------------------------------------ */
  var tocCleanup = null;

  function initTocSpy() {
    if (tocCleanup) {
      tocCleanup();
      tocCleanup = null;
    }

    var nav = document.getElementById('TableOfContents');
    if (!nav) return;

    var links = nav.querySelectorAll('a[href^="#"]');
    if (!links.length) return;

    var byId = {};
    var i;
    for (i = 0; i < links.length; i++) {
      var href = links[i].getAttribute('href') || '';
      var id = href.charAt(0) === '#' ? decodeURIComponent(href.slice(1)) : '';
      if (id) byId[id] = links[i];
    }

    var heads = document.querySelectorAll(
      '.post-content h2[id], .post-content h3[id], .post-content h4[id],' +
        '.post-content h5[id], .post-content h6[id]'
    );
    if (!heads.length) return;

    var current = null;
    function setActive(link) {
      if (link === current) return;
      if (current) current.classList.remove('is-active');
      current = link;
      if (current) current.classList.add('is-active');
    }

    function pick() {
      var best = null;
      for (var k = 0; k < heads.length; k++) {
        if (heads[k].getBoundingClientRect().top <= TOC_LINE) best = heads[k];
      }
      setActive(best ? byId[best.id] || null : null);
    }

    /* 点击目录链接：立即高亮，不等下一次滚动判定 */
    function onClick() {
      setActive(this);
    }
    for (i = 0; i < links.length; i++) {
      links[i].addEventListener('click', onClick);
    }

    /* 节流 100ms 直接判定：刻意不挂 rAF——rAF 在后台标签页/省电模式/某些无头环境下
       可能不被调度，那样 ticking 会一直停在 true，高亮就卡在上一个小节不动了。
       判定本身只是读 ~20 个标题的 rect、不写 DOM，10 次/秒的开销可以接受。 */
    var lastRun = 0;
    function onScroll() {
      var now = Date.now();
      if (now - lastRun < 100) return;
      lastRun = now;
      pick();
    }
    window.addEventListener('scroll', onScroll, { passive: true });

    pick();

    tocCleanup = function () {
      window.removeEventListener('scroll', onScroll);
      for (var k = 0; k < links.length; k++) {
        links[k].removeEventListener('click', onClick);
      }
      if (current) current.classList.remove('is-active');
      current = null;
    };
  }

  /* --------------------------------------------------------------------------
   * 数字滚动（count-up）——《动效升级方案》§4-8
   * 目标：首页 Highlights 的数值、/stats 的统计卡片数值。
   * 只处理「纯数字（可带前后缀与千分位）」的文本，其余原样跳过；
   * 进入视口触发一次即停（打 data-counted 标记），不来回重播；
   * 减少动态下不介入（文本本来就是终值）。
   * ------------------------------------------------------------------------ */
  var COUNT_MS = 700;
  var countIO = null;

  /* 把 "2" / "1,234" / "35 次" 拆成 前缀 + 数字 + 后缀；拆不动返回 null */
  function parseCount(text) {
    var m = /^(\D*)(\d[\d,]*)(\D*)$/.exec(text);
    if (!m) return null;
    var raw = m[2];
    var num = parseInt(raw.replace(/,/g, ''), 10);
    if (!isFinite(num)) return null;
    return { pre: m[1], num: num, post: m[3], grouped: raw.indexOf(',') >= 0 };
  }

  function runCount(el) {
    var info = parseCount(el.textContent.trim());
    if (!info || info.num <= 0) return;

    var target = info.num;
    var fmt = function (v) {
      return info.grouped ? v.toLocaleString('en-US') : String(v);
    };
    var finalText = info.pre + fmt(target) + info.post;
    var t0 = 0;
    var settled = false;
    var guard;

    var settle = function () {
      if (settled) return;
      settled = true;
      el.textContent = finalText; /* 收尾写精确值，不用插值结果 */
      window.clearTimeout(guard);
    };

    var frame = function (t) {
      if (settled) return;
      if (!t0) {
        t0 = t;
        /* 起跳的 0 放在「第一帧真跑起来」时才写：万一 rAF 没被调度
           （后台标签页、省电模式等），卡片上留下的仍是真实数值，
           而不是一个会骗人的 0 —— 这是数据正确性问题，不只是观感问题。 */
        el.textContent = info.pre + fmt(0) + info.post;
      }
      var k = Math.min(1, (t - t0) / COUNT_MS);
      if (k < 1) {
        var e = 1 - Math.pow(1 - k, 3); /* easeOutCubic：起快收慢，符合"数字落定"的观感 */
        el.textContent = info.pre + fmt(Math.round(target * e)) + info.post;
        window.requestAnimationFrame(frame);
      } else {
        settle();
      }
    };

    /* 兜底：即使 rAF 中途不再被调度，也保证最终落到精确值 */
    guard = window.setTimeout(settle, COUNT_MS + 400);
    window.requestAnimationFrame(frame);
  }

  function initCountUp() {
    if (!('IntersectionObserver' in window)) return;
    var els = document.querySelectorAll('.highlight-value, .stats-card-value');
    if (!els.length) return;

    if (countIO) countIO.disconnect();
    countIO = new IntersectionObserver(
      function (entries) {
        for (var i = 0; i < entries.length; i++) {
          if (!entries[i].isIntersecting) continue;
          var el = entries[i].target;
          countIO.unobserve(el);
          runCount(el);
        }
      },
      { threshold: 0.2 }
    );

    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.getAttribute('data-counted') === '1') continue;
      if (!parseCount(el.textContent.trim())) continue; /* 非数字：保持原样 */
      el.setAttribute('data-counted', '1');
      countIO.observe(el);
    }
  }

  /* 供 stats.js 在异步渲染完卡片后调用（与 __siteInitReveal/__siteInitTilt 同一套约定） */
  window.__motionCountUp = function () {
    if (reduceMotion()) return;
    initCountUp();
  };

  /* --------------------------------------------------------------------------
   * 平滑滚动（Lenis）——《动效升级方案》§6.4
   * Lenis 驱动的是**真实滚动位置**（不是 transform 假滚动），所以
   * position: sticky、animation-timeline: scroll()/view()、IntersectionObserver
   * 全部照常工作；触屏不接管（本版已移除 smoothTouch，syncTouch 默认关）。
   * 减少动态 / 没加载到 lenis.min.js / 初始化失败 → 一律退回浏览器原生滚动。
   * ------------------------------------------------------------------------ */
  function initSmoothScroll() {
    if (reduceMotion()) return;
    if (typeof window.Lenis !== 'function') return;
    if (window.__hnLenis) return;

    try {
      window.__hnLenis = new window.Lenis({
        /* lerp 越小越跟手、越大越滑；0.1 是接近原生手感的保守值
           （参考站多在 0.06~0.1） */
        lerp: 0.1,
        wheelMultiplier: 1,
        smoothWheel: true,
        autoRaf: true,
        /* anchors 保持关闭：目录锚点由 math-image.js 统一负责
           （那里要减掉 92px 导航偏移，而且刻意用"即时跳转"来躲开
             懒加载图片导致的高度漂移），两套都开会互相抢。 */
        anchors: false
      });
    } catch (err) {
      window.__hnLenis = null;
    }

    /* ------------------------------------------------------------------------
       防御一：把非法的滚动目标挡在 Lenis 之外。
       Lenis 的 scrollTo 对 target **不做类型校验**：`{immediate:true}` 分支里直接
       `this.targetScroll = target`。一旦被传进非数字（实测过一次：一个全局函数被
       塞了进来，因为早期版本 __hnScrollTo 是原样透传 y 的），它就固定在那里，
       此后每个滚轮事件都会走 `this.targetScroll + delta` —— 字符串拼接后再送进
       document.querySelector 抛 SyntaxError，**滚动彻底失效、页面卡在顶部且不自愈**。
       这里统一归一化，并留一条带调用栈的警告：下次真有人传错，控制台直接指出是谁。

       为什么字符串要放行：字符串是 Lenis 的合法用法（选择器），而且它走的是
       querySelector 分支——非法选择器会在**赋值之前**就抛错，不会污染内部状态。 */
    var rawScrollTo = window.__hnLenis && window.__hnLenis.scrollTo;
    if (typeof rawScrollTo === 'function') {
      var boundScrollTo = rawScrollTo.bind(window.__hnLenis);
      var badTargetLogged = 0;
      window.__hnLenis.scrollTo = function (target, opts) {
        var why = '';
        if (typeof target !== 'number') {
          if (typeof target === 'string') {
            /* 字符串是 Lenis 的合法用法，但**必须是能解析的选择器**：
               一旦内部值被写坏，滚轮路径会算出 `targetScroll + delta` 这种
               垃圾字符串，Lenis 拿去 document.querySelector 会抛 SyntaxError
               ——每个滚轮事件都抛，肉眼就是"卡住不动"。所以这里先试解析。 */
            try {
              document.querySelector(target);
            } catch (errSel) {
              why = '字符串不是合法选择器';
            }
          } else if (!(target instanceof Element)) {
            why = '既不是数字也不是元素';
          }
        }
        if (why) {
          if (badTargetLogged < 3) {
            badTargetLogged++;
            try {
              console.warn('[hn] Lenis.scrollTo 收到非法滚动目标（' + why + '），本次滚动已丢弃：',
                target, '\n调用栈：', new Error().stack);
            } catch (errWarn) { /* 警告本身失败不影响滚动 */ }
          }
          /* 关键：**不能**把它当成 0 —— 那会让每次滚轮都"跳回顶部"，
             正是用户看到的"卡在顶部"。
             也不能只是"丢弃这一次"：丢弃意味着这一下滚轮滚不动，注入者若持续
             写入，用户看到的就是"滚轮没反应"（另一种卡住）。
             所以在滚轮路径上发现坏目标，直接判定 Lenis 已被污染、立即退回浏览器
             原生滚动：之后滚轮完全由浏览器接管，滚动一定正常，只是少了缓动。
             这是"保证可用"优先于"保住平滑"的取舍。 */
          window.__hnLenisAnomalies = (window.__hnLenisAnomalies || 0) + 1;
          if (window.__hnLenis) {
            degradeToNativeScroll(window.__hnLenis, window.__hnLenisAnomalies);
          }
          return undefined;
        }
        return boundScrollTo(target, opts);
      };
    }

    /* ------------------------------------------------------------------------
       防御二：自愈 + 溯源 + 兜底。

       背景（线上实测）：某些环境里的外部脚本会**直接往 Lenis 内部字段里写非数字**
       ——不是调用 scrollTo，所以防御一拦不到。而 Lenis 每次 resize/raf 都会
       `targetScroll = actualScroll`，坏值因此不断回来；每个滚轮事件又在
       `targetScroll + delta` 上做字符串拼接、送进 querySelector 抛错
       → 滚动失效、页面卡在顶部。用户侧实测同一页面连报 69 次。

       三层处理：
         ① 捕获阶段拦 wheel，发现异常先按真实位置复位（"下一次滚轮就恢复"）；
         ② 首次异常时打印现场（各字段类型 + 原生滚动属性是否被外部覆写），并给
            targetScroll/animatedScroll 装访问器，**把写入者的调用栈打出来**
            —— 这是唯一能把"谁写坏的"钉死的办法；
         ③ 异常反复出现（≥3 次）说明有东西在持续破坏它：destroy Lenis 退回原生
            滚动，并摘掉它加在 <html> 上的类（否则 .lenis-stopped 的
            overflow:hidden 会把页面锁死）。宁可少一层平滑，也不能让页面卡住。 */
    function describeLenisState(lenis) {
      var info = {};
      ['targetScroll', 'animatedScroll', 'actualScroll', 'scroll', 'velocity'].forEach(function (k) {
        var v = lenis[k];
        info[k] = (typeof v === 'number') ? v : (typeof v + ' → ' + String(v).slice(0, 80).replace(/\s+/g, ' '));
      });
      /* 原生滚动属性被外部脚本覆写的迹象：正常时 scrollY/scrollTo 都不在 window 自身上 */
      try {
        info['window 自有 scrollY'] = Object.prototype.hasOwnProperty.call(window, 'scrollY');
        info['window 自有 scrollTo'] = Object.prototype.hasOwnProperty.call(window, 'scrollTo');
        info['typeof documentElement.scrollTop'] = typeof document.documentElement.scrollTop;
        info['typeof window.scrollY'] = typeof window.scrollY;
      } catch (eDesc) { /* 忽略 */ }
      return info;
    }

    /* 把写入者钉死：装在字段上的访问器会把"写非数字"的调用栈打出来。
       只打前 3 次——目的是点名，不是刷屏（外部脚本可能每帧都写）。 */
    function trapLenisWrites(lenis) {
      if (window.__hnLenisTrapped) return;
      window.__hnLenisTrapped = true;
      var logged = 0;
      ['targetScroll', 'animatedScroll'].forEach(function (key) {
        var desc = Object.getOwnPropertyDescriptor(lenis, key);
        if (!desc || !desc.configurable) return;
        var value = lenis[key];
        Object.defineProperty(lenis, key, {
          configurable: true,
          get: function () { return value; },
          set: function (v) {
            if (typeof v !== 'number' && logged < 3) {
              logged++;
              try {
                /* 把"这是不是那个全局函数"和"同一刻其它字段长什么样"一起打出来——
                   下一次复现就能直接定案，不用再猜。 */
                var isGlobalFuse = (typeof window.Fuse === 'function' && v === window.Fuse);
                var peer = {};
                ['targetScroll', 'animatedScroll', 'actualScroll', 'scroll'].forEach(function (k) {
                  try {
                    var pv = lenis[k];
                    peer[k] = (typeof pv === 'number') ? pv : (typeof pv);
                  } catch (ePeer) { peer[k] = '（读取失败）'; }
                });
                /* peer 用 JSON 序列化：对象在控制台里是折叠的，用户复制日志时只剩一个
                   "Object"，等于没打。 */
                console.warn('[hn] 有人往 Lenis.' + key + ' 写入非数字：', v,
                  '\n是否就是 window.Fuse：', isGlobalFuse,
                  '\n同一刻各字段类型：', JSON.stringify(peer),
                  '\n写入栈：', new Error().stack,
                  logged === 3 ? '\n（同类写入后续不再打印）' : '');
              } catch (eTrap) { /* 忽略 */ }
            }
            /* 写入层兜底：Lenis 的全部内部运算都建立在"这些字段是数字"之上。
               既然坏值必然经过这里，那就在这里把它换成一个合法数字（当前真实滚动
               位置），而不是让它落进去——这样无论上游是谁、从哪条路写进来，
               `targetScroll + delta` 都不可能再变成字符串，
               滚轮也就不会抛 SyntaxError、不会跳回顶部。 */
            if (typeof v !== 'number') {
              var fallbackY = (typeof lenis.actualScroll === 'number') ? lenis.actualScroll
                : (window.scrollY || document.documentElement.scrollTop || 0);
              v = fallbackY;
            }
            value = v;
          }
        });
      });
    }

    /* 兜底：退回浏览器原生滚动（先摘掉 Lenis 加在 <html> 上的类，避免锁死页面） */
    function degradeToNativeScroll(lenis, count) {
      if (window.__hnLenisDegraded) return;
      window.__hnLenisDegraded = true;

      /* ★ 必须掐断这个实例的滚轮入口，否则"降级"是假的：
         Lenis 的滚轮处理器在内部先做 e.preventDefault()，再交给 emitter 派发。
         只要它还在监听 wheel，浏览器就永远拿不到原生滚动 ——
         表现正是用户实测的"触控能滑（触控不归 Lenis 管）、滚轮彻底卡死"。
         destroy() 不保证摘掉这个监听（实测其残骸仍在派发，字段已被清成 null），
         所以这里把 emitter 的 emit 直接改成空函数：onWheel 派发不到 onVirtualScroll，
         preventDefault 也就不会发生，原生滚动立刻恢复。
         （不必也无法替换已注册的监听函数本身，掐掉派发即可。） */
      try { if (lenis.emitter) lenis.emitter.emit = function () {}; } catch (eEmit) { /* 忽略 */ }
      try { lenis.onVirtualScroll = function () {}; } catch (eOn) { /* 忽略 */ }
      try { if (typeof lenis.destroy === 'function') lenis.destroy(); } catch (eDestroy) { /* 忽略 */ }
      window.__hnLenis = null;
      var cl = document.documentElement.classList;
      ['lenis', 'lenis-smooth', 'lenis-stopped', 'lenis-scrolling'].forEach(function (c) { cl.remove(c); });
      try {
        console.warn('[hn] Lenis 内部状态被写坏（已 ' + count +
          ' 次），已退回浏览器原生滚动并掐断其滚轮接管——功能不受影响，只是少了平滑缓动。');
      } catch (eWarn) { /* 忽略 */ }
    }

    if (!window.__hnLenisSelfHeal) {
      window.__hnLenisSelfHeal = true;
      var anomalies = 0;
      window.addEventListener('wheel', function () {
        var lenis = window.__hnLenis;
        if (!lenis) return;
        if (typeof lenis.targetScroll === 'number' && typeof lenis.animatedScroll === 'number') return;
        anomalies++;
        /* 先取证（此时字段还是坏的），再复位——顺序反了就只能看到修好的值 */
        var snapshot = anomalies === 1 ? describeLenisState(lenis) : null;
        var y = typeof lenis.actualScroll === 'number'
          ? lenis.actualScroll
          : (window.scrollY || document.documentElement.scrollTop || 0);
        lenis.targetScroll = lenis.animatedScroll = y;
        if (anomalies === 1) {
          try {
            console.warn('[hn] Lenis 内部滚动值被写坏，已复位到', y, '——现场（复位前）：', snapshot);
          } catch (eLog) { /* 忽略 */ }
          trapLenisWrites(lenis);
        }
        if (anomalies >= 3) degradeToNativeScroll(lenis, anomalies);
      }, { capture: true, passive: true });
    }
  }

  /* 统一的"跳到某个滚动位置"入口：有 Lenis 时交给它（同时同步它内部的目标值，
     否则它的下一帧会把位置拉回去），没有则退回原生 scrollTo。
     immediate=true 表示不做平滑动画（换页回页首、锚点跳转都用它）。
     force=true：即使 Lenis 处于 stopped/locked（极端情况下可能残留），也照跳不误。 */
  window.__hnScrollTo = function (y, immediate) {
    var lenis = window.__hnLenis;
    var target = Math.max(0, Math.round(y) || 0);
    if (lenis && typeof lenis.scrollTo === 'function') {
      lenis.scrollTo(target, { immediate: !!immediate, force: true });
      return;
    }
    window.scrollTo(0, target);
  };

  /* 内容高度变化后刷新 Lenis 的尺寸缓存。
     为什么必须有这个：Lenis 把文档高度缓存在 dimensions 里（limit = scrollHeight
     - innerHeight），只在 window resize 与它自己的 ResizeObserver 回调里更新，
     而且那个观察器带 250ms 防抖。PJAX 换页后这段窗口里 limit 仍是**旧页面**的值：
       · 从长页切到短页：跳转会被夹到旧的大 limit（落点不准）；
       · 从短页切到长页（/posts/ 1347px、搜索页等）：旧 limit 只有几百甚至 0，
         于是滚轮被夹在 0~旧limit 内 —— 表现为"页面上不去下不来、每次滑动都被
         弹回顶部、伴随闪烁"（Lenis 的 rAF 仍在逐帧写位置，浏览器又把它夹回真实范围）。
     实测：换页后 400ms 时 limit 仍是 4297，而新页面 html.scrollHeight 只有 1347。
     所以换页后必须主动 resize()（这也是 Lenis 官方对 SPA/PJAX 的明确要求）。 */
  window.__hnLenisResize = function () {
    var lenis = window.__hnLenis;
    if (lenis && typeof lenis.resize === 'function') lenis.resize();
  };

  /* --------------------------------------------------------------------------
   * 首页轻量开场——《动效升级方案》§4-13
   * 只在首页、每次会话一次、约 520ms、纯遮罩揭幕。
   * 只在本页脚本执行时跑一次；PJAX 换页不会再播（脚本不会重新执行）。
   * ------------------------------------------------------------------------ */
  function initOpener() {
    if (reduceMotion()) return;
    if (!document.querySelector('.home-page')) return;
    try {
      if (window.sessionStorage.getItem('hn-opener')) return;
      window.sessionStorage.setItem('hn-opener', '1');
    } catch (err) {
      return; /* 隐私模式等 sessionStorage 不可用：不播 */
    }

    var el = document.createElement('div');
    el.className = 'home-opener';
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);

    /* 两帧后再揭幕：保证遮罩先被绘制过一帧，动画才有起点 */
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        el.classList.add('is-open');
      });
    });
    /* 动画结束就摘掉节点（不依赖 transitionend，避免掉帧时残留） */
    window.setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 700);
  }

  function init() {
    /* 目录高亮是功能性指示：减少动态下也保留（CSS 只去掉那条竖条的过渡） */
    initTocSpy();

    /* 下面都是装饰性入场：减少动态 / 无 IntersectionObserver 时完全不介入 */
    if (reduceMotion() || !('IntersectionObserver' in window)) return;

    initCountUp();

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

  /* 窗口尺寸变化：节奏重算（TOC 判定依赖当前视口）；
     标题只处理「还没入场」的——已入场的行已是终态，重新拆行反而会把它打回隐藏态。 */
  function onResize() {
    if (resizeTimer) window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      initTocSpy();
      if (reduceMotion() || !('IntersectionObserver' in window)) return;
      var hosts = document.querySelectorAll(HOSTS + '.mask-split:not(.mask-in)');
      for (var i = 0; i < hosts.length; i++) {
        unsplit(hosts[i]);
      }
      init();
    }, 200);
  }

  window.__motionInit = init;

  /* 首屏：DOM 已解析（defer 脚本在解析完成后按序执行） */
  initSmoothScroll(); /* 先起滚动引擎，再进场动画，避免首屏滚动手感不一致 */
  init();
  initOpener(); /* 必须在 init() 之后：遮罩要盖住已经就位的布局 */

  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);

  /* PJAX 换页：本监听先于 site.js 的同名监听注册（脚本顺序），
     所以新页面永远是"先拆行 → 再入场" */
  document.addEventListener('pjax:done', function () {
    init();
  });
})();
