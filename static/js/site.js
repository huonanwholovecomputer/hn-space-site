/* 共享的可见性判定（首页 data-reveal 与 about 行级入场共用）：
   - 'wait' ：元素仍在视口下方 / 仅露出一角 → 保持隐藏，等滚动到足够可见再播
   - 'show' ：元素基本完全进入视口（常规 ≥90% 可见，超一屏 ≥60%）→ 播放入场动画
   - 'force'：元素已滚过视口上方 → 直接显示，不再播动画，只保证不残留隐藏态 */
var revealClassify = function (rect, vh) {
  if (rect.top >= vh) {
    return 'wait';
  }
  if (rect.bottom <= 0 || rect.top < 0) {
    return 'force';
  }
  var visible = Math.min(rect.bottom, vh) - rect.top;
  var ratio = visible / (rect.height || 1);
  if (rect.height > vh) {
    return ratio >= 0.6 ? 'show' : 'wait';
  }
  return ratio >= 0.9 ? 'show' : 'wait';
};

/* 全站滚动入场动画：渐进增强，无 JS 或减少动态时直接显示 */
(function () {
  'use strict';
  document.documentElement.classList.add('js');

  var selector = '[data-reveal], .post-entry, .searchResults li, .archive-entry, .page-header, .post-header';

  var guardTimer = null;

  /* 播放入场动画（带同级错峰延迟），动画结束后清理隐藏态 */
  var revealEl = function (el) {
    var siblings = el.parentElement.children;
    var index = Array.prototype.indexOf.call(siblings, el);
    var delay = Math.min(index, 5) * 70;
    el.style.animationDelay = delay + 'ms';
    el.classList.add('is-in');
    // 入场完成后移除 reveal 类与内联延迟：
    // 否则 .reveal-item 会覆盖卡片自身的 hover 过渡，transform 也被钉住，上浮效果永远不生效。
    // data-reveal 属性同时移除，让 html.js [data-reveal] 的隐藏不再匹配。
    window.setTimeout(function () {
      el.classList.remove('reveal-item', 'is-in');
      el.style.animationDelay = '';
      el.removeAttribute('data-reveal');
    }, delay + 750);
  };

  /* 直接显示（已滚过视口、无法再播动画）：清掉隐藏态 */
  var forceReveal = function (el) {
    el.classList.remove('reveal-item', 'is-in');
    el.style.animationDelay = '';
    el.removeAttribute('data-reveal');
  };

  function initReveal() {
    var els = Array.prototype.slice.call(document.querySelectorAll(selector));
    if (!els.length) {
      return;
    }

    var reduce =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduce || !('IntersectionObserver' in window)) {
      els.forEach(revealEl);
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var el = entry.target;
          var rect = entry.boundingClientRect;
          var vh = window.innerHeight || document.documentElement.clientHeight;
          var action = revealClassify(rect, vh);
          if (entry.isIntersecting && action === 'show') {
            /* 足够可见：播放入场动画 */
            revealEl(el);
            io.unobserve(el);
          } else if (action === 'force') {
            /* 已滚过视口：直接显示，不留隐藏态 */
            forceReveal(el);
            io.unobserve(el);
          }
        });
      },
      /* 与 about 页一致的触发口径：元素基本完全进入视口
         （≥90%，超一屏 ≥60%）才播放，避免在显示范围外提前播 */
      { threshold: [0, 0.3, 0.6, 0.9, 1] }
    );

    els.forEach(function (el) {
      el.classList.add('reveal-item');
      io.observe(el);
    });

    /* 兜底轮询：IO 只在交集状态变化时回调——若瞬间滚动跳过某些元素
       （从未进入视口就到了视口上方），IO 不会触发，这里兜底强制显示 */
    if (guardTimer) {
      window.clearInterval(guardTimer);
    }
    guardTimer = window.setInterval(function () {
      var anyPending = false;
      Array.prototype.forEach.call(document.querySelectorAll(selector), function (el) {
        var rect = el.getBoundingClientRect();
        var vh = window.innerHeight || document.documentElement.clientHeight;
        var action = revealClassify(rect, vh);
        if (action === 'show') {
          revealEl(el);
          io.unobserve(el);
        } else if (action === 'force') {
          forceReveal(el);
          io.unobserve(el);
        } else {
          anyPending = true;
        }
      });
      if (!anyPending) {
        window.clearInterval(guardTimer);
        guardTimer = null;
      }
    }, 1200);
  }

  initReveal();
  window.__siteInitReveal = initReveal;
})();

