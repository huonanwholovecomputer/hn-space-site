/* =========================================================
   Math & Image 增强（HN Space）：
   - KaTeX 数学公式渲染（$...$ / $$...$$ / $`...`$ / \[...\]）
   - 文章图片：懒加载 + 居中 + 点击放大（lightbox）+ 超出自适应缩放
   - 兼容 PJAX（pjax:done 重新扫描初始化）
   依赖：KaTeX CSS/JS 由 extend_head.html 通过 CDN 引入。
   ========================================================= */
(function () {
  'use strict';

  /* 0. 悬浮层点击委托：必须在模块最顶部立即注册（捕获阶段），
     以确保即使后续渲染初始化抛错也绝不漏绑。
     - 捕获阶段：先于页面内其它脚本的 stopPropagation 生效
     - 恒注册：不依赖图片是否已渲染（PJAX/动态插入的图也能拦）
     - 直接拦截 a.math-img-zoom 上的点击，preventDefault 阻止跳转原图 */
  document.addEventListener('click', function (e) {
    try {
      var t = e.target;
      var link = (t && t.closest) ? t.closest('a.math-img-zoom') : null;
      if (!link) return;
      var img = link.querySelector('img');
      if (!img) return;
      e.preventDefault();
      e.stopPropagation();
      openLightbox(img.src, img.alt || '');
    } catch (err) {
      /* 静默：不影响页面其它交互 */
    }
  }, true);

  /* ---------- 1. KaTeX 数学公式渲染 ---------- */
  var renderMath = function (root) {
    if (!window.katex || !window.renderMathInElement) return;
    var scope = root || document;
    try {
      renderMathInElement(scope, {
        delimiters: [
          { left: '$$', right: '$$', display: true },    // 块级公式
          { left: '\\[', right: '\\]', display: true },  // 兼容写法
          { left: '$', right: '$', display: false },     // 行内公式
          { left: '\\(', right: '\\)', display: false }  // 兼容写法
        ],
        /* 防止把代码块/已用 $ 的普通文字误渲染。KaTeX 默认跳过 <code>/<pre> */
        throwOnError: false,
        errorColor: '#e57373',
        strict: 'ignore'
      });
    } catch (e) {
      /* 静默降级：缺失或解析失败不影响页面 */
    }
  };

  /* ---------- 2. 文章图片增强 ---------- */
  var enhanceImages = function (root) {
    try {
      var scope = root || document;
      var wrap = Array.prototype.slice.call(
        scope.querySelectorAll('.post-content img, main .post-content img')
      ).filter(function (img) {
        /* 跳过已被处理过的 */
        return !img.__mathImgBound && img.closest('.lightbox-wrap') === null;
      });

      if (!wrap.length) return;

      wrap.forEach(function (img) {
        img.__mathImgBound = true;

      /* 2a. 懒加载：如果原本没有 loading 属性，补上（PJAX 后不会重载旧图） */
      if (!img.hasAttribute('loading')) {
        img.setAttribute('loading', 'lazy');
        img.setAttribute('decoding', 'async');
      }

      /* 2b. 点击悬浮查看：为图片创建容器（点击事件由模块顶部捕获阶段委托拦截，
         见文件开头 document.addEventListener(..., true)） */
      var box = document.createElement('span');
      box.className = 'math-img-box';

      var link = document.createElement('a');
      link.href = img.src;
      link.className = 'math-img-zoom';
      link.setAttribute('rel', 'lightbox');
      /* download 属性让 pjax.js 的 shouldPjax 放行此链接（不拦截跳转），
         点击行为完全交给文件开头的捕获阶段委托；不加会触发 PJAX 导航到图片本身 */
      link.setAttribute('download', '');
      link.setAttribute('aria-label', '点击放大图片');

      /* 移动 src 进链接内 */
      img.parentNode.insertBefore(box, img);
      link.appendChild(img);
      box.appendChild(link);
      });
    } catch (e) {
      /* 图片包装失败：静默跳过，不影响页面其它交互 */
    }
  };

  /* ---------- 3. 可缩放悬浮看图（lightbox） ---------- */
  var lightboxEl = null;
  var lbImg = null;
  var lbStage = null;
  var lbState = { scale: 1, tx: 0, ty: 0 };
  var lbDrag = null;
  var wasDragging = false;
  var lbClosing = false;

  function buildLightbox() {
    lightboxEl = document.createElement('div');
    lightboxEl.className = 'math-lightbox';
    lightboxEl.innerHTML =
      '<div class="math-lightbox-mask"></div>' +
      '<div class="math-lb-stage">' +
      '<img class="math-lightbox-img" alt="" draggable="false" />' +
      '</div>' +
      '<div class="math-lb-toolbar">' +
      '<button class="math-lb-btn" data-act="zoomout" title="缩小" aria-label="缩小">&minus;</button>' +
      '<button class="math-lb-btn math-lb-reset" data-act="reset" title="重置为 100%" aria-label="重置为 100%">1:1</button>' +
      '<button class="math-lb-btn" data-act="zoomin" title="放大" aria-label="放大">+</button>' +
      '</div>' +
      '<button class="math-lightbox-close" data-act="close" aria-label="关闭">&times;</button>';
    document.body.appendChild(lightboxEl);

    lbImg = lightboxEl.querySelector('.math-lightbox-img');
    lbStage = lightboxEl.querySelector('.math-lb-stage');

    /* 关闭：点遮罩 / 关按钮 / Esc */
    lightboxEl.addEventListener('click', function (e) {
      var act = e.target.closest('[data-act]');
      if (act) {
        if (act.getAttribute('data-act') === 'close') { closeLightbox(); }
        else if (act.getAttribute('data-act') === 'zoomin') { zoomBy(1.4); }
        else if (act.getAttribute('data-act') === 'zoomout') { zoomBy(1 / 1.4); }
        else if (act.getAttribute('data-act') === 'reset') { resetView(); }
        return;
      }
      if (e.target === lightboxEl || e.target.classList.contains('math-lightbox-mask')) {
        if (wasDragging) return;  /* 刚拖完的 click 是 setPointerCapture 副产物，忽略不关 */
        closeLightbox();
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && lightboxEl.style.display !== 'none') { closeLightbox(); }
      else if (lightboxEl.style.display !== 'none' && (e.key === '+' || e.key === '=')) { zoomBy(1.4); }
      else if (lightboxEl.style.display !== 'none' && e.key === '-') { zoomBy(1 / 1.4); }
      else if (lightboxEl.style.display !== 'none' && e.key === '0') { resetView(); }
    });
  }

  function applyView() {
    lbImg.style.transform =
      'translate(' + lbState.tx + 'px, ' + lbState.ty + 'px) scale(' + lbState.scale + ')';
  }

  function zoomBy(factor) {
    var next = Math.min(8, Math.max(0.2, lbState.scale * factor));
    lbState.scale = next;
    applyView();
  }

  function resetView() {
    lbState.scale = 1;
    lbState.tx = 0;
    lbState.ty = 0;
    applyView();
  }

  function openLightbox(src, alt) {
    if (!lightboxEl) { buildLightbox(); }
    lbImg.src = src;
    lbImg.alt = alt || '';
    resetView();
    lightboxEl.style.display = 'flex';
    document.body.style.overflow = 'hidden'; /* 锁背景滚动 */

    /* 打开动画：加 .is-opening 播放弹入动画，结束后移除避免影响后续缩放 */
    lightboxEl.classList.remove('is-opening');
    void lightboxEl.offsetWidth; /* 强制 reflow，让动画每次重放 */
    lightboxEl.classList.add('is-opening');
    window.setTimeout(function () { lightboxEl.classList.remove('is-opening'); }, 300);
  }

  var lbClosing = false;
  function closeLightbox() {
    if (lbClosing || !lightboxEl) return;
    lbClosing = true;
    lightboxEl.classList.add('is-closing');   /* 触发 CSS 淡出动画 */
    window.setTimeout(function () {
      lightboxEl.style.display = 'none';
      lightboxEl.classList.remove('is-closing');
      document.body.style.overflow = '';
      lbClosing = false;
    }, 180);                                  /* 等动画播完再隐藏 */
  }

  /* 悬浮层内交互：滚轮缩放 + 拖拽平移 + 双击还原（绑定见下方 document 级监听） */

  /* 滚轮缩放：以光标位置为锚点 */
  if (document.addEventListener) {
    document.addEventListener('wheel', function (e) {
      if (!lightboxEl || lightboxEl.style.display === 'none') return;
      if (!e.target.closest || !e.target.closest('.math-lightbox')) return;
      e.preventDefault();
      var delta = -Math.sign(e.deltaY); /* 上滚放大，下滚缩小 */
      var factor = delta > 0 ? 1.15 : 1 / 1.15;
      zoomBy(factor);
    }, { passive: false });

    /* 拖拽平移 */
    document.addEventListener('pointerdown', function (e) {
      if (!lightboxEl || lightboxEl.style.display === 'none') return;
      if (!e.target.closest('.math-lb-stage')) return;
      if (lbState.scale <= 1) return; /* 100% 以下无需平移 */
      lbDrag = { x: e.clientX, y: e.clientY, tx: lbState.tx, ty: lbState.ty };
      lbStage.classList.add('is-dragging');
      lightboxEl.setPointerCapture && lightboxEl.setPointerCapture(e.pointerId);
    });
    document.addEventListener('pointermove', function (e) {
      if (!lbDrag) return;
      lbState.tx = lbDrag.tx + (e.clientX - lbDrag.x);
      lbState.ty = lbDrag.ty + (e.clientY - lbDrag.y);
      applyView();
    });
    document.addEventListener('pointerup', function () {
      if (lbStage) lbStage.classList.remove('is-dragging');
      if (lbDrag) { wasDragging = true; }  /* 刚拖完：抑制随后触发的 click，避免误关 */
      lbDrag = null;
      if (wasDragging) {
        window.setTimeout(function () { wasDragging = false; }, 50);
      }
    });
    document.addEventListener('pointercancel', function () {
      if (lbStage) lbStage.classList.remove('is-dragging');
      lbDrag = null;
    });

    /* 双击还原 */
    document.addEventListener('dblclick', function (e) {
      if (!lightboxEl || lightboxEl.style.display === 'none') return;
      if (!e.target.closest('.math-lb-stage')) return;
      if (lbState.scale > 1) { resetView(); } else { zoomBy(2); }
    });
  }

  /* ---------- 3. 统一初始化（DOMReady + PJAX） ---------- */
  var init = function () {
    renderMath(document);
    enhanceImages(document);
  };

  document.addEventListener('DOMContentLoaded', init);
  document.addEventListener('pjax:done', init);

  /* 兜底：若 DOM 已完成而事件已错过 */
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    init();
  }

  /* ---------- 4. 目录锚点跳转（避免 PJAX 与原生 hash 跳转冲突） ----------
     效果：点击目录链接用 scrollIntoView 定位，浏览器会应用标题上的
     scroll-margin-top（避开顶部悬浮导航栏），并更新 URL 的 hash。
     用「捕获阶段 + preventDefault」彻底绕开 PJAX 对 hash 链接的干扰，
     保证直链打开和 PJAX 进入后都稳定跳转。 */
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';
    /* 只处理站内纯锚点链接（如 #一前言），不处理外部/完整 URL */
    if (href.charAt(0) !== '#') return;
    e.preventDefault();

    var target = null;
    try {
      target = document.getElementById(decodeURIComponent(href.slice(1)));
    } catch (err) {
      target = document.getElementById(href.slice(1));
    }
    if (!target) return;
    /* 浏览器自动应用标题的 scroll-margin-top 缓冲导航栏；平滑滚动 */
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    /* 更新地址栏 hash（不触发滚动/不产生历史记录，避免反向干扰） */
    if (history.replaceState) {
      try { history.replaceState(null, '', href); } catch (err) { /* 忽略 */ }
    }
  }, true);
})();
