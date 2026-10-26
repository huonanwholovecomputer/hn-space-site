// Global mouse trail - particle system (canvas, dependency-free)
//
// 帧率无关性（motion-web/references/handfeel.md §7.1）：
// 本文件原先把所有动力学按「每帧」写（* 0.3、life -= 16、vx *= 0.96、r += 1.4）。
// 那是 30/60/120fps 下三个不同的滤波器：实测收敛时间 300/150/75ms（.tools/hn-motion-harness.mjs）。
// 现在统一切到「按 dt」：把 60fps 的每帧系数 a 换算成每秒紧度 k = -60·ln(1-a)，再用
// 1 - exp(-k·dt)；物理量乘以 f60（以 60fps 的一帧为单位的时间步长）。60fps 下与旧行为一致。
//
// 两个开关（静态/js/fx-prefs.js 的面板）：
//   · 「鼠标移动拖尾」= 丝带 + 移动时喷的粒子（--trail）
//   · 「鼠标点击效果」= 点击时的圆环 + 爆裂粒子（--click）
// 两者独立：可以只留点击、不留拖尾。
// 全部关闭时**不创建画布**（全屏 canvas 在 DPR2 下就是一块 2~10MB 的绘制缓冲，
// 低配机上连"建了但不用"都该省掉）；重新打开时按需重建。
//
// 另外修掉一处一直在烧 CPU 的行为：原来只要指针动过一次，cursor.active 就永远为真，
// 于是 tick 每帧 clear + 重绘整块全屏画布，哪怕鼠标已经静止、丝带粒子全都散尽。
// 现在「静止且无残影」时直接停掉 rAF（见 tick 末尾），下次 pointermove 再唤醒。
(function () {
  'use strict';

  if (!window.PointerEvent) return;
  if (window.matchMedia('(pointer: coarse)').matches) return; // touch-first devices
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; // user preference

  /* 特效开关（fx-prefs.js 必须先于本文件执行）。拿不到就当作全开。 */
  var FX = window.__hnFx;
  function trailOn() { return !FX || FX.enabled('trail'); }
  function clickOn() { return !FX || FX.enabled('click'); }
  function anyOn() { return trailOn() || clickOn(); }

  var canvas = null;
  var ctx = null;

  let W = 0;
  let H = 0;
  let DPR = 1;

  function resize() {
    if (!canvas || !ctx) return;
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    // 显式固定 CSS 尺寸，与绘制缓冲完全一致，避免百分比宽度/滚动条导致横向偏移
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  /* 按需创建：全关时不占绘制缓冲；开关重新打开时在这里补建。 */
  function ensureCanvas() {
    if (canvas && ctx) return true;
    canvas = document.createElement('canvas');
    canvas.id = 'mouse-trail';
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    if (!ctx) {
      /* 拿不到 2D 上下文（极端情况）：把节点收回去，避免留下一个空画布占位 */
      canvas.remove();
      canvas = null;
      return false;
    }
    resize();
    return true;
  }

  function destroyCanvas() {
    stop();
    if (canvas) {
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    }
    canvas = null;
    ctx = null;
    W = 0;
    H = 0;
  }

  // ---- cursor state ----
  const cursor = { x: -200, y: -200, tx: -200, ty: -200, active: false };
  const trail = []; // recent positions for the ribbon

  // ---- effects ----
  // 站点蓝系配色（与首页 --home-accent / DeepSeek 蓝一致），跟随明暗主题实时切换
  const THEMES = {
    light: {
      palette: ['#3b82f6', '#2563eb', '#60a5fa', '#22d3ee', '#ffffff'],
      ribbonHue: 217, ribbonSat: 91, ribbonLight: 60, // 拖尾丝带：蓝 → 靛蓝
      ring: '96, 165, 250'                              // 点击圆环
    },
    dark: {
      palette: ['#60a5fa', '#3b82f6', '#93c5fd', '#38bdf8', '#ffffff'],
      ribbonHue: 213, ribbonSat: 94, ribbonLight: 68,
      ring: '147, 197, 253'
    }
  };

  function detectTheme() {
    const t = document.documentElement.dataset.theme;
    if (t === 'dark') return 'dark';
    if (t === 'light') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  let activeTheme = detectTheme();
  const themeCfg = () => THEMES[activeTheme];

  // 主题按钮切换（PaperMod 修改 <html data-theme>）与系统主题变化时即时换色
  new MutationObserver(() => { activeTheme = detectTheme(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  window.matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => { activeTheme = detectTheme(); });

  const particles = [];
  const rings = [];
  const MAX_PARTICLES = 150;
  const MAX_RINGS = 8;

  let emitAcc = 0; // distance accumulator for emission
  let rafId = null;
  let lastT = 0;   // 上一帧时间戳，用于把「每帧系数」换算成按 dt 的系数

  /* 60fps 下的每帧系数 0.3 ⇄ k = -60·ln(1-0.3) ≈ 21.4/s */
  const FOLLOW_K = -60 * Math.log(0.7);
  /* 丝带跨度用「时间」而不是「点数」封顶：原来写死 18 点，在 60fps 下正好 ≈300ms，
     但在 120/144Hz 上只有 150/125ms，丝带会明显变短（帧率依赖的第二种表现）。
     改成按 dt 换算，60fps 下仍然得到 18 点。 */
  const TRAIL_WINDOW_MS = 300;
  const TRAIL_CAP_MIN = 8;
  const TRAIL_CAP_MAX = 64;
  /* 掉帧 / 切走标签页再回来时不让状态突变（与 site.js 的同名上限一致） */
  const MAX_DT = 64;

  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }

  function hexToRgba(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a.toFixed(3) + ')';
  }

  function pushParticle(p) {
    if (particles.length >= MAX_PARTICLES) particles.shift();
    particles.push(p);
  }

  function emit(x, y, speed) {
    pushParticle({
      x: x + rand(-2, 2),
      y: y + rand(-2, 2),
      vx: rand(-speed, speed),
      vy: rand(-speed, speed) - 0.4,
      size: rand(1.2, 3.6),
      life: rand(350, 850),
      maxLife: 850,
      color: pick(themeCfg().palette),
      sparkle: Math.random() < 0.12,
      rot: rand(0, Math.PI * 2)
    });
  }

  function burst(x, y) {
    const n = 22;
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + rand(-0.2, 0.2);
      const sp = rand(2.5, 7);
      pushParticle({
        x: x,
        y: y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        size: rand(1.5, 4),
        life: rand(500, 1000),
        maxLife: 1000,
        color: pick(themeCfg().palette),
        sparkle: i % 5 === 0,
        rot: rand(0, Math.PI * 2)
      });
    }
    rings.push({ x: x, y: y, r: 2, alpha: 0.7, max: rand(45, 70) });
    if (rings.length > MAX_RINGS) rings.shift();
  }

  function kick() {
    if (!rafId && canvas && ctx) rafId = requestAnimationFrame(tick);
  }

  function stop() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    lastT = 0;
  }

  function onMove(e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    if (!trailOn()) {
      /* 拖尾关着：不追踪、不喷粒子（点击效果独立，走 onDown） */
      cursor.active = false;
      trail.length = 0;
      return;
    }
    if (!ensureCanvas()) return;
    if (!cursor.active) {
      // 首次移动时直接吸附到鼠标位置，避免拖影从左上角（初始坐标）扫过来；
      // 同时把越界坐标钳制在画布内，避免从窗口外回来时产生边缘残影
      const nx = Math.min(W, Math.max(0, e.clientX));
      const ny = Math.min(H, Math.max(0, e.clientY));
      cursor.x = nx;
      cursor.y = ny;
      cursor.tx = nx;
      cursor.ty = ny;
      trail.length = 0;
    } else {
      cursor.tx = Math.min(W, Math.max(0, e.clientX));
      cursor.ty = Math.min(H, Math.max(0, e.clientY));
    }
    cursor.active = true;
    kick();
  }

  function onDown(e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    if (!clickOn()) return;
    if (!ensureCanvas()) return;
    burst(e.clientX, e.clientY);
    kick();
  }

  function onLeave() {
    cursor.active = false;
  }

  // ---- animation loop ----
  function tick() {
    rafId = null;
    if (!canvas || !ctx) return;
    const now = performance.now();
    const dtMs = lastT ? Math.min(now - lastT, MAX_DT) : 1000 / 60;
    lastT = now;
    // 以「60fps 的一帧」为单位的时间步长：粒子物理原本按每帧写，乘它就等价换算到任意帧率
    const f60 = dtMs / (1000 / 60);
    const drawTrail = trailOn();

    if (drawTrail) {
      // tail follows the pointer with easing; head stays under the cursor
      const followA = 1 - Math.exp(-FOLLOW_K * (dtMs / 1000));
      cursor.x += (cursor.tx - cursor.x) * followA;
      cursor.y += (cursor.ty - cursor.y) * followA;

      // emit particles while moving
      let dist = 0;
      if (trail.length) {
        const last = trail[trail.length - 1];
        dist = Math.hypot(cursor.x - last.x, cursor.y - last.y);
      }
      if (cursor.active && (trail.length === 0 || dist > 0.5)) {
        trail.push({ x: cursor.x, y: cursor.y, t: now });
        const cap = Math.max(TRAIL_CAP_MIN, Math.min(TRAIL_CAP_MAX, Math.round(TRAIL_WINDOW_MS / dtMs)));
        if (trail.length > cap) trail.shift();
        if (trail.length > 1) {
          emitAcc += dist;
          while (emitAcc >= 5) {
            emitAcc -= 5;
            emit(cursor.x + rand(-3, 3), cursor.y + rand(-3, 3), rand(0.2, 1.0));
          }
          if (Math.random() < 0.05) emit(cursor.x, cursor.y, rand(1, 2));
        }
      }
    } else {
      trail.length = 0;
      cursor.active = false;
    }

    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';

    if (drawTrail) drawRibbon(now);
    drawParticles(now, dtMs, f60);
    drawRings(now, f60);

    ctx.globalCompositeOperation = 'source-over';

    /* 还有没有东西要画？——拖尾点未消散完时也要继续渲染，
       避免鼠标移出窗口后丝带被冻结在屏幕上。
       新增「静止判定」：指针已停稳且丝带/粒子/圆环都空了就不再排帧，
       否则静止的鼠标会让整块全屏画布每帧重绘（这是低配机上持续占用的一块）。 */
    const settled =
      Math.abs(cursor.tx - cursor.x) < 0.25 && Math.abs(cursor.ty - cursor.y) < 0.25;
    const keep =
      (drawTrail && cursor.active && !settled) ||
      (drawTrail && trail.length > 0) ||
      particles.length > 0 ||
      rings.length > 0;

    if (keep && anyOn()) {
      rafId = requestAnimationFrame(tick);
    } else {
      // 收尾：把最后一帧擦掉，避免残留的淡粒子停在屏幕上
      ctx.clearRect(0, 0, W, H);
      lastT = 0;
    }
  }

  function drawRibbon(now) {
    // 按时间淘汰（本来就是毫秒语义，与帧率无关，无需换算）
    while (trail.length && now - trail[0].t > 750) trail.shift();
    const n = trail.length;
    if (n < 2 || !ctx) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 1; i < n; i++) {
      const p0 = trail[i - 1];
      const p1 = trail[i];
      const k = i / n; // 0 oldest -> 1 newest
      const age = (now - p1.t) / 700;
      const fade = Math.max(0, 1 - age) * k;
      if (fade <= 0.02) continue;
      const t = themeCfg();
      ctx.strokeStyle = 'hsla(' + (t.ribbonHue + k * 28).toFixed(0) + ', ' + t.ribbonSat + '%, ' + t.ribbonLight + '%, ' + (0.16 * fade).toFixed(3) + ')';
      ctx.lineWidth = 0.8 + 2.2 * k * fade;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
  }

  function drawParticles(now, dtMs, f60) {
    // vx/vy 的单位是「60fps 下每帧多少 px」，所以位移乘 f60；
    // 阻尼 0.96/帧 与重力 0.03/帧 同样按 f60 换算（pow 保证多帧叠加与逐帧等价）
    const damp = Math.pow(0.96, f60);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dtMs; // life 本来就是按 60fps（每帧 16ms）记的毫秒
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * f60;
      p.y += p.vy * f60;
      p.vx *= damp;
      p.vy *= damp;
      p.vy += 0.03 * f60; // gentle fall
      p.rot += 0.08 * f60;

      const k = Math.max(0, p.life / p.maxLife);
      if (p.sparkle) {
        const tw = Math.abs(Math.sin(now / 90 + p.rot));
        const s = p.size * (0.6 + tw);
        ctx.fillStyle = hexToRgba(p.color, 0.95 * k);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - s);
        ctx.lineTo(p.x + s * 0.35, p.y);
        ctx.lineTo(p.x, p.y + s);
        ctx.lineTo(p.x - s * 0.35, p.y);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = hexToRgba(p.color, 0.22 * k);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = hexToRgba(p.color, 0.85 * k);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * k, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawRings(now, f60) {
    const decay = Math.pow(0.94, f60);
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.r += 1.4 * f60;
      r.alpha *= decay;
      if (r.alpha < 0.02) {
        rings.splice(i, 1);
        continue;
      }
      ctx.strokeStyle = 'rgba(' + themeCfg().ring + ',' + r.alpha.toFixed(3) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  /* ---- 开关联动 ----
     关掉拖尾立刻停丝带；关掉点击不再响应 pointerdown；
     两个都关 → 连画布一起移除（由 destroyCanvas 走 stop()）。
     重新打开时下一次 pointermove / pointerdown 会自己建回画布并唤醒循环。 */
  function refresh() {
    if (!anyOn()) {
      cursor.active = false;
      trail.length = 0;
      particles.length = 0;
      rings.length = 0;
      destroyCanvas();
      return;
    }
    if (!trailOn()) {
      cursor.active = false;
      trail.length = 0;
      if (!particles.length && !rings.length) {
        stop();
        if (ctx) ctx.clearRect(0, 0, W, H);
      }
    }
    if (!clickOn()) {
      /* 已经喷出去的粒子仍会自然消散，不做硬切（视觉上不该"啪"地消失） */
      rings.length = 0;
    }
  }

  if (FX) FX.onChange(refresh);

  /* ---- 判据台架探针（只读、零副作用）----
     .tools/hn-motion-harness.mjs 用它按 30/60/120fps 逐帧比对拖尾轨迹。
     探针契约见 motion-web/references/verification-harness.md §1：
     时间必须可设（由台架的虚拟时钟接管 rAF），状态必须可读（这里）。 */
  window.__hnMotion = Object.assign(window.__hnMotion || {}, {
    trail: function () {
      return {
        x: cursor.x,
        y: cursor.y,
        tx: cursor.tx,
        ty: cursor.ty,
        n: trail.length,
        particles: particles.length,
        canvas: !!canvas,
        raf: !!rafId
      };
    }
  });

  window.addEventListener('resize', function () {
    if (!canvas) return;
    resize();
  });
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerdown', onDown, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);

  /* 首次加载就按偏好决定建不建画布 */
  refresh();
})();
