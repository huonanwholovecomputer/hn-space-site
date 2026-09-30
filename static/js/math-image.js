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
     - 两种入口：
       a.math-img-zoom —— 文章图片，取内部 <img> 的 src，preventDefault 阻止跳转原图；
       a[data-lightbox] —— 通用入口（如竞赛证书），大图取锚点 href、说明取 <img> 的 alt；
                           无 JS 时 href 仍能直接打开大图，属渐进增强。
       注意：pjax.js 的 shouldPjax 必须排除 a[data-lightbox]，否则会被当成站内跳转。 */
  document.addEventListener('click', function (e) {
    try {
      var t = e.target;
      var link = (t && t.closest) ? t.closest('a.math-img-zoom, a[data-lightbox]') : null;
      if (!link) return;
      var img = link.querySelector('img');
      var src = link.hasAttribute('data-lightbox') ? link.getAttribute('href') : (img && img.src);
      if (!src) return;
      e.preventDefault();
      e.stopPropagation();
      /* 多图入口（如竞赛证书）：锚点上带 data-gallery-items 的 JSON，打开画廊；
         没有则按单图打开（文章图片走的就是这条，行为与以前完全一致）。 */
      var items = null;
      var raw = link.getAttribute('data-gallery-items');
      if (raw) {
        try {
          var parsed = JSON.parse(raw);
          if (parsed && parsed.length) {
            items = [];
            for (var i = 0; i < parsed.length; i++) {
              items.push({
                img: parsed[i].img || '',
                alt: parsed[i].alt || '',
                label: parsed[i].label || ''
              });
            }
          }
        } catch (errParse) {
          items = null; /* JSON 坏了就退回单图，不阻断查看 */
        }
      }
      openLightbox(src, (img && img.alt) || link.getAttribute('title') || '', items, 0);
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

      /* 连续多图收窄标记：包装完成后，整组判定「相邻段落各含一张图」→
         给组内每个 box 加 .math-img-seq 类（CSS 据此收窄到 80%）。
         手动指定宽度的图（style="width:XX%"）不参与收窄。 */
      Array.prototype.forEach.call(
        document.querySelectorAll('.post-content .math-img-box'),
        function (box) {
          if (box.querySelector('img[style*="width"]')) return;       /* 手动宽度豁免 */
          var p = box.parentElement;
          if (!p) return;
          var prevSib = p.previousElementSibling;
          var nextSib = p.nextElementSibling;
          var inSeq =
            (prevSib && prevSib.querySelector('.math-img-box')) ||
            (nextSib && nextSib.querySelector('.math-img-box'));
          if (inSeq) box.classList.add('math-img-seq');
        }
      );
    } catch (e) {
      /* 图片包装失败：静默跳过，不影响页面其它交互 */
    }
  };

  /* ---------- 3. 可缩放悬浮看图（lightbox） ----------
     单图与多图共用这一套：多图（证书画廊）多出左右切换按钮、说明条与计数器，
     由 .is-gallery 控制显隐；单图时它们全部不出现，行为与以前一致。 */
  var lightboxEl = null;
  var lbImg = null;
  var lbStage = null;
  var lbState = { scale: 1, tx: 0, ty: 0 };
  var lbDrag = null;
  var lbPress = null;   /* {x, y, moved}：最近一次按下的起点与最大位移（用于区分点击/拖动） */
  var lbClosing = false;
  var lbItems = [];        /* [{img, alt, label}] */
  var lbIndex = 0;
  var lbLastFocus = null;  /* 打开前的焦点，关闭后归还（键盘用户不丢位置） */
  var lbCapText = null;
  var lbCapIdx = null;
  var lbLenisWasRunning = false;

  /* 浮层与 Lenis 平滑滚动的关系（用户报过"灯箱里滚轮缩放时下面的文章也跟着滚"）：
     Lenis 的滚轮处理器里**没有任何 defaultPrevented 判断**（源码实测），它只认
     ① composedPath 里带 data-lenis-prevent 的元素、② 自身 stopped 状态；
     而它的滚动是程序化的 window.scrollTo，所以 body{overflow:hidden} 也拦不住它。
     于是三件事一起做：
       · 灯箱元素挂 data-lenis-prevent → Lenis 忽略浮层内的滚轮/触摸；
       · 打开时 stop() → 掐掉进入浮层前残留的惯性滚动；
       · 关闭时按"打开前的状态"恢复，不擅自启动本来就停着的 Lenis。 */
  function lockLenis() {
    var lenis = window.__hnLenis;
    if (!lenis || typeof lenis.stop !== 'function') return;
    lbLenisWasRunning = !lenis.isStopped;
    try { lenis.stop(); } catch (eLock) { /* 忽略：锁不住也不能影响看图 */ }
  }

  function unlockLenis() {
    var lenis = window.__hnLenis;
    if (!lenis || typeof lenis.start !== 'function') return;
    if (!lbLenisWasRunning) return;
    try { lenis.start(); } catch (eUnlock) { /* 忽略 */ }
  }

  function buildLightbox() {
    lightboxEl = document.createElement('div');
    lightboxEl.className = 'math-lightbox';
    /* 让 Lenis 忽略浮层内的滚轮与触摸（配合 body 的 overflow 锁，双保险） */
    lightboxEl.setAttribute('data-lenis-prevent', '');
    /* 图标一律用内联 SVG，而不是文字字形（‹ › × − +）：
       文字字形在行盒里天生不居中（实测 ‹› 的墨迹比行盒中心低 3.5px、× 低 2.5px，
       line-height:1 也改不了——那是字体的基线/墨迹度量决定的），
       用 SVG 则由 flex 居中对齐，几何精确且与字体无关。 */
    var svg = function (inner, size) {
      return '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="none"' +
        ' stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"' +
        ' aria-hidden="true" focusable="false">' + inner + '</svg>';
    };
    lightboxEl.innerHTML =
      '<div class="math-lightbox-mask"></div>' +
      '<div class="math-lb-stage">' +
      '<img class="math-lightbox-img" alt="" draggable="false" />' +
      '</div>' +
      '<button class="math-lb-nav math-lb-prev" data-act="prev" title="上一张（←）" aria-label="上一张">' +
      svg('<polyline points="15 18 9 12 15 6"/>', 24) + '</button>' +
      '<button class="math-lb-nav math-lb-next" data-act="next" title="下一张（→）" aria-label="下一张">' +
      svg('<polyline points="9 18 15 12 9 6"/>', 24) + '</button>' +
      '<div class="math-lb-caption" aria-live="polite">' +
      '<span class="math-lb-cap-text"></span>' +
      '<span class="math-lb-cap-idx"></span>' +
      '</div>' +
      '<div class="math-lb-toolbar">' +
      '<button class="math-lb-btn" data-act="zoomout" title="缩小" aria-label="缩小">' +
      svg('<line x1="5" y1="12" x2="19" y2="12"/>', 20) + '</button>' +
      '<button class="math-lb-btn math-lb-reset" data-act="reset" title="重置为 100%" aria-label="重置为 100%">1:1</button>' +
      '<button class="math-lb-btn" data-act="zoomin" title="放大" aria-label="放大">' +
      svg('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>', 20) + '</button>' +
      '</div>' +
      '<button class="math-lightbox-close" data-act="close" aria-label="关闭">' +
      svg('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>', 22) + '</button>';
    document.body.appendChild(lightboxEl);

    lbImg = lightboxEl.querySelector('.math-lightbox-img');
    lbStage = lightboxEl.querySelector('.math-lb-stage');
    lbCapText = lightboxEl.querySelector('.math-lb-cap-text');
    lbCapIdx = lightboxEl.querySelector('.math-lb-cap-idx');

    /* 点击：缩放/切图等控件优先；其余按**几何位置**判定——
       图片内的点击什么都不做（哪怕图片还只是 1:1），图片外（舞台空白/遮罩）才关闭。
       刚发生过拖动（>6px）不算点击，避免"把图拖到图外松手"被误判成点图外而关闭。 */
    lightboxEl.addEventListener('click', function (e) {
      var act = e.target.closest ? e.target.closest('[data-act]') : null;
      if (act) {
        if (act.getAttribute('data-act') === 'close') { closeLightbox(); }
        else if (act.getAttribute('data-act') === 'zoomin') { zoomBy(1.4); }
        else if (act.getAttribute('data-act') === 'zoomout') { zoomBy(1 / 1.4); }
        else if (act.getAttribute('data-act') === 'reset') { resetView(); }
        else if (act.getAttribute('data-act') === 'next') { showItem(lbIndex + 1, 1); }
        else if (act.getAttribute('data-act') === 'prev') { showItem(lbIndex - 1, -1); }
        return;
      }
      if (lbPress && lbPress.moved > 6) return;
      if (hitImage(e.clientX, e.clientY)) return;
      closeLightbox();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && lightboxEl.style.display !== 'none') { closeLightbox(); }
      else if (lightboxEl.style.display !== 'none' && e.key === 'ArrowRight') { showItem(lbIndex + 1, 1); }
      else if (lightboxEl.style.display !== 'none' && e.key === 'ArrowLeft') { showItem(lbIndex - 1, -1); }
      else if (lightboxEl.style.display !== 'none' && (e.key === '+' || e.key === '=')) { zoomBy(1.4); }
      else if (lightboxEl.style.display !== 'none' && e.key === '-') { zoomBy(1 / 1.4); }
      else if (lightboxEl.style.display !== 'none' && e.key === '0') { resetView(); }
    });
  }

  /* 命中判定：指针是否落在图片的**视觉矩形**内（getBoundingClientRect 含 transform）。
     为什么不看事件 target：pointerdown 里对 lightboxEl 调了 setPointerCapture，
     之后的 click 会被重定向到 lightboxEl——"点图片"与"点图片外"在 target 上分不开，
     这正是"点/拖图片会误关闭""放大后点图外关不掉"的共同根源。 */
  function hitImage(x, y) {
    if (!lbImg) return false;
    var r = lbImg.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }

  /* 缩放/平移后把位移夹回可视范围：
     · 某轴上图片比视口小 → 该轴位移归零（保持居中），因此"缩小到画面外"不可能发生；
     · 比视口大 → 位移夹在 ±(视觉尺寸 - 视口)/2，图片边缘不会被拖进画面内部。
     offsetWidth/Height 是**未变换**的布局尺寸（= 初始显示尺寸），乘 scale 即当前视觉尺寸。 */
  function clampPan() {
    if (!lbImg) return;
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var maxX = Math.max(0, (lbImg.offsetWidth * lbState.scale - vw) / 2);
    var maxY = Math.max(0, (lbImg.offsetHeight * lbState.scale - vh) / 2);
    lbState.tx = Math.min(maxX, Math.max(-maxX, lbState.tx || 0));
    lbState.ty = Math.min(maxY, Math.max(-maxY, lbState.ty || 0));
  }

  function applyView() {
    clampPan();
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

  /* 显示第 i 张（环形）。dir=1/-1 时给一个轻微的横向滑入方向感；
     打开时（dir=0）不滑，交给 .is-opening 的弹入动画。 */
  function showItem(i, dir) {
    var n = lbItems.length;
    if (!n) return;
    i = ((i % n) + n) % n;
    var moving = i !== lbIndex;
    lbIndex = i;
    var it = lbItems[i] || {};
    lbImg.src = it.img || '';
    lbImg.alt = it.alt || '';
    resetView();
    if (lbCapText) lbCapText.textContent = it.label || '';
    if (lbCapIdx) lbCapIdx.textContent = n > 1 ? (i + 1) + ' / ' + n : '';
    lightboxEl.classList.toggle('is-gallery', n > 1);
    if (moving && dir) {
      lightboxEl.style.setProperty('--lb-dir', String(dir));
      lightboxEl.classList.remove('is-switching');
      void lightboxEl.offsetWidth; /* reflow，让动画每次重放 */
      lightboxEl.classList.add('is-switching');
      window.setTimeout(function () { lightboxEl.classList.remove('is-switching'); }, 340);
    }
    /* 预载相邻两张，翻看时不等图 */
    var neighbors = [i + 1, i - 1];
    for (var k = 0; k < neighbors.length; k++) {
      var t = lbItems[((neighbors[k] % n) + n) % n];
      if (t && t.img) { var pre = new Image(); pre.src = t.img; }
    }
  }

  function openLightbox(src, alt, items, index) {
    if (!lightboxEl) { buildLightbox(); }
    lbItems = (items && items.length) ? items : [{ img: src, alt: alt || '', label: '' }];
    lbIndex = 0;
    lbLastFocus = document.activeElement;
    showItem(typeof index === 'number' ? index : 0, 0);
    lightboxEl.style.display = 'flex';
    document.body.style.overflow = 'hidden'; /* 锁背景滚动（原生滚动）*/
    lockLenis();                             /* 再锁 Lenis 的程序化滚动 */

    /* 打开动画：加 .is-opening 播放弹入动画，结束后移除避免影响后续缩放 */
    lightboxEl.classList.remove('is-opening');
    void lightboxEl.offsetWidth; /* 强制 reflow，让动画每次重放 */
    lightboxEl.classList.add('is-opening');
    window.setTimeout(function () { lightboxEl.classList.remove('is-opening'); }, 300);

    /* 焦点移入弹层：键盘用户可直接 ←/→ 翻看、Esc 关闭 */
    var closeBtn = lightboxEl.querySelector('.math-lightbox-close');
    if (closeBtn) { try { closeBtn.focus({ preventScroll: true }); } catch (eFocus) { closeBtn.focus(); } }
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
      unlockLenis();
      lbClosing = false;
      lbItems = [];
      /* 把焦点还给打开它的那个元素 */
      if (lbLastFocus && lbLastFocus.focus) {
        try { lbLastFocus.focus({ preventScroll: true }); } catch (eBack) { /* 忽略 */ }
      }
      lbLastFocus = null;
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

    /* 指针跟踪：同时支持单指平移与双指捏合缩放（移动端 pinch zoom） */
    var lbPointers = {};      /* pointerId -> {x,y} */
    var lbPinchDist = 0;      /* 最近一次两指距离 */
    var lbPinchScale = 1;     /* 进入 pinch 时的基准 scale */

    document.addEventListener('pointerdown', function (e) {
      if (!lightboxEl || lightboxEl.style.display === 'none') return;
      if (!e.target.closest || !e.target.closest('.math-lb-stage')) return;
      var inside = hitImage(e.clientX, e.clientY);
      lbPress = { x: e.clientX, y: e.clientY, moved: 0 };

      /* 按下点在图片之外（舞台空白 / 遮罩）：直接关闭——点击与拖动都算。
         控制条、关闭按钮、画廊左右键都不在 .math-lb-stage 里，不会被这里误伤。 */
      if (!inside) { closeLightbox(); return; }

      var id = e.pointerId;
      lbPointers[id] = { x: e.clientX, y: e.clientY };
      lbStage.classList.add('is-dragging');

      var ids = Object.keys(lbPointers);
      if (ids.length === 2) {
        /* 进入双指捏合：记录距离与基准缩放，暂停单指平移 */
        lbPinchDist = dist2Pointer(ids[0], ids[1]);
        lbPinchScale = lbState.scale;
        lbDrag = null;
      } else {
        /* 记录平移起点。能移动多少由 clampPan 决定：图片小于视口时位移恒为 0，
           所以"图片不大时拖动没效果"是自然结果，不需要额外开关。 */
        lbDrag = { x: e.clientX, y: e.clientY, tx: lbState.tx, ty: lbState.ty };
      }
      /* 合成事件/异常指针会让 setPointerCapture 抛错，别因此中断整个按下流程 */
      try {
        lightboxEl.setPointerCapture && lightboxEl.setPointerCapture(e.pointerId);
      } catch (errCap) { /* 忽略 */ }
    });

    document.addEventListener('pointermove', function (e) {
      if (!lightboxEl || lightboxEl.style.display === 'none') return;
      /* 记录本此按压的最大位移：供 click 判定"这是点击还是拖动" */
      if (lbPress) {
        lbPress.moved = Math.max(
          lbPress.moved,
          Math.abs(e.clientX - lbPress.x) + Math.abs(e.clientY - lbPress.y)
        );
      }
      var pt = lbPointers[e.pointerId];
      if (!pt) return;
      pt.x = e.clientX; pt.y = e.clientY;

      var ids = Object.keys(lbPointers);
      if (ids.length >= 2) {
        /* 双指捏合缩放：以两指距离比例改变缩放倍率 */
        var d = dist2Pointer(ids[0], ids[1]);
        if (lbPinchDist > 0) {
          var next = Math.min(8, Math.max(0.2, lbPinchScale * (d / lbPinchDist)));
          lbState.scale = next;
          applyView();
        }
        return;
      }
      /* 单指平移（位移在 applyView → clampPan 里被夹住） */
      if (lbDrag) {
        lbState.tx = lbDrag.tx + (e.clientX - lbDrag.x);
        lbState.ty = lbDrag.ty + (e.clientY - lbDrag.y);
        applyView();
      }
    });

    function dist2Pointer(a, b) {
      var p1 = lbPointers[a], p2 = lbPointers[b];
      var dx = p1.x - p2.x, dy = p1.y - p2.y;
      return Math.sqrt(dx * dx + dy * dy);
    }

    document.addEventListener('pointerup', function (e) {
      delete lbPointers[e.pointerId];
      if (lbStage) lbStage.classList.remove('is-dragging');
      var ids = Object.keys(lbPointers);
      if (ids.length === 1) {
        /* 双指变单指：剩下那根接管平移 */
        var p = lbPointers[ids[0]];
        lbDrag = { x: p.x, y: p.y, tx: lbState.tx, ty: lbState.ty };
      } else if (ids.length === 0) {
        lbDrag = null;
        /* 焦点/状态收尾：lbPress 保留到下一次 pointerdown 覆盖即可（click 紧随其后） */
        var pressed = lbPress;
        window.setTimeout(function () { if (lbPress === pressed) lbPress = null; }, 350);
      }
    });
    document.addEventListener('pointercancel', function (e) {
      delete lbPointers[e.pointerId];
      if (lbStage) lbStage.classList.remove('is-dragging');
      var ids = Object.keys(lbPointers);
      if (ids.length === 0) lbDrag = null;
    });

    /* 双击还原 */
    document.addEventListener('dblclick', function (e) {
      if (!lightboxEl || lightboxEl.style.display === 'none') return;
      if (!e.target.closest('.math-lb-stage')) return;
      if (lbState.scale > 1) { resetView(); } else { zoomBy(2); }
    });

    /* 视口尺寸变化后重算一次位移上界，避免放大状态下窗口变小把图片挤出画面 */
    window.addEventListener('resize', function () {
      if (lightboxEl && lightboxEl.style.display !== 'none') applyView();
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

    /* —— 返回顶部按钮（#top）例外 ——
       文章页（body.page-posts，长文 + 懒加载图片）保持下方的「即时跳转 +
       多次校正」，避免平滑动画期间页面高度变化导致定位偏差；
       其余页面（首页 / 关于 / 归档等）没有该定位问题，直接放行给
       PaperMod footer 脚本的 scrollIntoView({behavior:'smooth'})，
       恢复平滑回顶效果。 */
    var isTopLink = (a.id === 'top-link') || href === '#top';
    var isPostPage = document.body.classList.contains('page-posts');
    if (isTopLink && !isPostPage) return;

    e.preventDefault();

    var target = null;
    try {
      target = document.getElementById(decodeURIComponent(href.slice(1)));
    } catch (err) {
      target = document.getElementById(href.slice(1));
    }
    if (!target) return;

    /* —— 精准锚点定位，避开懒加载图片导致的高度变化 ——
       用「手动计算绝对位置 + 直接跳转」而非平滑滚动（平滑动画长，期间图
       片加载会改变高度导致停偏）；不做延迟二次校正，避免「先跳一次、
       约一秒后又跳一次」的二次跳转观感。 */
    var NAV_OFFSET = 92; /* 顶部悬浮导航高度 + 余量 */
    function scrollToTarget() {
      var top = target.getBoundingClientRect().top + (window.scrollY || window.pageYOffset);
      var y = Math.max(0, top - NAV_OFFSET);
      /* 有 Lenis 时交给 motion.js 的入口做即时跳转（同步它的内部目标值，
         否则它的下一帧会把位置拉回去）；没有则退回原生 scrollTo。 */
      if (typeof window.__hnScrollTo === 'function') {
        window.__hnScrollTo(y, true);
      } else {
        window.scrollTo(0, y);
      }
    }
    scrollToTarget();
    /* 只保留第一次即时跳转，取消 120/400/900ms 的多次延迟校正：
       那会在跳转后约一秒再补跳一次，观感上是二次跳转。
       懒加载图片带来的高度漂移，改为由浏览器滚动位置自然承担。 */

    /* 更新地址栏 hash（不触发滚动/不产生历史记录，避免反向干扰） */
    if (history.replaceState) {
      try { history.replaceState(null, '', href); } catch (err) { /* 忽略 */ }
    }
  }, true);
})();
