/* =========================================================
   PJAX 无刷新导航：站内链接点击 → fetch 新页面 → 只替换 <main>
   内容并更新标题/URL，保留 body 上的全局元素（header、footer、
   鼠标拖尾 canvas 等），滚动位置不重置 → 灵动岛收缩状态、
   拖尾与点击特效跨页面持续存在。
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
    var proto = url.protocol;
    if (proto !== 'http:' && proto !== 'https:') return false;
    if (url.origin !== location.origin) return false;
    if (url.pathname === location.pathname && url.search === location.search) return false;
    if (url.hash && url.pathname === location.pathname) return false; // 同页锚点
    return true;
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

  function navigate(url, push) {
    if (push) {
      history.pushState({ url: url.href }, '', url.href);
    }

    /* 记录进入新页面前的滚动位置与导航状态，用于过渡后恢复 */
    var prevScrollY = window.scrollY;
    var header = document.querySelector('.header');
    var wasScrolled = header ? header.classList.contains('is-scrolled') : false;

    var req = fetch(url.href, { headers: { 'X-PJAX': '1' } });

    req
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var newMain = doc.querySelector('main.main');
        if (!newMain) throw new Error('no main');

        applyHead(doc, url);
        applyBodyClass(doc);
        applyNavActive(url);
        /* 替换 main 内容：header/footer/拖尾 canvas 等 body 全局元素不动 */
        mainEl.innerHTML = newMain.innerHTML;

        /* 进入搜索页：重新初始化搜索框（启用输入框 + 绑定事件 + 重建索引） */
        if (isSearchUrl(url)) {
          ensureSearchReady(doc);
        }

        /* 新页面高度可能更短：尝试恢复到原滚动位置，超界则由浏览器收紧。
           在替换后立即执行（此时浏览器尚未因内容变更自动跳顶）。 */
        var targetY = Math.min(prevScrollY, document.body.scrollHeight - window.innerHeight);
        if (targetY > 0) {
          window.scrollTo(0, targetY);
        }

        /* 灵动岛过渡：即使新页面不够长导致滚动位置归零，
           也先保持导航收缩状态一瞬，再由 scroll 监听按真实位置校正，
           避免导航栏在跨页瞬间"弹开"闪烁。 */
        if (header && wasScrolled && window.scrollY <= 80) {
          header.classList.add('is-scrolled');
        }

        document.dispatchEvent(new CustomEvent('pjax:done', { detail: { url: url.href } }));

        /* 等浏览器稳定后，根据真实滚动位置校正导航状态 */
        window.setTimeout(function () {
          if (header) {
            header.classList.toggle('is-scrolled', window.scrollY > 80);
          }
        }, 60);
      })
      .catch(function () {
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
