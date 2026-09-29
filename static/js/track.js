/* =========================================================
   Umami 自定义事件埋点（HN Space）
   ---------------------------------------------------------
   设计约束：
   1) 环境过滤不在这里做——由 script 标签的 data-domains="blog.hn-space.cn" 负责，
      Umami 内核在 U() 里拦截所有非白名单域名的上报（含自定义事件），
      所以本地 hugo server 预览既不会记页面浏览，也不会记这里的事件。
   2) track.js 在 head 里 defer，而 umami 脚本在文件末尾才加载，
      故 window.umami 一律「调用时才取」，不在加载期缓存。
   3) 全部用事件委托绑定在 document 上：PJAX 换页不重建监听，无需重新初始化。
   4) 埋点任何异常都必须静默——统计永远不能影响阅读体验。

   事件清单（Umami → 网站 → 事件面板可见）：
     outbound-click  { host, from }        外链点击（GitHub / B站 / 友链 / 引用来源等）
     email-click     { to }                邮箱按钮点击
     copy-code       { lang }              代码块「复制」按钮
     image-zoom      { image }             正文图片 / 公式图点击放大
     search          { query, results }    站内搜索（停手 1.5s 后记一次，带命中条数）
     theme-toggle    { mode }              主题切换（浅色 / 深色 / 跟随系统，见 extend_footer.html）
     404             { path }              访问了不存在的路径

   路径类属性统一经 readable() 处理：浏览器给的 location.pathname 是百分号编码的
   （中文路径会变成 /%E9%9A%8F%E4%BE%BF...），解码后才能在「事件属性」里直接读；
   非法转义序列退还原值，超长（扫描器探测）截断到 200 字符。
   ========================================================= */
(function () {
  'use strict';

  function track(name, data) {
    var api = window.umami;
    if (!api || typeof api.track !== 'function') return;
    try {
      if (data) {
        api.track(name, data);
      } else {
        api.track(name);
      }
    } catch (err) { /* 静默：埋点失败不影响页面 */ }
  }

  /* 暴露给其他脚本（extend_footer.html 的三态主题切换）复用 */
  window.__hnTrack = track;

  /* 外链判定：http(s) 且域名与当前页不同 */
  function isExternal(href) {
    try {
      var u = new URL(href, location.href);
      return (u.protocol === 'http:' || u.protocol === 'https:') && u.hostname !== location.hostname;
    } catch (err) {
      return false;
    }
  }

  /* 代码块语言：Hugo(Chroma) 输出 <code class="language-xxx" data-lang="xxx"> */
  function codeLang(codeEl) {
    if (!codeEl) return 'text';
    if (codeEl.dataset && codeEl.dataset.lang) return codeEl.dataset.lang;
    var m = (codeEl.className || '').match(/language-([\w+#-]+)/);
    return m ? m[1] : 'text';
  }

  /* 把百分号编码的路径/文件名还原成可读文本：
     /%E9%9A%8F%E4%BE%BF → /随便 ；同时给超长值封顶，避免扫描器构造的超长 URL 灌进事件属性。 */
  var MAX_PROP_LEN = 200;
  function readable(value) {
    var s = value || '';
    try {
      s = decodeURIComponent(s);
    } catch (err) {
      /* 非法转义序列：保留原值 */
    }
    return s.length > MAX_PROP_LEN ? s.slice(0, MAX_PROP_LEN) + '…' : s;
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;

    /* 1) 代码复制按钮（PaperMod 的 .copy-code，由主题 footer 脚本动态创建） */
    var copyBtn = t.closest('.copy-code');
    if (copyBtn) {
      var box = copyBtn.closest('.highlight, pre, .chroma') || copyBtn.parentNode;
      track('copy-code', { lang: codeLang(box && box.querySelector('code')) });
      return;
    }

    /* 2) 图片放大：正文图片点击后进 lightbox（math-image.js 包了一层 a.math-img-zoom） */
    var zoom = t.closest('a.math-img-zoom, a[rel="lightbox"], .post-content img, .math-img-box img');
    if (zoom) {
      var img = zoom.tagName === 'IMG' ? zoom : zoom.querySelector('img');
      var src = (img && (img.getAttribute('src') || '')) || '';
      track('image-zoom', { image: readable(src.split('/').pop().split('?')[0]) });
      return;
    }

    /* 3) 链接：邮件 / 外链 */
    var a = t.closest('a[href]');
    if (!a) return;

    var href = a.getAttribute('href') || '';
    if (/^mailto:/i.test(href)) {
      track('email-click', { to: href.slice(7).split('?')[0] });
      return;
    }

    if (isExternal(a.href)) {
      var host = '';
      try { host = new URL(a.href).hostname; } catch (err) { /* 忽略 */ }
      track('outbound-click', { host: host, from: readable(location.pathname) });
    }
  }, true);

  /* 4) 站内搜索：input 会冒泡，用委托即可跨 PJAX 生效 */
  var searchTimer = null;
  var lastQuery = '';
  document.addEventListener('input', function (e) {
    var el = e.target;
    if (!el || el.id !== 'searchInput') return;
    if (searchTimer) window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(function () {
      var q = (el.value || '').trim().slice(0, 64);
      if (q.length < 2 || q === lastQuery) return;
      lastQuery = q;
      track('search', {
        query: q,
        results: document.querySelectorAll('#searchResults li').length
      });
    }, 1500);
  }, true);

  /* 5) 404：nginx 把不存在的路径交给 Hugo 的 404.html，页面带 .not-found 容器。
     等 window load——那时所有 defer 脚本（含 umami）都已执行完。 */
  if (document.querySelector('.not-found')) {
    window.addEventListener('load', function () {
      track('404', { path: readable(location.pathname) });
    });
  }
})();