/* 卡片 3D 倾斜 + 手电筒光晕：带速率限制的平滑跟随，光斑为聚焦的圆形光束。
   实现要点：不依赖 pointerenter/pointerleave（旋转会改变视觉边界，
   边缘移动时反复触发命中判定导致震荡），改为全局指针位置 + 磁吸扩展区：
   - 鼠标位于「卡片 + 四周 MAGNET 像素」内 → 持续跟随倾斜（坐标钳制到卡片内）
   - 移出扩展区 → 平滑复位
   这样鼠标在卡片边缘来回滑动时角度稳定，无临界震荡。 */
(function () {
  'use strict';

  var CARD_SELECTOR =
    '.highlight-card, .skill-card, .project-card, .content-card, ' +
    '.project-featured, .about-card, .contact-panel, .post-entry, .searchResults li, ' +
    '.about-quick-card, .about-tile, .about-dev-card, .about-exp-card, ' +
    '.about-comp-card, .about-comp-featured';

  /* 磁吸扩展区（像素）：卡片四周留出该范围，边缘滑动仍视为"在卡片上" */
  var MAGNET = 28;

  var cards = [];          // 已绑定状态对象的卡片
  var mouseX = -9999;
  var mouseY = -9999;
  var mouseReady = false;
  var globalBound = false;

  function makeState(el) {
    var maxTilt = parseFloat(
      window.getComputedStyle(el).getPropertyValue('--tilt-max')
    );
    if (!isFinite(maxTilt) || maxTilt <= 0) {
      maxTilt = 4;
    }

    var target = { rx: 0, ry: 0, gx: 50, gy: 50 };
    var current = { rx: 0, ry: 0, gx: 50, gy: 50 };
    var raf = null;

    function apply() {
      el.style.setProperty('--rx', current.rx.toFixed(2) + 'deg');
      el.style.setProperty('--ry', current.ry.toFixed(2) + 'deg');
      el.style.setProperty('--gx', current.gx.toFixed(1) + '%');
      el.style.setProperty('--gy', current.gy.toFixed(1) + '%');
    }

    /* 复位到中性：清掉内联样式，避免 PJAX 后光效停在旧位置（如十字中心） */
    function resetInline() {
      el.style.removeProperty('--rx');
      el.style.removeProperty('--ry');
      el.style.removeProperty('--gx');
      el.style.removeProperty('--gy');
      el.style.removeProperty('--gs');
    }

    function step() {
      current.rx += (target.rx - current.rx) * 0.16;
      current.ry += (target.ry - current.ry) * 0.16;
      current.gx += (target.gx - current.gx) * 0.16;
      current.gy += (target.gy - current.gy) * 0.16;
      apply();
      var settled =
        Math.abs(current.rx - target.rx) < 0.03 &&
        Math.abs(current.ry - target.ry) < 0.03 &&
        Math.abs(current.gx - target.gx) < 0.03 &&
        Math.abs(current.gy - target.gy) < 0.03;
      raf = settled ? null : window.requestAnimationFrame(step);
    }

    return {
      el: el,
      maxTilt: maxTilt,
      target: target,
      current: current,
      active: false,
      raf: null,
      apply: apply,
      resetInline: resetInline,
      start: function () {
        if (!raf) {
          raf = window.requestAnimationFrame(step);
        }
      }
    };
  }

  /* 更新单个卡片：鼠标是否落在磁吸区内 */
  function updateCard(st) {
    var el = st.el;
    if (!el.isConnected) return;

    var rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    var inside =
      mouseX >= rect.left - MAGNET &&
      mouseX <= rect.right + MAGNET &&
      mouseY >= rect.top - MAGNET &&
      mouseY <= rect.bottom + MAGNET;

    if (inside) {
      /* 坐标钳制到卡片内，边缘处达到最大倾斜而非无限放大 */
      var cx = Math.min(Math.max(mouseX, rect.left), rect.right);
      var cy = Math.min(Math.max(mouseY, rect.top), rect.bottom);
      var x = (cx - rect.left) / rect.width;
      var y = (cy - rect.top) / rect.height;
      if (!st.active) {
        st.active = true;
        el.classList.add('is-tilting');
        var size = Math.max(90, Math.min(rect.width, rect.height) * 0.72);
        el.style.setProperty('--gs', size.toFixed(0) + 'px');
        /* 进入时立即写入一次目标值，避免 rAF 未启动时光效停留在旧位置 */
        st.target.rx = (0.5 - y) * 2 * st.maxTilt;
        st.target.ry = (x - 0.5) * 2 * st.maxTilt;
        st.target.gx = x * 100;
        st.target.gy = y * 100;
        st.apply();
        st.start();
        return;
      }
      st.target.rx = (0.5 - y) * 2 * st.maxTilt;
      st.target.ry = (x - 0.5) * 2 * st.maxTilt;
      st.target.gx = x * 100;
      st.target.gy = y * 100;
      st.start();
    } else if (st.active) {
      st.active = false;
      el.classList.remove('is-tilting');
      st.target.rx = 0;
      st.target.ry = 0;
      st.start();
    }
  }

  /* 遍历所有卡片并更新光效（鼠标/滚动共用） */
  function updateAll() {
    for (var i = 0; i < cards.length; i++) {
      updateCard(cards[i]);
    }
  }

  function onGlobalMove(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    mouseReady = true;
    updateAll();
  }

  /* 滚动时（滚轮/惯性/滚动条/跳转）卡片相对鼠标的位置会变，
     但 pointermove 不会因滚动触发——若不重算，光斑会停留在滚动前
     的最后坐标，看起来「卡在十字中心」。这里用 rAF 节流按最新
     getBoundingClientRect 重算，让光斑始终跟随鼠标的视觉位置。 */
  var scrollRaf = null;
  function onScroll() {
    if (scrollRaf) return;
    scrollRaf = window.requestAnimationFrame(function () {
      scrollRaf = null;
      if (mouseReady) updateAll();
    });
  }

  function initTilt() {
    if (
      !window.matchMedia ||
      !window.matchMedia('(hover: hover) and (pointer: fine)').matches ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    /* 全局 pointermove + scroll 只绑定一次（PJAX 后复用） */
    if (!globalBound) {
      globalBound = true;
      window.addEventListener('pointermove', onGlobalMove, { passive: true });
      /* capture：捕获任意滚动容器（window / 内部滚动区）的滚动 */
      window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    }

    /* PJAX 换页后：清除所有卡片的激活态（is-tilting 类 + 内联光效样式），
       并把鼠标坐标重置为无效值，避免用旧页面坐标对新卡片误触发光效。 */
    cards.forEach(function (st) {
      st.active = false;
      st.el.classList.remove('is-tilting');
      st.resetInline();
    });
    mouseX = -9999;
    mouseY = -9999;
    mouseReady = false;

    /* 扫描新卡片（已绑定的跳过）；同时清理已脱离 DOM 的旧卡片 */
    cards = cards.filter(function (st) { return st.el.isConnected; });

    Array.prototype.forEach.call(
      document.querySelectorAll(CARD_SELECTOR),
      function (el) {
        if (el.__tiltBound) return;
        el.__tiltBound = true;
        var st = makeState(el);
        /* PJAX 换页后新卡片可能带旧的内联光效样式，先复位，
           避免光效卡在十字中心或残留旧位置 */
        st.resetInline();
        cards.push(st);
      }
    );
  }

  initTilt();
  window.__siteInitTilt = initTilt;
})();

/* 关于页行级入场：整行进入视口后，子卡片从左到右逐个「磁吸」入位。
   隐藏态只挂在 [data-about-row] 上（about.css 的 html.js [data-about-row] > *），
   动画结束后移除该属性，隐藏规则不再匹配 → 卡片回到默认样式，hover 上浮正常。 */
(function () {
  'use strict';

  var rows = [];
  var io = null;
  var guard = null;

  var reduce =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var show = function (row) {
    var kids = row.children;
    var total = kids.length;
    Array.prototype.forEach.call(kids, function (el, i) {
      el.style.setProperty('--snap-delay', i * 90 + 'ms');
      el.classList.add('is-in');
    });
    /* 等最后一个卡片入场动画结束后再清理，避免隐藏规则把卡片重新隐藏 */
    var lastDelay = (total - 1) * 90 + 620;
    window.setTimeout(function () {
      Array.prototype.forEach.call(kids, function (el) {
        el.classList.remove('is-in');
        el.style.removeProperty('--snap-delay');
        /* 保险：清除可能残留的内联 transform/opacity，
           确保离屏未播放动画的卡片也回到默认样式 */
        el.style.opacity = '';
        el.style.transform = '';
      });
      row.removeAttribute('data-about-row');
    }, lastDelay + 40);
  };

  /* 强制展示：不清除动画类，直接移除隐藏态。
     用于行已滚过视口上方（无法再播放入场动画）时的兜底。 */
  var forceShow = function (row) {
    var kids = row.children;
    Array.prototype.forEach.call(kids, function (el) {
      el.classList.remove('is-in');
      el.style.removeProperty('--snap-delay');
      el.style.opacity = '';
      el.style.transform = '';
    });
    row.removeAttribute('data-about-row');
  };

  /* 行当前的处理方式由文件顶部的 revealClassify 统一判定
     （与首页 data-reveal 共用同一套 ≥90% / 超一屏 ≥60% 触发口径） */

  function startGuard() {
    if (guard) {
      window.clearInterval(guard);
      guard = null;
    }
    guard = window.setInterval(function () {
      var anyPending = false;
      rows.forEach(function (row) {
        if (!row.hasAttribute('data-about-row')) {
          return;
        }
        anyPending = true;
        var rect = row.getBoundingClientRect();
        var vh = window.innerHeight || document.documentElement.clientHeight;
        var action = revealClassify(rect, vh);
        if (action === 'show') {
          show(row);
          if (io) io.unobserve(row);
        } else if (action === 'force') {
          forceShow(row);
          if (io) io.unobserve(row);
        }
        /* 'wait'：保持隐藏，等用户滚动到后再触发 */
      });
      if (!anyPending) {
        window.clearInterval(guard);
        guard = null;
      }
    }, 1200);
  }

  function initAboutRow() {
    /* 重扫：PJAX 后 rows 包含新旧所有（旧行已移除 data-about-row 属性，
       重扫仅保留仍带属性的行） */
    rows = Array.prototype.slice.call(document.querySelectorAll('[data-about-row]'));
    if (!rows.length) {
      return;
    }

    if (reduce || !('IntersectionObserver' in window)) {
      rows.forEach(show);
      return;
    }

    if (!io) {
      io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) {
              return;
            }
            var rect = entry.boundingClientRect;
            var vh = window.innerHeight || document.documentElement.clientHeight;
            var action = revealClassify(rect, vh);
            if (action === 'show') {
              show(entry.target);
              io.unobserve(entry.target);
            } else if (action === 'force') {
              /* 快速滚过：行横跨视口顶部时才走到这里 */
              forceShow(entry.target);
              io.unobserve(entry.target);
            }
          });
        },
        /* 只按可见比例触发：行基本完全进入视口（≥90%，超一屏 ≥60%）
           才播放入场动画，避免在显示范围外/只露出一角时提前播放 */
        { threshold: [0, 0.3, 0.6, 0.9, 1] }
      );
    }

    rows.forEach(function (row) {
      io.observe(row);
    });

    /* 兜底 A：页面加载后，已完全/基本进入视口的行立即展示，
       已滚过的行直接显示 */
    window.setTimeout(function () {
      rows.forEach(function (row) {
        if (!row.hasAttribute('data-about-row')) {
          return;
        }
        var rect = row.getBoundingClientRect();
        var vh = window.innerHeight || document.documentElement.clientHeight;
        var action = revealClassify(rect, vh);
        if (action === 'show') {
          show(row);
          if (io) io.unobserve(row);
        } else if (action === 'force') {
          forceShow(row);
          if (io) io.unobserve(row);
        }
      });
    }, 300);

    startGuard();
  }

  initAboutRow();
  window.__siteInitAboutRow = initAboutRow;
})();

