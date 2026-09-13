/* ══════════════════════════════════════════════════════════════
   PORTAL — main.js
   纯原生 JS，无依赖。负责：滚动淡入、导航状态、卡片光斑、
   光标氛围光、状态面板实时数据、空状态自动切换。
   ══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── 工具 ─────────────────────────────────────────────────── */
  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

  /* ── 1. 滚动淡入 (Intersection Observer) ──────────────────── */
  function initReveal() {
    var items = $$('.rv');
    if (!items.length) return;

    // 容器内的卡片按顺序错峰
    $$('[data-stagger]').forEach(function (group) {
      $$('.rv', group).forEach(function (el, i) {
        if (!el.style.getPropertyValue('--d')) {
          el.style.setProperty('--d', (i * 90) + 'ms');
        }
      });
    });

    if (reduceMotion || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      });
    }, {
      root: null,
      rootMargin: '0px 0px -9% 0px',
      threshold: 0.12
    });

    items.forEach(function (el) { io.observe(el); });

    // 首屏元素立即显示，避免等待
    requestAnimationFrame(function () {
      items.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.92) el.classList.add('is-in');
      });
    });
  }

  /* ── 2. 导航吸附状态 + 滚动进度 ───────────────────────────── */
  function initNav() {
    var nav = $('.nav');
    var bar = $('.scrollbar i');
    if (!nav && !bar) return;

    var ticking = false;

    function update() {
      var y = window.scrollY || root.scrollTop || 0;
      if (nav) nav.classList.toggle('is-stuck', y > 24);
      if (bar) {
        var max = doc.body.scrollHeight - window.innerHeight;
        var p = max > 0 ? clamp(y / max, 0, 1) : 0;
        bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      }
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });

    window.addEventListener('resize', update, { passive: true });
    update();
  }

  /* ── 3. 卡片鼠标光斑 ──────────────────────────────────────── */
  function initCardSpotlight() {
    var cards = $$('.card');
    if (!cards.length || reduceMotion) return;

    cards.forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(2) + '%');
        card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(2) + '%');
      }, { passive: true });
    });
  }

  /* ── 4. 全局光标氛围光 ────────────────────────────────────── */
  function initCursorGlow() {
    var spot = $('.bg__spot');
    if (!spot || reduceMotion) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    var tx = window.innerWidth / 2, ty = window.innerHeight / 3;
    var cx = tx, cy = ty;
    var running = false;

    function loop() {
      cx += (tx - cx) * 0.075;
      cy += (ty - cy) * 0.075;
      spot.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
      if (Math.abs(tx - cx) > 0.4 || Math.abs(ty - cy) > 0.4) {
        requestAnimationFrame(loop);
      } else {
        running = false;
      }
    }

    window.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY;
      spot.style.opacity = '1';
      if (!running) { running = true; requestAnimationFrame(loop); }
    }, { passive: true });

    window.addEventListener('pointerleave', function () {
      spot.style.opacity = '0';
    }, { passive: true });
  }

  /* ── 5. 首屏视差 ──────────────────────────────────────────── */
  function initParallax() {
    if (reduceMotion) return;
    var layers = $$('[data-parallax]');
    if (!layers.length) return;

    var ticking = false;
    function update() {
      var y = window.scrollY || 0;
      layers.forEach(function (el) {
        var k = parseFloat(el.getAttribute('data-parallax')) || 0;
        el.style.transform = 'translate3d(0,' + (y * k).toFixed(2) + 'px,0)';
      });
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
  }

  /* ── 6. 状态面板：实时时钟 + 波形 + 计数 ──────────────────── */
  function initPanel() {
    // 波形条随机节奏
    $$('.wave i').forEach(function (bar, i) {
      bar.style.animationDelay = (-(i * 0.13) % 1.9).toFixed(2) + 's';
      bar.style.animationDuration = (1.3 + (i % 5) * 0.24).toFixed(2) + 's';
      bar.style.height = (18 + (i * 13) % 62) + '%';
    });

    // UTC 时钟
    var clock = $('[data-clock]');
    function tick() {
      if (!clock) return;
      var d = new Date();
      var p = function (n) { return n < 10 ? '0' + n : '' + n; };
      clock.textContent = p(d.getUTCHours()) + ':' + p(d.getUTCMinutes()) + ':' + p(d.getUTCSeconds()) + ' UTC';
    }
    tick();
    setInterval(tick, 1000);

    // 更新日期
    $$('[data-updated]').forEach(function (el) {
      el.textContent = el.getAttribute('data-updated');
    });
  }

  /* ── 7. 作品计数 + 空状态自动切换 ─────────────────────────── */
  function initWorksState() {
    var grid = $('#works-grid');
    if (!grid) return;

    var cards = $$('.card', grid);
    var empty = $('#empty-state');
    var n = cards.length;

    $$('[data-count]').forEach(function (el) {
      el.textContent = n < 10 ? '0' + n : String(n);
    });

    // 有作品时自动隐藏空状态；没有作品时隐藏网格容器多余边框
    if (empty) empty.hidden = n > 0;
    grid.hidden = n === 0;

    var label = $('[data-count-label]');
    if (label) label.textContent = n > 0 ? '已发布作品' : '待发布作品';
  }

  /* ── 8. 跑马灯无缝循环 ────────────────────────────────────── */
  function initTicker() {
    var track = $('.ticker__track');
    if (!track) return;
    var set = $('.ticker__set', track);
    if (!set) return;
    // 复制一份，配合 translateX(-50%) 实现无缝滚动
    track.appendChild(set.cloneNode(true));
    track.setAttribute('aria-hidden', 'true');
  }

  /* ── 9. 平滑锚点（兼顾 fixed 导航高度） ───────────────────── */
  function initAnchors() {
    var navH = 74;
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        if (!id || id === '#') return;
        var target = doc.getElementById(id.slice(1));
        if (!target) return;
        e.preventDefault();
        var top = target.getBoundingClientRect().top + window.scrollY - navH - 12;
        window.scrollTo({
          top: Math.max(top, 0),
          behavior: reduceMotion ? 'auto' : 'smooth'
        });
        if (history.replaceState) history.replaceState(null, '', id);
      });
    });
  }

  /* ── 10. 页脚年份 ─────────────────────────────────────────── */
  function initYear() {
    $$('[data-year]').forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });
  }

  /* ── 启动 ─────────────────────────────────────────────────── */
  function boot() {
    root.classList.add('js-ready');
    initYear();
    initTicker();
    initPanel();
    initWorksState();
    initReveal();
    initNav();
    initCardSpotlight();
    initCursorGlow();
    initParallax();
    initAnchors();
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
