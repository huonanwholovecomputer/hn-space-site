/* =========================================================
   证书查看器（HN Space）—— 专门给「竞赛证书」用，取代通用灯箱
   =========================================================

   为什么另起一个查看器，而不是改 math-image.js 的灯箱：
   灯箱是 2D 的（FLIP 缩放 + 平移），而证书想看的是**它是一张塑封的纸**——
   有厚度、会反光、能被拿在手里翻一下。这两件事的运动语言完全不同：
   灯箱回答"这张图多大"，查看器回答"这张纸在光下是什么样"。

   四个动作（都是用户 2026-10-26 点名要的）：
   1. 打开：从纸上「揭起来」——FLIP 到居中（900ms，慢到看得见它在长大），
      同时**只绕 Y 轴**横向翻转：卡片出现时是**背面**朝观众（180°），翻半圈露出正面，
      然后带着惯性被低频弹簧拉住，停在正向（见 §6 的 kickSpin / stepSpin）。
      慢、掉速、低频 = 用户要的"很重的大纸被空气阻力按住"；竖向的 rotateX 摆幅已删；
   2. 拖动：抓起来转（只有横向 + 竖向两个轴），角度**越拉越费劲**、渐近一个够不到的上限
      （橡皮筋，见 §9 的 rubber）；松手带惯性，由与入场同一档阻尼比的弹簧收回正对；
   3. 缩放：滚轮 / 触控板捏合、触屏双指捏合、触屏双击 —— 以指针（或双指中心）为锚点，
      放大后单指拖动变成"平移"（读证书时的直觉）；
   4. 悬停：只剩 ±3° 的微倾。**光效整套删掉了**（2026-10-26 用户要求）：
      高光斑 .cv-gloss、塑封反射带 .cv-film、跟随指针的背光 .cv-shade、场景泛光
      .cv-bloom 全部移除，卡片现在只有静态的纸边与颗粒。

   材质的物理边界（10-25 的实测结论）：证书是白纸，**加色加不动**（白纸只差 0.4 级色阶），
   这也正是"在白纸上打光"最终被删掉的原因 —— 真正读得出的只有纸的厚度、截面与边线。

   依赖：无。<html> 滚动锁与 Lenis 锁复用 window.__hnLbLock（math-image.js 导出），
   拿不到就自己兜一个最小实现，绝不让"打开后页面还在滚"。
   ========================================================= */
