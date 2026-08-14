/* 全站滚动入场动画：渐进增强，无 JS 或减少动态时直接显示 */
(function () {
  'use strict';
  document.documentElement.classList.add('js');

  var selector = '[data-reveal], .post-entry, .searchResults li, .archive-entry, .page-header, .post-header';
  var els = Array.prototype.slice.call(document.querySelectorAll(selector));
  if (!els.length) {
    return;
  }

  var show = function (el) {
    el.classList.add('is-in');
  };

  var reduce =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduce || !('IntersectionObserver' in window)) {
    els.forEach(show);
    return;
  }

  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) {
          return;
        }
        var el = entry.target;
        var siblings = el.parentElement.children;
        var index = Array.prototype.indexOf.call(siblings, el);
        var delay = Math.min(index, 5) * 70;
        el.style.animationDelay = delay + 'ms';
        show(el);
        io.unobserve(el);
        // 入场完成后移除 reveal 类与内联延迟：
        // 否则 .reveal-item 会覆盖卡片自身的 hover 过渡，transform 也被钉住，上浮效果永远不生效。
        // data-reveal 属性同时移除，让 html.js [data-reveal] 的隐藏不再匹配。
        window.setTimeout(function () {
          el.classList.remove('reveal-item', 'is-in');
          el.style.animationDelay = '';
          el.removeAttribute('data-reveal');
        }, delay + 750);
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -36px 0px' }
  );

  els.forEach(function (el) {
    el.classList.add('reveal-item');
    io.observe(el);
  });
})();

/* 卡片 3D 倾斜 + 手电筒光晕：带速率限制的平滑跟随，光斑为聚焦的圆形光束 */
(function () {
  'use strict';
  if (
    !window.matchMedia ||
    !window.matchMedia('(hover: hover) and (pointer: fine)').matches ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    return;
  }

  var CARD_SELECTOR =
    '.highlight-card, .skill-card, .project-card, .content-card, ' +
    '.project-featured, .about-card, .contact-panel, .post-entry, .searchResults li';

  Array.prototype.forEach.call(
    document.querySelectorAll(CARD_SELECTOR),
    function (el) {
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

      function start() {
        if (!raf) {
          raf = window.requestAnimationFrame(step);
        }
      }

      el.addEventListener('pointerenter', function () {
        var rect = el.getBoundingClientRect();
        var size = Math.max(90, Math.min(rect.width, rect.height) * 0.72);
        el.style.setProperty('--gs', size.toFixed(0) + 'px');
      });

      el.addEventListener('pointermove', function (e) {
        var rect = el.getBoundingClientRect();
        if (!rect.width || !rect.height) {
          return;
        }
        var x = (e.clientX - rect.left) / rect.width;
        var y = (e.clientY - rect.top) / rect.height;
        el.classList.add('is-tilting');
        target.rx = (0.5 - y) * 2 * maxTilt;
        target.ry = (x - 0.5) * 2 * maxTilt;
        target.gx = x * 100;
        target.gy = y * 100;
        start();
      });

      el.addEventListener('pointerleave', function () {
        el.classList.remove('is-tilting');
        target.rx = 0;
        target.ry = 0;
        start();
      });
    }
  );
})();

/* 关于页行级入场：整行进入视口后，子卡片从左到右逐个「磁吸」入位。
   隐藏态只挂在 [data-about-row] 上（about.css 的 html.js [data-about-row] > *），
   动画结束后移除该属性，隐藏规则不再匹配 → 卡片回到默认样式，hover 上浮正常。 */
(function () {
  'use strict';
  var rows = document.querySelectorAll('[data-about-row]');
  if (!rows.length) {
    return;
  }

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
      });
      row.removeAttribute('data-about-row');
    }, lastDelay + 40);
  };

  if (reduce || !('IntersectionObserver' in window)) {
    rows.forEach(show);
    return;
  }

  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) {
          return;
        }
        show(entry.target);
        io.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -36px 0px' }
  );

  rows.forEach(function (row) {
    io.observe(row);
  });
})();

/* 悬浮导航：滚动超过 80px 收缩成"灵动岛"胶囊（DeepSeek 同款阈值与交互） */
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
  var name = document.querySelector('.hero-name');
  if (!name) return;
  if (window.matchMedia && window.matchMedia('(hover: none), (pointer: coarse)').matches) return;

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
