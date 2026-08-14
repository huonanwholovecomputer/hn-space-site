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

  /* 判断链接是否应走 PJAX：
     同源、非下载、非新窗口、非纯锚点、非邮件/电话 */
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
        /* 替换 main 内容：header/footer/拖尾 canvas 等 body 全局元素不动 */
        mainEl.innerHTML = newMain.innerHTML;

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
