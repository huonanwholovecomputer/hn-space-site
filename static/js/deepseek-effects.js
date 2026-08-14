/* =========================================================
   DeepSeek 官网效果移植（借鉴实现，vanilla JS，无依赖）
   ---------------------------------------------------------
   1. 液态渐变背景 —— WebGL2 流体模拟（flowmap ping-pong）
      原实现：/_next/static/chunks/8261-*.js
      原理：模拟 pass 把鼠标当作"刷子"写入速度/强度图（flowmap），
            每帧按 decay 衰减；渲染 pass 用该图扰动噪声域，
            得到会跟随鼠标流动的三色液态渐变。
   2. 网格鼠标交互 —— Canvas 2D 弹簧质点网格
      原实现：page chunk 模块 9667
      原理：每 90px 一个节点，鼠标 140px 范围内施加斥力，
            弹簧拉回原位置 + 摩擦衰减；节点间连线，靠近鼠标
            的点变大变亮。
   3. 文字反色光标 —— mix-blend-mode: difference 圆环
      原实现：layout chunk CursorEffect + .ds-cursor-ring
      原理：64px 白色圆环用 lerp 平滑跟随鼠标，悬停在
            [data-cursor="blend"] 元素上时展开，difference
            混合模式将覆盖区域的颜色反相。
   4. 波浪扰动层 —— WebGL2 FBM + 旋度噪声流体（叠加在液态之上）
      原实现：/_next/static/chunks/4097-*.js 模块 73334 (type:"fluid")
      原理：旋度噪声(curlish)搅动坐标 + 域扭曲 FBM(fluidNoise) 采样，
            全部随时间演化 → 持续翻滚的"波浪"；5 色混合 + 电影颗粒。
            官网用于 hero 右侧"加入我们"卡片，本站叠加为整层背景。

   用法：
     <canvas data-ds-effect="grid"  class="..."></canvas>
     <canvas data-ds-effect="fluid" class="..."></canvas>
     <canvas data-ds-effect="wave"  class="..."></canvas>
     <h1 data-cursor="blend">标题</h1>   （光标环自动初始化）
   主题协调：fluid/wave 画布配色主题无关（固定于本文件），
   浅/深色适配由 CSS 遮罩层完成（deepseek-effects.css 的 --ds-fx-overlay），
   切换主题即时生效、无延迟。网格颜色 --ds-grid-rgb、波浪参数 --ds-wave-* 仍可调。
   ========================================================= */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = window.matchMedia('(hover: none), (pointer: coarse)').matches;

  /* ---------- 小工具 ---------- */
  function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name);
    v = (v || '').trim();
    return v || fallback;
  }

  function hexToRgb01(hex) {
    hex = String(hex || '').replace('#', '');
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    var n = parseInt(hex, 16);
    if (isNaN(n)) return null;
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  function parseRgbTriple(str, fallback) {
    var parts = String(str || '').split(',').map(function (s) { return parseInt(s, 10); });
    if (parts.length === 3 && parts.every(function (n) { return !isNaN(n); })) return parts;
    return fallback;
  }

  /* =========================================================
     主题感知配色（v4）
     ---------------------------------------------------------
     液态/波浪画布采用「强调蓝 + 主题底色」：
       - 强调蓝：浅/深各一档固定（FLUID_ACCENT / WAVE_ACCENTS）
       - "平静色"：始终取当前主题底色 --theme（getThemeRgb 动态读取）
     → 平静区域颜色 = 页面背景色，与背景无缝融合（不依赖 CSS blend）；
       → 彩色区域 = 底色之上的可见蓝，深色近黑底上也能看清流动。
     主题切换：MutationObserver 监听 html[data-theme]，即时更新画布颜色，
     无节流延迟（旧版每 1.5s 轮询的延迟问题已根除）。
     ========================================================= */
  function isDarkTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }

  /* 当前主题底色（--theme，light 下为白、dark 下为近黑微蓝） */
  function getThemeRgb() {
    var v = cssVar('--theme', '');
    var m = (v || '').match(/[\d.]+/g);
    if (m && m.length >= 3) {
      return [
        Math.min(255, parseFloat(m[0])) / 255,
        Math.min(255, parseFloat(m[1])) / 255,
        Math.min(255, parseFloat(m[2])) / 255
      ];
    }
    return [0.04, 0.05, 0.07]; // 兜底：近黑
  }

  var FLUID_ACCENT = {
    light: hexToRgb01('#8aa3d6'),   // 浅色：官网原版蓝
    dark: hexToRgb01('#33598f')     // 深色：中暗蓝（比 v13 的 #4170b8 暗一档，低调不抢眼）
  };

  /* 波浪层 4 个强调色（第 3 位固定为主题底色，见 applyThemeToEffects） */
  var WAVE_ACCENTS = {
    light: [hexToRgb01('#7f9fd6'), hexToRgb01('#b9cdee'), hexToRgb01('#e2ecfa'), hexToRgb01('#97b3e3')],
    dark: [hexToRgb01('#3c68a5'), hexToRgb01('#244175'), hexToRgb01('#182f5a'), hexToRgb01('#2b4e8e')]
  };

  function applyThemeToEffects() {
    var dark = isDarkTheme();
    var theme = getThemeRgb();
    var fluids = document.querySelectorAll('canvas[data-ds-effect="fluid"]');
    for (var i = 0; i < fluids.length; i++) {
      var c = fluids[i].__dsColors;
      if (!c) continue;
      c[0] = dark ? FLUID_ACCENT.dark : FLUID_ACCENT.light;
      c[1] = theme;
      c[2] = theme;
    }
    var waves = document.querySelectorAll('canvas[data-ds-effect="wave"]');
    for (var j = 0; j < waves.length; j++) {
      var w = waves[j].__dsColors;
      if (!w) continue;
      var acc = dark ? WAVE_ACCENTS.dark : WAVE_ACCENTS.light;
      w[0] = acc[0];
      w[1] = acc[1];
      w[2] = theme;
      w[3] = acc[2];
      w[4] = acc[3];
    }
  }

  var themeObserver = null;
  function initThemeObserver() {
    if (themeObserver || !window.MutationObserver) return;
    themeObserver = new MutationObserver(function () { applyThemeToEffects(); });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  /* =========================================================
     1. 反色光标环
     ========================================================= */
  function initCursorBlend() {
    if (coarse || reduced) return;
    if (document.querySelector('.ds-cursor-ring')) return;

    var ring = document.createElement('div');
    ring.className = 'ds-cursor-ring';
    ring.setAttribute('aria-hidden', 'true');
    document.body.appendChild(ring);

    var x = 0, y = 0;      // 目标位置
    var lx = 0, ly = 0;    // 平滑后的当前位置
    var rafId = 0;

    function onMove(e) {
      x = e.clientX;
      y = e.clientY;
      ring.style.opacity = '1';
    }
    function onOver(e) {
      var t = e.target;
      if (!t || !t.closest) return;
      var blend = t.closest('[data-cursor="blend"]');
      var link = t.closest('a, button, [role="button"], input, textarea, select, label');
      ring.classList.toggle('is-blend', !!blend);
      ring.classList.toggle('is-hover', !!link && !blend);
    }
    function onLeave() { ring.style.opacity = '0'; }
    function tick() {
      // 原站 lerp：快速移动 0.7，慢速 0.4，接近位置时刻放慢
      var dx = x - lx, dy = y - ly;
      var s = Math.sqrt(dx * dx + dy * dy) > 50 ? 0.7 : 0.4;
      lx += dx * s;
      ly += dy * s;
      ring.style.transform = 'translate3d(' + lx + 'px, ' + ly + 'px, 0)';
      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    document.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseover', onOver, { passive: true });
    document.documentElement.addEventListener('mouseleave', onLeave);

    window.addEventListener('pagehide', function cleanup() {
      cancelAnimationFrame(rafId);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseover', onOver);
      document.documentElement.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('pagehide', cleanup);
    });
  }

  /* =========================================================
     2. 网格鼠标交互（弹簧质点网格）
     ========================================================= */
  function initDotGrid(canvas) {
    if (coarse || reduced) return;
    if (!canvas.getContext) return;

    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var hero = canvas.closest('.home-hero');
    if (hero) hero.classList.add('has-ds-grid');

    var rgb = parseRgbTriple(cssVar('--ds-grid-rgb', ''), [60, 100, 160]).join(', ');

    /* —— 原站参数 —— */
    var SPACING = 90;      // 节点间距 px
    var RADIUS = 140;      // 鼠标影响半径 px
    var FORCE = 30;        // 斥力强度
    var SPRING = 0.05;     // 拉回原位置的弹簧系数
    var FRICTION = 0.85;   // 速度衰减
    var LINE_ALPHA = 0.1;  // 连线透明度
    var DOT_ALPHA = 0.2;   // 圆点透明度
    var DPR = Math.min(window.devicePixelRatio || 1, 2);

    var points = [], cols = 0, rows = 0, w = 0, h = 0;
    var mouse = { x: NaN, y: NaN };
    var rafId = 0, running = false, visible = true;
    var resizeTimer = null;

    function rebuild() {
      cols = Math.ceil(w / SPACING) + 1;
      rows = Math.ceil(h / SPACING) + 1;
      // 网格整体居中（原站做法）
      var ox = (w - (cols - 1) * SPACING) / 2;
      var oy = (h - (rows - 1) * SPACING) / 2;
      points = [];
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var px = ox + SPACING * c;
          var py = oy + SPACING * r;
          points.push({ restX: px, restY: py, x: px, y: py, vx: 0, vy: 0 });
        }
      }
    }

    function resize() {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      if (!w || !h) return;
      canvas.width = Math.round(w * DPR);
      canvas.height = Math.round(h * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      rebuild();
    }

    function kick() { if (!running && visible) { running = true; rafId = requestAnimationFrame(frame); } }

    function onMove(e) {
      var rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      kick();
    }

    var last = 0, step = 1000 / 30;
    function frame(t) {
      if (!visible) { running = false; return; }
      if (t - last < step) { rafId = requestAnimationFrame(frame); return; }
      last = t - (t - last) % step;

      var cw = canvas.clientWidth, ch = canvas.clientHeight;
      if (cw !== w || ch !== h) {
        resize();
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(rebuild, 150);
      }

      ctx.clearRect(0, 0, w, h);
      var mx = mouse.x, my = mouse.y;
      var maxSpeed = 0;

      /* 物理更新：斥力 + 弹簧回拉 + 摩擦（原站公式） */
      for (var i = 0; i < points.length; i++) {
        var p = points[i];
        var rx = p.x - mx, ry = p.y - my;
        var dist = Math.sqrt(rx * rx + ry * ry);
        if (dist < RADIUS && dist > 0.1) {
          var f = (1 - dist / RADIUS) * FORCE;
          var nx = rx / dist, ny = ry / dist;
          p.vx += nx * f * 0.1;
          p.vy += ny * f * 0.1;
        }
        var dx = p.restX - p.x, dy = p.restY - p.y;
        p.vx += SPRING * dx;
        p.vy += SPRING * dy;
        p.vx *= FRICTION;
        p.vy *= FRICTION;
        p.x += p.vx;
        p.y += p.vy;
        var sp = Math.abs(p.vx) + Math.abs(p.vy);
        if (sp > maxSpeed) maxSpeed = sp;
      }

      /* 连线（横 + 竖）：距离 <20px 的相邻点跳过，两端各留 10px 不画 */
      ctx.strokeStyle = 'rgba(' + rgb + ', ' + LINE_ALPHA + ')';
      ctx.lineWidth = 0.5;

      var r, c, a, b, dx, dy, len, nx, ny;
      for (r = 0; r < rows; r++) {
        for (c = 0; c < cols - 1; c++) {
          a = points[r * cols + c]; b = points[r * cols + c + 1];
          dx = b.x - a.x; dy = b.y - a.y; len = Math.sqrt(dx * dx + dy * dy);
          if (len < 20) continue;
          nx = dx / len; ny = dy / len;
          ctx.beginPath();
          ctx.moveTo(a.x + 10 * nx, a.y + 10 * ny);
          ctx.lineTo(b.x - 10 * nx, b.y - 10 * ny);
          ctx.stroke();
        }
      }
      for (c = 0; c < cols; c++) {
        for (r = 0; r < rows - 1; r++) {
          a = points[r * cols + c]; b = points[(r + 1) * cols + c];
          dx = b.x - a.x; dy = b.y - a.y; len = Math.sqrt(dx * dx + dy * dy);
          if (len < 20) continue;
          nx = dx / len; ny = dy / len;
          ctx.beginPath();
          ctx.moveTo(a.x + 10 * nx, a.y + 10 * ny);
          ctx.lineTo(b.x - 10 * nx, b.y - 10 * ny);
          ctx.stroke();
        }
      }

      /* 圆点：离鼠标越近越大越亮。
         原版首帧鼠标为 NaN 时圆点不绘制（radius=NaN 被忽略），
         这里补上：鼠标未进入前按 k=0 画出静态圆点。 */
      ctx.fillStyle = 'rgba(' + rgb + ', ' + DOT_ALPHA + ')';
      for (i = 0; i < points.length; i++) {
        p = points[i];
        rx = p.x - mx; ry = p.y - my;
        dist = Math.sqrt(rx * rx + ry * ry);
        var k = isNaN(dist) ? 0 : Math.max(0, 1 - dist / RADIUS);
        var radius = 1.8 + 2 * k;
        ctx.globalAlpha = DOT_ALPHA + 0.4 * k;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      /* 静止（无速度）时停止渲染，省电（原站做法） */
      if (maxSpeed < 0.01) { running = false; return; }
      rafId = requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener('mousemove', onMove, { passive: true });
    var io = new IntersectionObserver(function (entries) {
      visible = entries[entries.length - 1].isIntersecting;
      if (visible) kick();
    }, { threshold: 0 });
    io.observe(canvas);
    /* 直接启动第一帧：IO 首个回调并非所有环境都保证触发，
       只靠它会在部分浏览器出现"网格不画"的冷启动问题。 */
    kick();

    window.addEventListener('pagehide', function cleanup() {
      cancelAnimationFrame(rafId);
      io.disconnect();
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('pagehide', cleanup);
    });
  }

  /* =========================================================
     3. 液态渐变（WebGL2 流体模拟）
     ========================================================= */
  var VERT_SRC = [
    '#version 300 es',
    'in vec4 a_position;',
    'out vec2 vUv;',
    'void main() {',
    '  vUv = a_position.xy * 0.5 + 0.5;',
    '  gl_Position = a_position;',
    '}'
  ].join('\n');

  /* 模拟 pass：鼠标 = 刷子，写入 flowmap；decay 让扰动自然消散 */
  var SIM_SRC = [
    '#version 300 es',
    'precision mediump float;',
    'in vec2 vUv;',
    'uniform sampler2D u_prev;',
    'uniform vec2 u_mouse;',
    'uniform vec2 u_velocity;',
    'uniform float u_brushRadius;',
    'uniform float u_brushStrength;',
    'uniform float u_decay;',
    'out vec4 fragColor;',
    'void main() {',
    '  vec4 prev = texture(u_prev, vUv);',
    '  prev.r *= u_decay;',
    '  prev.gb = mix(vec2(0.5), prev.gb, u_decay);',
    '  float dist = distance(vUv, u_mouse);',
    '  float influence = exp(-dist * dist / (u_brushRadius * u_brushRadius * 0.5));',
    '  influence = max(0.0, influence - 0.01);',
    '  float speed = length(u_velocity);',
    '  float presenceStrength = u_brushStrength * 0.3;',
    '  float velBonus = min(speed * 3.0, 0.7) * u_brushStrength;',
    '  float totalStrength = presenceStrength + velBonus;',
    '  prev.r = max(prev.r, influence * totalStrength);',
    '  float blendAmt = influence * min(totalStrength, 0.4) * 0.3;',
    '  prev.g = mix(prev.g, clamp(u_velocity.x * 2.0 + 0.5, 0.0, 1.0), blendAmt);',
    '  prev.b = mix(prev.b, clamp(u_velocity.y * 2.0 + 0.5, 0.0, 1.0), blendAmt);',
    '  fragColor = prev;',
    '}'
  ].join('\n');

  /* 渲染 pass：噪声域被 flowmap 扰动 + 旋转 + 漩涡 + 三色混合 */
  var RENDER_SRC = [
    '#version 300 es',
    'precision mediump float;',
    'in vec2 vUv;',
    'uniform float u_time;',
    'uniform float u_pixelRatio;',
    'uniform vec2 u_resolution;',
    'uniform float u_scale;',
    'uniform float u_rotation;',
    'uniform vec4 u_color1, u_color2, u_color3;',
    'uniform float u_colorCount;',
    'uniform float u_proportion;',
    'uniform float u_softness;',
    'uniform float u_shape;',
    'uniform float u_shapeScale;',
    'uniform float u_distortion;',
    'uniform float u_swirl;',
    'uniform float u_swirlIterations;',
    'uniform vec2 u_offset;',
    'uniform sampler2D u_flowmap;',
    'uniform float u_distortBoost;',
    'uniform float u_noiseBoost;',
    'uniform float u_swirlBoost;',
    'out vec4 fragColor;',
    '#define TWO_PI 6.28318530718',
    '#define PI 3.14159265358979323846',
    'vec2 rotate(vec2 uv, float th) { return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv; }',
    'float random(vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123); }',
    'float noise(vec2 st) {',
    '  vec2 i = floor(st); vec2 f = fract(st);',
    '  float a = random(i), b = random(i + vec2(1,0)), c = random(i + vec2(0,1)), d = random(i + vec2(1,1));',
    '  vec2 u = f*f*(3.0-2.0*f);',
    '  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);',
    '}',
    'vec3 blend_multi(float mixer, float softness) {',
    '  float edge = 1.0 - softness;',
    '  vec3 col = u_color1.rgb;',
    '  if (u_colorCount > 1.5) { col = mix(col, u_color2.rgb, smoothstep(0.0 + 0.35*edge, 0.7 - 0.35*edge, mixer)); }',
    '  if (u_colorCount > 2.5) { col = mix(col, u_color3.rgb, smoothstep(0.3 + 0.35*edge, 1.0 - 0.35*edge, mixer)); }',
    '  return col;',
    '}',
    'void main() {',
    '  vec2 uv = gl_FragCoord.xy / u_resolution.xy;',
    '  float t = .5 * u_time;',
    '  float ns = .0005 + .006 * u_scale;',
    '  uv -= .5; uv *= (ns * u_resolution); uv = rotate(uv, u_rotation * .5 * PI);',
    '  uv /= u_pixelRatio; uv += .5; uv += u_offset;',
    '  vec2 fragUV = gl_FragCoord.xy / u_resolution.xy;',
    '  vec4 flow = texture(u_flowmap, fragUV);',
    '  float influence = flow.r;',
    '  vec2 flowDir = (flow.gb - 0.5) * 2.0;',
    '  float n1 = noise(uv + t), n2 = noise(uv*2. - t);',
    '  float angle = n1 * TWO_PI;',
    '  float totalDistortion = u_distortion + influence * u_distortBoost;',
    '  uv.x += 4. * totalDistortion * n2 * cos(angle);',
    '  uv.y += 4. * totalDistortion * n2 * sin(angle);',
    '  uv += flowDir * influence * 0.15;',
    '  /* 全局沸腾扰动：本站 mouseStrength=0（flowmap 无输入），原版该分支永不生效；',
    '     改为无条件应用，让整片液体持续翻滚，流动感明显增强 */',
    '  float localNoise = noise(uv * 2.0 + t * 1.5);',
    '  uv += u_noiseBoost * vec2(cos(localNoise * TWO_PI), sin(localNoise * TWO_PI));',
    '  float iters = ceil(clamp(u_swirlIterations, 1., 30.));',
    '  float swirlAmt = clamp(u_swirl, 0., 2.) + influence * u_swirlBoost;',
    '  for (float i = 1.; i <= 30.0; i++) {',
    '    if (i > iters) break;',
    '    uv.x += swirlAmt / i * cos(t + i*1.5*uv.y);',
    '    uv.y += swirlAmt / i * cos(t + i*1.*uv.x);',
    '  }',
    '  float proportion = clamp(u_proportion, 0., 1.);',
    '  vec2 cuv = uv * (.5 + 3.5 * u_shapeScale);',
    '  /* 图案相位随时间缓慢漂移 → 液体仅轻微"流动" */',
    '  float shape = .5 + .5 * sin(cuv.x + t * 0.25) * cos(cuv.y + t * 0.18);',
    '  float mixer = shape + .48 * sign(proportion - .5) * pow(abs(proportion - .5), .5);',
    '  vec3 col = blend_multi(mixer, clamp(u_softness, 0., 1.));',
    '  fragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  function initFluid(canvas) {
    var gl = null;
    try {
      gl = canvas.getContext('webgl2', {
        alpha: true,
        premultipliedAlpha: false,
        powerPreference: 'low-power'
      });
    } catch (e) { gl = null; }
    if (!gl) { canvas.style.display = 'none'; return; } // 无 WebGL2：静默降级

    /* —— 引擎参数（流动性调校：慢速沉稳档 v11，贴合静态界面）——
       目标：极慢速 + 中等偏弱搅动——速度不动，搅动比 v12 明显一些。 */
    var params = {
      mouseRadius: 0.22,     // 刷子半径（相对画布）
      mouseStrength: 0,      // 刷子强度：本站设为 0，液态渐变只做环境流动
      decay: 0.96,           // 扰动衰减
      distortBoost: 1.35,    // 鼠标处畸变增强（无鼠标时不生效）
      noiseBoost: 0.1,       // 全局沸腾扰动（v12 0.05 → 0.1：搅动更明显）
      swirlBoost: 0.45,      // 鼠标处漩涡增强（无鼠标时不生效）
      speed: 12,             // 流动速度：不变（极慢）
      distortion: 22,        // 畸变强度：v12 15 → 22（搅动增强，略高于原版 20）
      swirl: 8,              // 漩涡强度：v12 6 → 8
      swirlIterations: 7,    // 漩涡层级：v12 6 → 7
      scale: 0.5,            // 噪声尺度（原值）
      rotation: -5,
      proportion: 50,
      softness: 95,          // 混合柔和度略降 → 色带更"实"
      shapeScale: 8,         // 色块更大更饱满，减少"稀"感
      offsetX: 0,
      offsetY: 65
    };

    function compile(type, src) {
      var sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error('DS fluid shader:', gl.getShaderInfoLog(sh));
        return null;
      }
      return sh;
    }
    function program(fragSrc) {
      var vs = compile(gl.VERTEX_SHADER, VERT_SRC);
      var fs = compile(gl.FRAGMENT_SHADER, fragSrc);
      if (!vs || !fs) return null;
      var p = gl.createProgram();
      gl.attachShader(p, vs);
      gl.attachShader(p, fs);
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        console.error('DS fluid link:', gl.getProgramInfoLog(p));
        return null;
      }
      return p;
    }

    var simProg = program(SIM_SRC);
    var renderProg = program(RENDER_SRC);
    if (!simProg || !renderProg) { canvas.style.display = 'none'; return; }

    var simLoc = {
      prev: gl.getUniformLocation(simProg, 'u_prev'),
      mouse: gl.getUniformLocation(simProg, 'u_mouse'),
      velocity: gl.getUniformLocation(simProg, 'u_velocity'),
      brushRadius: gl.getUniformLocation(simProg, 'u_brushRadius'),
      brushStrength: gl.getUniformLocation(simProg, 'u_brushStrength'),
      decay: gl.getUniformLocation(simProg, 'u_decay')
    };
    var rLoc = {
      time: gl.getUniformLocation(renderProg, 'u_time'),
      pixelRatio: gl.getUniformLocation(renderProg, 'u_pixelRatio'),
      resolution: gl.getUniformLocation(renderProg, 'u_resolution'),
      scale: gl.getUniformLocation(renderProg, 'u_scale'),
      rotation: gl.getUniformLocation(renderProg, 'u_rotation'),
      offset: gl.getUniformLocation(renderProg, 'u_offset'),
      color1: gl.getUniformLocation(renderProg, 'u_color1'),
      color2: gl.getUniformLocation(renderProg, 'u_color2'),
      color3: gl.getUniformLocation(renderProg, 'u_color3'),
      colorCount: gl.getUniformLocation(renderProg, 'u_colorCount'),
      proportion: gl.getUniformLocation(renderProg, 'u_proportion'),
      softness: gl.getUniformLocation(renderProg, 'u_softness'),
      shape: gl.getUniformLocation(renderProg, 'u_shape'),
      shapeScale: gl.getUniformLocation(renderProg, 'u_shapeScale'),
      distortion: gl.getUniformLocation(renderProg, 'u_distortion'),
      swirl: gl.getUniformLocation(renderProg, 'u_swirl'),
      swirlIterations: gl.getUniformLocation(renderProg, 'u_swirlIterations'),
      flowmap: gl.getUniformLocation(renderProg, 'u_flowmap'),
      distortBoost: gl.getUniformLocation(renderProg, 'u_distortBoost'),
      noiseBoost: gl.getUniformLocation(renderProg, 'u_noiseBoost'),
      swirlBoost: gl.getUniformLocation(renderProg, 'u_swirlBoost')
    };

    /* 全屏三角形（两个三角形合成一个 quad） */
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    function bindQuad(prog) {
      var loc = gl.getAttribLocation(prog, 'a_position');
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    }

    function createTex(w, h) {
      var tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return tex;
    }
    function createFbo(tex) {
      var fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return fbo;
    }

    var fboA = { tex: null, fbo: null };
    var fboB = { tex: null, fbo: null };
    var fw = 0, fh = 0;          // 离屏缓冲像素尺寸
    var cssW = 0, cssH = 0;      // 画布 CSS 尺寸（用于判断是否重建）
    var DPR = Math.min(window.devicePixelRatio || 1, 1.25);

    function disposeFbo(f) {
      if (f.fbo) gl.deleteFramebuffer(f.fbo);
      if (f.tex) gl.deleteTexture(f.tex);
      f.fbo = f.tex = null;
    }

    function resize() {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      cssW = w; cssH = h;
      var pw = Math.round(w * DPR), ph = Math.round(h * DPR);
      canvas.width = pw;
      canvas.height = ph;
      fw = pw; fh = ph;
      disposeFbo(fboA);
      disposeFbo(fboB);
      fboA.tex = createTex(fw, fh);
      fboA.fbo = createFbo(fboA.tex);
      fboB.tex = createTex(fw, fh);
      fboB.fbo = createFbo(fboB.tex);
    }

    /* 鼠标状态（原站平滑参数）。
       初始放在画布外并吸附首帧位置：避免页面加载瞬间在画面中心
       留下一个"刷子"痕迹（原版初始在 0.5,0.5 会有这个小瑕疵）。 */
    var mouse = { x: -0.5, y: -0.5, sx: -0.5, sy: -0.5, vx: 0, vy: 0, svx: 0, svy: 0 };
    var hasMoved = false;
    function onMove(e) {
      var rect = canvas.getBoundingClientRect();
      if (rect.width && rect.height) {
        mouse.x = (e.clientX - rect.left) / rect.width;
        mouse.y = 1 - (e.clientY - rect.top) / rect.height;
        if (!hasMoved) {
          mouse.sx = mouse.x;
          mouse.sy = mouse.y;
          hasMoved = true;
        }
      }
    }

    /* 配色：c1 = 主题强调蓝，c2/c3 = 主题底色（applyThemeToEffects 初始化并随主题更新）。
       "平静区域 = 主题底色" → 与页面背景无缝融合；彩色区域 = 底色之上的可见蓝。 */
    var colors = [FLUID_ACCENT.light, [1, 1, 1], [1, 1, 1]];
    canvas.__dsColors = colors;

    var rafId = 0, visible = true, running = false;
    var drawnOnce = false;
    var start = performance.now();
    var ping = true;
    var last = 0, step = 1000 / 30;

    function frame(t) {
      rafId = 0;
      if (!visible || (reduced && drawnOnce)) { running = false; return; }
      if (t - last < step) { rafId = requestAnimationFrame(frame); return; }
      last = t - (t - last) % step;

      if (canvas.clientWidth !== cssW || canvas.clientHeight !== cssH) resize();

      /* 平滑鼠标 + 速度（原站系数）。
         mouseStrength = 0 时跳过：渐变纯环境流动，鼠标不再搅动。 */
      if (params.mouseStrength > 0) {
        mouse.sx += (mouse.x - mouse.sx) * 0.12;
        mouse.sy += (mouse.y - mouse.sy) * 0.12;
        mouse.svx += ((mouse.x - mouse.sx) * 0.5 - mouse.svx) * 0.15;
        mouse.svy += ((mouse.y - mouse.sy) * 0.5 - mouse.svy) * 0.15;
      }

      /* —— 模拟 pass（ping-pong）—— */
      var src = ping ? fboA : fboB;
      var dst = ping ? fboB : fboA;
      ping = !ping;

      gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fbo);
      gl.viewport(0, 0, fw, fh);
      gl.useProgram(simProg);
      bindQuad(simProg);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, src.tex);
      gl.uniform1i(simLoc.prev, 0);
      gl.uniform2f(simLoc.mouse, mouse.sx, mouse.sy);
      gl.uniform2f(simLoc.velocity, mouse.svx, mouse.svy);
      gl.uniform1f(simLoc.brushRadius, params.mouseRadius);
      gl.uniform1f(simLoc.brushStrength, params.mouseStrength);
      gl.uniform1f(simLoc.decay, params.decay);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      /* —— 渲染 pass —— */
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(renderProg);
      bindQuad(renderProg);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, dst.tex);
      gl.uniform1i(rLoc.flowmap, 0);

      var time = (performance.now() - start) * 0.001 * (params.speed / 100);
      gl.uniform1f(rLoc.time, time);
      gl.uniform1f(rLoc.pixelRatio, window.devicePixelRatio || 1);
      gl.uniform2f(rLoc.resolution, canvas.width, canvas.height);
      gl.uniform1f(rLoc.scale, params.scale);
      gl.uniform1f(rLoc.rotation, params.rotation / 90);
      gl.uniform2f(rLoc.offset, params.offsetX / 100, params.offsetY / 100);
      gl.uniform4f(rLoc.color1, colors[0][0], colors[0][1], colors[0][2], 1);
      gl.uniform4f(rLoc.color2, colors[1][0], colors[1][1], colors[1][2], 1);
      gl.uniform4f(rLoc.color3, colors[2][0], colors[2][1], colors[2][2], 1);
      gl.uniform1f(rLoc.colorCount, 3);
      gl.uniform1f(rLoc.proportion, params.proportion / 100);
      gl.uniform1f(rLoc.softness, params.softness / 100);
      gl.uniform1f(rLoc.shape, 0);
      gl.uniform1f(rLoc.shapeScale, params.shapeScale / 100);
      gl.uniform1f(rLoc.distortion, params.distortion / 100);
      gl.uniform1f(rLoc.swirl, params.swirl / 50);
      gl.uniform1f(rLoc.swirlIterations, params.swirlIterations);
      gl.uniform1f(rLoc.distortBoost, params.distortBoost);
      gl.uniform1f(rLoc.noiseBoost, params.noiseBoost);
      gl.uniform1f(rLoc.swirlBoost, params.swirlBoost);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      drawnOnce = true;
      if (!reduced) rafId = requestAnimationFrame(frame);
    }

    function kick() {
      if (!running && visible && !(reduced && drawnOnce)) {
        running = true;
        rafId = requestAnimationFrame(frame);
      }
    }

    resize();
    if (!reduced) {
      /* 仅启用鼠标交互时才监听（本站 mouseStrength=0，不监听） */
      if (params.mouseStrength > 0) {
        window.addEventListener('mousemove', onMove, { passive: true });
      }
      var io = new IntersectionObserver(function (entries) {
        visible = entries[entries.length - 1].isIntersecting;
        if (visible) kick();
      }, { threshold: 0 });
      io.observe(canvas);
      kick();
      window.addEventListener('pagehide', function cleanup() {
        cancelAnimationFrame(rafId);
        io.disconnect();
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('pagehide', cleanup);
      });
    } else {
      /* 减少动态：只渲染一帧静态画面 */
      visible = true;
      kick();
    }
  }

  /* =========================================================
     4. 波浪扰动层（FBM + 旋度噪声流体）
        原版：chunk 4097 模块 73334，type:"fluid"
        —— 官网"加入我们"卡片的波浪效果，本站用作整层背景叠加。
        与液态层（flowmap）不同：无鼠标交互、无 ping-pong，
        单 pass 直接渲染随时间演化的流体噪声。
        ========================================================= */
  var WAVE_VERT_SRC = [
    '#version 300 es',
    'in vec4 a_position;',
    'void main() {',
    '  gl_Position = a_position;',
    '}'
  ].join('\n');

  /* 摘取自官网原始 fragment shader（保留完整结构，仅把 uniform 固定为 5 色）：
     - snoise：3D 单纯形噪声（Ashima webgl-noise 版）
     - fbm：分形布朗运动
     - fluidNoise：域扭曲 FBM（双重扭曲 w1、w2 后再采样）→ "液态"流动感
     - curlish：旋度噪声（对噪声场求旋度，散度为零 → 旋转涡流，无压缩伪影）
     - 时间驱动：所有噪声样本随 u_time 演化，形成持续翻滚的波浪 */
  var WAVE_FRAG_SRC = [
    '#version 300 es',
    'precision mediump float;',
    'uniform float u_time;',
    'uniform vec2 u_resolution;',
    'uniform vec3 u_c1, u_c2, u_c3, u_c4, u_c5;',
    'uniform float u_scale;',
    'uniform float u_grain;',
    'out vec4 fragColor;',
    'vec3 mod289v3(vec3 x){return x-floor(x*(1./289.))*289.;}',
    'vec4 mod289v4(vec4 x){return x-floor(x*(1./289.))*289.;}',
    'vec4 permute(vec4 x){return mod289v4(((x*34.)+1.)*x);}',
    'vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}',
    'float snoise(vec3 v){',
    '  const vec2 C=vec2(1./6.,1./3.);',
    '  const vec4 D=vec4(0.,.5,1.,2.);',
    '  vec3 i=floor(v+dot(v,C.yyy));',
    '  vec3 x0=v-i+dot(i,C.xxx);',
    '  vec3 g=step(x0.yzx,x0.xyz);',
    '  vec3 l=1.-g;',
    '  vec3 i1=min(g.xyz,l.zxy);',
    '  vec3 i2=max(g.xyz,l.zxy);',
    '  vec3 x1=x0-i1+C.xxx;',
    '  vec3 x2=x0-i2+C.yyy;',
    '  vec3 x3=x0-D.yyy;',
    '  i=mod289v3(i);',
    '  vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));',
    '  float n_=.142857142857;',
    '  vec3 ns=n_*D.wyz-D.xzx;',
    '  vec4 j=p-49.*floor(p*ns.z*ns.z);',
    '  vec4 x_=floor(j*ns.z);',
    '  vec4 y_=floor(j-7.*x_);',
    '  vec4 x=x_*ns.x+ns.yyyy;',
    '  vec4 y=y_*ns.x+ns.yyyy;',
    '  vec4 h=1.-abs(x)-abs(y);',
    '  vec4 b0=vec4(x.xy,y.xy);',
    '  vec4 b1=vec4(x.zw,y.zw);',
    '  vec4 s0=floor(b0)*2.+1.;',
    '  vec4 s1=floor(b1)*2.+1.;',
    '  vec4 sh=-step(h,vec4(0.));',
    '  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;',
    '  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;',
    '  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);',
    '  vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);',
    '  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));',
    '  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;',
    '  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);',
    '  m=m*m;',
    '  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));',
    '}',
    'float hash(vec2 p){',
    '  vec3 p3=fract(vec3(p.xyx)*.1031);',
    '  p3+=dot(p3,p3.yzx+33.33);',
    '  return fract((p3.x+p3.y)*p3.z);',
    '}',
    'float fbm(vec3 p){',
    '  float v=0.,amp=.6;vec3 shift=vec3(100.);',
    '  for(int i=0;i<1;i++){v+=amp*snoise(p);p=p*2.+shift;amp*=.4;}',
    '  return v;',
    '}',
    'float fluidNoise(vec2 uv,float t){',
    '  float n1=fbm(vec3(uv*.6,t*.06));',
    '  float n2=fbm(vec3(uv*.6+5.2,t*.06+1.3));',
    '  vec2 w1=vec2(n1,n2)*.6;',
    '  float n3=fbm(vec3((uv+w1)*.7+1.7,t*.05+3.1));',
    '  float n4=fbm(vec3((uv+w1)*.7+9.2,t*.05+5.7));',
    '  vec2 w2=vec2(n3,n4)*.5;',
    '  return fbm(vec3((uv+w1+w2)*.5,t*.04));',
    '}',
    'vec2 curlish(vec2 uv,float t){',
    '  float eps=.02;',
    '  float n=snoise(vec3(uv*.8,t));',
    '  float nx=snoise(vec3((uv+vec2(eps,0.))*.8,t));',
    '  float ny=snoise(vec3((uv+vec2(0.,eps))*.8,t));',
    '  return vec2(-(ny-n)/eps,(nx-n)/eps)*.003;',
    '}',
    'void main(){',
    '  float aspect=u_resolution.x/u_resolution.y;',
    '  vec2 uv=gl_FragCoord.xy/u_resolution;',
    '  vec2 suv=vec2(uv.x*aspect, uv.y) * u_scale;',
    '  float t=u_time;',
    '  vec2 curl=curlish(suv,t*.04);',
    '  vec2 uvD=suv+curl*9.;',
    '  float f=fluidNoise(uvD,t);',
    '  float swirl=snoise(vec3(uvD*.8+f*1.5,t*.035))*.5+.5;',
    '  float n=f*.5+.5;',
    '  vec3 col=mix(u_c1,u_c2,smoothstep(.2,.5,n));',
    '  col=mix(col,u_c3,smoothstep(.35,.65,n+swirl*.25));',
    '  col=mix(col,u_c4,smoothstep(.6,.85,swirl)*.55);',
    '  col=mix(col,u_c5,smoothstep(.5,.8,n*swirl)*.35);',
    '  if(u_grain>0.0){',
    '    vec2 flowOffset = (uvD - suv) * u_resolution.y;',
    '    vec2 gp = floor((gl_FragCoord.xy + flowOffset) / 5.0);',
    '    float gr=hash(gp)*2.-1.;',
    '    col+=gr*u_grain;',
    '  }',
    '  float vig=1.-smoothstep(.4,.78,length(uv-.5));',
    '  col=mix(col*.75,col,vig*.35+.65);',
    '  fragColor=vec4(col,1.);',
    '}'
  ].join('\n');

  function initWave(canvas) {
    var gl = null;
    try {
      gl = canvas.getContext('webgl2', {
        alpha: true,
        premultipliedAlpha: false,
        powerPreference: 'low-power'
      });
    } catch (e) { gl = null; }
    if (!gl) { canvas.style.display = 'none'; return; } // 无 WebGL2：静默降级

    /* 可调参数（CSS 变量，参考官网 join 卡片：speed 80 / scale 2.5 / grain 0.003） */
    var params = {
      scale: parseFloat(cssVar('--ds-wave-scale', '2.2')),
      speed: parseFloat(cssVar('--ds-wave-speed', '35')),
      grain: parseFloat(cssVar('--ds-wave-grain', '0.002'))
    };
    if (!isFinite(params.scale)) params.scale = 2.2;
    if (!isFinite(params.speed)) params.speed = 60;
    if (!isFinite(params.grain)) params.grain = 0.002;

    function compile(type, src) {
      var sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error('DS wave shader:', gl.getShaderInfoLog(sh));
        return null;
      }
      return sh;
    }

    var vs = compile(gl.VERTEX_SHADER, WAVE_VERT_SRC);
    var fs = compile(gl.FRAGMENT_SHADER, WAVE_FRAG_SRC);
    if (!vs || !fs) { canvas.style.display = 'none'; return; }
    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('DS wave link:', gl.getProgramInfoLog(prog));
      canvas.style.display = 'none';
      return;
    }

    var loc = {
      time: gl.getUniformLocation(prog, 'u_time'),
      resolution: gl.getUniformLocation(prog, 'u_resolution'),
      scale: gl.getUniformLocation(prog, 'u_scale'),
      grain: gl.getUniformLocation(prog, 'u_grain'),
      c1: gl.getUniformLocation(prog, 'u_c1'),
      c2: gl.getUniformLocation(prog, 'u_c2'),
      c3: gl.getUniformLocation(prog, 'u_c3'),
      c4: gl.getUniformLocation(prog, 'u_c4'),
      c5: gl.getUniformLocation(prog, 'u_c5')
    };

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    function bindQuad() {
      var a = gl.getAttribLocation(prog, 'a_position');
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(a);
      gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    }

    var DPR = Math.min(window.devicePixelRatio || 1, 1.25);
    var pw = 0, ph = 0, cssW = 0, cssH = 0;
    function resize() {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      cssW = w; cssH = h;
      pw = Math.round(w * DPR);
      ph = Math.round(h * DPR);
      canvas.width = pw;
      canvas.height = ph;
      gl.viewport(0, 0, pw, ph);
    }

    /* 配色：1/2/4/5 = 主题强调蓝，第 3 位 = 主题底色（applyThemeToEffects 随主题更新） */
    var colors = [
      WAVE_ACCENTS.light[0],
      WAVE_ACCENTS.light[1],
      [1, 1, 1],
      WAVE_ACCENTS.light[2],
      WAVE_ACCENTS.light[3]
    ];
    canvas.__dsColors = colors;

    var rafId = 0, visible = true, running = false, drawnOnce = false;
    var start = performance.now();
    var last = 0, step = 1000 / 30;

    function frame(t) {
      rafId = 0;
      if (!visible || (reduced && drawnOnce)) { running = false; return; }
      if (t - last < step) { rafId = requestAnimationFrame(frame); return; }
      last = t - (t - last) % step;

      if (canvas.clientWidth !== cssW || canvas.clientHeight !== cssH) resize();

      gl.useProgram(prog);
      bindQuad();
      var time = (performance.now() - start) * 0.001 * (params.speed / 100);
      gl.uniform1f(loc.time, time);
      gl.uniform2f(loc.resolution, pw, ph);
      gl.uniform1f(loc.scale, params.scale);
      gl.uniform1f(loc.grain, params.grain);
      for (var i = 0; i < 5; i++) {
        gl.uniform3f(loc['c' + (i + 1)], colors[i][0], colors[i][1], colors[i][2]);
      }
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      drawnOnce = true;
      if (!reduced) rafId = requestAnimationFrame(frame);
    }

    function kick() {
      if (!running && visible && !(reduced && drawnOnce)) {
        running = true;
        rafId = requestAnimationFrame(frame);
      }
    }

    resize();
    if (!reduced) {
      var io = new IntersectionObserver(function (entries) {
        visible = entries[entries.length - 1].isIntersecting;
        if (visible) kick();
      }, { threshold: 0 });
      io.observe(canvas);
      kick();
      window.addEventListener('pagehide', function cleanup() {
        cancelAnimationFrame(rafId);
        io.disconnect();
        window.removeEventListener('pagehide', cleanup);
      });
    } else {
      /* 减少动态：只渲染一帧静态画面 */
      visible = true;
      kick();
    }
  }

  /* =========================================================
     自动初始化
     ========================================================= */
  function initAll() {
    initCursorBlend();
    var grids = document.querySelectorAll('canvas[data-ds-effect="grid"]');
    for (var i = 0; i < grids.length; i++) {
      if (!grids[i].__dsInit) initDotGrid(grids[i]);
      grids[i].__dsInit = true;
    }
    var fluids = document.querySelectorAll('canvas[data-ds-effect="fluid"]');
    for (var i = 0; i < fluids.length; i++) {
      if (!fluids[i].__dsInit) initFluid(fluids[i]);
      fluids[i].__dsInit = true;
    }
    var waves = document.querySelectorAll('canvas[data-ds-effect="wave"]');
    for (var i = 0; i < waves.length; i++) {
      if (!waves[i].__dsInit) initWave(waves[i]);
      waves[i].__dsInit = true;
    }
    /* 主题配色初始化 + 切换监听（即时更新，无节流延迟） */
    applyThemeToEffects();
    initThemeObserver();
  }

  /* 供 PJAX 复用：新页面内容替换后重新扫描 canvas（防重复初始化） */
  window.__dsInitAll = initAll;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();
