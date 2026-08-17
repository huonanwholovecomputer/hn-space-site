/* =========================================================
   Math & Image 增强（HN Space）：
   - KaTeX 数学公式渲染（$...$ / $$...$$ / $`...`$ / \[...\]）
   - 文章图片：懒加载 + 居中 + 点击放大（lightbox）+ 超出自适应缩放
   - 兼容 PJAX（pjax:done 重新扫描初始化）
   依赖：KaTeX CSS/JS 由 extend_head.html 通过 CDN 引入。
   ========================================================= */
(function () {
  'use strict';

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

      /* 2b. 点击放大（lightbox）：为图片创建带遮罩层的可放大容器 */
      var box = document.createElement('span');
      box.className = 'math-img-box';

      var link = document.createElement('a');
      link.href = img.src;
      link.className = 'math-img-zoom';
      link.setAttribute('rel', 'lightbox');
      link.setAttribute('aria-label', '点击放大图片');

      /* 移动 src 进链接内 */
      img.parentNode.insertBefore(box, img);
      link.appendChild(img);
      box.appendChild(link);

      /* 点击打开放大遮罩 */
      link.addEventListener('click', function (e) {
        e.preventDefault();
        openLightbox(img.src, img.alt || '');
      });
    });
  };

  /* Lightbox 遮罩层（单例，全局共享一次） */
  var lightboxEl = null;
  function openLightbox(src, alt) {
    if (!lightboxEl) {
      lightboxEl = document.createElement('div');
      lightboxEl.className = 'math-lightbox';
      lightboxEl.innerHTML =
        '<div class="math-lightbox-mask"></div>' +
        '<img class="math-lightbox-img" alt="" />' +
        '<button class="math-lightbox-close" aria-label="关闭">&times;</button>';
      lightboxEl.style.display = 'none';
      document.body.appendChild(lightboxEl);

      lightboxEl.addEventListener('click', function (e) {
        if (e.target === lightboxEl || e.target.classList.contains('math-lightbox-mask') ||
            e.target.classList.contains('math-lightbox-close')) {
          lightboxEl.style.display = 'none';
        }
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && lightboxEl.style.display !== 'none') {
          lightboxEl.style.display = 'none';
        }
      });
    }
    var imgs = lightboxEl.getElementsByClassName('math-lightbox-img');
    imgs[0].src = src;
    imgs[0].alt = alt || '';
    /* 重置滚动，避免当前页滚动位置干扰 */
    lightboxEl.style.display = 'flex';
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
})();