(function () {
  'use strict';
  if (window.__hnCertViewer) return;

  var SEL = 'a[data-cert-viewer]';
  var reduceMQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  /* ---------- 0. 常量：手感 ---------- */
  /* 两处弹簧共用**同一档阻尼比 ζ≈0.32**，只有 ω 不同 —— 用户 2026-10-26 反馈
     「拖动回弹和入场的阻尼好像不是同一个，入场更硬」，所以阻尼比统一，差别只在快慢：
       · 主摆 KP/KD：ω≈9.06（1.44Hz），拖动松手后回正 / 换张时的小摆，摆一下半就停；
       · 入场 SPIN_KP/SPIN_KD：ω≈7.35（1.17Hz），频率更低 = 更"重"，见下面 §入场旋转。 */
  var KP = 82, KD = 5.8;             /* ζ = kd/(2ω) ≈ 0.32 */
  /* 悬停级：只做 4.5° 以内的小倾，ω≈7.7，ζ≈0.55（几乎不过冲，歪一点点就停） */
  var HKP = 60, HKD = 8.5;
  /* 拖动角度：**不是硬上限，而是"越拉越费劲"的橡皮筋**（用户 2026-10-26 要求）。
     线性区内 1:1 跟手（到 SOFT），越过 SOFT 之后按指数压缩、渐近 HARD —— 永远够不到 HARD，
     所以"最终拉不动"，但也没有那道突然撞墙的截断。HARD 取在快要侧过去（90°）之前，
     任何角度都还能看见纸，不会拖出一张空白背面。
     数值手感：Y 轴 SOFT=50°/HARD=86°，从 0 拖到 300px（约 102° raw）才到 ~80°。 */
  var DRAG_SOFT_X = 36, DRAG_HARD_X = 64;   /* 上下（rotateX） */
  var DRAG_SOFT_Y = 50, DRAG_HARD_Y = 86;   /* 左右（rotateY） */
  var SWING_RX = 74, SWING_RY = 96;         /* 甩出去回弹时的硬兜底（别让它翻到背面） */
  var DRAG_GAIN = 0.34;              /* 1px 指针 → 多少度（线性区） */
  /* 缩放上限：证书原件是扫描件，放到 3.2 倍时字已经很大，再放就是糊的了 */
  var ZOOM_MAX = 3.2;

  /* ---- 入场旋转的手感（2026-10-26 第五版，用户原话）----
     「让证书变"重"一些，现在感觉很"轻"，很"硬"，需要减慢旋转速度，
       像是很大的物品在运动时受到了空气阻力。」
     「拖动回弹的阻尼和证书入场时的阻尼好像不是同一个？入场阻尼更高，弹性不明显。」
     被否掉的路线（别再调回去）：
       ① rotateX 跷跷板（竖向摆）—— 只要横向；
       ② 360° + 99° 过冲、摆 2.1s —— 「转的有点多，阻尼不够强」；
       ③ 360° + 32° 过冲 —— 仍「像转了两圈」；
       ④ 半圈 0.33s + ω=14 的硬弹簧 —— 「很轻、很硬」。
     "重"不是靠放慢一档速度装出来的，而是三件事一起：
       · 慢：半圈 0.56s（不是 0.33s），全程平均只有 ~320°/s；
       · 空气阻力：A 段 drag 从 0.6 提到 1.8，过正面时角速度已经从 520 掉到 ~190°/s
         —— 手一离开就更慢，像在推一张大纸；
       · 低频：B 段 ω 从 14.1 降到 7.35（1.17Hz），ζ 与拖动回弹统一在 0.32
         —— 过冲 17°、回弹 6°、0.9s 后才慢慢摆回来，1.4s 静止（不再"啪"一下刹住）。
     数值用 .tools/spin-spring.py 在 1/120、1/60、1/30 帧率下复核过。 */
  var SPIN_START = 180;              /* 开场姿态：背面朝观众（180°） */
  var SPIN_TARGET = 360;             /* 收在正向（360° ≡ 0°，同一个朝向） */
  var SPIN_V0 = 520;                 /* 起手角速度（°/s）：半圈 0.56s，一路被阻力压着掉速 */
  var SPIN_DRAG = 1.8;               /* A 段空气阻尼（1/s）：大纸在空气里的那种掉速 */
  var SPIN_KP = 54, SPIN_KD = 4.8;   /* B 段：ω≈7.35rad/s、ζ≈0.33（与拖动回弹同一档阻尼比） */
  /* 开场「从纸上长大」的时长（用户 2026-10-26：太短了，加长）。
     560ms 配 cubic-bezier(.16,1,.3,1) 读起来像"啪"一下就到眼前：那条曲线在 12% 时间
     就走完一半、40% 就基本到位，后面的时长全部浪费。
     现在 900ms + 一条"先起速、后长尾"的 dolly 曲线（约 50% 时间走完 80%，末 10% 还在动），
     配合入场翻转的"重物感"：起步不是弹射，而是大质量被推开。
     用 .tools/cv-flip-frames.mjs 逐帧量过宽度曲线。 */
  var FLIP_MS = 900;
  var FLIP_EASE = 'cubic-bezier(.4,.08,.25,1)';
  var CLOSE_MS = 300;

  var S = {
    open: false, ready: false, reduced: false,
    items: [], index: 0,
    el: {}, box: { w: 0, h: 0 },
    phys: { rx: 0, ry: 0, vx: 0, vy: 0 },
    hov: { x: 0, y: 0, tx: 0, ty: 0, vx: 0, vy: 0 },
    drag: { on: false, id: null, lx: 0, ly: 0, lt: 0, vx: 0, vy: 0, moved: 0, rawX: 0, rawY: 0 },
    /* 缩放：s = 倍数，x/y = 相对卡片中心的平移（px）。滚轮 / 双指 / 双击都写这三个数。 */
    zoom: { s: 1, x: 0, y: 0 },
    /* 双指捏合：d0/cx0/cy0/s0/x0/y0 是捏合开始那一刻的快照 */
    pinch: { on: false, d0: 0, cx0: 0, cy0: 0, s0: 1, x0: 0, y0: 0 },
    ptrs: {},                 /* 当前按在浮层上的指针（捏合要两根） */
    tap: { t: 0, x: 0, y: 0 },/* 上一次"轻点"的时间和位置（双击放大用） */
    /* 入场旋转：a = 当前角度（180 = 背面起步，360 = 正向），v = 角速度（°/s） */
    spin: { on: false, a: 0, v: 0, caught: false },
    raf: 0, last: 0, flipAnim: null, origin: null, lastFocus: null
  };

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  /* ---------- 1. 拦截点击 ----------
     必须在**捕获阶段**、且注册得比 math-image.js 更早（脚本顺序保证），
     否则通用灯箱会先一步把点击吃掉。stopImmediatePropagation 是必须的：
     math-image 的委托也挂在 document 捕获阶段，stopPropagation 拦不住同级的它。 */
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button > 0) return;
    var link = e.target && e.target.closest ? e.target.closest(SEL) : null;
    if (!link) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    open(link, e.target);
  }, true);

  /* ---------- 2. 打开 ---------- */
  function open(link, tappedEl) {
    if (S.open) return;
    var items = readItems(link);
    if (!items.length) return;         /* 解析失败：交回浏览器（href 是原图） */
    S.items = items;
    S.index = 0;
    S.origin = originOf(tappedEl, link);
    S.hov.x = S.hov.y = S.hov.tx = S.hov.ty = S.hov.vx = S.hov.vy = 0;
    resetZoom();                       /* 每次打开都从 1x 开始 */
    S.reduced = !!(reduceMQ && reduceMQ.matches);
    S.lastFocus = document.activeElement;

    build();
    S.open = true;
    S.ready = false;
    lockPage(true);

    S.el.root.hidden = false;
    /* 先量目标框（此时舞台已按 --cv-w/--cv-h 布局），再拿它算 FLIP 起点 */
    fitBox(items[0]);
    setImage(0);
    /* 每次打开都从静止姿态开始（上次拖动/关闭留下的角度不能带进来） */
    S.phys.rx = S.phys.ry = S.phys.vx = S.phys.vy = 0;
    /* ⚠️ 必须在 rAF **之前**同步调用：首帧姿态是"背面朝观众"，
       若等到 rAF 里才写 transform，卡片会先按 0°（正面）画一帧再跳到 180°。 */
    kickSpin();
    requestAnimationFrame(function () {
      S.el.root.classList.add('is-open');
      playFlipIn();
      S.ready = true;
      try { S.el.close.focus({ preventScroll: true }); } catch (eFocus) { }
      start();
    });
  }

  /* 一张纸 = 一张证书（2026-10-26 用户要求：点哪张就放大哪张，不做画廊）。
     读 data-cert-item（单个对象）；老结构里的 data-gallery-items 只在里面有 1 项时兼容。 */
  function readItems(link) {
    var it = null;
    var raw = link.getAttribute('data-cert-item');
    if (raw) {
      try { it = JSON.parse(raw); } catch (e) { it = null; }
    }
    if (!it) {
      var old = link.getAttribute('data-gallery-items');
      if (old) {
        try {
          var arr = JSON.parse(old);
          if (arr && arr.length) it = arr[0];
        } catch (e2) { it = null; }
      }
    }
    if (!it || !it.img) {
      var href = link.getAttribute('href');
      if (!href) return [];
      var img = link.querySelector('img');
      it = { img: href, alt: (img && img.alt) || '', label: '', ar: 0, thumb: '' };
    }
    return [{ img: it.img, alt: it.alt || '', label: it.label || '', ar: Number(it.ar) || 0, thumb: it.thumb || '' }];
  }

  /* 起点：优先用户真正点中的那一张纸（纸堆里有两张叠着，用 querySelector 会拿错） */
  function originOf(tappedEl, link) {
    var node = (tappedEl && tappedEl.closest && tappedEl.closest('.cert-paper__sheet')) ||
      link.querySelector('.cert-paper__sheet') || link;
    var r = null;
    try { r = node.getBoundingClientRect(); } catch (e) { r = null; }
    if (!r || !r.width) { r = link.getBoundingClientRect(); }
    return { el: node, rect: { left: r.left, top: r.top, width: r.width, height: r.height } };
  }

  /* ---------- 3. DOM ---------- */
  function build() {
    if (S.el.root) return;
    var root = document.createElement('div');
    root.className = 'cv-root';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', '证书查看器');
    root.setAttribute('data-lenis-prevent', '');
    root.hidden = true;

    var svg = function (inner, size) {
      return '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="none" stroke="currentColor"' +
        ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + inner + '</svg>';
    };

    root.innerHTML =
      '<div class="cv-scrim" data-act="close"></div>' +
      '<div class="cv-stage">' +
      '<div class="cv-shadow" aria-hidden="true"></div>' +
      '<div class="cv-flip">' +
      /* .cv-zoom 只负责滚轮/双指/双击的缩放与平移，和 .cv-flip 的 FLIP 动画、
         .cv-persp 的透视、.cv-tilt 的旋转各管一层，互不覆盖。 */
      '<div class="cv-zoom">' +
      '<div class="cv-persp">' +
      '<div class="cv-tilt">' +
      '<div class="cv-slab">' +
      '<div class="cv-face">' +
      '<img class="cv-img" alt="" draggable="false" decoding="async">' +
      '<span class="cv-rim" aria-hidden="true"></span>' +
      '<span class="cv-noise" aria-hidden="true"></span>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div class="cv-hud">' +
      '<p class="cv-cap"><span class="cv-cap-text"></span></p>' +
      '<p class="cv-hint">拖动转动 · 滚轮放大 · Esc 关闭</p>' +
      '</div>' +
      '<button class="cv-close" data-act="close" aria-label="关闭">' +
      svg('<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>', 20) + '</button>';

    document.body.appendChild(root);

    S.el = {
      root: root,
      scrim: root.querySelector('.cv-scrim'),
      stage: root.querySelector('.cv-stage'),
      shadow: root.querySelector('.cv-shadow'),
      flip: root.querySelector('.cv-flip'),
      zoom: root.querySelector('.cv-zoom'),
      persp: root.querySelector('.cv-persp'),
      tilt: root.querySelector('.cv-tilt'),
      slab: root.querySelector('.cv-slab'),
      face: root.querySelector('.cv-face'),
      img: root.querySelector('.cv-img'),
      capText: root.querySelector('.cv-cap-text'),
      cap: root.querySelector('.cv-cap'),
      hint: root.querySelector('.cv-hint'),
      close: root.querySelector('.cv-close')
    };

    /* 触屏上没有 Esc 键也没有滚轮：提示换成触屏的说法（遮罩本来就是关闭热区） */
    if (window.matchMedia && window.matchMedia('(hover: none)').matches) {
      S.el.hint.textContent = '拖动转动 · 双指/双击放大 · 点空白处关闭';
    }

    root.addEventListener('click', onHudClick);
    root.addEventListener('pointerdown', onDown, { passive: false });
    root.addEventListener('pointermove', onMove, { passive: true });
    root.addEventListener('pointerup', onUp);
    root.addEventListener('pointercancel', onUp);
    /* 滚轮：passive:false 才能 preventDefault（既不让页面滚，也不让 Lenis 接管）。
       触控板的捏合手势浏览器会以 ctrlKey=true 的 wheel 事件送进来。 */
    root.addEventListener('wheel', onWheel, { passive: false });

    S.el.img.addEventListener('load', function () {
      if (!S.open) return;
      /* 图片解码后按真实比例再校一次框（data 里的 ar 有时是 0） */
      if (!S.items[S.index].ar) { fitBox(S.items[S.index], true); }
    });
  }

  function onHudClick(e) {
    var btn = e.target.closest('[data-act]');
    if (!btn) return;
    /* 2026-10-26：上一张/下一张已删除 —— 一张纸就是一张证书，没有画廊。 */
    if (btn.getAttribute('data-act') === 'close') close();
  }

  /* ---------- 4. 布局：按证书真实比例把卡片塞进视口 ---------- */
  function fitBox(item, fromImage) {
    var vw = window.innerWidth, vh = window.innerHeight;
    var pad = vw < 700 ? 0.86 : 0.80;          /* 可用宽度占比 */
    var maxW = Math.min(vw * pad, 1080);
    var maxH = vh * (vw < 700 ? 0.60 : 0.74);
    var ar = item.ar;
    if (!ar && fromImage && S.el.img.naturalWidth) ar = S.el.img.naturalWidth / S.el.img.naturalHeight;
    if (!ar) ar = 0.7071;
    var w = maxW, h = w / ar;
    if (h > maxH) { h = maxH; w = h * ar; }
    S.box.w = Math.round(w);
    S.box.h = Math.round(h);
    S.el.flip.style.width = S.box.w + 'px';
    S.el.flip.style.height = S.box.h + 'px';
    S.el.shadow.style.width = Math.round(w * 0.92) + 'px';
    S.el.shadow.style.height = Math.round(Math.min(90, h * 0.18)) + 'px';
    updateShadow();
  }

  function setImage(i) {
    var it = S.items[i];
    if (!it) return;
    S.el.img.src = it.img;
    S.el.img.alt = it.alt || it.label || '获奖证书';
    S.el.capText.textContent = it.label || '';
    fitBox(it);
  }

  /* ---------- 5. 开场的 FLIP：从纸上长到居中 ---------- */
  function flipTransformFrom(rect) {
    var box = S.el.flip.getBoundingClientRect();
    if (!box.width || !box.height) return 'none';
    var dx = (rect.left + rect.width / 2) - (box.left + box.width / 2);
    var dy = (rect.top + rect.height / 2) - (box.top + box.height / 2);
    var sx = rect.width / box.width;
    var sy = rect.height / box.height;
    return 'translate(' + dx.toFixed(2) + 'px,' + dy.toFixed(2) + 'px) scale(' +
      sx.toFixed(4) + ',' + sy.toFixed(4) + ')';
  }

  function playFlipIn() {
    if (S.reduced) { S.el.flip.style.transform = 'none'; return; }
    var from = flipTransformFrom(S.origin.rect);
    if (S.flipAnim) { try { S.flipAnim.cancel(); } catch (e) { } }
    S.el.flip.style.transform = 'none';
    try {
      S.flipAnim = S.el.flip.animate(
        [{ transform: from, opacity: 0.55 }, { transform: 'none', opacity: 1 }],
        { duration: FLIP_MS, easing: FLIP_EASE, fill: 'both' }
      );
    } catch (eNoWaapi) { /* 没有 WAAPI 就是一次硬切，功能不受影响 */ }
  }

  function playFlipOut(done) {
    if (S.reduced) { S.el.flip.style.transform = 'none'; done(); return; }
    /* 从**当前呈现值**出发（动画半路关闭也不跳）：先读 computed，再取消旧动画 */
    var live = 'none';
    try { live = getComputedStyle(S.el.flip).transform; } catch (e) { }
    if (S.flipAnim) { try { S.flipAnim.cancel(); } catch (e2) { } }
    var to = flipTransformFrom(originRectNow());
    var finished = false;
    var finish = function () { if (finished) return; finished = true; done(); };
    try {
      S.flipAnim = S.el.flip.animate(
        [{ transform: live || 'none', opacity: 1 }, { transform: to, opacity: 0.35 }],
        { duration: CLOSE_MS, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'both' }
      );
      S.flipAnim.onfinish = finish;
      setTimeout(finish, CLOSE_MS + 120);
    } catch (e3) { finish(); }
  }

  function originRectNow() {
    var el = S.origin && S.origin.el;
    if (el && el.isConnected) {
      try {
        var r = el.getBoundingClientRect();
        if (r.width && r.height) return { left: r.left, top: r.top, width: r.width, height: r.height };
      } catch (e) { }
    }
    return S.origin ? S.origin.rect : { left: innerWidth / 2, top: innerHeight / 2, width: 120, height: 160 };
  }

  /* ---------- 6. 物理：PD 控制器（比例 = 回正，微分 = 阻尼） ----------
     用户的原话是「像 PID 一样逐渐静止」。这里没有积分项（I）：
     目标是 0°，积分项只在有恒定外扰时才有意义，加进来反而会拖出一个
     收不住的长尾。PD 就是教科书里的阻尼弹簧，视觉上就是"摆两下停住"。
     2026-10-26：换张用的 kickSeesaw 已删（一张纸就是一张证书，没有"换张"了），
     这条弹簧现在只负责拖动松手后的回正。 */

  /* 入场：横向（只绕 Y 轴）从**背面**翻半圈到正面。竖向的 rx 全程保持 0 —— 用户明确不要。 */
  function kickSpin() {
    if (S.reduced) {
      S.spin.on = false; S.spin.caught = false; S.spin.a = 0; S.spin.v = 0;
      if (S.el.tilt) S.el.tilt.style.transform = 'none';
      return;
    }
    S.spin.on = true;
    S.spin.a = SPIN_START;
    S.spin.v = SPIN_V0;
    S.spin.caught = false;
    /* 首帧就把姿态钉在背面（否则 DOM 会先按 0° 画一帧正面再跳到 180°） */
    if (S.el.tilt) S.el.tilt.style.transform = 'rotateX(0deg) rotateY(' + SPIN_START + 'deg)';
  }

  /* 两段式积分（数值与 .tools/spin-check.py 一致，改参数请先跑那个脚本）：
       A 段 a<360：只有空气阻尼 a'' = -drag·a'（180° 起步）；
       B 段 a≥360：被弹簧接住 a'' = -kp(a-360) - kd·a'，摆一下就收敛到 360°。
     停稳判据用的是"角度离 360 不到 0.25° 且角速度 < 14°/s"：14°/s 在一帧里只走
     0.2°，肉眼已经是静止；此时把角度归零（360° 与 0° 是同一个朝向，跳变不可见）。 */
  function stepSpin(dt) {
    var sp = S.spin;
    if (!sp.caught) {
      sp.v += (-SPIN_DRAG * sp.v) * dt;
      sp.a += sp.v * dt;
      if (sp.a >= SPIN_TARGET) { sp.caught = true; }
      return;
    }
    sp.v += (-SPIN_KP * (sp.a - SPIN_TARGET) - SPIN_KD * sp.v) * dt;
    sp.a += sp.v * dt;
    if (Math.abs(sp.a - SPIN_TARGET) < 0.25 && Math.abs(sp.v) < 14) {
      sp.on = false; sp.caught = false; sp.a = 0; sp.v = 0;
    }
  }

  function stepPhysics(dt) {
    if (S.drag.on) return;     /* 拖拽中不让弹簧抢方向盘 */
    if (S.spin.on) {
      /* 入场旋转期间不做任何竖向摆动：把悬停微倾的目标清零，让 hov 自己衰减回 0 */
      stepSpin(dt);
      S.hov.tx = 0; S.hov.ty = 0;
    } else {
      var ax = -KP * S.phys.rx - KD * S.phys.vx;
      var ay = -KP * S.phys.ry - KD * S.phys.vy;
      S.phys.vx += ax * dt;
      S.phys.vy += ay * dt;
      S.phys.rx = clamp(S.phys.rx + S.phys.vx * dt, -SWING_RX, SWING_RX);
      S.phys.ry = clamp(S.phys.ry + S.phys.vy * dt, -SWING_RY, SWING_RY);
    }

    /* 悬停微倾（另一条更硬的弹簧，几乎不过冲）：指针在哪边，哪边就靠近一点 */
    S.hov.vx += (-HKP * (S.hov.x - S.hov.tx) - HKD * S.hov.vx) * dt;
    S.hov.vy += (-HKP * (S.hov.y - S.hov.ty) - HKD * S.hov.vy) * dt;
    S.hov.x = clamp(S.hov.x + S.hov.vx * dt, -1, 1);
    S.hov.y = clamp(S.hov.y + S.hov.vy * dt, -1, 1);
  }

  /* ---------- 7. 渲染 ---------- */
  function render() {
    if (S.reduced) {
      /* 减少动态：不转、不摆，只保留缩放/平移 */
      S.el.tilt.style.transform = 'none';
      S.el.persp.style.transform = 'none';
    } else {
      var rx = S.phys.rx;
      var ry = S.phys.ry + (S.spin.on ? S.spin.a : 0);   /* 入场那圈直接叠加在纵向角度上 */
      S.el.tilt.style.transform = 'rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg)';
      /* 悬停微倾 4° → 3°：纸一大，4° 的边缘位移就有 40px，扫起来"晃"；
         3° 仍然读得出是立体的，但安静得多。 */
      S.el.persp.style.transform = 'rotateX(' + (S.hov.y * -3).toFixed(2) + 'deg) rotateY(' + (S.hov.x * 3).toFixed(2) + 'deg)';
    }

    /* 缩放（滚轮 / 双指 / 双击）：单独一层 .cv-zoom，别和 FLIP、透视、旋转抢同一个 transform */
    var z = S.zoom;
    S.el.zoom.style.transform = (z.s === 1 && !z.x && !z.y) ? 'none'
      : 'translate3d(' + z.x.toFixed(2) + 'px,' + z.y.toFixed(2) + 'px,0) scale(' + z.s.toFixed(4) + ')';
    S.el.root.classList.toggle('is-zoomed', z.s > 1.01);

    updateShadow();
  }

  function updateShadow() {
    var rx = S.phys.rx;
    var ry = S.phys.ry + (S.spin.on ? S.spin.a : 0);
    /* 影子按「侧过去了多少」抬起来：sin 让转满一圈时的抬升自然回到 0
       （转过 180° 时纸是背朝观众，但仍然是"正对着"的，不应该悬得最高）。 */
    var edge = Math.min(46, Math.abs(Math.sin(ry * Math.PI / 180)) * 57.3);
    var lift = Math.min(1, (Math.abs(rx) + edge) / 42);   /* 歪得越多 = 抬得越高 */
    S.el.shadow.style.transform = 'translate(' + (-rx * 0.9 - Math.sin(ry * Math.PI / 180) * 6).toFixed(1) + 'px,' + (6 + lift * 14).toFixed(1) + 'px) scale(' +
      (1 - lift * 0.10).toFixed(3) + ')';
    /* 放大后影子跟着卡片一起放大就不对了（它在 .cv-zoom 外面），索性收掉 */
    S.el.shadow.style.opacity = S.zoom.s > 1.01 ? '0' : (0.34 + lift * 0.22).toFixed(3);
  }

  /* ---------- 8. 主循环 ---------- */
  function start() {
    if (S.raf) return;
    S.last = 0;
    S.raf = requestAnimationFrame(loop);
    S.el.root.classList.add('is-running');
  }

  function stop() {
    if (S.raf) cancelAnimationFrame(S.raf);
    S.raf = 0;
    if (S.el.root) S.el.root.classList.remove('is-running');
  }

  function loop(now) {
    S.raf = requestAnimationFrame(loop);
    if (!S.last) S.last = now;
    var dt = Math.min((now - S.last) / 1000, 1 / 30);
    S.last = now;
    S.dt = dt;
    if (!S.reduced) stepPhysics(dt);
    /* 减少动态时也要 render：缩放（滚轮/双指/双击）与影子都靠它落 transform */
    render();
  }

  /* ---------- 9. 指针：转动（拖动）/ 缩放（滚轮 · 双指 · 双击） ----------
     用户 2026-10-26 三条要求：
       ① 鼠标拖动允许更大范围，但不是硬上限，而是"越拉越费劲、最终拉不动"的弹簧；
       ② 删掉鼠标悬浮的整套光效（高光/背光/泛光都去掉，只留纸本身的边缘与颗粒）；
       ③ 增加滚轮放大、触屏双指捏合放大、触屏双击放大。 */

  /* 橡皮筋映射：线性区 1:1 跟手；越过 soft 之后按指数压缩、渐近 hard。
     导数在靠近 hard 时趋于 0 ⇒ "越拉越费劲、最终拉不动"，但没有一道撞墙的截断。 */
  function rubber(raw, soft, hard) {
    var a = Math.abs(raw);
    if (a <= soft) return raw;
    var span = hard - soft;
    var out = soft + span * (1 - Math.exp(-(a - soft) / span));
    return raw < 0 ? -out : out;
  }
  /* 反函数：抓住的瞬间用当前角度反推 raw，避免"一抓就跳"。 */
  function rubberRaw(angle, soft, hard) {
    var a = Math.min(Math.abs(angle), hard - 0.01);
    if (a <= soft) return angle;
    var span = hard - soft;
    var raw = soft - span * Math.log(1 - (a - soft) / span);
    return angle < 0 ? -raw : raw;
  }
  /* raw 也封顶：拉得再远，往回拉时也不会先经过一大段"死区" */
  function clampRaw(raw, soft, hard) {
    var lim = hard + (hard - soft) * 2.5;
    return clamp(raw, -lim, lim);
  }

  /* 悬停微倾（光效删掉后只剩它）：指针在哪边，哪边就稍微靠近一点 */
  function pointerToTilt(e) {
    var b = S.el.flip.getBoundingClientRect();
    if (!b.width) return;
    var nx = clamp((e.clientX - b.left) / b.width, -0.15, 1.15);
    var ny = clamp((e.clientY - b.top) / b.height, -0.15, 1.15);
    S.hov.tx = clamp((nx - 0.5) * 2, -1, 1);
    S.hov.ty = clamp((ny - 0.5) * 2, -1, 1);
  }

  /* ---------- 缩放 ---------- */
  function flipCenter() {
    var r = S.el.flip.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  /* 平移不能把纸拖出可视区：最多拖到自己放大出来的那几边 */
  function clampPan() {
    var z = S.zoom;
    var lx = (z.s - 1) * S.box.w / 2, ly = (z.s - 1) * S.box.h / 2;
    z.x = clamp(z.x, -lx, lx);
    z.y = clamp(z.y, -ly, ly);
  }
  /* 以屏幕上的 (px,py) 为锚点缩放：那个点下面压着的内容不动（读证书就该这样放大） */
  function zoomAt(next, px, py) {
    var z = S.zoom;
    var ns = clamp(next, 1, ZOOM_MAX);
    if (ns <= 1.01) { z.s = 1; z.x = 0; z.y = 0; return; }
    var c = flipCenter();
    var k = ns / z.s;
    z.x = px - c.x - k * (px - c.x - z.x);
    z.y = py - c.y - k * (py - c.y - z.y);
    z.s = ns;
    clampPan();
  }
  function resetZoom() { S.zoom.s = 1; S.zoom.x = 0; S.zoom.y = 0; }

  function onWheel(e) {
    if (!S.open) return;
    if (e.target.closest && e.target.closest('[data-act]')) return;
    e.preventDefault();                       /* 页面不滚、Lenis 也别接管 */
    /* deltaMode 1 = 按行滚（Firefox 常见），先换算成像素 */
    var dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    /* 触控板捏合（浏览器以 ctrlKey=true 的 wheel 送来）delta 很小，步长要放大 */
    var k = Math.exp(-dy * (e.ctrlKey ? 0.010 : 0.0016));
    zoomAt(S.zoom.s * k, e.clientX, e.clientY);
  }

  /* ---------- 指针 ---------- */
  function startPinch() {
    var ids = Object.keys(S.ptrs);
    var a = S.ptrs[ids[0]], b = S.ptrs[ids[1]];
    S.pinch.on = true;
    S.pinch.d0 = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y));
    S.pinch.cx0 = (a.x + b.x) / 2;
    S.pinch.cy0 = (a.y + b.y) / 2;
    S.pinch.s0 = S.zoom.s;
    S.pinch.x0 = S.zoom.x;
    S.pinch.y0 = S.zoom.y;
    S.el.root.classList.add('is-zooming');
  }

  function pinchMove() {
    var ids = Object.keys(S.ptrs);
    if (ids.length < 2) return;
    var a = S.ptrs[ids[0]], b = S.ptrs[ids[1]];
    var d = Math.hypot(b.x - a.x, b.y - a.y);
    var cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
    var ns = clamp(S.pinch.s0 * (d / S.pinch.d0), 1, ZOOM_MAX);
    /* 捏合开始时手指中心压着的那块内容，要一直跟住手指中心（顺便实现双指平移） */
    var c = flipCenter();
    var d0x = (S.pinch.cx0 - c.x - S.pinch.x0) / S.pinch.s0;
    var d0y = (S.pinch.cy0 - c.y - S.pinch.y0) / S.pinch.s0;
    S.zoom.s = ns;
    S.zoom.x = cx - c.x - ns * d0x;
    S.zoom.y = cy - c.y - ns * d0y;
    if (ns <= 1.01) { S.zoom.s = 1; S.zoom.x = 0; S.zoom.y = 0; }
    clampPan();
  }

  function onDown(e) {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (e.target.closest('[data-act]')) return;      /* 按钮不参与 */
    var onCard = !!e.target.closest('.cv-flip');
    S.ptrs[e.pointerId] = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 };

    var ids = Object.keys(S.ptrs);
    /* 第二根手指落下 → 进捏合（空白处捏也允许放大），把单指拖拽停掉 */
    if (ids.length === 2) {
      if (S.drag.on) {
        S.drag.on = false;
        try { S.el.root.releasePointerCapture(S.drag.id); } catch (e0) { }
        S.el.root.classList.remove('is-dragging');
      }
      startPinch();
      e.preventDefault();
      return;
    }
    if (ids.length > 2) return;
    if (!onCard) return;       /* 空白处：单击交给遮罩关闭，不拖不转 */
    if (e.pointerType === 'mouse') pointerToTilt(e);
    /* 入场翻转的尾巴（最后那 1~2° 的摆动）不该再拦着用户：靠正向 4° 以内、速度也小了，
       就直接把角度交接过去，手感上等于"转完了"。 */
    if (S.spin.on && Math.abs(S.spin.a - SPIN_TARGET) < 4 && Math.abs(S.spin.v) < 80) {
      /* 把剩下的角度和角速度原样交给拖动弹簧，视觉上不会跳一下 */
      S.phys.ry = S.spin.a - SPIN_TARGET;
      S.phys.vy = S.spin.v;
      S.spin.on = false; S.spin.caught = false; S.spin.a = 0; S.spin.v = 0;
    }
    if (S.spin.on) return;     /* 还在翻：不给抓（交接会跳） */
    if (S.reduced) return;     /* 减少动态：可以缩放，但不转 */

    S.drag.on = true;
    S.drag.id = e.pointerId;
    S.drag.lx = e.clientX; S.drag.ly = e.clientY;
    S.drag.lt = performance.now();
    S.drag.vx = 0; S.drag.vy = 0; S.drag.moved = 0;
    /* 从当前角度反推 raw：上一轮甩出去的余角也能接着抓，不会跳一下 */
    S.drag.rawX = rubberRaw(S.phys.rx, DRAG_SOFT_X, DRAG_HARD_X);
    S.drag.rawY = rubberRaw(S.phys.ry, DRAG_SOFT_Y, DRAG_HARD_Y);
    try { S.el.root.setPointerCapture(e.pointerId); } catch (eCap) { }
    S.el.root.classList.add('is-dragging');
    e.preventDefault();                              /* 别让浏览器把图当图片拖走 */
  }

  function onMove(e) {
    if (!S.open) return;
    if (S.ptrs[e.pointerId]) {
      var pp = S.ptrs[e.pointerId];
      var ddx = e.clientX - pp.x, ddy = e.clientY - pp.y;
      pp.x = e.clientX; pp.y = e.clientY;
      pp.moved += Math.abs(ddx) + Math.abs(ddy);
    }
    if (S.pinch.on) { pinchMove(); return; }
    if (!S.drag.on || e.pointerId !== S.drag.id) {
      if (e.pointerType === 'mouse') pointerToTilt(e);
      return;
    }
    var now = performance.now();
    var dt = Math.max(8, now - S.drag.lt) / 1000;
    var dx = e.clientX - S.drag.lx;
    var dy = e.clientY - S.drag.ly;
    S.drag.lx = e.clientX; S.drag.ly = e.clientY; S.drag.lt = now;
    S.drag.moved += Math.abs(dx) + Math.abs(dy);

    if (S.zoom.s > 1.01) {
      /* 放大之后一只手是"平移"而不是"转动" —— 看图时这是所有人的直觉 */
      S.zoom.x += dx; S.zoom.y += dy;
      clampPan();
      return;
    }

    /* 转动：橡皮筋。raw 累计指针位移，显示角度由 rubber() 压缩，越靠边越费劲 */
    var prevX = S.phys.rx, prevY = S.phys.ry;
    S.drag.rawY = clampRaw(S.drag.rawY + dx * DRAG_GAIN, DRAG_SOFT_Y, DRAG_HARD_Y);
    S.drag.rawX = clampRaw(S.drag.rawX - dy * DRAG_GAIN, DRAG_SOFT_X, DRAG_HARD_X);
    S.phys.ry = rubber(S.drag.rawY, DRAG_SOFT_Y, DRAG_HARD_Y);
    S.phys.rx = rubber(S.drag.rawX, DRAG_SOFT_X, DRAG_HARD_X);
    /* 松手惯性用**显示角**的角速度（橡皮筋里 raw 的速度已经不是手感了） */
    S.drag.vx = S.drag.vx * 0.6 + ((S.phys.ry - prevY) / dt) * 0.4;
    S.drag.vy = S.drag.vy * 0.6 + ((S.phys.rx - prevX) / dt) * 0.4;
    if (S.drag.moved > 24) S.el.hint.classList.add('is-used');
  }

  function onUp(e) {
    var p = S.ptrs[e.pointerId];
    delete S.ptrs[e.pointerId];

    /* 触屏双击放大：两次轻点，间隔 < 320ms、两次落点 < 28px */
    if (p && e.pointerType !== 'mouse' && p.moved < 10 && performance.now() - p.t < 260) {
      var nowT = performance.now();
      var dbl = nowT - S.tap.t < 320 && Math.hypot(e.clientX - S.tap.x, e.clientY - S.tap.y) < 28;
      if (dbl) {
        S.tap.t = 0;
        if (S.zoom.s > 1.05) resetZoom(); else zoomAt(2.6, e.clientX, e.clientY);
        return;
      }
      S.tap.t = nowT; S.tap.x = e.clientX; S.tap.y = e.clientY;
    }

    /* 捏合结束：剩下的手指不要突然变回"转动" */
    if (S.pinch.on) {
      if (Object.keys(S.ptrs).length < 2) {
        S.pinch.on = false;
        S.el.root.classList.remove('is-zooming');
      }
      return;
    }

    if (!S.drag.on || e.pointerId !== S.drag.id) return;
    S.drag.on = false;
    try { S.el.root.releasePointerCapture(e.pointerId); } catch (eR) { }
    S.el.root.classList.remove('is-dragging');
    /* 松手：把最后的速度交给弹簧，于是有"甩出去再被拉回来"的余韵（与入场同一档阻尼比） */
    S.phys.vx = clamp(S.drag.vy, -420, 420);
    S.phys.vy = clamp(S.drag.vx, -420, 420);
  }

  function onLeave() {
    S.hov.tx = 0; S.hov.ty = 0;
  }

  /* ---------- 10. 关闭 ---------- */

  /* 立刻收掉（不做退场动画）：PJAX 换页时用。
     这时候 <main> 已经换成新页面的内容，卡片背后那张纸**不在这页了** ——
     再从"原来的位置"缩回去，看到的就是一张白纸飞向虚空。 */
  function closeNow() {
    if (!S.el.root) return;
    S.el.root.hidden = true;
    S.el.root.classList.remove('is-open', 'is-running', 'is-dragging', 'is-zoomed', 'is-zooming');
    S.el.flip.style.transform = 'none';
    /* 旋转/微倾也清干净：早关（翻转途中 Esc）会把 --ry 停在半路，
       虽然下次 open() 的 kickSpin / render 都会重写，但让关着的 DOM 回到中性更省心。 */
    if (S.el.tilt) S.el.tilt.style.transform = 'none';
    if (S.el.persp) S.el.persp.style.transform = 'none';
    /* 入场旋转的状态一并清干净：下次 open() 的 kickSpin 会重新钉首帧，
       但这里不清的话，探针/调试里会看到"已经关了还在转"的假象。 */
    S.spin.on = false; S.spin.caught = false; S.spin.a = 0; S.spin.v = 0;
    if (S.flipAnim) { try { S.flipAnim.cancel(); } catch (e) { } S.flipAnim = null; }
    resetZoom();
    unlockPage();
  }

  function close() {
    if (!S.open) return;
    S.open = false;
    stop();
    S.el.root.classList.remove('is-open', 'is-dragging');
    if (S.drag.on) { S.drag.on = false; }
    playFlipOut(function () {
      if (S.open) return;                 /* 关的过程中又点开了：别把新的收掉 */
      closeNow();
      if (S.lastFocus && S.lastFocus.focus) { try { S.lastFocus.focus({ preventScroll: true }); } catch (e2) { } }
    });
  }

  /* PJAX 换页（点导航 / 浏览器前进 / 后退）时浮层必须立刻收掉。
     <main> 被整块替换，{打开它的那张纸} 已经不在文档里；不主动收的话，
     遮罩会继续盖在新页面上、<html> 的滚动锁也不会归还（2026-10-26 实测：
     开着证书按后退，回到首页后整页仍然锁着、还挂在旧证书的画面上）。 */
  document.addEventListener('pjax:done', function () {
    if (!S.open) return;
    S.open = false;
    stop();
    closeNow();
  });

  /* ---------- 11. 键盘 ---------- */
  document.addEventListener('keydown', function (e) {
    if (!S.open) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    /* ← → 原来用于换张（画廊），现在一张纸只对应一张证书，已删除 */
    if (e.key === 'Tab') {
      var f = S.el.root.querySelectorAll('button:not([hidden])');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, true);

  /* 指针离开卡片：悬停微倾归零（整层都算，挪到按钮上也算离开） */
  document.addEventListener('pointermove', function (e) {
    if (!S.open) return;
    if (S.el.root && !S.el.root.contains(e.target)) onLeave();
  }, true);

  window.addEventListener('resize', function () {
    if (!S.open) return;
    fitBox(S.items[S.index], true);
    resetZoom();                     /* 视口变了，原来的缩放锚点就没意义了 */
  });

  /* ---------- 13. 滚动锁 ----------
     这套技术是 math-image.js 里实测出来的（锁 <html>、绝不动 <body>，否则
     文章页粘性目录会掉下去），所以直接复用它导出的函数；拿不到时兜底。 */
  function lockPage() {
    var api = window.__hnLbLock;
    if (api && api.lock) { api.lock(); return; }
    document.documentElement.style.overflow = 'hidden';
  }
  function unlockPage() {
    var api = window.__hnLbLock;
    if (api && api.unlock) { api.unlock(); return; }
    document.documentElement.style.overflow = '';
  }

  /* 对外只暴露一个只读探针（验收脚本用；不参与任何生产逻辑） */
  window.__hnCertViewer = {
    isOpen: function () { return S.open; },
    state: function () {
      return {
        open: S.open, index: S.index, n: S.items.length,
        rx: +S.phys.rx.toFixed(2), ry: +S.phys.ry.toFixed(2),
        vx: +S.phys.vx.toFixed(2), vy: +S.phys.vy.toFixed(2),
        /* 入场旋转的现场：spinning = 还在转；spin = 当前角度（180 = 背面，360 = 正向） */
        spinning: S.spin.on, spin: S.spin.on ? +S.spin.a.toFixed(2) : null,
        spinV: S.spin.on ? +S.spin.v.toFixed(1) : null,
        dragging: S.drag.on, zoom: +S.zoom.s.toFixed(3), pan: [+S.zoom.x.toFixed(1), +S.zoom.y.toFixed(1)],
        hov: [+S.hov.x.toFixed(3), +S.hov.y.toFixed(3)],
        box: [S.box.w, S.box.h], reduced: S.reduced
      };
    }
  };
})();
