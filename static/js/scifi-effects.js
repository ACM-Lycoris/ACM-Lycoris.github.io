/**
 * ACM-Lycoris Blog · Sci-Fi FX Engine
 * 粒子星网 / 流星 / 点击火花 / 卡片 3D 倾斜 + 全息光斑 / HUD 角标 /
 * 标题故障风 / 滚动渐显 / 阅读进度条 / 开机扫描线
 *
 * 设计约束：
 *  - 纯增强层：任何失败都不影响站点原有功能（每个模块独立 try/catch）
 *  - 尊重 prefers-reduced-motion；移动端自动降密度；后台标签页暂停渲染
 *  - 不触碰主题 / AOS 已接管的元素，避免双重动画
 */
(function () {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  /* ===================== 公共工具 ===================== */

  var reduceMotion = false;
  try {
    reduceMotion =
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) {}

  var finePointer = false;
  try {
    finePointer =
      window.matchMedia &&
      window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  } catch (e) {}

  function isDarkNow() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }

  var themeListeners = [];
  function onThemeChange(fn) {
    themeListeners.push(fn);
  }
  try {
    new MutationObserver(function () {
      var dark = isDarkNow();
      for (var i = 0; i < themeListeners.length; i++) {
        try { themeListeners[i](dark); } catch (e) {}
      }
    }).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
  } catch (e) {}

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  /* ===================== 1. 粒子星网背景 ===================== */

  function initParticles() {
    if (reduceMotion) return;

    var canvas = document.createElement('canvas');
    canvas.id = 'fx-bg';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var COLORS = [
      [255, 0, 60],   // 灵梦红
      [0, 229, 255],  // 霓虹青
      [255, 0, 170],  // 品红
    ];
    var COLOR_WEIGHTS = [0.5, 0.85, 1]; // 累积权重：红 50% / 青 35% / 品红 15%

    var w = 0, h = 0;
    var particles = [];
    var stars = [];
    var mouse = { x: -1e4, y: -1e4 };
    var dark = isDarkNow();
    var rafId = 0;
    var lastTime = 0;
    var nextStarAt = performance.now() + rand(6000, 14000);
    var LINK_DIST = 120;
    var MOUSE_DIST = 150;

    onThemeChange(function (d) { dark = d; });

    function pickColor() {
      var r = Math.random();
      for (var i = 0; i < COLOR_WEIGHTS.length; i++) {
        if (r < COLOR_WEIGHTS[i]) return COLORS[i];
      }
      return COLORS[0];
    }

    function makeParticle() {
      return {
        x: rand(0, w),
        y: rand(0, h),
        vx: rand(-0.18, 0.18),
        vy: rand(-0.14, 0.14),
        r: rand(0.8, 2.2),
        c: pickColor(),
        tw: rand(0, Math.PI * 2), // 闪烁相位
      };
    }

    function seed() {
      var mobile = w < 769;
      var target = Math.round((w * h) / (mobile ? 36000 : 23000));
      target = clamp(target, 20, mobile ? 36 : 88);
      particles.length = 0;
      for (var i = 0; i < target; i++) particles.push(makeParticle());
    }

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    }

    function spawnStar(now) {
      stars.push({
        x: rand(w * 0.15, w * 0.95),
        y: rand(-40, h * 0.25),
        vx: rand(-7.5, -4.5),
        vy: rand(3.5, 5.5),
        len: rand(80, 150),
      });
      nextStarAt = now + rand(6000, 14000);
    }

    function frame(now) {
      rafId = requestAnimationFrame(frame);

      var dt = lastTime ? clamp((now - lastTime) / 16.7, 0, 3) : 1;
      lastTime = now;

      ctx.clearRect(0, 0, w, h);

      var pAlpha = dark ? 0.55 : 0.2;
      var lAlpha = dark ? 0.2 : 0.07;
      var i, j, p, q;

      /* --- 粒子运动 --- */
      for (i = 0; i < particles.length; i++) {
        p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.tw += 0.02 * dt;

        // 鼠标轻微排斥
        var mdx = p.x - mouse.x;
        var mdy = p.y - mouse.y;
        var md2 = mdx * mdx + mdy * mdy;
        if (md2 < MOUSE_DIST * MOUSE_DIST && md2 > 0.01) {
          var md = Math.sqrt(md2);
          var f = ((1 - md / MOUSE_DIST) * 0.9 * dt) / md;
          p.x += mdx * f;
          p.y += mdy * f;
        }

        // 边缘环绕
        if (p.x < -10) p.x = w + 10;
        else if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        else if (p.y > h + 10) p.y = -10;
      }

      /* --- 粒子连线 --- */
      ctx.lineWidth = 1;
      for (i = 0; i < particles.length; i++) {
        p = particles[i];
        for (j = i + 1; j < particles.length; j++) {
          q = particles[j];
          var dx = p.x - q.x;
          var dy = p.y - q.y;
          if (dx > LINK_DIST || dx < -LINK_DIST || dy > LINK_DIST || dy < -LINK_DIST) continue;
          var d2 = dx * dx + dy * dy;
          if (d2 > LINK_DIST * LINK_DIST) continue;
          var a = (1 - Math.sqrt(d2) / LINK_DIST) * lAlpha;
          ctx.strokeStyle =
            'rgba(' + p.c[0] + ',' + p.c[1] + ',' + p.c[2] + ',' + a.toFixed(3) + ')';
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        }

        // 鼠标连线
        var mx = p.x - mouse.x;
        var my = p.y - mouse.y;
        var m2 = mx * mx + my * my;
        if (m2 < MOUSE_DIST * MOUSE_DIST) {
          var ma = (1 - Math.sqrt(m2) / MOUSE_DIST) * (dark ? 0.3 : 0.12);
          ctx.strokeStyle = 'rgba(0,229,255,' + ma.toFixed(3) + ')';
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
      }

      /* --- 粒子本体（带闪烁） --- */
      for (i = 0; i < particles.length; i++) {
        p = particles[i];
        var tw = 0.7 + 0.3 * Math.sin(p.tw);
        ctx.fillStyle =
          'rgba(' + p.c[0] + ',' + p.c[1] + ',' + p.c[2] + ',' + (pAlpha * tw).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      /* --- 流星（仅暗色模式） --- */
      if (dark) {
        if (now > nextStarAt && stars.length < 2) spawnStar(now);
        for (i = stars.length - 1; i >= 0; i--) {
          var s = stars[i];
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          if (s.x < -s.len || s.y > h + s.len) {
            stars.splice(i, 1);
            continue;
          }
          var sp = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
          var tx = s.x - (s.vx / sp) * s.len;
          var ty = s.y - (s.vy / sp) * s.len;
          var grad = ctx.createLinearGradient(s.x, s.y, tx, ty);
          grad.addColorStop(0, 'rgba(220,250,255,0.85)');
          grad.addColorStop(0.3, 'rgba(0,229,255,0.4)');
          grad.addColorStop(1, 'rgba(0,229,255,0)');
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(tx, ty);
          ctx.stroke();
          ctx.lineWidth = 1;
        }
      } else if (stars.length) {
        stars.length = 0;
      }
    }

    function start() {
      if (!rafId) {
        lastTime = 0;
        rafId = requestAnimationFrame(frame);
      }
    }

    function stop() {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    }

    var resizeTimer = 0;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    });

    window.addEventListener('pointermove', function (e) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    }, { passive: true });

    document.addEventListener('pointerleave', function () {
      mouse.x = -1e4;
      mouse.y = -1e4;
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop();
      else start();
    });

    resize();
    start();
  }

  /* ===================== 2. 点击霓虹火花 ===================== */

  function initSparks() {
    if (reduceMotion) return;

    var canvas = null;
    var ctx = null;
    var sparks = [];
    var running = false;
    var COLORS = ['255,0,60', '0,229,255', '255,0,170', '252,238,10'];

    function ensureCanvas() {
      if (canvas) return;
      canvas = document.createElement('canvas');
      canvas.id = 'fx-fg';
      canvas.setAttribute('aria-hidden', 'true');
      document.body.appendChild(canvas);
      ctx = canvas.getContext('2d');
      sizeCanvas();
      window.addEventListener('resize', sizeCanvas);
    }

    function sizeCanvas() {
      if (!canvas || !ctx) return;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function step() {
      if (!ctx) { running = false; return; }
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (var i = sparks.length - 1; i >= 0; i--) {
        var s = sparks[i];
        var px = s.x;
        var py = s.y;
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.06;
        s.vx *= 0.985;
        s.vy *= 0.985;
        s.life -= s.decay;
        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        ctx.strokeStyle = 'rgba(' + s.c + ',' + s.life.toFixed(3) + ')';
        ctx.lineWidth = s.size;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(s.x, s.y);
        ctx.stroke();
      }
      if (sparks.length) {
        requestAnimationFrame(step);
      } else {
        running = false;
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      }
    }

    window.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      ensureCanvas();
      if (!ctx) return;
      var n = 12;
      for (var i = 0; i < n; i++) {
        var angle = (Math.PI * 2 * i) / n + rand(-0.25, 0.25);
        var speed = rand(1.6, 4.6);
        sparks.push({
          x: e.clientX,
          y: e.clientY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          decay: rand(0.025, 0.05),
          size: rand(1, 2),
          c: COLORS[(Math.random() * COLORS.length) | 0],
        });
      }
      if (!running) {
        running = true;
        requestAnimationFrame(step);
      }
    }, { passive: true });
  }

  /* ===================== 3. 阅读进度条 ===================== */

  function initProgress() {
    var bar = document.createElement('div');
    bar.id = 'fx-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);

    var ticking = false;

    function update() {
      ticking = false;
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var p = max > 1 ? clamp((window.scrollY || doc.scrollTop || 0) / max, 0, 1) : 0;
      bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }, { passive: true });

    window.addEventListener('resize', function () {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    });

    update();
  }

  /* ===================== 4. 卡片：HUD 角标 + 全息光斑 + 3D 倾斜 ===================== */

  function attachTilt(el, glare) {
    var rect = null;
    var raf = 0;
    var px = 0.5;
    var py = 0.5;
    var MAX_DEG = 4.5;

    function update() {
      raf = 0;
      var rx = (py - 0.5) * -2 * MAX_DEG;
      var ry = (px - 0.5) * 2 * MAX_DEG;
      el.style.transform =
        'perspective(900px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' +
        ry.toFixed(2) + 'deg) translateY(-2px)';
      if (glare) {
        glare.style.setProperty('--fx-gx', (px * 100).toFixed(1) + '%');
        glare.style.setProperty('--fx-gy', (py * 100).toFixed(1) + '%');
      }
    }

    el.addEventListener('pointerenter', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      rect = el.getBoundingClientRect();
      el.classList.add('fx-tilting');
    });

    el.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      if (!rect) rect = el.getBoundingClientRect();
      px = clamp((e.clientX - rect.left) / rect.width, 0, 1);
      py = clamp((e.clientY - rect.top) / rect.height, 0, 1);
      if (!raf) raf = requestAnimationFrame(update);
    });

    el.addEventListener('pointerleave', function () {
      rect = null;
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      el.classList.remove('fx-tilting');
      el.style.transform = '';
    });
  }

  function initCards() {
    var cards = document.querySelectorAll('.post-wrap, .cat-card, .home-intro-card');
    if (!cards.length) return;

    Array.prototype.forEach.call(cards, function (card) {
      card.classList.add('fx-has-fx');

      // HUD 四角标记
      var corners = document.createElement('span');
      corners.className = 'fx-corners';
      corners.setAttribute('aria-hidden', 'true');
      for (var i = 0; i < 4; i++) corners.appendChild(document.createElement('i'));
      card.appendChild(corners);

      // 倾斜与光斑只在精确指针（鼠标）且未减少动态时启用
      if (!finePointer || reduceMotion) return;

      var glare = document.createElement('span');
      glare.className = 'fx-glare';
      glare.setAttribute('aria-hidden', 'true');
      card.appendChild(glare);

      attachTilt(card, glare);
    });
  }

  /* ===================== 5. 站点标题故障风 ===================== */

  function initGlitch() {
    if (reduceMotion) return;
    var h1 = document.querySelector('#logo h1');
    if (!h1 || h1.children.length) return;
    var text = (h1.textContent || '').trim();
    if (!text) return;

    h1.setAttribute('data-text', text);
    h1.classList.add('fx-glitch');

    var busy = false;
    function go() {
      if (busy || document.hidden) return;
      busy = true;
      h1.classList.add('fx-glitch-go');
      setTimeout(function () {
        h1.classList.remove('fx-glitch-go');
        busy = false;
      }, 460);
    }

    h1.addEventListener('pointerenter', go);
    setInterval(function () {
      if (Math.random() < 0.55) go();
    }, 5600);
  }

  /* ===================== 6. 滚动渐显 ===================== */

  function initReveal() {
    if (reduceMotion || !('IntersectionObserver' in window)) return;

    // 图片加载会大幅改变布局，必须等布局稳定后再测量"是否在首屏下方"，
    // 否则 IO 初次回调会把尚未滚到的元素误判为可见，滚动渐显失效
    if (document.readyState !== 'complete') {
      window.addEventListener('load', function () {
        setTimeout(initReveal, 60);
      }, { once: true });
      return;
    }

    var selectors = [
      '.article-entry > h2',
      '.article-entry > h3',
      '.article-entry > p',
      '.article-entry > pre',
      '.article-entry > blockquote',
      '.article-entry > table',
      '.article-entry > ul',
      '.article-entry > ol',
      '.article-entry > .highlight',
      '.article-entry > figure',
      '.cat-card',
      '.archive-post-item',
    ];

    var nodes;
    try {
      nodes = document.querySelectorAll(selectors.join(','));
    } catch (e) {
      return;
    }
    if (!nodes.length) return;

    var vh = window.innerHeight;
    var targets = [];
    Array.prototype.forEach.call(nodes, function (el) {
      if (el.hasAttribute('data-aos')) return; // AOS 已接管的元素不重复处理
      var r = el.getBoundingClientRect();
      if (r.top > vh * 0.95) {
        el.classList.add('fx-reveal');
        targets.push(el);
      }
    });
    if (!targets.length) return;

    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) {
          entries[i].target.classList.add('fx-in');
          io.unobserve(entries[i].target);
        }
      }
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0 });

    for (var i = 0; i < targets.length; i++) io.observe(targets[i]);
  }

  /* ===================== 7. 开机扫描线 (每个会话一次) ===================== */

  function initBootSweep() {
    if (reduceMotion) return;
    try {
      if (sessionStorage.getItem('fxBootDone')) return;
      sessionStorage.setItem('fxBootDone', '1');
    } catch (e) {}

    // 等主题预加载遮罩 (#loader, z-index 1000) 淡出后再扫描，避免压在加载屏上
    if (document.readyState !== 'complete') {
      window.addEventListener('load', function () {
        setTimeout(runBootSweep, 350);
      }, { once: true });
      return;
    }
    runBootSweep();
  }

  function runBootSweep() {
    var line = document.createElement('div');
    line.id = 'fx-boot';
    line.setAttribute('aria-hidden', 'true');
    document.body.appendChild(line);

    var removed = false;
    function remove() {
      if (removed) return;
      removed = true;
      if (line.parentNode) line.parentNode.removeChild(line);
    }
    line.addEventListener('animationend', remove);
    setTimeout(remove, 2200);
  }

  /* ===================== 启动 ===================== */

  function boot() {
    var modules = [
      initParticles,
      initSparks,
      initProgress,
      initCards,
      initGlitch,
      initReveal,
      initBootSweep,
    ];
    for (var i = 0; i < modules.length; i++) {
      try {
        modules[i]();
      } catch (e) {
        if (window.console && console.warn) {
          console.warn('[scifi-fx] module failed:', e);
        }
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
