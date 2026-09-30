/* =========================================================
   PJAX 无刷新导航：站内链接点击 → fetch 新页面 → 只替换 <main>
   内容并更新标题/URL，保留 body 上的全局元素（header、footer、
   鼠标拖尾 canvas 等），滚动位置不重置 → 灵动岛收缩状态、
   拖尾与点击特效跨页面持续存在。
   例外：进入 /posts/<slug>/ 正文页时回到页首（见 isArticleUrl）。
   ========================================================= */
(function () {
  'use strict';

  /* 需要替换的 <head> 节点类型（除 stylesheet 外，CSS 全局共享不换） */
  var HEAD_SELECTOR =
    'title, meta[name="description"], meta[name="keywords"], meta[property^="og:"], ' +
    'meta[name="twitter:"], link[rel="canonical"]';

  var mainEl = document.querySelector('main.main');
  if (!mainEl) return;

  /* 首次加载：初始化导航高亮指示条位置（.active 由 Hugo 服务端渲染） */
  (function initNavActive() {
    var menu = document.getElementById('menu');
    if (!menu) return;
    /* 兜底创建指示条（绝对定位，不参与 flex 布局） */
    if (!menu.querySelector('.menu-indicator')) {
      var indicator = document.createElement('span');
      indicator.className = 'menu-indicator';
      menu.appendChild(indicator);
    }
    indicator = menu.querySelector('.menu-indicator');
    var activeSpan = menu.querySelector('.active');
    /* 初始定位不带动画：指示条 CSS 初始态是 left:0（菜单最左 = 首页位置），
       若直接带 transition 设置位置，整页加载（如搜索页）时会从「首页」
       一路滑到激活项，显得突兀。先临时禁用 transition 直接就位，
       再恢复，后续 PJAX 切换仍保持平滑滑动。 */
    indicator.style.transition = 'none';
    moveMenuIndicator(activeSpan);
    void indicator.offsetWidth; /* 强制 reflow，让上一步的位置样式生效 */
    indicator.style.transition = '';
    /* 等字体/布局稳定后校正一次位置 */
    window.addEventListener('load', function () {
      window.setTimeout(function () {
        moveMenuIndicator(menu.querySelector('.active'));
      }, 300);
    });
  })();

  /* 判断链接是否应走 PJAX：
     同源、非下载、非新窗口、非纯锚点、非邮件/电话。
     搜索页也已接入 PJAX：fastsearch.js 站点版暴露 window.initFastSearch，
     PJAX 进入 /search/ 后由 ensureSearchReady 重新初始化搜索框。 */

  function shouldPjax(a, url) {
    if (a.target && a.target !== '_self') return false;
    if (a.hasAttribute('download')) return false;
    if (a.getAttribute('rel') === 'noopener' && a.getAttribute('target') === '_blank') return false;
    /* 站内灯箱入口（如竞赛证书）：交给 math-image.js 的 a[data-lightbox] 处理，
       不能当站内跳转去 fetch（否则会把图片当 HTML 解析、然后整页跳转过去）。 */
    if (a.hasAttribute('data-lightbox')) return false;
    /* 静态资源一律不做 PJAX（图片/PDF/字体/压缩包等）：
       同一类问题以后换成 <a href="xx.pdf"> 也不会再踩。 */
    if (/\.(png|jpe?g|webp|avif|gif|svg|ico|pdf|zip|7z|rar|gz|mp4|webm|mp3|wav|woff2?|ttf|otf|eot)$/i.test(url.pathname)) {
      return false;
    }
    var proto = url.protocol;
    if (proto !== 'http:' && proto !== 'https:') return false;
    if (url.origin !== location.origin) return false;
    if (url.pathname === location.pathname && url.search === location.search) return false;
    if (url.hash && url.pathname === location.pathname) return false; // 同页锚点
    return true;
  }

  /* 文章页判定：/posts/<slug>/ 形式的正文页（区别于 /posts/ 列表页）。
     点击进入正文时应回到页首，不保留来源页的滚动位置。 */
  function isArticleUrl(url) {
    var p = url.pathname || '';
    return /^\/posts\/[^/]+(?:\/)?$/.test(p);
  }

  function applyHead(doc, url) {
    var old = document.head.querySelectorAll(HEAD_SELECTOR);
    Array.prototype.forEach.call(old, function (el) { el.remove(); });
    var fresh = doc.head.querySelectorAll(HEAD_SELECTOR);
    Array.prototype.forEach.call(fresh, function (el) {
      document.head.appendChild(el.cloneNode(true));
    });
    document.title = doc.title || document.title;
  }

  function applyBodyClass(doc) {
    var cls = doc.body.className || '';
    document.body.className = cls;
    document.body.id = doc.body.id || 'top';
  }

  /* 更新导航菜单高亮：根据新 URL 匹配 .menu 链接，切换 .active，
     并滑动下划线指示条到激活项。 */
  function applyNavActive(url) {
    var menuLinks = document.querySelectorAll('#menu a');
    var activeSpan = null;
    Array.prototype.forEach.call(menuLinks, function (a) {
      var linkUrl;
      try {
        linkUrl = new URL(a.href, location.href);
      } catch (err) {
        return;
      }
      /* 与 Hugo 端一致的匹配规则：URL（含尾斜杠）精确相等即高亮 */
      var target = (linkUrl.pathname || '/');
      if (target.length > 1 && !/\/$/.test(target)) target += '/';
      var current = (url.pathname || '/');
      if (current.length > 1 && !/\/$/.test(current)) current += '/';
      var span = a.querySelector('span');
      if (span) {
        var isActive = target === current;
        span.classList.toggle('active', isActive);
        if (isActive) activeSpan = span;
      }
    });
    moveMenuIndicator(activeSpan);
  }

  /* 滑动下划线指示条到激活项（或隐藏） */
  function moveMenuIndicator(activeSpan) {
    var menu = document.getElementById('menu');
    if (!menu) return;
    var indicator = menu.querySelector('.menu-indicator');
    /* 桌面端才有 indicator 元素（模板里已加，JS 兜底创建） */
    if (!indicator) {
      indicator = document.createElement('span');
      indicator.className = 'menu-indicator';
      menu.appendChild(indicator);
    }
    if (!activeSpan) {
      indicator.classList.remove('is-active');
      return;
    }
    var menuRect = menu.getBoundingClientRect();
    var spanRect = activeSpan.getBoundingClientRect();
    var left = spanRect.left - menuRect.left + menu.scrollLeft;
    indicator.style.left = left + 'px';
    indicator.style.width = spanRect.width + 'px';
    indicator.classList.add('is-active');
  }

  /* 搜索页支持 PJAX：页面 head 里的 search.js（fuse + fastsearch）只在整页加载时
     由浏览器执行；PJAX 进入 /search/ 后这里手动补加载/调用初始化，
     让输入框启用并可交互（fastsearch.js 站点版暴露 window.initFastSearch）。 */
  function isSearchUrl(url) {
    var p = url.pathname || '/';
    if (p.length > 1 && !/\/$/.test(p)) p += '/';
    return p === '/search/';
  }

  function ensureSearchReady(doc) {
    if (!document.getElementById('searchInput')) return;
    if (typeof window.initFastSearch === 'function') {
      window.initFastSearch();
      return;
    }
    /* 首次进入：从新文档 head 取 search.js 地址并注入（脚本执行时会立即初始化） */
    var srcEl = doc.querySelector('script[src*="/assets/js/search."]');
    if (!srcEl) return;
    var s = document.createElement('script');
    s.src = new URL(srcEl.getAttribute('src'), location.href).href;
    s.onload = function () {
      if (typeof window.initFastSearch === 'function') window.initFastSearch();
    };
    document.head.appendChild(s);
  }

  /* ---------- 换页过渡（对应《动效升级方案》§4-6）----------
     离开：先把 <main> 淡出（html.is-nav-leaving），再替换内容；新内容的入场
     交给 site.js 的 data-reveal，不再叠第二层容器动画（否则两层各淡一次）。
     慢网桥接：超过 LOADING_DELAY_MS 还没回来，才在顶部显示一条不确定进度细线。
     减少动态：不做淡出（LEAVE_MS = 0），行为与改动前完全一致。
     并发保护：只有最后一次点击的结果允许改 DOM（快速连点不互相打架）。 */
  var reduceMotion = !!(
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  var LEAVE_MS = reduceMotion ? 0 : 150;
  var LOADING_DELAY_MS = 250;
  var navToken = 0;

  function setNavLoading(on) {
    document.documentElement.classList.toggle('is-nav-loading', !!on);
  }

  function setNavLeaving(on) {
    document.documentElement.classList.toggle('is-nav-leaving', !!on);
  }

  function beginLeave() {
    if (LEAVE_MS <= 0) return Promise.resolve();
    setNavLeaving(true);
    return new Promise(function (resolve) {
      window.setTimeout(resolve, LEAVE_MS);
    });
  }

  /* 换页时的滚动定位：优先交给 motion.js 的 __hnScrollTo
     （有 Lenis 时由它即时跳转并同步内部目标值，否则 Lenis 下一帧会把位置拉回去），
     没有该入口时就是原生 scrollTo。 */
  function jumpTo(y) {
    var target = Math.max(0, Math.round(y) || 0);
    if (typeof window.__hnScrollTo === 'function') {
      window.__hnScrollTo(target, true);
      return;
    }
    window.scrollTo(0, target);
  }

  /* 刷新 Lenis 的尺寸缓存（limit = 文档高 - 视口高）。
     必须在换页替换内容之后、任何跳转之前调用，否则它会拿旧页面的 limit
     夹住滚动：从短页切到长页时表现为"滑不动 + 每次弹回顶部 + 闪烁"。
     详见 motion.js 里 __hnLenisResize 的注释。 */
  function refreshScrollBounds() {
    if (typeof window.__hnLenisResize === 'function') window.__hnLenisResize();
  }

  function navigate(url, push) {
    if (push) {
      history.pushState({ url: url.href }, '', url.href);
    }

    /* 记录进入新页面前的滚动位置与导航状态，用于过渡后恢复 */
    var prevScrollY = window.scrollY;
    var header = document.querySelector('.header');
    var wasScrolled = header ? header.classList.contains('is-scrolled') : false;

    var myToken = ++navToken;
    var stale = function () {
      return myToken !== navToken;
    };

    /* 新的导航接管过渡状态：清掉上一次可能残留的淡出态。
       快速连点时，旧导航会在 beginLeave 之后的 stale 分支提前返回、不再调用
       finish（那次导航的结果已被丢弃），若不在这里清，页面会停在淡出状态。 */
    setNavLeaving(false);

    var loadingTimer = window.setTimeout(function () {
      if (!stale()) setNavLoading(true);
    }, LOADING_DELAY_MS);

    /* 收尾：撤掉加载细线与淡出态。过期导航不再碰这些状态，交给最新那次 */
    var finish = function () {
      window.clearTimeout(loadingTimer);
      if (stale()) return;
      setNavLoading(false);
      setNavLeaving(false);
    };

    var req = fetch(url.href, { headers: { 'X-PJAX': '1' } });

    req
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(function (html) {
        if (stale()) return; /* 期间又有新导航：这次结果丢弃，不碰 DOM */

        var doc = new DOMParser().parseFromString(html, 'text/html');
        var newMain = doc.querySelector('main.main');
        if (!newMain) throw new Error('no main');

        /* 先淡出、再替换：避免"旧内容瞬间消失、新内容空一帧"的硬切 */
        return beginLeave().then(function () {
          if (stale()) return;

          applyHead(doc, url);
          applyBodyClass(doc);
          applyNavActive(url);
          /* 替换 main 内容：header/footer/拖尾 canvas 等 body 全局元素不动 */
          mainEl.innerHTML = newMain.innerHTML;
          /* 先撤掉淡出态：新内容以正常状态就位，再由 data-reveal 逐个入场 */
          finish();

          /* 进入搜索页：重新初始化搜索框（启用输入框 + 绑定事件 + 重建索引）。
             先拆掉 Lenis 是第二道防线：搜索包里的 Fuse UMD 曾在 classic script 顶层
             声明 `var e,t; e=this`，把 window.e/t 覆盖掉，而 Lenis 的内部初始化是运行时
             从全局作用域取 `e`/`t` 的 → `new Lenis()` 抛 "e is not a constructor"，
             平滑滚动从此消失（且被静默吞掉、控制台无输出）。
             根因已修在源头（lenis.min.js 与 Fuse 包各自加作用域隔离），搜索页现在不再
             污染任何全局；这里仍先拆后建，让搜索页固定走原生滚动，也隔离未来的意外。
             离开搜索页时由 motion.js 的 syncSmoothScroll（监听 pjax:done）重建实例。 */
          if (isSearchUrl(url)) {
            if (typeof window.__hnLenisTeardown === 'function') window.__hnLenisTeardown();
            ensureSearchReady(doc);
          }

          /* 文章页点击进入正文：固定回到页首。
             其余页面：尝试恢复到原滚动位置（新页面高度可能更短，
             超界则由浏览器收紧；在替换后立即执行，此时浏览器尚未
             因内容变更自动跳顶）。 */
          /* 先刷新滚动上界，再决定跳到哪里：否则 jumpTo 的 clamp 与随后的
             滚轮都会用旧页面的 limit（这是"换页后卡住滑不动"的根因）。 */
          refreshScrollBounds();
          var isArticle = isArticleUrl(url);
          if (isArticle) {
            jumpTo(0);
          } else {
            var targetY = Math.min(prevScrollY, document.documentElement.scrollHeight - window.innerHeight);
            jumpTo(targetY);
          }
          /* 内容里的图片/字体仍会继续撑高文档（懒加载），过一会儿再校正一次；
             中间这段时间 Lenis 自带的观察器（250ms 防抖）也会兜一次。 */
          window.setTimeout(function () {
            if (!stale()) refreshScrollBounds();
          }, 300);

          /* 灵动岛过渡：即使新页面不够长导致滚动位置归零，
             也先保持导航收缩状态一瞬，再由 scroll 监听按真实位置校正，
             避免导航栏在跨页瞬间"弹开"闪烁（文章页已回页首，跳过）。 */
          if (header && wasScrolled && !isArticle && window.scrollY <= 80) {
            header.classList.add('is-scrolled');
          }

          document.dispatchEvent(new CustomEvent('pjax:done', { detail: { url: url.href } }));

          /* 等浏览器稳定后，根据真实滚动位置校正导航状态 */
          window.setTimeout(function () {
            if (header) {
              header.classList.toggle('is-scrolled', window.scrollY > 80);
            }
          }, 60);
        });
      })
      .catch(function () {
        finish();
        /* 失败回退：整页跳转 */
        location.href = url.href;
      });
  }

  /* 点击捕获：拦截站内链接 */
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    var url;
    try {
      url = new URL(a.href, location.href);
    } catch (err) {
      return;
    }
    /* 当前页面为普通页面：直接走 PJAX */
    if (!shouldPjax(a, url)) return;

    /* 移动端菜单已用 site.js 关闭；这里阻止默认跳转走 PJAX */
    e.preventDefault();
    navigate(url, true);
  }, true);

  /* 浏览器前进/后退 */
  window.addEventListener('popstate', function (e) {
    var url = new URL(location.href);
    navigate(url, false);
  });

  /* 首次加载：若页面带查询参数（如 ?dark），PJAX 后也保持一致 */
})();
