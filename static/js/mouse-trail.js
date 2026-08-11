// Global mouse trail - particle system (canvas, dependency-free)
(function () {
  'use strict';

  if (!window.PointerEvent) return;
  if (window.matchMedia('(pointer: coarse)').matches) return; // touch-first devices
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; // user preference

  const canvas = document.createElement('canvas');
  canvas.id = 'mouse-trail';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  let W = 0;
  let H = 0;
  let DPR = 1;

  function resize() {
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

  // ---- cursor state ----
  const cursor = { x: -200, y: -200, tx: -200, ty: -200, active: false };
  const trail = []; // recent positions for the ribbon
  const MAX_TRAIL = 26;

  // ---- effects ----
  const PALETTE = ['#8b5cf6', '#6366f1', '#22d3ee', '#e879f9', '#ffffff'];
  const particles = [];
  const rings = [];
  const MAX_PARTICLES = 150;
  const MAX_RINGS = 8;

  let emitAcc = 0; // distance accumulator for emission
  let rafId = null;

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
      color: pick(PALETTE),
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
        color: pick(PALETTE),
        sparkle: i % 5 === 0,
        rot: rand(0, Math.PI * 2)
      });
    }
    rings.push({ x: x, y: y, r: 2, alpha: 0.7, max: rand(45, 70) });
    if (rings.length > MAX_RINGS) rings.shift();
  }

  function onMove(e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    if (!cursor.active) {
      // 首次移动时直接吸附到鼠标位置，避免拖影从左上角（初始坐标）扫过来
      cursor.x = e.clientX;
      cursor.y = e.clientY;
      trail.length = 0;
    }
    cursor.tx = e.clientX;
    cursor.ty = e.clientY;
    cursor.active = true;
    if (!rafId) rafId = requestAnimationFrame(tick);
  }

  function onDown(e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    burst(e.clientX, e.clientY);
    if (!rafId) rafId = requestAnimationFrame(tick);
  }

  function onLeave() {
    cursor.active = false;
  }

  // ---- animation loop ----
  function tick() {
    rafId = null;
    const now = performance.now();

    // tail follows the pointer with easing; head stays under the cursor
    cursor.x += (cursor.tx - cursor.x) * 0.3;
    cursor.y += (cursor.ty - cursor.y) * 0.3;

    // emit particles while moving
    let dist = 0;
    if (trail.length) {
      const last = trail[trail.length - 1];
      dist = Math.hypot(cursor.x - last.x, cursor.y - last.y);
    }
    if (cursor.active && (trail.length === 0 || dist > 0.5)) {
      trail.push({ x: cursor.x, y: cursor.y, t: now });
      if (trail.length > MAX_TRAIL) trail.shift();
      if (trail.length > 1) {
        emitAcc += dist;
        while (emitAcc >= 5) {
          emitAcc -= 5;
          emit(cursor.x + rand(-3, 3), cursor.y + rand(-3, 3), rand(0.2, 1.0));
        }
        if (Math.random() < 0.05) emit(cursor.x, cursor.y, rand(1, 2));
      }
    }

    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';

    drawRibbon(now);
    drawParticles(now);
    drawRings(now);

    ctx.globalCompositeOperation = 'source-over';

    if (cursor.active || particles.length || rings.length) {
      rafId = requestAnimationFrame(tick);
    }
  }

  function drawRibbon(now) {
    while (trail.length && now - trail[0].t > 900) trail.shift();
    const n = trail.length;
    if (n < 2) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 1; i < n; i++) {
      const p0 = trail[i - 1];
      const p1 = trail[i];
      const k = i / n; // 0 oldest -> 1 newest
      const age = (now - p1.t) / 700;
      const fade = Math.max(0, 1 - age) * k;
      if (fade <= 0.02) continue;
      ctx.strokeStyle = 'hsla(' + (265 + k * 70).toFixed(0) + ', 85%, 65%, ' + (0.45 * fade).toFixed(3) + ')';
      ctx.lineWidth = 1 + 4 * k * fade;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
  }

  function drawParticles(now) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= 16; // ~1 frame
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.vy += 0.03; // gentle fall
      p.rot += 0.08;

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

  function drawRings(now) {
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.r += 1.4;
      r.alpha *= 0.94;
      if (r.alpha < 0.02) {
        rings.splice(i, 1);
        continue;
      }
      ctx.strokeStyle = 'rgba(180,150,255,' + r.alpha.toFixed(3) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerdown', onDown, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);
  resize();
})();