/* 悬浮导航：滚动超过 80px 收缩成"灵动岛"胶囊（DeepSeek 同款阈值与交互）。
   header 是 body 级元素，PJAX 不替换 → 只需初始化一次。 */
(function () {
  'use strict';
  var header = document.querySelector('.header');
  if (!header) return;
  var onScroll = function () {
    header.classList.toggle('is-scrolled', window.scrollY > 80);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
})();

/* 名字"窥视镜"：反色圆环内显示别名（h_n）、圆环外保持原名（霍楠）。
   用两层文本 + 跟随鼠标的圆形遮罩实现：基础层在圆内隐藏、窥视层只在圆内显示，
   圆环的 mix-blend-mode: difference 反色正好落在窥视窗口上。 */
(function () {
  'use strict';

  function initPeek() {
    var name = document.querySelector('.hero-name');
    if (!name) return;
    if (window.matchMedia && window.matchMedia('(hover: none), (pointer: coarse)').matches) return;
    /* PJAX 后重复调用时避免重复绑定 */
    if (name.__peekBound) return;
    name.__peekBound = true;

    var last = { x: -9999, y: -9999 };
    function update() {
      var rect = name.getBoundingClientRect();
      name.style.setProperty('--peek-x', (last.x - rect.left).toFixed(1) + 'px');
      name.style.setProperty('--peek-y', (last.y - rect.top).toFixed(1) + 'px');
    }
    window.addEventListener('mousemove', function (e) {
      last.x = e.clientX;
      last.y = e.clientY;
      update();
    }, { passive: true });
    /* 滚动时名字相对坐标变化，同步刷新，避免窥视镜错位 */
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
  }

  initPeek();
  window.__siteInitPeek = initPeek;
})();

/* 移动端导航：汉堡按钮开合下拉菜单。
   仅在手机宽度（.nav-toggle 可见）下生效，桌面端无感。 */
(function () {
  'use strict';
  var header = document.querySelector('.header');
  var toggle = document.getElementById('nav-toggle');
  if (!header || !toggle) return;

  var setOpen = function (open) {
    header.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? '关闭导航菜单' : '打开导航菜单');
  };

  toggle.addEventListener('click', function () {
    setOpen(!header.classList.contains('is-open'));
  });

  /* 点击下拉面板以外的区域关闭 */
  document.addEventListener('click', function (e) {
    if (header.classList.contains('is-open') && !header.contains(e.target)) {
      setOpen(false);
    }
  });

  /* 按 Esc 关闭并聚焦回按钮 */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && header.classList.contains('is-open')) {
      setOpen(false);
      toggle.focus();
    }
  });

  /* 点击菜单链接后自动收起 */
  var menu = document.getElementById('menu');
  if (menu) {
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        setOpen(false);
      }
    });
  }

  /* 横屏/窗口放大回桌面宽度时复位 */
  var mq = window.matchMedia('(min-width: 769px)');
  var onMq = function (e) {
    if (e.matches) setOpen(false);
  };
  if (mq.addEventListener) {
    mq.addEventListener('change', onMq);
  } else if (mq.addListener) {
    mq.addListener(onMq);
  }
})();

/* =========================================================
   PJAX 联动：新页面内容替换完成后，重新初始化页面级效果。
   在 pjax.js 之后加载（extend_head 中 pjax.js 排在 site.js 后），
   但 pjax:done 事件由 pjax.js 触发，这里只需监听。
   ========================================================= */
(function () {
  'use strict';
  document.addEventListener('pjax:done', function () {
    if (window.__siteInitReveal) window.__siteInitReveal();
    if (window.__siteInitTilt) window.__siteInitTilt();
    if (window.__siteInitAboutRow) window.__siteInitAboutRow();
    if (window.__siteInitPeek) window.__siteInitPeek();
    if (window.__dsInitAll) window.__dsInitAll();
  });
})();
