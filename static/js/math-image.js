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
      /* 记住被点的那张原图（元素 + 此刻的视觉矩形）：它就是打开/关闭缩放动画的起点与终点。
         优先用**真正被点到的那个元素**——证书触发器里叠着两张缩略图，querySelector 只会
         拿到第一张，用它会让动画从一个用户没点的地方飞出来。 */
      var tapped = (t && t.tagName === 'IMG') ? t : (img || link);
      var origin = null;
      try { origin = { el: tapped, rect: tapped.getBoundingClientRect() }; } catch (eOrigin) { origin = null; }
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
      openLightbox(src, (img && img.alt) || link.getAttribute('title') || '', items, 0, origin);
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
  var lbLenisLocked = false;   /* Lenis 锁是否由本次浮层持有（双击图片会连着开两次，必须幂等）*/
  var lbRootOverflow = null;   /* 打开前 <html> 的内联 overflow；null = 当前没持有锁 */
  var lbRootPadRight = null;   /* 打开前 <html> 的内联 padding-right（滚动条补偿要用）*/
  var lbRootBg = null;         /* 打开前 <html> 的内联 background-color（gutter 压暗要用）*/
  var lbScrollbarW = 0;        /* 锁定时被回收的**视口布局宽度**（gutter 生效/覆层滚动条时为 0）*/
  var lbCloseTimer = null;     /* 关闭后"隐藏浮层"的计时器（再次打开要先取消它）*/
  var lbOrigin = null;         /* { el, rect }：点开大图的那张原图，缩放动画的起点 */
  var lbZoomAnim = null;       /* 当前入场/退场的 FLIP 缩放动画（WAAPI Animation）*/

  /* 背景滚动锁 —— ★ 必须锁 <html>，绝不能锁 <body>（2026-10-16 修「打开图片后左侧目录消失」）。
     一句话成因：body 上的 overflow:hidden 会让 .post-toc 的 position:sticky 整个失效。

     机理：overflow 有一条"传播"规则——根元素的 overflow 会作用到视口上；根是 html 且它
     自己的 overflow 为 visible 时，改由 body 的 overflow 顶上。但 Chrome 在传播之后
     **仍把 body 当成一个 overflow:hidden 的滚动容器**，于是 float:left + position:sticky
     的目录（吸附范围=视口，见 motion.css ⑪）的"最近滚动口"变成了 body 这个从头到尾
     不滚动的盒子 ⇒ 吸附偏移整体不算数，目录退回文档流原位。用户滚到文章深处点图片时，
     它已经停在视口上方约 7000px 处 ⇒ 观感就是"打开图片后左侧目录莫名其妙消失了"。
     锁在 <html> 上不触发这条链：视口变成不可滚，sticky 照常吸附、位置正确。

     实证（本机无头 Chrome + CDP，都在 .tools/ 里可复跑）：
       · lb-repro.mjs        —— 真实鼠标点图前后差分：tocRect.y 84 → -7057（visible true → false）
       · lb-lock-test.mjs    —— A~G 七种锁法隔离：只有"锁 body"会坏 sticky；
                               "锁 html"同时拦住 PageDown 与滚轮，sticky 完好（tocY 恒 84）；
                               html+body 都 overflow:clip 也不坏 sticky，但 clip 连程序化滚动
                               都禁掉（Lenis 的 window.scrollTo 会失效），所以不用它。

     与 Lenis 的分工：lenis.stop() 会自己给 <html> 挂 .lenis-stopped（同为 overflow:hidden）
     并掐掉在途惯性；但"减少动态"、搜索页、初始化失败等情况下根本没有 Lenis 实例，
     锁必须由这里独立提供，不能只靠那个类。 */

  /* 锁本体：只动 <html> 的内联 overflow，不改类名——与 Lenis 的 .lenis-stopped 各管各的，
     两套同时存在也不会打架（同值，谁先摘都不影响）。
     幂等（以 lbRootOverflow === null 表示"未持有"）：**双击一张图会连着触发两次 click**，
     第二次 openLightbox 若把当时的 'hidden' 当成"打开前的值"存下来，关闭时就会还回去
     ⇒ 页面永久锁死。

     滚动条补偿（2026-10-16 二次修订）：
     ★ 首选是让视口宽度**根本不变化**——css/extended/scrollbar.css 的
       `html { scrollbar-gutter: stable }` 让滚动条槽常驻，锁定时视口布局宽度恒定，
       fixed 元素（悬浮导航 / 回到顶部 / 阅读进度条）一位都不动，文档流也无需补偿。
       实证：.tools/lb-fixed-jitter.mjs（不注入 vs 注入 gutter，逐元素量 left/right）。
     ★ 但 gutter 在 Chrome<94 / Firefox<97 / Safari<18.2 上不生效，那里视口会真变宽
       （Windows 经典滚动条实测 15px：文档流内容跳 7.5px、贴右的 fixed 元素跳 15px；
       lb-repro 里 TOC 的 x 33 → 40 就是它）。所以这里**实测**被回收的宽度再补。

     量法：临时插一个 `position:fixed; left:0; right:0` 的探针，读它的 rect 宽度——
     那正是 fixed 元素的包含块(ICB)宽度。锁前量一次、锁完再量一次，差值 > 0 才补
     padding-right（html 的 padding 不产生滚动容器、也不改变 ICB，所以既不动目录的
     sticky，又照样把文档流收回去）。比 `if (CSS.supports('scrollbar-gutter', ...))`
     可靠：不管样式表加载成功与否、将来谁改了 scrollbar.css，它都自洽。
     差值量不到（覆层滚动条 / gutter 生效 / 页面本来就不可滚）就是 0，什么都不补。

     注：探针量的是 ICB —— 不能用 `window.innerWidth - documentElement.clientWidth`，
     那个读数在 gutter 生效时锁后仍报 1440（= 1440 - 0），会误判成"被收回 15px"而双重补偿。 */
  function icbWidth() {
    var probe = document.createElement('div');
    probe.style.cssText =
      'position:fixed;left:0;right:0;top:0;height:0;visibility:hidden;pointer-events:none';
    document.body.appendChild(probe);
    var w = probe.getBoundingClientRect().width;
    probe.remove();
    return w;
  }

  /* 解析 computed 颜色 'rgb(r, g, b)' / 'rgba(r, g, b, a)'；解析不了（transparent 等）返回 null */
  function parseRgb(c) {
    var m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\s*\)/.exec(c || '');
    if (!m) return null;
    return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
  }

  /* gutter 空槽的视觉修补 —— ★ 只能改「画布背景」，页面元素这条路是死的。
     scrollbar-gutter 保留的那条槽（Windows 实测 15px）**不在页面坐标系里**：
     锁定时 elementFromPoint(1426) 返回 null，满屏的 fixed 灯箱（rect 明明 0→1440）
     照样画不进去，截图右侧仍是页面背景色。
     唯一能填进那条槽的是「画布背景」——根元素背景传播到 canvas 的结果。
     所以锁定时按遮罩的 alpha 把根背景合成成"隔着遮罩看背景"的颜色，槽就和遮罩融为一体。
     实测：gutter 亮度 (10,13,19) → (2,2,3)，与遮罩区只差 1 个灰阶；内容区一字未变
     （body 自带不透明背景把 html 背景盖住了 ⇒ 改它只影响 gutter）。
     遮罩色与不透明度都从 CSS 现读、不硬编码：改 .math-lightbox-mask 的颜色这里自动跟随。
     背景是图片/渐变、或读到 transparent 时直接放弃——宁可留一条浅带，也不乱涂。 */
  function dimCanvasForGutter(root) {
    var maskEl = lightboxEl && lightboxEl.querySelector('.math-lightbox-mask');
    var mc = parseRgb(maskEl ? getComputedStyle(maskEl).backgroundColor : '');
    if (!mc) return;
    var canvas = parseRgb(getComputedStyle(root).backgroundColor);
    if (!canvas || canvas.a === 0) canvas = parseRgb(getComputedStyle(document.body).backgroundColor);
    if (!canvas || canvas.a === 0) return;
    root.style.backgroundColor = 'rgb(' +
      Math.round(mc.r * mc.a + canvas.r * (1 - mc.a)) + ', ' +
      Math.round(mc.g * mc.a + canvas.g * (1 - mc.a)) + ', ' +
      Math.round(mc.b * mc.a + canvas.b * (1 - mc.a)) + ')';
  }

  function lockScroll() {
    var root = document.documentElement;
    if (lbRootOverflow !== null) {      /* 已持有锁：只确保状态，绝不把 'hidden' 记成"打开前的值" */
      root.style.overflow = 'hidden';
      return;
    }
    lbRootOverflow = root.style.overflow || '';
    lbRootPadRight = root.style.paddingRight || '';
    lbRootBg = root.style.backgroundColor || '';
    var icbBefore = icbWidth();
    var winMinusIcb = Math.max(0, Math.round(window.innerWidth - icbBefore));  /* 视口布局宽度比窗口窄多少 */
    root.style.overflow = 'hidden';
    lbScrollbarW = Math.max(0, Math.round(icbWidth() - icbBefore));
    if (lbScrollbarW) root.style.paddingRight = lbScrollbarW + 'px';
    /* 视口没变宽（gutter 生效）⇒ 右侧留下一条 gutter 空槽，把它压暗成遮罩色 */
    if (lbScrollbarW === 0 && winMinusIcb > 0) dimCanvasForGutter(root);
  }

  function unlockScroll() {
    if (lbRootOverflow === null) return;     /* 本来就没锁：什么都不做（别把别人的锁写坏）*/
    var root = document.documentElement;
    root.style.overflow = lbRootOverflow;
    root.style.paddingRight = lbRootPadRight;   /* 先还宽度再放滚动条，两个方向都不跳 */
    root.style.backgroundColor = lbRootBg;      /* 画布背景还原（gutter 空槽随之消失）*/
    lbRootOverflow = null;
    lbRootPadRight = null;
    lbRootBg = null;
    lbScrollbarW = 0;
  }

  /* 浮层与 Lenis 平滑滚动的关系（用户报过"灯箱里滚轮缩放时下面的文章也跟着滚"）：
     Lenis 的滚轮处理器里**没有任何 defaultPrevented 判断**（源码实测），它只认
     ① composedPath 里带 data-lenis-prevent 的元素、② 自身 stopped 状态；
     而它的滚动是程序化的 window.scrollTo，所以 overflow 锁拦不住它
     （overflow 锁挡的是原生滚动/键盘/滚动条，挡不住它自己写 window.scrollTo）。
     于是三件事一起做：
       · 灯箱元素挂 data-lenis-prevent → Lenis 忽略浮层内的滚轮/触摸；
       · 打开时 stop() → 掐掉进入浮层前残留的惯性滚动；
       · 关闭时按"打开前的状态"恢复，不擅自启动本来就停着的 Lenis。 */
  function lockLenis() {
    var lenis = window.__hnLenis;
    if (!lenis || typeof lenis.stop !== 'function') return;
    if (!lbLenisLocked) {            /* 幂等：双击只会记一次"打开前本来在跑" */
      lbLenisWasRunning = !lenis.isStopped;
      lbLenisLocked = true;
    }
    try { lenis.stop(); } catch (eLock) { /* 忽略：锁不住也不能影响看图 */ }
  }

  function unlockLenis() {
    if (!lbLenisLocked) return;      /* 本来就没锁：不擅自 start 别人停着的 Lenis */
    lbLenisLocked = false;
    var lenis = window.__hnLenis;
    if (!lenis || typeof lenis.start !== 'function') return;
    if (!lbLenisWasRunning) return;
    try { lenis.start(); } catch (eUnlock) { /* 忽略 */ }
  }

  /* --------------------------------------------------------------------------
     3a. 打开/关闭的**空间延续**：大图从被点的那张原图的"位置与大小"长出来，
     关闭时沿同一条路缩回去（FLIP / zoom-from-origin）。
     --------------------------------------------------------------------------
     为什么做：灯箱原来只是"图片原地淡入 + 轻微弹一下"，可它打开的东西明明来自页面上
     一个具体的位置。Apple《Designing Fluid Interfaces》：**从哪里来就回哪里去**，
     进出走同一条路径、锚定触发它的那个元素，用户才不用重新建立"这是什么、跟刚才那张
     图什么关系"。这也是 iOS 相册、Chrome 图片查看器共同的做法。

     实现要点（每条都对应一个具体的坑）：
      ① 用 WAAPI（Element.animate）而不是 CSS keyframes/transition：起点矩形是运行时的
         几何量，而且**必须可中断**——CSS 动画只能从零重放，长动画途中关闭会看到跳变；
         WAAPI 能 cancel 掉、再从**当前画面值**接着走。
      ② 大图的尺寸取 offsetWidth/Height（布局尺寸，与 transform 无关），中心由
         getBoundingClientRect() **减掉当前内联位移**反推——那个 rect 含 transform，
         也含正在播放的动画，直接拿它当"布局态"会算错。
      ③ transform-origin 是元素中心（CSS 默认），于是
         `translate(dx,dy) scale(s)`：scale 绕自身中心缩放，dx/dy 是"原图中心 − 大图中心"
         （父坐标系像素，与 scale 无关）。宽高比一致时 sx==sy；本站图片都保住比例
         （见 motion.css 的 --hn-wh），万一不一致取几何平均——比取 min/max 都不容易
         在某一轴上明显溢出。
      ④ 减少动态、拿不到原图矩形、图片还没解码时，整条不做，退回原地弹入。
     实证：.tools/lb-zoom-check.mjs（暂停 + 逐帧 seek，断言首帧矩形 == 原图矩形）。
     ========================================================================== */
  var LB_ZOOM_IN = 380;   /* 入场：原图 → 大图（全屏级的空间转换，比常规 UI 动效长）*/
  var LB_ZOOM_OUT = 280;  /* 退场：比入场快（Emil：退场永远比入场干脆）*/
  var LB_EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';  /* 强 ease-out；进出同一条曲线 = 镜像可逆 */

  function reduceMotion() {
    try {
      return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) { return false; }
  }

  function cancelZoomAnim() {
    if (!lbZoomAnim) return;
    try { lbZoomAnim.cancel(); } catch (e) { /* 忽略：动画已经结束/被系统取消 */ }
    lbZoomAnim = null;
  }

  /* 大图"未变换"时的布局盒：尺寸 + 中心（中心 = 视觉中心 − 当前内联位移）*/
  function lbLayoutBox() {
    if (!lbImg) return null;
    var w = lbImg.offsetWidth, h = lbImg.offsetHeight;
    if (!w || !h) return null;                    /* 还没解码 ⇒ 没有布局盒，不能做 FLIP */
    var r = lbImg.getBoundingClientRect();
    return {
      w: w,
      h: h,
      cx: (r.left + r.right) / 2 - (lbState.tx || 0),
      cy: (r.top + r.bottom) / 2 - (lbState.ty || 0)
    };
  }

  function flipTransform(rect, box) {
    if (!rect || !box || !rect.width || !rect.height) return null;
    var s = Math.sqrt((rect.width / box.w) * (rect.height / box.h));
    if (!isFinite(s) || s <= 0) return null;
    var dx = (rect.left + rect.width / 2) - box.cx;
    var dy = (rect.top + rect.height / 2) - box.cy;
    return 'translate(' + dx + 'px, ' + dy + 'px) scale(' + s + ')';
  }

  /* 原图此刻的视觉矩形：元素还在文档里就现取（更准——hover 放大、换图版本都能跟上），
     否则用打开时的快照。 */
  function originRectNow() {
    if (!lbOrigin) return null;
    if (lbOrigin.el && lbOrigin.el.isConnected) {
      try {
        var r = lbOrigin.el.getBoundingClientRect();
        if (r.width && r.height) return r;
      } catch (e) { /* 忽略：退回快照 */ }
    }
    return lbOrigin.rect;
  }

  /* 入场：从原图长到居中大图。返回是否真的播了动画（false = 调用方走退路）。 */
  function playZoomIn() {
    if (reduceMotion() || !lbImg || typeof lbImg.animate !== 'function') return false;
    var from = flipTransform(originRectNow(), lbLayoutBox());
    if (!from) return false;
    lbZoomAnim = lbImg.animate(
      [{ transform: from }, { transform: 'translate(0px, 0px) scale(1)' }],
      { duration: LB_ZOOM_IN, easing: LB_EASE }
    );
    return true;
  }

  /* 退场：缩回原图。返回是否真的播了动画。
     起点取**当前画面值**——getComputedStyle 会把正在播放的入场动画一并算进来，先读现场、
     再取消旧动画、再以它为 from 起新动画，这就是"入场没播完就关闭也不跳变"的关键
     （Apple：中断时永远从 presentation value 出发，不是从目标值）。 */
  function playZoomOut() {
    if (reduceMotion() || !lbImg || typeof lbImg.animate !== 'function') return false;
    var live = '';
    try { live = getComputedStyle(lbImg).transform; } catch (eLive) { live = ''; }
    cancelZoomAnim();
    var to = flipTransform(originRectNow(), lbLayoutBox());
    if (!to) return false;
    if (!live || live === 'none') live = 'translate(0px, 0px) scale(1)';
    lbZoomAnim = lbImg.animate(
      [{ transform: live }, { transform: to }],
      { duration: LB_ZOOM_OUT, easing: LB_EASE }
    );
    return true;
  }

  function buildLightbox() {
    lightboxEl = document.createElement('div');
    lightboxEl.className = 'math-lightbox';
    /* 让 Lenis 忽略浮层内的滚轮与触摸（配合 <html> 的滚动锁，双保险） */
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
    /* 用户开始缩放/平移（或切图）⇒ 入场动画立刻让位：它和手动操作都在写同一个 transform，
       让 CSS 动画和用户的手抢画面必然出怪。取消后内联 transform 就是当前状态，接得上。 */
    cancelZoomAnim();
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

  function openLightbox(src, alt, items, index, origin) {
    if (!lightboxEl) { buildLightbox(); }

    /* 可重入：**双击一张图会连着触发两次 click**（click click dblclick）⇒ 第二次进来时
       要先把上一次的收尾动作撤掉（待隐藏的计时器、未播完的动画），否则会出现
       "刚打开就被上一次的关闭计时器藏掉/解锁"的错乱。 */
    if (lbCloseTimer) { window.clearTimeout(lbCloseTimer); lbCloseTimer = null; }
    lbClosing = false;
    cancelZoomAnim();
    lbOrigin = origin || null;

    lbItems = (items && items.length) ? items : [{ img: src, alt: alt || '', label: '' }];
    lbIndex = 0;
    lbLastFocus = document.activeElement;
    showItem(typeof index === 'number' ? index : 0, 0);
    lightboxEl.style.display = 'flex';
    lockScroll();                            /* 锁背景滚动（★ 锁在 <html> 上，见上文）*/
    lockLenis();                             /* 再锁 Lenis 的程序化滚动 */

    /* 入场：控制件错峰淡入（.is-opening）+ 大图从原图长到居中（playZoomIn）。
       整段在同一个任务里跑完，首帧就是最终状态，不会先闪一下。 */
    lightboxEl.classList.remove('is-opening', 'is-pop-img', 'is-closing', 'is-zoom-out');
    void lightboxEl.offsetWidth;             /* reflow：让同名动画能重放 */
    lightboxEl.classList.add('is-opening');
    if (!playZoomIn()) { lightboxEl.classList.add('is-pop-img'); }   /* 退路：原地弹入/淡入 */

    window.setTimeout(function () {
      lightboxEl.classList.remove('is-opening', 'is-pop-img');
    }, LB_ZOOM_IN + 60);                     /* 比最长的入场动画（图 380 / 控件 360）再宽一点 */

    /* 焦点移入弹层：键盘用户可直接 ←/→ 翻看、Esc 关闭 */
    var closeBtn = lightboxEl.querySelector('.math-lightbox-close');
    if (closeBtn) { try { closeBtn.focus({ preventScroll: true }); } catch (eFocus) { closeBtn.focus(); } }
  }

  var lbClosing = false;
  function closeLightbox() {
    if (lbClosing || !lightboxEl) return;
    lbClosing = true;
    /* 先摘掉 .is-opening：控制件的入场动画随之取消，接着的 .is-closing 过渡从当前值接上 */
    lightboxEl.classList.remove('is-opening', 'is-pop-img');
    lightboxEl.classList.add('is-closing');   /* 触发遮罩/控制件的 CSS 淡出 */
    var zoomed = playZoomOut();               /* 大图缩回原图（拿不到原图/减少动态时为 false）*/
    lightboxEl.classList.toggle('is-zoom-out', zoomed);
    lbCloseTimer = window.setTimeout(function () {
      lbCloseTimer = null;
      lightboxEl.style.display = 'none';
      lightboxEl.classList.remove('is-closing', 'is-zoom-out');
      unlockScroll();
      unlockLenis();
      lbClosing = false;
      lbItems = [];
      lbOrigin = null;
      lbZoomAnim = null;                      /* 动画已播完，引用一起放掉 */
      /* 把焦点还给打开它的那个元素 */
      if (lbLastFocus && lbLastFocus.focus) {
        try { lbLastFocus.focus({ preventScroll: true }); } catch (eBack) { /* 忽略 */ }
      }
      lbLastFocus = null;
    }, zoomed ? LB_ZOOM_OUT : 180);           /* 等动画播完再隐藏（缩回原图的最后一帧就落在原图上）*/
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
