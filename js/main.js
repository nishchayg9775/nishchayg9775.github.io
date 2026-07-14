/* ============================================================
   NISHCHAY GUPTA — PORTFOLIO ’26 · interaction & motion engine
   GSAP + ScrollTrigger (local), vanilla everything else.
   ============================================================ */
(() => {
  'use strict';

  const doc = document;
  const root = doc.documentElement;
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE_POINTER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const LOW_POWER = !FINE_POINTER ||
    Number(navigator.deviceMemory || 8) <= 4 ||
    Number(navigator.hardwareConcurrency || 8) <= 4;
  const DATA = window.NG_DATA || { projects: [] };

  if (REDUCED) root.classList.add('no-motion');

  // storage can throw (blocked cookies / enterprise policy) — never let it kill the site
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* theme just won't persist */ } }
  };
  const session = {
    get(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch { /* optional enhancement */ } }
  };

  const esc = s => String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------------- Theme ---------------- */
  const themeToggle = doc.querySelector('[data-theme-toggle]');
  const storedTheme = store.get('ng-theme');
  if (storedTheme === 'light' || storedTheme === 'dark') root.dataset.theme = storedTheme;

  const syncThemeMeta = () => {
    const dark = root.dataset.theme === 'dark';
    themeToggle.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    const meta = doc.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = dark ? '#08080b' : '#eef1f6';
  };
  syncThemeMeta();

  themeToggle.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    const apply = () => {
      root.dataset.theme = next;
      store.set('ng-theme', next);
      syncThemeMeta();
      ambientField && ambientField.refreshColors();
    };
    if (doc.startViewTransition && !REDUCED) doc.startViewTransition(apply);
    else apply();
  });

  /* ---------------- Native scroll + GSAP ---------------- */
  gsap.registerPlugin(ScrollTrigger);
  const scrollTo = target => {
    const el = typeof target === 'string' ? doc.querySelector(target) : target;
    el && el.scrollIntoView({ behavior: 'auto' });
  };
  // reference-counted so nested lockers (preloader / menu / case) can't unlock each other
  let lockCount = 0;
  const lockScroll = lock => {
    lockCount = Math.max(0, lockCount + (lock ? 1 : -1));
    const locked = lockCount > 0;
    doc.body.classList.toggle('is-locked', locked);
  };

  // anchor navigation — move focus too (WCAG 2.4.1 / 2.4.3)
  doc.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      const target = id.length > 1 && doc.querySelector(id);
      if (target) {
        e.preventDefault();
        closeMenu();
        scrollTo(id);
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      }
    });
  });

  /* ---------------- Header ---------------- */
  const header = doc.querySelector('[data-header]');
  const mainEl = doc.querySelector('main');
  const footerEl = doc.querySelector('.footer');
  let lastY = 0;
  const onScrollHeader = y => {
    header.classList.toggle('is-scrolled', y > 30);
    if (y > 140 && y > lastY + 4 && !doc.body.classList.contains('is-locked')) header.classList.add('is-hidden');
    else if (y < lastY - 4 || y <= 140) header.classList.remove('is-hidden');
    lastY = y;
  };
  window.addEventListener('scroll', () => onScrollHeader(window.scrollY), { passive: true });
  // keyboard users must never focus an off-screen header control
  header.addEventListener('focusin', () => header.classList.remove('is-hidden'));

  /* ---------------- Mobile menu ---------------- */
  const menu = doc.querySelector('[data-menu]');
  const menuBtn = doc.querySelector('[data-menu-btn]');
  const setBackgroundInert = inert => {
    mainEl.inert = inert;
    footerEl.inert = inert;
  };
  const openMenu = () => {
    if (menu.classList.contains('is-open')) return;
    SFX.toggle();
    header.classList.remove('is-hidden');
    menu.classList.add('is-open');
    menu.inert = false;
    menuBtn.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');
    menuBtn.setAttribute('aria-expanded', 'true');
    menuBtn.setAttribute('aria-label', 'Close menu');
    setBackgroundInert(true);
    lockScroll(true);
    const firstLink = menu.querySelector('a');
    firstLink && firstLink.focus({ preventScroll: true });
  };
  function closeMenu() {
    if (!menu.classList.contains('is-open')) return;
    SFX.toggle();
    menu.classList.remove('is-open');
    menu.inert = true;
    menuBtn.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.setAttribute('aria-label', 'Open menu');
    setBackgroundInert(false);
    lockScroll(false);
    menuBtn.focus({ preventScroll: true });
  }
  menuBtn.addEventListener('click', () => (menu.classList.contains('is-open') ? closeMenu() : openMenu()));

  /* ---------------- Custom cursor ---------------- */
  const cursor = doc.querySelector('.cursor');
  const cursorLabel = doc.querySelector('[data-cursor-label]');
  if (FINE_POINTER && !REDUCED) {
    root.classList.add('has-cursor');
    const dot = doc.querySelector('[data-cursor-dot]');
    const ring = doc.querySelector('[data-cursor-ring]');
    const pos = { x: innerWidth / 2, y: innerHeight / 2 };
    const dotP = { ...pos };
    const ringP = { ...pos };
    window.addEventListener('mousemove', e => { pos.x = e.clientX; pos.y = e.clientY; }, { passive: true });
    gsap.ticker.add(() => {
      dotP.x += (pos.x - dotP.x) * 0.62; dotP.y += (pos.y - dotP.y) * 0.62;
      ringP.x += (pos.x - ringP.x) * 0.16; ringP.y += (pos.y - ringP.y) * 0.16;
      dot.style.transform = `translate3d(${dotP.x}px, ${dotP.y}px, 0)`;
      ring.style.transform = `translate3d(${ringP.x}px, ${ringP.y}px, 0)`;
    });
    window.addEventListener('mousedown', () => cursor.classList.add('is-press'));
    window.addEventListener('mouseup', () => cursor.classList.remove('is-press'));
    doc.addEventListener('mouseover', e => {
      const t = e.target.closest('[data-cursor-view]');
      if (t) {
        cursor.classList.add('is-view');
        cursorLabel.textContent = t.getAttribute('data-cursor-view') || 'View';
      }
    });
    doc.addEventListener('mouseout', e => {
      if (e.target.closest('[data-cursor-view]')) cursor.classList.remove('is-view');
    });
  } else {
    cursor.style.display = 'none';
  }

  /* ---------------- Cursor glow ---------------- */
  const glow = doc.querySelector('[data-glow]');
  if (glow && FINE_POINTER && !REDUCED) {
    const g = { x: innerWidth / 2, y: innerHeight * 0.4 };
    const gt = { ...g };
    window.addEventListener('mousemove', e => { gt.x = e.clientX; gt.y = e.clientY; }, { passive: true });
    gsap.ticker.add(() => {
      g.x += (gt.x - g.x) * 0.06; g.y += (gt.y - g.y) * 0.06;
      glow.style.transform = `translate3d(${g.x}px, ${g.y}px, 0)`;
    });
  }

  /* ---------------- Magnetic elements ---------------- */
  const initMagnetic = scope => {
    if (!FINE_POINTER || REDUCED) return;
    (scope || doc).querySelectorAll('[data-magnetic]').forEach(el => {
      if (el.__magnetic) return;
      el.__magnetic = true;
      const strength = 18;
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width - 0.5) * 2;
        const y = ((e.clientY - r.top) / r.height - 0.5) * 2;
        gsap.to(el, { x: x * strength, y: y * strength * 0.7, duration: 0.4, ease: 'power2.out' });
      });
      el.addEventListener('mouseleave', () => {
        gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.4)' });
      });
    });
  };
  initMagnetic();

  /* ---------------- Ambient particle field — scroll-morphing 3D shapes ----------------
     Thousands of dots form a 3D shape per section; scrolling morphs the cloud
     into the next shape while it slowly rotates. Cursor pushes particles away. */
  class AmbientField {
    constructor(canvas, animated) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      // background dots don't need retina crispness; 1.25 halves the pixel work
      this.dpr = Math.min(1.25, window.devicePixelRatio || 1);
      this.animated = animated;
      this.mouse = { x: -9999, y: -9999 };
      this.paused = false;
      this.running = false;
      this.scroll = window.scrollY || 0;
      this.lastScroll = this.scroll;
      this.spin = 0;
      this.spinVel = 0.0032;
      this.lastPaint = 0;
      this.refreshColors();
      this.build();
      let rt;
      window.addEventListener('resize', () => {
        clearTimeout(rt);
        rt = setTimeout(() => { this.build(); if (!this.running) this.drawFrame(performance.now()); }, 150);
      }, { passive: true });
      // section offsets drift as lazy media loads; a ResizeObserver on <body>
      // catches that after layout settles — never a forced reflow inside the
      // draw loop (offsetTop mid-frame flushed layout of the whole card DOM)
      if ('ResizeObserver' in window) {
        let ot;
        new ResizeObserver(() => {
          clearTimeout(ot);
          ot = setTimeout(() => this.refreshOffsets(), 200);
        }).observe(doc.body);
      } else {
        window.addEventListener('load', () => this.refreshOffsets(), { once: true });
      }
      window.addEventListener('scroll', () => { this.scroll = window.scrollY; }, { passive: true });
      if (animated) {
        window.addEventListener('mousemove', e => {
          this.mouse.x = e.clientX * this.dpr;
          this.mouse.y = e.clientY * this.dpr;
        }, { passive: true });
        window.addEventListener('mouseout', () => { this.mouse.x = -9999; this.mouse.y = -9999; });
        doc.addEventListener('visibilitychange', () => this.toggle());
      }
    }
    refreshColors() {
      const cs = getComputedStyle(root);
      this.accent = cs.getPropertyValue('--accent').trim();
      this.soft = cs.getPropertyValue('--hero-gold').trim() || '#9fd0ff';
      const dark = root.dataset.theme === 'dark';
      this.dotColor = dark ? 'rgb(242, 244, 248)' : 'rgb(16, 20, 29)';
      this.baseAlpha = dark ? 0.85 : 0.7;
      if (!this.running && this.pts) this.drawFrame(performance.now());
    }
    /* procedural 3D point clouds in roughly unit space */
    shapePoints(kind, n) {
      const pts = [];
      const R = Math.random;
      if (kind.startsWith('text:')) {
        const str = kind.slice(5);
        const oc = doc.createElement('canvas');
        const s = 220;
        oc.width = Math.round(s * Math.max(1, str.length * 0.66));
        oc.height = s;
        const c2 = oc.getContext('2d');
        c2.font = `900 ${Math.round(s * 0.78)}px Arial, sans-serif`;
        c2.textAlign = 'center';
        c2.textBaseline = 'middle';
        c2.fillStyle = '#fff';
        c2.fillText(str, oc.width / 2, s * 0.56);
        const img = c2.getImageData(0, 0, oc.width, oc.height).data;
        const cand = [];
        for (let y = 0; y < oc.height; y += 2) {
          for (let x = 0; x < oc.width; x += 2) {
            if (img[(y * oc.width + x) * 4 + 3] > 128) cand.push([x, y]);
          }
        }
        const spread = Math.min(1.7, (oc.width / oc.height) * 0.92);
        for (let i = 0; i < n; i++) {
          const [x, y] = cand[(R() * cand.length) | 0] || [oc.width / 2, s / 2];
          pts.push({
            x: (x / oc.width - 0.5) * 2 * spread,
            y: (y / oc.height - 0.5) * 1.15,
            z: (R() - 0.5) * 0.2
          });
        }
        return pts;
      }
      for (let i = 0; i < n; i++) {
        let p;
        switch (kind) {
          case 'sphere': {
            const t = Math.acos(1 - 2 * R()), ph = R() * 6.2832, r = 0.9 + R() * 0.08;
            p = { x: Math.sin(t) * Math.cos(ph) * r, y: Math.cos(t) * r, z: Math.sin(t) * Math.sin(ph) * r };
            break;
          }
          case 'cube': {
            const f = (R() * 6) | 0, a = R() * 2 - 1, b = R() * 2 - 1, s = 0.76;
            p = [
              { x: s, y: a * s, z: b * s }, { x: -s, y: a * s, z: b * s },
              { x: a * s, y: s, z: b * s }, { x: a * s, y: -s, z: b * s },
              { x: a * s, y: b * s, z: s }, { x: a * s, y: b * s, z: -s }
            ][f];
            break;
          }
          case 'torus': {
            const u = R() * 6.2832, v = R() * 6.2832, T = 0.68, r = 0.27;
            p = { x: (T + r * Math.cos(v)) * Math.cos(u), y: r * Math.sin(v), z: (T + r * Math.cos(v)) * Math.sin(u) };
            break;
          }
          case 'funnel': {
            const t = R(), ang = R() * 6.2832, rad = 0.15 + (1 - t) * 0.85;
            p = { x: Math.cos(ang) * rad, y: 0.9 - t * 1.8, z: Math.sin(ang) * rad };
            break;
          }
          case 'helix': {
            const t = R(), ang = t * 6.2832 * 3;
            p = {
              x: Math.cos(ang) * 0.72 + (R() - 0.5) * 0.12,
              y: (t - 0.5) * 1.9,
              z: Math.sin(ang) * 0.72 + (R() - 0.5) * 0.12
            };
            break;
          }
          case 'octa': {
            const x = R() - 0.5, y = R() - 0.5, z = R() - 0.5;
            const L = (Math.abs(x) + Math.abs(y) + Math.abs(z)) || 1;
            p = { x: x * 0.95 / L, y: y * 0.95 / L, z: z * 0.95 / L };
            break;
          }
          case 'steps': {
            const s3 = (R() * 4) | 0;
            p = {
              x: -0.78 + s3 * 0.52 + R() * 0.46,
              y: 0.6 - s3 * 0.4 + (R() - 0.5) * 0.28,
              z: (R() - 0.5) * 0.5
            };
            break;
          }
          case 'ring': {
            const ang = R() * 6.2832, rad = 0.55 + R() * 0.35;
            p = { x: Math.cos(ang) * rad, y: Math.sin(ang) * rad, z: (R() - 0.5) * 0.14 };
            break;
          }
          default: {
            const ang = R() * 6.2832, rad = Math.sqrt(R());
            p = { x: Math.cos(ang) * rad, y: Math.sin(ang) * rad, z: (R() - 0.5) * 0.3 };
          }
        }
        pts.push(p);
      }
      return pts;
    }
    build() {
      const vw = innerWidth || doc.documentElement.clientWidth;
      const vh = innerHeight || doc.documentElement.clientHeight;
      if (!vw || !vh) { setTimeout(() => this.build(), 300); return; } // layout not ready yet
      this.w = this.canvas.width = Math.round(vw * this.dpr);
      this.h = this.canvas.height = Math.round(vh * this.dpr);
      // capped at 1000: the sim + per-particle draw was eating half the frame
      // budget on integrated-GPU laptops, and Lenis scroll queues behind it
      const ceiling = LOW_POWER ? 420 : 700;
      const floor = LOW_POWER ? 260 : 420;
      const count = Math.min(ceiling, Math.max(floor, Math.round((vw * vh) / 900)));
      this.pts = Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * 3, y: (Math.random() - 0.5) * 3, z: (Math.random() - 0.5) * 3,
        tx: 0, ty: 0, tz: 0, vx: 0, vy: 0, vz: 0,
        k: 0.024 + Math.random() * 0.05, // per-particle spring = organic morphs
        delay: 0,
        hue: Math.random(),
        seed: Math.random() * 6.2832,
        ox: 0, oy: 0
      }));
      // colour buckets: one fillStyle per group instead of one per particle
      this.buckets = [
        this.pts.filter(p => p.hue < 0.42),
        this.pts.filter(p => p.hue >= 0.42 && p.hue < 0.74),
        this.pts.filter(p => p.hue >= 0.74)
      ];
      this.stars = Array.from({ length: 80 }, () => ({
        x: Math.random() * this.w, y: Math.random() * this.h,
        s: (0.5 + Math.random() * 1.2) * this.dpr, tw: Math.random() * 6.2832
      }));
      this.sectionShapes = [
        ['top', 'text:NG'], ['about', 'sphere'], ['work', 'cube'], ['gallery', 'torus'],
        ['services', 'funnel'], ['process', 'helix'], ['skills', 'octa'],
        ['experience', 'steps'], ['testimonials', 'ring'], ['clients', 'ring'],
        ['contact', 'text:HELLO']
      ].map(([id, shape]) => ({ el: doc.getElementById(id), shape })).filter(s => s.el);
      this.shapeCache = {};
      this.refreshOffsets();
      this.shapeIndex = -1;
      this.updateShape(true);
      this.mouseR = 140 * this.dpr;
    }
    refreshOffsets() {
      this.offsets = this.sectionShapes.map(s => s.el.offsetTop);
    }
    targetsFor(kind) {
      if (!this.shapeCache[kind]) this.shapeCache[kind] = this.shapePoints(kind, this.pts.length);
      return this.shapeCache[kind];
    }
    activeIndex() {
      const probe = this.scroll + (innerHeight || 800) * 0.45;
      let idx = 0;
      for (let i = 0; i < this.offsets.length; i++) {
        if (this.offsets[i] <= probe) idx = i;
      }
      return idx;
    }
    updateShape(instant) {
      const idx = this.activeIndex();
      if (idx === this.shapeIndex) return;
      this.shapeIndex = idx;
      const targets = this.targetsFor(this.sectionShapes[idx].shape);
      const now = performance.now();
      for (let i = 0; i < this.pts.length; i++) {
        const p = this.pts[i], tg = targets[i];
        p.tx = tg.x; p.ty = tg.y; p.tz = tg.z;
        p.delay = instant ? 0 : now + Math.random() * 480; // staggered departure
        if (instant) { p.x = tg.x; p.y = tg.y; p.z = tg.z; }
      }
    }
    setPaused(p) { this.paused = p; this.toggle(); }
    toggle() {
      const should = this.animated && !this.paused && !doc.hidden;
      if (should && !this.running) { this.running = true; this.raf = requestAnimationFrame(t => this.frame(t)); }
      if (!should) { this.running = false; cancelAnimationFrame(this.raf); }
    }
    drawFrame(t) {
      const { ctx, pts, mouse } = this;
      ctx.clearRect(0, 0, this.w, this.h);
      // twinkling backdrop stars
      ctx.fillStyle = this.dotColor;
      for (const s of this.stars) {
        ctx.globalAlpha = 0.14 + 0.2 * (0.5 + 0.5 * Math.sin(t * 0.001 + s.tw));
        ctx.fillRect(s.x, s.y, s.s, s.s);
      }
      this.updateShape(false);
      // rotation: gentle base spin, nudged faster while scrolling
      const sv = this.scroll - this.lastScroll;
      this.lastScroll = this.scroll;
      this.spinVel += Math.min(0.02, Math.abs(sv) * 0.00002);
      this.spinVel += (0.0032 - this.spinVel) * 0.05;
      this.spin += this.spinVel;
      const cy = Math.cos(this.spin), sy = Math.sin(this.spin);
      const tilt = 0.3, cx = Math.cos(tilt), sx = Math.sin(tilt);
      const midX = this.w * 0.66, midY = this.h * 0.52;
      const S = Math.min(this.w, this.h) * 0.36;
      const persp = 3.4;
      const r2 = this.mouseR * this.mouseR;
      const colors = [this.accent, this.soft, this.dotColor];
      for (let b = 0; b < 3; b++) {
        ctx.fillStyle = colors[b]; // one style per bucket, not per particle
        for (const p of this.buckets[b]) {
          if (t > p.delay) {
            p.vx = (p.vx + (p.tx - p.x) * p.k) * 0.86;
            p.vy = (p.vy + (p.ty - p.y) * p.k) * 0.86;
            p.vz = (p.vz + (p.tz - p.z) * p.k) * 0.86;
            p.x += p.vx; p.y += p.vy; p.z += p.vz;
          }
          // rotate Y, then tilt X, then perspective-project
          const X = p.x * cy + p.z * sy;
          const Z0 = p.z * cy - p.x * sy;
          const Y = p.y * cx - Z0 * sx;
          const Z = p.y * sx + Z0 * cx;
          const sc = persp / (persp + Z);
          let px = midX + X * S * sc;
          let py = midY + Y * S * sc;
          // cursor repel, eased
          const mx = px + p.ox - mouse.x, my = py + p.oy - mouse.y;
          const d2 = mx * mx + my * my;
          let txo = 0, tyo = 0;
          if (d2 < r2) {
            const d = Math.sqrt(d2) || 1;
            const f = (1 - d / this.mouseR) * 34 * this.dpr;
            txo = (mx / d) * f;
            tyo = (my / d) * f;
          }
          p.ox += (txo - p.ox) * 0.09;
          p.oy += (tyo - p.oy) * 0.09;
          px += p.ox; py += p.oy;
          const depth = Math.max(0, Math.min(1, (sc - 0.62) * 1.6));
          const tw = 0.7 + 0.3 * Math.sin(t * 0.002 + p.seed);
          ctx.globalAlpha = this.baseAlpha * (0.18 + 0.82 * depth) * tw;
          const size = (0.8 + 1.3 * sc) * this.dpr;
          ctx.fillRect(px, py, size, size);
        }
      }
      ctx.globalAlpha = 1;
    }
    frame(t) {
      if (!this.running) return;
      // Ambient motion does not need a 60fps simulation. Capping the paint
      // rate leaves the main thread free for scrolling and image decoding.
      if (t - this.lastPaint >= 32) {
        this.lastPaint = t;
        this.drawFrame(t);
      }
      this.raf = requestAnimationFrame(tt => this.frame(tt));
    }
  }
  const ambientCanvas = doc.querySelector('[data-ambient]');
  let ambientField = null;
  if (ambientCanvas && !REDUCED) {
    ambientField = new AmbientField(ambientCanvas, FINE_POINTER && !LOW_POWER);
    if (FINE_POINTER && !LOW_POWER) ambientField.toggle();
    // always paint one frame so the field is never blank (touch devices,
    // or the page loading in a hidden tab)
    if (!ambientField.running) ambientField.drawFrame(performance.now());
    if (location.search.includes('debug')) window.__ambient = ambientField;
  }

  /* ---------------- Motion pause (WCAG 2.2.2) ---------------- */
  const motionToggle = doc.querySelector('[data-motion-toggle]');
  let marqueeTween = null;
  let motionPaused = false;
  if (motionToggle) {
    if (REDUCED) motionToggle.hidden = true; // nothing auto-plays under reduced motion
    motionToggle.addEventListener('click', () => {
      motionPaused = !motionPaused;
      root.classList.toggle('motion-paused', motionPaused);
      motionToggle.setAttribute('aria-pressed', String(motionPaused));
      motionToggle.setAttribute('aria-label', motionPaused ? 'Resume animations' : 'Pause animations');
      if (marqueeTween) motionPaused ? marqueeTween.pause() : marqueeTween.play();
      ambientField && ambientField.setPaused(motionPaused);
    });
  }

  /* ---------------- Split text ---------------- */
  const splitTargets = [];
  doc.querySelectorAll('[data-split]').forEach(el => {
    const wrapWords = node => {
      const out = doc.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach(part => {
        if (!part) return;
        if (/^\s+$/.test(part)) { out.appendChild(doc.createTextNode(' ')); return; }
        const w = doc.createElement('span');
        w.className = 'sw';
        const wi = doc.createElement('span');
        wi.className = 'swi';
        wi.textContent = part;
        w.appendChild(wi);
        out.appendChild(w);
      });
      return out;
    };
    [...el.childNodes].forEach(node => {
      if (node.nodeType === 3) el.replaceChild(wrapWords(node), node);
      else if (node.nodeType === 1) {
        [...node.childNodes].forEach(inner => {
          if (inner.nodeType === 3) node.replaceChild(wrapWords(inner), inner);
        });
      }
    });
    splitTargets.push(el);
  });

  /* ---------------- Data rendering ---------------- */
  const featuredList = doc.querySelector('[data-featured-list]');
  const projects = DATA.projects || [];

  const imgTag = (src, alt, w, h, eager) =>
    `<img src="${esc(src)}" alt="${esc(alt)}" width="${w}" height="${h}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;

  // Featured
  const featured = projects.filter(p => p.featured);
  if (featuredList) {
    const first = featured[0];
    featuredList.innerHTML = `
      <section class="featured-dossier" data-featured-dossier data-reveal aria-label="Selected case studies">
        <div class="featured-dossier__tabs" role="tablist" aria-label="Choose case study">
          ${featured.map((p, i) => `<button role="tab" data-featured-go="${i}" aria-selected="${i === 0 ? 'true' : 'false'}">
            <span>0${i + 1}</span>
            <strong>${esc(p.client)}</strong>
            <small>${esc(p.categoryLabel)}</small>
          </button>`).join('')}
        </div>

        <div class="featured-dossier__board">
          <aside class="featured-dossier__brief">
            <span class="mono-label" data-featured-index>Case 01 / ${String(featured.length).padStart(2, '0')}</span>
            <h3 data-featured-title>${esc(first.title)}</h3>
            <p class="featured-dossier__client" data-featured-client>${esc(first.client)} · ${esc(first.categoryLabel)}</p>
            <dl>
              <div><dt>Industry</dt><dd data-featured-industry>${esc(first.industry)}</dd></div>
              <div><dt>Role</dt><dd data-featured-role>${esc(first.role)}</dd></div>
            </dl>
            <div class="featured-dossier__stats" data-featured-stats>
              ${(first.stats || []).map(stat => `<div><strong>${esc(stat.num)}${esc(stat.suffix || '')}</strong><span>${esc(stat.label)}</span></div>`).join('')}
            </div>
          </aside>

          <div class="featured-dossier__stage" data-featured-stage tabindex="0" role="group"
            aria-label="Selected work — case study artwork viewer">
            <span class="featured-dossier__grid" aria-hidden="true"></span>
            <span class="featured-dossier__coordinate featured-dossier__coordinate--top mono-label" aria-hidden="true">CASE FILE / 2026</span>
            <span class="featured-dossier__coordinate featured-dossier__coordinate--side mono-label" aria-hidden="true">STRATEGY → SYSTEM → RESULT</span>
            ${featured.map((p, i) => `<button class="featured-dossier__card" data-featured-card="${i}" data-featured-id="${esc(p.id)}"
              style="--featured-ar: ${p.card.w} / ${p.card.h}" aria-label="Select ${esc(p.title)}">
              <span class="featured-dossier__frame">
                ${imgTag(p.card.img, `${p.title} — ${p.client}`, p.card.w, p.card.h)}
                <span class="featured-dossier__folio mono-label" aria-hidden="true">0${i + 1}</span>
              </span>
            </button>`).join('')}
            <div class="featured-dossier__caption" aria-live="polite">
              <small class="mono-label">Selected case study</small>
              <strong data-featured-active-title>${esc(first.title)}</strong>
            </div>
          </div>

          <aside class="featured-dossier__preview">
            <span class="mono-label">Case study preview</span>
            <h4>The brief</h4>
            <p data-featured-summary>${esc(first.sub)}</p>
            <div class="featured-dossier__tags" data-featured-tags>
              ${first.tags.slice(0, 4).map(t => `<span class="tag">${esc(t)}</span>`).join('')}
            </div>
            <button class="featured-dossier__open" data-featured-open data-case-open="${esc(first.id)}"
              aria-label="Open case study: ${esc(first.title)}">
              <span>Open full case study</span><i aria-hidden="true">↗</i>
            </button>
          </aside>
        </div>

        <footer class="featured-dossier__footer">
          <span class="featured-dossier__progress" aria-hidden="true"><i data-featured-progress></i></span>
          <p>Choose a case file · swipe or use the touchpad · open for the full problem-to-outcome story</p>
        </footer>
      </section>`;

    const featuredDossier = featuredList.querySelector('[data-featured-dossier]');
    const featuredStage = featuredDossier.querySelector('[data-featured-stage]');
    const featuredCards = [...featuredDossier.querySelectorAll('[data-featured-card]')];
    const featuredTabs = [...featuredDossier.querySelectorAll('[data-featured-go]')];
    const featuredProgress = featuredDossier.querySelector('[data-featured-progress]');
    const featuredOpen = featuredDossier.querySelector('[data-featured-open]');
    const featuredIndex = featuredDossier.querySelector('[data-featured-index]');
    const featuredTitle = featuredDossier.querySelector('[data-featured-title]');
    const featuredClient = featuredDossier.querySelector('[data-featured-client]');
    const featuredIndustry = featuredDossier.querySelector('[data-featured-industry]');
    const featuredRole = featuredDossier.querySelector('[data-featured-role]');
    const featuredStats = featuredDossier.querySelector('[data-featured-stats]');
    const featuredSummary = featuredDossier.querySelector('[data-featured-summary]');
    const featuredTags = featuredDossier.querySelector('[data-featured-tags]');
    const featuredActiveTitle = featuredDossier.querySelector('[data-featured-active-title]');
    let featuredActive = 0;
    let featuredStartX = 0, featuredStartY = 0, featuredDragged = false;
    let featuredWheel = 0, featuredWheelAt = 0;

    const renderFeatured = next => {
      featuredActive = (next + featured.length) % featured.length;
      const project = featured[featuredActive];
      featuredCards.forEach((card, index) => {
        let position = index - featuredActive;
        if (position > featured.length / 2) position -= featured.length;
        if (position < -featured.length / 2) position += featured.length;
        if (position === featured.length / 2) position = -position;
        const active = position === 0;
        card.dataset.position = String(Math.max(-2, Math.min(2, position)));
        card.tabIndex = Math.abs(position) <= 1 ? 0 : -1;
        card.setAttribute('aria-hidden', Math.abs(position) <= 1 ? 'false' : 'true');
        card.setAttribute('aria-pressed', String(active));
        card.setAttribute('aria-label', `${active ? 'Open case study' : 'Select case study'}: ${featured[index].title}`);
        if (active) {
          card.dataset.caseOpen = card.dataset.featuredId;
          card.dataset.cursorView = 'Open';
        } else {
          delete card.dataset.caseOpen;
          delete card.dataset.cursorView;
        }
      });
      featuredTabs.forEach((tab, index) => {
        const selected = index === featuredActive;
        tab.setAttribute('aria-selected', String(selected));
        tab.tabIndex = selected ? 0 : -1;
      });
      featuredIndex.textContent = `Case ${String(featuredActive + 1).padStart(2, '0')} / ${String(featured.length).padStart(2, '0')}`;
      featuredTitle.textContent = project.title;
      featuredClient.textContent = `${project.client} · ${project.categoryLabel}`;
      featuredIndustry.textContent = project.industry;
      featuredRole.textContent = project.role;
      featuredStats.innerHTML = (project.stats || []).map(stat => `<div><strong>${esc(stat.num)}${esc(stat.suffix || '')}</strong><span>${esc(stat.label)}</span></div>`).join('');
      featuredSummary.textContent = project.sub;
      featuredTags.innerHTML = project.tags.slice(0, 4).map(tag => `<span class="tag">${esc(tag)}</span>`).join('');
      featuredActiveTitle.textContent = project.title;
      featuredOpen.dataset.caseOpen = project.id;
      featuredOpen.setAttribute('aria-label', `Open case study: ${project.title}`);
      featuredProgress.style.transform = `scaleX(${(featuredActive + 1) / featured.length})`;
    };

    const stepFeatured = direction => { SFX.flip(); renderFeatured(featuredActive + direction); };

    featuredDossier.addEventListener('click', e => {
      if (featuredDragged) {
        featuredDragged = false;
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      const tab = e.target.closest('[data-featured-go]');
      if (tab) { SFX.flip(); renderFeatured(Number(tab.dataset.featuredGo)); return; }
      const card = e.target.closest('[data-featured-card]');
      if (!card) return;
      const index = Number(card.dataset.featuredCard);
      if (index !== featuredActive) {
        e.preventDefault();
        e.stopPropagation();
        SFX.flip();
        renderFeatured(index);
      }
    });
    featuredStage.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); stepFeatured(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); stepFeatured(1); }
      else if (e.key === 'Home') { e.preventDefault(); renderFeatured(0); }
      else if (e.key === 'End') { e.preventDefault(); renderFeatured(featured.length - 1); }
    });
    featuredStage.addEventListener('wheel', e => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) * 1.1) return;
      e.preventDefault();
      featuredWheel += e.deltaX;
      const now = performance.now();
      if (Math.abs(featuredWheel) >= 38 && now - featuredWheelAt > 360) {
        stepFeatured(featuredWheel > 0 ? 1 : -1);
        featuredWheel = 0;
        featuredWheelAt = now;
      }
    }, { passive: false });
    featuredStage.addEventListener('pointerdown', e => {
      if (!e.isPrimary) return;
      featuredStartX = e.clientX;
      featuredStartY = e.clientY;
      featuredDragged = false;
    }, { passive: true });
    featuredStage.addEventListener('pointerup', e => {
      if (!e.isPrimary) return;
      const deltaX = e.clientX - featuredStartX;
      const deltaY = e.clientY - featuredStartY;
      if (Math.abs(deltaX) >= 44 && Math.abs(deltaX) > Math.abs(deltaY) * 1.15) {
        featuredDragged = true;
        stepFeatured(deltaX < 0 ? 1 : -1);
      }
    }, { passive: true });
    featuredStage.addEventListener('pointercancel', () => { featuredDragged = false; }, { passive: true });
    renderFeatured(0);
  }

  /* ---------------- Case study overlay ---------------- */
  const caseRootEl = doc.querySelector('[data-case]');
  const casePanel = caseRootEl.querySelector('.case__panel');
  const caseContent = doc.querySelector('[data-case-content]');
  const caseScroll = doc.querySelector('[data-case-scroll]');
  let lastFocus = null;

  const caseHTML = p => {
    const next = projects[(projects.findIndex(x => x.id === p.id) + 1) % projects.length];
    return `
      <div class="case-hero">${imgTag(p.hero.img, p.hero.alt || `${p.title} — hero visual`, p.hero.w, p.hero.h, true)}</div>
      <header class="case-head">
        <div class="case-head__meta">
          <span class="mono-label" style="color:var(--accent)">${esc(p.categoryLabel)}</span>
          <span class="mono-label">${esc(p.client)}</span>
          <span class="mono-label">${esc(p.year)}</span>
        </div>
        <h3 class="case-head__title" id="case-title">${esc(p.title)}</h3>
        <p class="case-head__sub">${esc(p.sub)}</p>
      </header>
      <dl class="case-grid">
        <div><dt>Role</dt><dd>${esc(p.role)}</dd></div>
        <div><dt>Deliverables</dt><dd>${esc(p.deliverables)}</dd></div>
        <div><dt>Tools</dt><dd>${esc(p.tools)}</dd></div>
        <div><dt>Industry</dt><dd>${esc(p.industry)}</dd></div>
      </dl>
      <div class="case-body">
        <section><h4>The brief</h4><p>${esc(p.brief)}</p></section>
        <section><h4>The approach</h4><p>${esc(p.approach)}</p></section>
        <section><h4>The outcome</h4><p>${esc(p.outcome)}</p></section>
      </div>
      ${p.stats && p.stats.length ? `<div class="case-stats">${p.stats.map(s =>
        `<div class="stat"><span class="stat__num" data-suffix="${esc(s.suffix || '')}">${esc(s.num)}</span><span class="stat__label">${esc(s.label)}</span></div>`).join('')}</div>` : ''}
      <div class="case-gallery">
        ${p.gallery.map(g => `<figure${g.full ? ' class="is-full"' : ''}>${imgTag(g.src, g.alt || `${p.title} — detail`, g.w, g.h)}</figure>`).join('')}
      </div>
      <div class="case-next">
        <span class="case-next__label mono-label">Next project</span>
        <button class="case-next__btn" data-case-open="${esc(next.id)}">${esc(next.title)} →</button>
      </div>`;
  };

  const openCase = id => {
    const p = projects.find(x => x.id === id);
    if (!p) return;
    SFX.open();
    closeMenu();
    const wasOpen = caseRootEl.classList.contains('is-open');
    if (!wasOpen) lastFocus = doc.activeElement; // capture BEFORE any DOM mutation
    caseContent.innerHTML = caseHTML(p);
    caseScroll.scrollTop = 0;
    caseRootEl.classList.add('is-open');
    caseRootEl.inert = false;
    caseRootEl.setAttribute('aria-hidden', 'false');
    if (!wasOpen) {
      header.inert = true;
      setBackgroundInert(true);
      lockScroll(true);
    }
    caseRootEl.querySelector('.case__close').focus({ preventScroll: true });
    if (!REDUCED) {
      gsap.fromTo(caseContent.children, { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.7, stagger: 0.06, delay: 0.25, ease: 'power3.out', clearProps: 'all' });
    }
    pushDeepLink('#case/' + encodeURIComponent(id));
  };
  const closeCase = () => {
    if (!caseRootEl.classList.contains('is-open')) return;
    SFX.close();
    caseRootEl.classList.remove('is-open');
    caseRootEl.inert = true;
    caseRootEl.setAttribute('aria-hidden', 'true');
    header.inert = false;
    setBackgroundInert(false);
    lockScroll(false);
    if (lastFocus && lastFocus.isConnected) lastFocus.focus({ preventScroll: true });
    lastFocus = null;
    clearDeepLink();
  };

  doc.addEventListener('click', e => {
    const opener = e.target.closest('[data-case-open]');
    if (opener) { openCase(opener.dataset.caseOpen); return; }
    if (e.target.closest('[data-case-close]')) closeCase();
  });
  doc.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (caseRootEl.classList.contains('is-open')) closeCase();
      else closeMenu();
    }
    if (e.key === 'Tab' && caseRootEl.classList.contains('is-open')) {
      const focusables = casePanel.querySelectorAll('button, a[href]');
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (!casePanel.contains(doc.activeElement)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---------------- Interface sounds (WebAudio, no files) ---------------- */
  const soundToggle = doc.querySelector('[data-sound-toggle]');
  const SFX = (() => {
    let ctx = null;
    // Keep audio opt-in: no AudioContext, oscillator farm or music timer is
    // created until the visitor explicitly enables sound.
    let enabled = store.get('ng-sfx') === 'on';
    const ensure = () => {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) { enabled = false; return null; }
        ctx = new AC();
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    };
    const blip = (freq, dur, type, gain, slideTo) => {
      if (!enabled) return;
      const c = ensure();
      if (!c) return;
      const t = c.currentTime;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(c.destination);
      o.start(t);
      o.stop(t + dur + 0.03);
    };
    return {
      get enabled() { return enabled; },
      set(v) { enabled = v; store.set('ng-sfx', v ? 'on' : 'off'); },
      hover:  () => blip(1240, 0.03, 'sine', 0.014),
      click:  () => blip(640, 0.06, 'triangle', 0.045, 860),
      open:   () => blip(420, 0.16, 'sine', 0.05, 880),
      close:  () => blip(860, 0.13, 'sine', 0.04, 430),
      flip:   () => blip(980, 0.045, 'triangle', 0.032),
      rail:   () => blip(720 + Math.random() * 140, 0.032, 'sine', 0.013, 900),
      toggle: () => blip(520, 0.09, 'triangle', 0.035, 780)
    };
  })();
  const syncSound = () => {
    root.classList.toggle('sfx-off', !SFX.enabled);
    soundToggle.setAttribute('aria-pressed', String(SFX.enabled));
    soundToggle.setAttribute('aria-label', SFX.enabled ? 'Mute interface sounds' : 'Unmute interface sounds');
  };
  /* ---------------- Ambient music — generative, infinite, very quiet ----------------
     No audio file: a slow four-chord pad synthesized live, looping forever.
     Follows the same mute toggle and preference as the interface sounds. */
  const MUSIC = (() => {
    let ctx = null, master = null, filter = null;
    let running = false, timer = null, step = 0;
    const CHORD_SEC = 9;
    const CHORDS = [
      [110.00, 164.81, 220.00, 261.63, 329.63], // Am(add9) — home
      [87.31, 130.81, 174.61, 220.00, 261.63],  // Fmaj7 — warm
      [98.00, 146.83, 196.00, 246.94, 293.66],  // G — lift
      [130.81, 196.00, 261.63, 329.63, 392.00]  // C — resolve
    ];
    const ensure = () => {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      if (!ctx) {
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.0001;
        filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 900;
        filter.Q.value = 0.4;
        const lfo = ctx.createOscillator();     // the pad slowly "breathes"
        const lfoGain = ctx.createGain();
        lfo.frequency.value = 0.03;
        lfoGain.gain.value = 320;
        lfo.connect(lfoGain).connect(filter.frequency);
        lfo.start();
        filter.connect(master).connect(ctx.destination);
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    };
    const playChord = freqs => {
      const t = ctx.currentTime;
      freqs.forEach((f, i) => {
        const t0 = t + i * 0.35; // notes bloom one after another
        for (const det of [-2.4, 2.4]) { // two softly detuned voices per note
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = i < 2 ? 'sine' : 'triangle';
          o.frequency.value = f;
          o.detune.value = det;
          g.gain.setValueAtTime(0.0001, t0);
          g.gain.exponentialRampToValueAtTime(i < 2 ? 0.05 : 0.028, t0 + 3.2);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + CHORD_SEC + 3.5);
          o.connect(g).connect(filter);
          o.start(t0);
          o.stop(t0 + CHORD_SEC + 4);
        }
      });
    };
    const tick = () => {
      if (!running) return;
      playChord(CHORDS[step % CHORDS.length]);
      step++;
    };
    return {
      get running() { return running; },
      start() {
        if (running || !SFX.enabled) return;
        if (!ensure()) return;
        running = true;
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), ctx.currentTime);
        master.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + 6); // fade in, stays low
        tick();
        timer = setInterval(tick, CHORD_SEC * 1000);
      },
      stop() {
        if (!running) return;
        running = false;
        clearInterval(timer);
        if (!ctx) return;
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), ctx.currentTime);
        master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
      }
    };
  })();
  // browsers only allow audio after a real gesture: first press starts the pad
  let audioUnlocked = false;
  const musicKick = () => { audioUnlocked = true; MUSIC.start(); };
  window.addEventListener('pointerdown', musicKick, { once: true, passive: true });
  window.addEventListener('keydown', musicKick, { once: true });
  // silence in hidden tabs; ease back in when the visitor returns
  doc.addEventListener('visibilitychange', () => {
    if (doc.hidden) MUSIC.stop();
    else if (audioUnlocked && SFX.enabled) MUSIC.start();
  });

  if (soundToggle) {
    syncSound();
    soundToggle.addEventListener('click', () => {
      SFX.set(!SFX.enabled);
      syncSound();
      SFX.toggle();
      audioUnlocked = true;
      if (SFX.enabled) MUSIC.start();
      else MUSIC.stop();
    });
  }
  // one soft tick per newly-hovered control; cards excluded (too dense)
  let lastHoverEl = null;
  if (FINE_POINTER) doc.addEventListener('mouseover', e => {
    const el = e.target.closest('a[href], button');
    if (el && el !== lastHoverEl && !el.closest('[data-gal-open]')) SFX.hover();
    lastHoverEl = el;
  });
  doc.addEventListener('click', e => {
    const el = e.target.closest('a[href], button');
    if (!el) return;
    // these play their own sound inside their open/close handlers
    if (el.closest('[data-sound-toggle], [data-gal-open], [data-case-open], [data-lb-close], [data-case-close], [data-menu-btn]')) return;
    if (el.closest('[data-lb-prev], [data-lb-next], [data-rail-prev], [data-rail-next]')) SFX.flip();
    else if (el.closest('[data-theme-toggle]')) SFX.toggle();
    else SFX.click();
  });

  /* ---------------- Complete archive — category rails ---------------- */
  const GAL = window.NG_GALLERY || { categories: [], items: [] };
  const railsWrap = doc.querySelector('[data-gallery-rails]');
  const galCatLabel = Object.fromEntries(GAL.categories);
  const galList = GAL.items; // lightbox order = rail order (category-major)

  const galCardHTML = it => {
    // rails use the small thumb (~800px); the lightbox keeps full resolution.
    // 583 full-res JPEGs decoding mid-scroll was a major source of wheel lag.
    const [src, w, h] = it.thumb || it.cover;
    const pageCount = it.pages ? it.pages.length : 1;
    const isCarousel = it.cat === 'carousels' && pageCount > 1;
    const isDeck = it.cat === 'decks' && pageCount > 1;
    const deckRatio = isDeck ? w / h : 1;
    const deckVars = isDeck
      ? `--deck-ar: ${w} / ${h}; --deck-width: clamp(${Math.round(deckRatio * 190)}px, ${(deckRatio * 23).toFixed(2)}vw, ${Math.round(deckRatio * 270)}px); --deck-width-mobile: ${Math.round(deckRatio * 178)}px;`
      : '';
    const previews = isCarousel || isDeck
      ? (it.previews || [it.thumb || it.cover, ...it.pages.slice(1, 3)]).slice(0, 3)
      : [];
    const frontContent = `
      <span class="g-card__pages">${String(pageCount).padStart(2, '0')} ${isCarousel ? 'slides' : 'pages'}</span>
      <span class="g-card__veil"><span class="g-card__title">${esc(it.title)}</span></span>`;
    const deckMedia = isDeck
      ? `<span class="g-card__deck-shell">
          <span class="g-card__deck-stack">
            ${previews.map((preview, i) => {
              const [previewSrc, previewW, previewH] = preview;
              return `<span class="g-card__deck-slide${i === 0 ? ' is-front' : ''}" style="--deck-slide: ${i}" aria-hidden="true">
                <img src="${esc(previewSrc)}" alt="" width="${previewW}" height="${previewH}" loading="lazy" decoding="async">
              </span>`;
            }).join('')}
            <span class="g-card__deck-spine" aria-hidden="true"></span>
          </span>
          <span class="g-card__deck-meta">
            <span>
              <small class="mono-label">Presentation deck</small>
              <strong>${esc(it.title)}</strong>
            </span>
            <span class="g-card__deck-count"><b>${String(pageCount).padStart(2, '0')}</b><small>slides</small></span>
          </span>
        </span>`
      : '';
    const media = isCarousel
      ? `<span class="g-card__media g-card__media--stack" style="--ar: ${w} / ${h}">
          ${previews.map((preview, i) => {
            const [previewSrc, previewW, previewH] = preview;
            const front = i === 0;
            return `<span class="g-card__sheet${front ? ' is-front' : ''}" style="--sheet: ${i}" aria-hidden="${front ? 'false' : 'true'}">
              <img src="${encodeURI(previewSrc)}" alt="${front ? `${esc(it.title)} — ${esc(galCatLabel[it.cat] || '')}` : ''}"
                width="${previewW}" height="${previewH}" loading="lazy" decoding="async">
              ${front ? frontContent : ''}
            </span>`;
          }).reverse().join('')}
        </span>`
      : isDeck
        ? deckMedia
        : `<span class="g-card__media" style="--ar: ${w} / ${h}">
          <img src="${encodeURI(src)}" alt="${esc(it.title)} — ${esc(galCatLabel[it.cat] || '')}"
            width="${w}" height="${h}" loading="lazy" decoding="async">
          ${pageCount > 1 ? frontContent : `<span class="g-card__veil"><span class="g-card__title">${esc(it.title)}</span></span>`}
        </span>`;
    return `
      <button class="g-card${isCarousel ? ' g-card--carousel' : ''}${isDeck ? ' g-card--deck' : ''}"${isDeck ? ` style="${deckVars}"` : ''} data-gal-open="${esc(it.id)}" data-cursor-view="View"
        aria-label="View: ${esc(it.title)}${pageCount > 1 ? ` — ${pageCount} pages` : ''}">
        ${media}
      </button>`;
  };

  const socialCardHTML = (it, index) => {
    const [src, w, h] = it.thumb || it.cover;
    const format = w === h ? 'Square' : w < h ? 'Portrait' : 'Landscape';
    return `<button class="social-tile" data-gal-open="${esc(it.id)}" data-cursor-view="View"
      aria-label="View social post: ${esc(it.title)}">
      <span class="social-tile__top">
        <span class="social-tile__dot" aria-hidden="true"></span>
        <span class="mono-label">Post ${String(index + 1).padStart(2, '0')}</span>
        <span class="social-tile__format">${format}</span>
      </span>
      <span class="social-tile__media">
        <img src="${encodeURI(src)}" alt="${esc(it.title)} — ${esc(galCatLabel[it.cat] || '')}"
          width="${w}" height="${h}" loading="lazy" decoding="async">
      </span>
      <span class="social-tile__meta">
        <strong>${esc(it.title)}</strong>
        <span aria-hidden="true">↗</span>
      </span>
    </button>`;
  };

  const socialShowcaseHTML = (items, label) =>
    `<div class="rail rail--social" data-reveal>
      <div class="rail__head">
        <div>
          <h3 class="rail__title">${esc(label)}<sup>${items.length}</sup></h3>
          <p class="rail__note">Campaign-ready feed creatives · swipe through the series</p>
        </div>
        <div class="rail__nav">
          <button class="rail__btn" data-rail-prev aria-label="Scroll ${esc(label)} back">←</button>
          <button class="rail__btn" data-rail-next aria-label="Scroll ${esc(label)} forward">→</button>
        </div>
      </div>
      <div class="rail__track social-carousel" data-rail-track role="group" aria-label="${esc(label)} — ${items.length} pieces">
        ${items.map(socialCardHTML).join('')}
      </div>
    </div>`;

  const festivalCardHTML = (it, index) => {
    const [src, w, h] = it.thumb || it.cover;
    return `<button class="festival-card" data-gal-open="${esc(it.id)}" data-cursor-view="View"
      aria-label="View moment: ${esc(it.title)}">
      <span class="festival-card__tab" aria-hidden="true">
        <small>Moment</small>
        <b>${String(index + 1).padStart(2, '0')}</b>
      </span>
      <span class="festival-card__media">
        <img src="${encodeURI(src)}" alt="${esc(it.title)} — ${esc(galCatLabel[it.cat] || '')}"
          width="${w}" height="${h}" loading="lazy" decoding="async">
      </span>
      <span class="festival-card__meta">
        <span>
          <small class="mono-label">Cultural calendar</small>
          <strong>${esc(it.title)}</strong>
        </span>
        <span class="festival-card__open" aria-hidden="true">View ↗</span>
      </span>
    </button>`;
  };

  const festivalShowcaseHTML = (items, label) =>
    `<div class="rail rail--festivals" data-reveal>
      <div class="rail__head">
        <div>
          <h3 class="rail__title">${esc(label)}<sup>${items.length}</sup></h3>
          <p class="rail__note">A cultural calendar · festivals, observances and live moments</p>
        </div>
        <div class="rail__nav">
          <button class="rail__btn" data-rail-prev aria-label="Scroll ${esc(label)} back">←</button>
          <button class="rail__btn" data-rail-next aria-label="Scroll ${esc(label)} forward">→</button>
        </div>
      </div>
      <div class="rail__track festival-timeline" data-rail-track role="group" aria-label="${esc(label)} — ${items.length} pieces">
        ${items.map(festivalCardHTML).join('')}
      </div>
    </div>`;

  const thumbnailCardHTML = (it, index) => {
    const [src, w, h] = it.thumb || it.cover;
    return `<button class="thumbnail-card" data-gal-open="${esc(it.id)}" data-cursor-view="View"
      aria-label="View YouTube thumbnail: ${esc(it.title)}">
      <span class="thumbnail-card__chrome" aria-hidden="true">
        <span class="thumbnail-card__lights"><i></i><i></i><i></i></span>
        <span class="mono-label">Video ${String(index + 1).padStart(2, '0')}</span>
        <span class="thumbnail-card__ratio">16:9</span>
      </span>
      <span class="thumbnail-card__screen">
        <img src="${encodeURI(src)}" alt="${esc(it.title)} — ${esc(galCatLabel[it.cat] || '')}"
          width="${w}" height="${h}" loading="lazy" decoding="async">
        <span class="thumbnail-card__play" aria-hidden="true">▶</span>
        <span class="thumbnail-card__progress" aria-hidden="true"><i></i></span>
      </span>
      <span class="thumbnail-card__meta">
        <span>
          <small class="mono-label">YouTube thumbnail</small>
          <strong>${esc(it.title)}</strong>
        </span>
        <span class="thumbnail-card__open" aria-hidden="true">Open ↗</span>
      </span>
    </button>`;
  };

  const thumbnailShowcaseHTML = (items, label) =>
    `<div class="rail rail--thumbnails" data-reveal>
      <div class="rail__head">
        <div>
          <h3 class="rail__title">${esc(label)}<sup>${items.length}</sup></h3>
          <p class="rail__note">Editorial video covers · built for the first click</p>
        </div>
        <div class="rail__nav">
          <button class="rail__btn" data-rail-prev aria-label="Scroll ${esc(label)} back">←</button>
          <button class="rail__btn" data-rail-next aria-label="Scroll ${esc(label)} forward">→</button>
        </div>
      </div>
      <div class="rail__track thumbnail-reel" data-rail-track role="group" aria-label="${esc(label)} — ${items.length} pieces">
        ${items.map(thumbnailCardHTML).join('')}
      </div>
    </div>`;

  const bannerCardHTML = (it, index, total) => {
    const [src, w, h] = it.thumb || it.cover;
    const [, fullW, fullH] = it.cover || it.thumb;
    return `<button class="banner-browser" style="--banner-ar: ${w} / ${h}" data-gal-open="${esc(it.id)}"
      data-cursor-view="View" aria-label="View website banner: ${esc(it.title)}">
      <span class="banner-browser__chrome" aria-hidden="true">
        <span class="banner-browser__lights"><i></i><i></i><i></i></span>
        <span class="banner-browser__address"><i>●</i> campaign.preview / ${String(index + 1).padStart(2, '0')}</span>
        <span class="mono-label">${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}</span>
      </span>
      <span class="banner-browser__viewport">
        <img src="${encodeURI(src)}" alt="${esc(it.title)} — ${esc(galCatLabel[it.cat] || '')}"
          width="${w}" height="${h}" loading="lazy" decoding="async">
        <span class="banner-browser__status" aria-hidden="true"><i></i></span>
      </span>
      <span class="banner-browser__meta">
        <span>
          <small class="mono-label">Live campaign canvas · ${fullW} × ${fullH}</small>
          <strong>${esc(it.title)}</strong>
        </span>
        <span class="banner-browser__open" aria-hidden="true">Inspect ↗</span>
      </span>
    </button>`;
  };

  const bannerShowcaseHTML = (items, label) =>
    `<div class="rail rail--banners" data-reveal>
      <div class="rail__head">
        <div>
          <span class="mono-label banner-lab__eyebrow">Responsive display lab</span>
          <h3 class="rail__title">${esc(label)}<sup>${items.length}</sup></h3>
          <p class="rail__note">Campaign canvases · previewed at their native proportions</p>
        </div>
        <div class="rail__nav">
          <button class="rail__btn" data-rail-prev aria-label="Scroll ${esc(label)} back">←</button>
          <button class="rail__btn" data-rail-next aria-label="Scroll ${esc(label)} forward">→</button>
        </div>
      </div>
      <div class="rail__track banner-browser-strip" data-rail-track role="group"
        aria-label="${esc(label)} — ${items.length} pieces">
        ${items.map((it, index) => bannerCardHTML(it, index, items.length)).join('')}
      </div>
    </div>`;

  const flyerShowcaseHTML = (items, label) =>
    `<section class="rail rail--flyers flyer-slider" data-flyer-slider data-reveal aria-labelledby="flyer-slider-title">
      <header class="flyer-slider__head">
        <div>
          <span class="mono-label flyer-slider__eyebrow">Print editions · ${items.length} selected pieces</span>
          <h3 class="flyer-slider__title" id="flyer-slider-title">Flyers <em>&amp; posters</em></h3>
          <p class="rail__note">Promotional print, event communication and campaign collateral</p>
        </div>
        <div class="flyer-slider__active" aria-live="polite">
          <small class="mono-label">Selected artwork</small>
          <strong data-flyer-active-label>${esc(items[Math.min(1, items.length - 1)].title)}</strong>
        </div>
      </header>
      <div class="flyer-slider__stage" data-flyer-stage tabindex="0" role="group"
        aria-label="${esc(label)} — overlapping artwork slider">
        ${items.map((it, index) => {
          const [src, w, h] = it.thumb || it.cover;
          return `<button class="flyer-slider__card" style="--flyer-ar: ${w} / ${h}"
            data-flyer-card="${index}" data-flyer-id="${esc(it.id)}" aria-label="Select ${esc(it.title)}">
            <span class="flyer-slider__art">
              <img src="${encodeURI(src)}" alt="${esc(it.title)} — ${esc(label)}"
                width="${w}" height="${h}" loading="lazy" decoding="async">
              <span class="flyer-slider__folio mono-label" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>
            </span>
          </button>`;
        }).join('')}
      </div>
      <footer class="flyer-slider__footer">
        <span class="flyer-slider__progress" aria-hidden="true"><i data-flyer-progress></i></span>
        <div class="flyer-slider__indices" aria-label="Choose artwork">
          ${items.map((it, index) => `<button data-flyer-go="${index}" aria-label="Show artwork ${index + 1}: ${esc(it.title)}">${index + 1}</button>`).join('')}
        </div>
      </footer>
      <p class="flyer-slider__hint">Select a side piece to bring it forward · open the centre artwork for full view</p>
    </section>`;

  const interiorShowcaseHTML = (items, label) => {
    const series = [
      {
        key: 'araya',
        name: 'Araya Estates',
        location: 'Noida · Uttarakhand',
        discipline: 'Property campaigns',
        note: 'High-ticket listings shaped with a quieter, hospitality-led visual language.',
        items: items.filter(it => it.title.toLowerCase().startsWith('aaraya'))
      },
      {
        key: 'kosha',
        name: 'Kosha Spaces',
        location: 'Dubai · Residential',
        discipline: 'Interior storytelling',
        note: 'Editorial social systems designed to feel as considered as the spaces themselves.',
        items: items.filter(it => !it.title.toLowerCase().startsWith('aaraya'))
      }
    ].filter(group => group.items.length);
    const initial = series[0];
    const allCards = series.flatMap(group => group.items.map((it, index) => ({ it, index, group })));

    return `<section class="rail rail--interior interior-dossier" data-interior-showcase data-reveal
      aria-labelledby="interior-dossier-title">
      <header class="interior-dossier__head">
        <div>
          <span class="mono-label interior-dossier__eyebrow">Spatial brand systems · ${items.length} selected pieces</span>
          <h3 class="interior-dossier__title" id="interior-dossier-title">Interior <em>&amp; real estate</em></h3>
        </div>
        <p>Two brands. One measured visual language for spaces, listings and considered living.</p>
      </header>

      <div class="interior-dossier__series" role="tablist" aria-label="Choose project series">
        ${series.map((group, index) => `<button role="tab" data-interior-tab="${esc(group.key)}"
          aria-selected="${index === 0 ? 'true' : 'false'}">
          <span>0${index + 1}</span><strong>${esc(group.name)}</strong><small>${group.items.length} pieces</small>
        </button>`).join('')}
      </div>

      <div class="interior-dossier__board">
        <aside class="interior-dossier__brief">
          <span class="mono-label" data-interior-series-label>Series 01 / ${String(series.length).padStart(2, '0')}</span>
          <h4 data-interior-brand>${esc(initial.name)}</h4>
          <p data-interior-copy>${esc(initial.note)}</p>
          <dl>
            <div><dt>Location</dt><dd data-interior-location>${esc(initial.location)}</dd></div>
            <div><dt>Discipline</dt><dd data-interior-discipline>${esc(initial.discipline)}</dd></div>
            <div><dt>Editions</dt><dd data-interior-count>${String(initial.items.length).padStart(2, '0')}</dd></div>
          </dl>
          <div class="interior-dossier__step">
            <button data-interior-prev aria-label="Previous interior artwork">Prev</button>
            <span><b data-interior-current>01</b> / <span data-interior-total>${String(initial.items.length).padStart(2, '0')}</span></span>
            <button data-interior-next aria-label="Next interior artwork">Next</button>
          </div>
        </aside>

        <div class="interior-dossier__stage" data-interior-stage tabindex="0" role="group"
          aria-label="${esc(label)} — architectural artwork viewer">
          <span class="interior-dossier__grid" aria-hidden="true"></span>
          <span class="interior-dossier__coordinate interior-dossier__coordinate--top mono-label" aria-hidden="true">28.5355° N</span>
          <span class="interior-dossier__coordinate interior-dossier__coordinate--side mono-label" aria-hidden="true">77.3910° E</span>
          ${allCards.map(({ it, index, group }) => {
            const [src, w, h] = it.thumb || it.cover;
            return `<button class="interior-dossier__card" style="--interior-ar: ${w} / ${h}"
              data-interior-card="${index}" data-interior-series="${esc(group.key)}" data-interior-id="${esc(it.id)}"
              aria-label="Select ${esc(it.title)}">
              <span class="interior-dossier__frame">
                <img src="${encodeURI(src)}" alt="${esc(it.title)} — ${esc(group.name)}"
                  width="${w}" height="${h}" loading="lazy" decoding="async">
                <span class="interior-dossier__folio mono-label" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>
              </span>
            </button>`;
          }).join('')}
          <div class="interior-dossier__caption" aria-live="polite">
            <small class="mono-label">Selected campaign frame</small>
            <strong data-interior-active-title>${esc(initial.items[0].title)}</strong>
          </div>
        </div>
      </div>

      <footer class="interior-dossier__index">
        <div class="interior-dossier__progress" aria-hidden="true"><i data-interior-progress></i></div>
        <div class="interior-dossier__thumbs" data-interior-thumbs aria-label="Artwork index">
          ${allCards.map(({ it, index, group }) => {
            const [src, w, h] = it.thumb || it.cover;
            return `<button data-interior-go="${index}" data-interior-series="${esc(group.key)}"
              aria-label="Show ${esc(group.name)} artwork ${index + 1}: ${esc(it.title)}">
              <img src="${encodeURI(src)}" alt="" width="${w}" height="${h}" loading="lazy" decoding="async">
              <span>${String(index + 1).padStart(2, '0')}</span>
            </button>`;
          }).join('')}
        </div>
        <p>Choose a frame · swipe or use the touchpad · open the centre piece for full view</p>
      </footer>
    </section>`;
  };

  const aiShowcaseHTML = (items, label) => `
    <section class="rail rail--ai-ads ai-coverflow" data-ai-coverflow data-reveal aria-labelledby="ai-coverflow-title">
      <header class="ai-coverflow__head">
        <div>
          <span class="mono-label ai-coverflow__eyebrow">AI ad campaigns · ${items.length} concepts</span>
          <h3 class="ai-coverflow__title" id="ai-coverflow-title">Parachute <em>visual worlds</em></h3>
        </div>
        <p class="mono-label ai-coverflow__context">Coconut Oil · Spec Campaign · 2026</p>
      </header>
      <div class="ai-coverflow__stage" role="group" aria-label="${esc(label)} — interactive coverflow">
        ${items.map((it, i) => {
          const [src, w, h] = it.thumb || it.cover;
          return `<button class="ai-coverflow__card" data-ai-card="${esc(it.id)}" data-ai-index="${i}"
            aria-label="Select concept ${i + 1}: ${esc(it.title)}">
            <span class="ai-coverflow__media">
              <img src="${encodeURI(src)}" alt="${esc(it.title)}" width="${w}" height="${h}" loading="lazy" decoding="async">
            </span>
            <span class="ai-coverflow__card-copy">
              <strong>Concept ${String(i + 1).padStart(2, '0')}</strong>
              <small>Parachute · AI art direction</small>
            </span>
          </button>`;
        }).join('')}
      </div>
    </section>`;

  const initGallery = () => {
    if (!railsWrap || !GAL.items.length || railsWrap.dataset.galleryReady === 'true') return;
    railsWrap.dataset.galleryReady = 'true';
    railsWrap.innerHTML = GAL.categories.map(([key, label]) => {
      const items = GAL.items.filter(it => it.cat === key);
      if (!items.length) return '';
      if (key === 'ai-ads') return aiShowcaseHTML(items, label);
      if (key === 'social') return socialShowcaseHTML(items, label);
      if (key === 'festivals') return festivalShowcaseHTML(items, label);
      if (key === 'thumbnails') return thumbnailShowcaseHTML(items, label);
      if (key === 'banners') return bannerShowcaseHTML(items, label);
      if (key === 'flyers') return flyerShowcaseHTML(items, label);
      if (key === 'interior') return interiorShowcaseHTML(items, label);
      return `
        <div class="rail rail--${esc(key)}" data-reveal>
          <div class="rail__head">
            <div>
              <h3 class="rail__title">${esc(label)}<sup>${items.length}</sup></h3>
              ${key === 'carousels' ? '<p class="rail__note">Multi-slide stories · stacked to reveal the sequence</p>' : ''}
              ${key === 'decks' ? '<p class="rail__note">Presentation systems · layered slide previews</p>' : ''}
            </div>
            <div class="rail__nav">
              <button class="rail__btn" data-rail-prev aria-label="Scroll ${esc(label)} back">←</button>
              <button class="rail__btn" data-rail-next aria-label="Scroll ${esc(label)} forward">→</button>
            </div>
          </div>
          <div class="rail__track" data-rail-track role="group" aria-label="${esc(label)} — ${items.length} pieces">
            ${items.map(galCardHTML).join('')}
          </div>
        </div>`;
    }).join('');

    // Reference-style 3D coverflow for AI campaign concepts.
    const aiFlow = railsWrap.querySelector('[data-ai-coverflow]');
    if (aiFlow) {
      const aiCards = [...aiFlow.querySelectorAll('[data-ai-card]')];
      const total = aiCards.length;
      let active = Math.floor(total / 2);
      let autoTimer = 0;
      let resumeTimer = 0;
      let wheelDelta = 0;
      let lastWheelStep = 0;
      let touchStartX = 0;
      let touchStartY = 0;
      let inView = false;
      let hoverPaused = false;
      let focusPaused = false;
      // Match the card transition so the next concept starts as soon as the
      // current movement settles, without a static pause between slides.
      const AUTO_DELAY = 680;
      const MANUAL_PAUSE = 720;
      const states = ['is-active', 'is-before-1', 'is-before-2', 'is-after-1', 'is-after-2', 'is-far'];

      const renderAiFlow = next => {
        active = (next + total) % total;
        aiCards.forEach((card, i) => {
          let delta = i - active;
          if (delta > total / 2) delta -= total;
          if (delta < -total / 2) delta += total;
          const state = delta === 0 ? 'is-active'
            : delta === -1 ? 'is-before-1'
              : delta === -2 ? 'is-before-2'
                : delta === 1 ? 'is-after-1'
                  : delta === 2 ? 'is-after-2'
                    : 'is-far';
          card.classList.remove(...states);
          card.classList.add(state);
          const visible = Math.abs(delta) <= 2;
          card.tabIndex = visible ? 0 : -1;
          card.setAttribute('aria-hidden', visible ? 'false' : 'true');
          card.setAttribute('aria-pressed', delta === 0 ? 'true' : 'false');
          card.setAttribute('aria-label', `${delta === 0 ? 'Open' : 'Bring forward'} concept ${i + 1}`);
          card.dataset.cursorView = delta === 0 ? 'View' : 'Focus';
        });
      };

      const stopAiAuto = () => {
        window.clearInterval(autoTimer);
        autoTimer = 0;
      };

      const startAiAuto = () => {
        stopAiAuto();
        if (REDUCED || !inView || hoverPaused || focusPaused || document.hidden) return;
        autoTimer = window.setInterval(() => renderAiFlow(active + 1), AUTO_DELAY);
      };

      const restartAiAutoSoon = () => {
        stopAiAuto();
        window.clearTimeout(resumeTimer);
        resumeTimer = window.setTimeout(startAiAuto, MANUAL_PAUSE);
      };

      const stepAiFlow = direction => {
        SFX.flip();
        renderAiFlow(active + direction);
        restartAiAutoSoon();
      };

      aiFlow.addEventListener('click', e => {
        const card = e.target.closest('[data-ai-card]');
        if (!card) return;
        const index = Number(card.dataset.aiIndex);
        if (index === active) {
          stopAiAuto();
          openLb(card.dataset.aiCard);
        } else {
          SFX.flip();
          renderAiFlow(index);
          restartAiAutoSoon();
        }
      });
      aiFlow.addEventListener('keydown', e => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); stepAiFlow(-1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); stepAiFlow(1); }
      });

      // Precision touchpads report horizontal gestures as wheel deltaX. Accumulate
      // small deltas, advance once per gesture, and keep normal vertical scrolling.
      aiFlow.addEventListener('wheel', e => {
        if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) * 1.1) return;
        e.preventDefault();
        wheelDelta += e.deltaX;
        const now = performance.now();
        if (Math.abs(wheelDelta) >= 42 && now - lastWheelStep > 420) {
          stepAiFlow(wheelDelta > 0 ? 1 : -1);
          wheelDelta = 0;
          lastWheelStep = now;
        }
      }, { passive: false });

      aiFlow.addEventListener('touchstart', e => {
        const touch = e.changedTouches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        stopAiAuto();
      }, { passive: true });

      aiFlow.addEventListener('touchend', e => {
        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - touchStartX;
        const deltaY = touch.clientY - touchStartY;
        if (Math.abs(deltaX) >= 44 && Math.abs(deltaX) > Math.abs(deltaY) * 1.15) {
          stepAiFlow(deltaX < 0 ? 1 : -1);
        } else {
          restartAiAutoSoon();
        }
      });

      if (window.matchMedia('(hover: hover)').matches) {
        aiFlow.addEventListener('mouseenter', () => { hoverPaused = true; stopAiAuto(); });
        aiFlow.addEventListener('mouseleave', () => { hoverPaused = false; startAiAuto(); });
      }

      aiFlow.addEventListener('focusin', () => { focusPaused = true; stopAiAuto(); });
      aiFlow.addEventListener('focusout', e => {
        if (aiFlow.contains(e.relatedTarget)) return;
        focusPaused = false;
        startAiAuto();
      });

      document.addEventListener('visibilitychange', () => {
        if (document.hidden) stopAiAuto();
        else startAiAuto();
      });

      document.addEventListener('click', e => {
        if (e.target.closest('[data-lb-close]')) restartAiAutoSoon();
      });

      const aiVisibility = new IntersectionObserver(([entry]) => {
        inView = entry.isIntersecting && entry.intersectionRatio >= 0.25;
        if (inView) startAiAuto();
        else stopAiAuto();
      }, { threshold: [0, 0.25, 0.6] });
      aiVisibility.observe(aiFlow);
      renderAiFlow(active);
    }

    // Reference-inspired overlapping editorial slider for flyers and posters.
    const flyerSlider = railsWrap.querySelector('[data-flyer-slider]');
    if (flyerSlider) {
      const flyerStage = flyerSlider.querySelector('[data-flyer-stage]');
      const flyerCards = [...flyerSlider.querySelectorAll('[data-flyer-card]')];
      const flyerControls = [...flyerSlider.querySelectorAll('[data-flyer-go]')];
      const flyerProgress = flyerSlider.querySelector('[data-flyer-progress]');
      const flyerActiveLabel = flyerSlider.querySelector('[data-flyer-active-label]');
      const flyerItems = GAL.items.filter(it => it.cat === 'flyers');
      const flyerTotal = flyerCards.length;
      let flyerActive = Math.min(1, flyerTotal - 1);
      let flyerStartX = 0, flyerStartY = 0, flyerDragged = false;
      let flyerWheel = 0, flyerWheelAt = 0;

      const flyerRender = next => {
        flyerActive = (next + flyerTotal) % flyerTotal;
        flyerCards.forEach((card, index) => {
          let position = (index - flyerActive + flyerTotal) % flyerTotal;
          if (position > flyerTotal / 2) position -= flyerTotal;
          if (position === flyerTotal / 2) position = -position;
          position = Math.max(-3, Math.min(2, position));
          const isActive = position === 0;
          card.dataset.position = String(position);
          card.setAttribute('aria-pressed', String(isActive));
          card.tabIndex = Math.abs(position) <= 1 ? 0 : -1;
          card.setAttribute('aria-label', `${isActive ? 'Open' : 'Select'} ${flyerItems[index].title}`);
          if (isActive) {
            card.dataset.galOpen = card.dataset.flyerId;
            card.dataset.cursorView = 'View';
          } else {
            delete card.dataset.galOpen;
            delete card.dataset.cursorView;
          }
        });
        flyerControls.forEach((control, index) => {
          const selected = index === flyerActive;
          control.classList.toggle('is-active', selected);
          if (selected) control.setAttribute('aria-current', 'true');
          else control.removeAttribute('aria-current');
        });
        flyerProgress.style.transform = `scaleX(${(flyerActive + 1) / flyerTotal})`;
        flyerActiveLabel.textContent = flyerItems[flyerActive].title;
      };
      const flyerStep = direction => { SFX.flip(); flyerRender(flyerActive + direction); };

      flyerSlider.addEventListener('click', e => {
        if (flyerDragged) {
          flyerDragged = false;
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        const control = e.target.closest('[data-flyer-go]');
        if (control) {
          SFX.flip();
          flyerRender(Number(control.dataset.flyerGo));
          return;
        }
        const card = e.target.closest('[data-flyer-card]');
        if (!card) return;
        const index = Number(card.dataset.flyerCard);
        if (index !== flyerActive) {
          e.preventDefault();
          SFX.flip();
          flyerRender(index);
        }
      });
      flyerStage.addEventListener('keydown', e => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); flyerStep(-1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); flyerStep(1); }
        else if (e.key === 'Home') { e.preventDefault(); flyerRender(0); }
        else if (e.key === 'End') { e.preventDefault(); flyerRender(flyerTotal - 1); }
      });
      flyerStage.addEventListener('wheel', e => {
        if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) * 1.1) return;
        e.preventDefault();
        flyerWheel += e.deltaX;
        const now = performance.now();
        if (Math.abs(flyerWheel) >= 38 && now - flyerWheelAt > 360) {
          flyerStep(flyerWheel > 0 ? 1 : -1);
          flyerWheel = 0;
          flyerWheelAt = now;
        }
      }, { passive: false });
      flyerStage.addEventListener('pointerdown', e => {
        if (!e.isPrimary) return;
        flyerStartX = e.clientX;
        flyerStartY = e.clientY;
        flyerDragged = false;
      }, { passive: true });
      flyerStage.addEventListener('pointerup', e => {
        if (!e.isPrimary) return;
        const deltaX = e.clientX - flyerStartX;
        const deltaY = e.clientY - flyerStartY;
        if (Math.abs(deltaX) >= 44 && Math.abs(deltaX) > Math.abs(deltaY) * 1.15) {
          flyerDragged = true;
          flyerStep(deltaX < 0 ? 1 : -1);
        }
      }, { passive: true });
      flyerStage.addEventListener('pointercancel', () => { flyerDragged = false; }, { passive: true });
      flyerRender(flyerActive);
    }

    // Spatial dossier for the two property and interiors brand systems.
    const interiorShowcase = railsWrap.querySelector('[data-interior-showcase]');
    if (interiorShowcase) {
      const interiorStage = interiorShowcase.querySelector('[data-interior-stage]');
      const interiorCards = [...interiorShowcase.querySelectorAll('[data-interior-card]')];
      const interiorThumbs = [...interiorShowcase.querySelectorAll('[data-interior-go]')];
      const interiorTabs = [...interiorShowcase.querySelectorAll('[data-interior-tab]')];
      const interiorThumbStrip = interiorShowcase.querySelector('[data-interior-thumbs]');
      const interiorProgress = interiorShowcase.querySelector('[data-interior-progress]');
      const interiorBrand = interiorShowcase.querySelector('[data-interior-brand]');
      const interiorCopy = interiorShowcase.querySelector('[data-interior-copy]');
      const interiorLocation = interiorShowcase.querySelector('[data-interior-location]');
      const interiorDiscipline = interiorShowcase.querySelector('[data-interior-discipline]');
      const interiorCount = interiorShowcase.querySelector('[data-interior-count]');
      const interiorCurrent = interiorShowcase.querySelector('[data-interior-current]');
      const interiorTotal = interiorShowcase.querySelector('[data-interior-total]');
      const interiorSeriesLabel = interiorShowcase.querySelector('[data-interior-series-label]');
      const interiorActiveTitle = interiorShowcase.querySelector('[data-interior-active-title]');
      const interiorItems = GAL.items.filter(it => it.cat === 'interior');
      const interiorSeries = {
        araya: {
          name: 'Araya Estates', location: 'Noida · Uttarakhand', discipline: 'Property campaigns',
          copy: 'High-ticket listings shaped with a quieter, hospitality-led visual language.',
          items: interiorItems.filter(it => it.title.toLowerCase().startsWith('aaraya'))
        },
        kosha: {
          name: 'Kosha Spaces', location: 'Dubai · Residential', discipline: 'Interior storytelling',
          copy: 'Editorial social systems designed to feel as considered as the spaces themselves.',
          items: interiorItems.filter(it => !it.title.toLowerCase().startsWith('aaraya'))
        }
      };
      const interiorSeriesKeys = Object.keys(interiorSeries).filter(key => interiorSeries[key].items.length);
      const interiorActiveBySeries = Object.fromEntries(interiorSeriesKeys.map(key => [key, 0]));
      let interiorSeriesKey = interiorSeriesKeys[0];
      let interiorStartX = 0, interiorStartY = 0, interiorDragged = false;
      let interiorWheel = 0, interiorWheelAt = 0;

      const renderInterior = (next, shouldScroll = false) => {
        const group = interiorSeries[interiorSeriesKey];
        const total = group.items.length;
        const active = (next + total) % total;
        interiorActiveBySeries[interiorSeriesKey] = active;

        interiorCards.forEach(card => {
          const inSeries = card.dataset.interiorSeries === interiorSeriesKey;
          card.hidden = !inSeries;
          if (!inSeries) {
            card.tabIndex = -1;
            card.removeAttribute('data-position');
            delete card.dataset.galOpen;
            delete card.dataset.cursorView;
            return;
          }
          const index = Number(card.dataset.interiorCard);
          let position = index - active;
          if (position > total / 2) position -= total;
          if (position < -total / 2) position += total;
          const isActive = position === 0;
          card.dataset.position = String(Math.max(-2, Math.min(2, position)));
          card.tabIndex = Math.abs(position) <= 1 ? 0 : -1;
          card.setAttribute('aria-hidden', Math.abs(position) <= 1 ? 'false' : 'true');
          card.setAttribute('aria-pressed', String(isActive));
          card.setAttribute('aria-label', `${isActive ? 'Open' : 'Bring forward'} ${group.items[index].title}`);
          if (isActive) {
            card.dataset.galOpen = card.dataset.interiorId;
            card.dataset.cursorView = 'View';
          } else {
            delete card.dataset.galOpen;
            delete card.dataset.cursorView;
          }
        });

        let selectedThumb = null;
        interiorThumbs.forEach(thumb => {
          const inSeries = thumb.dataset.interiorSeries === interiorSeriesKey;
          const selected = inSeries && Number(thumb.dataset.interiorGo) === active;
          thumb.hidden = !inSeries;
          thumb.classList.toggle('is-active', selected);
          if (selected) {
            thumb.setAttribute('aria-current', 'true');
            selectedThumb = thumb;
          } else thumb.removeAttribute('aria-current');
        });

        interiorTabs.forEach(tab => {
          const selected = tab.dataset.interiorTab === interiorSeriesKey;
          tab.setAttribute('aria-selected', String(selected));
          tab.tabIndex = selected ? 0 : -1;
        });

        const seriesNumber = interiorSeriesKeys.indexOf(interiorSeriesKey) + 1;
        interiorSeriesLabel.textContent = `Series ${String(seriesNumber).padStart(2, '0')} / ${String(interiorSeriesKeys.length).padStart(2, '0')}`;
        interiorBrand.textContent = group.name;
        interiorCopy.textContent = group.copy;
        interiorLocation.textContent = group.location;
        interiorDiscipline.textContent = group.discipline;
        interiorCount.textContent = String(total).padStart(2, '0');
        interiorCurrent.textContent = String(active + 1).padStart(2, '0');
        interiorTotal.textContent = String(total).padStart(2, '0');
        interiorActiveTitle.textContent = group.items[active].title;
        interiorProgress.style.transform = `scaleX(${(active + 1) / total})`;
        if (shouldScroll && selectedThumb) {
          interiorThumbStrip.scrollTo({
            left: selectedThumb.offsetLeft - (interiorThumbStrip.clientWidth - selectedThumb.offsetWidth) / 2,
            behavior: REDUCED ? 'auto' : 'smooth'
          });
        }
      };

      const stepInterior = direction => {
        SFX.flip();
        renderInterior(interiorActiveBySeries[interiorSeriesKey] + direction, true);
      };

      interiorShowcase.addEventListener('click', e => {
        if (interiorDragged) {
          interiorDragged = false;
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        const tab = e.target.closest('[data-interior-tab]');
        if (tab) {
          interiorSeriesKey = tab.dataset.interiorTab;
          SFX.flip();
          renderInterior(interiorActiveBySeries[interiorSeriesKey], true);
          return;
        }
        const thumb = e.target.closest('[data-interior-go]');
        if (thumb && thumb.dataset.interiorSeries === interiorSeriesKey) {
          SFX.flip();
          renderInterior(Number(thumb.dataset.interiorGo), true);
          return;
        }
        if (e.target.closest('[data-interior-prev]')) { stepInterior(-1); return; }
        if (e.target.closest('[data-interior-next]')) { stepInterior(1); return; }
        const card = e.target.closest('[data-interior-card]');
        if (!card || card.dataset.interiorSeries !== interiorSeriesKey) return;
        const index = Number(card.dataset.interiorCard);
        if (index !== interiorActiveBySeries[interiorSeriesKey]) {
          e.preventDefault();
          e.stopPropagation();
          SFX.flip();
          renderInterior(index, true);
        }
      });

      interiorStage.addEventListener('keydown', e => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); stepInterior(-1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); stepInterior(1); }
        else if (e.key === 'Home') { e.preventDefault(); renderInterior(0, true); }
        else if (e.key === 'End') { e.preventDefault(); renderInterior(interiorSeries[interiorSeriesKey].items.length - 1, true); }
      });

      interiorStage.addEventListener('wheel', e => {
        if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) * 1.1) return;
        e.preventDefault();
        interiorWheel += e.deltaX;
        const now = performance.now();
        if (Math.abs(interiorWheel) >= 38 && now - interiorWheelAt > 360) {
          stepInterior(interiorWheel > 0 ? 1 : -1);
          interiorWheel = 0;
          interiorWheelAt = now;
        }
      }, { passive: false });

      interiorStage.addEventListener('pointerdown', e => {
        if (!e.isPrimary) return;
        interiorStartX = e.clientX;
        interiorStartY = e.clientY;
        interiorDragged = false;
      }, { passive: true });
      interiorStage.addEventListener('pointerup', e => {
        if (!e.isPrimary) return;
        const deltaX = e.clientX - interiorStartX;
        const deltaY = e.clientY - interiorStartY;
        if (Math.abs(deltaX) >= 44 && Math.abs(deltaX) > Math.abs(deltaY) * 1.15) {
          interiorDragged = true;
          stepInterior(deltaX < 0 ? 1 : -1);
        }
      }, { passive: true });
      interiorStage.addEventListener('pointercancel', () => { interiorDragged = false; }, { passive: true });

      renderInterior(0);
    }

    // arrow buttons page the rail
    railsWrap.addEventListener('click', e => {
      const btn = e.target.closest('[data-rail-prev], [data-rail-next]');
      if (!btn) return;
      const track = btn.closest('.rail').querySelector('[data-rail-track]');
      const dir = btn.hasAttribute('data-rail-next') ? 1 : -1;
      recenterRail(track, true); // make room before the smooth glide starts
      track.scrollBy({ left: dir * track.clientWidth * 0.85, behavior: REDUCED ? 'auto' : 'smooth' });
    });

    // mouse drag-to-scroll; a real drag must not fire the card click
    let dragTrack = null, dragStartX = 0, dragStartLeft = 0, dragDist = 0;
    railsWrap.addEventListener('pointerdown', e => {
      const track = e.target.closest('[data-rail-track]');
      if (!track || e.pointerType !== 'mouse') return; // touch scrolls natively
      dragTrack = track; dragStartX = e.clientX; dragStartLeft = track.scrollLeft; dragDist = 0;
    });
    window.addEventListener('pointermove', e => {
      if (!dragTrack) return;
      const dx = e.clientX - dragStartX;
      dragDist = Math.max(dragDist, Math.abs(dx));
      if (dragDist > 6) dragTrack.classList.add('is-dragging');
      dragTrack.scrollLeft = dragStartLeft - dx;
    });
    window.addEventListener('pointerup', () => {
      if (!dragTrack) return;
      dragTrack.classList.remove('is-dragging');
      dragTrack = null;
    });
    railsWrap.addEventListener('click', e => {
      if (dragDist > 8) { e.stopPropagation(); e.preventDefault(); }
      dragDist = 0;
    }, true);

    // infinite loop — each rail's card set is cloned enough times that a
    // silent jump by an exact set-width lands on identical pixels, so the
    // rail can scroll forever in either direction
    const tracks = [...railsWrap.querySelectorAll('[data-rail-track]')];
    const loopTracks = tracks.filter(track => track.closest('.rail--thumbnails, .rail--banners'));
    const loopState = new Map();
    const setupRailLoop = track => {
      let st = loopState.get(track);
      if (!st) { st = { originals: [...track.children], copies: 1 }; loopState.set(track, st); }
      const o = st.originals;
      if (!o.length) return;
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      st.setW = o[o.length - 1].offsetLeft + o[o.length - 1].offsetWidth - o[0].offsetLeft + gap;
      if (!st.setW) return;
      const cw = track.clientWidth;
      // zone must stay above the worst drift mid smooth-glide (0.5 set + 0.85 view)
      st.zone = st.setW * 0.5 + cw;
      const need = Math.max(3, Math.ceil((2 * st.zone + 2.5 * cw) / st.setW));
      while (st.copies < need) {
        for (const card of o) {
          const clone = card.cloneNode(true);
          clone.setAttribute('aria-hidden', 'true');
          clone.tabIndex = -1;
          track.appendChild(clone);
        }
        st.copies++;
      }
      // cache layout reads for the hot scroll handlers: geometry only changes
      // here (cloning) and on resize, which both re-run setupRailLoop
      st.half = (track.scrollWidth - track.clientWidth) / 2;
      st.centers = [...track.children].map(c => c.offsetLeft + c.offsetWidth / 2);
    };
    const recenterRail = (track, tight) => {
      const st = loopState.get(track);
      if (!st || !st.setW) return;
      const drift = track.scrollLeft - st.half; // cached: no scrollWidth reflow per scroll event
      if (Math.abs(drift) <= (tight ? st.setW * 0.5 : st.zone)) return;
      const delta = -Math.round(drift / st.setW) * st.setW;
      if (!delta) return;
      track.scrollLeft += delta;
      if (dragTrack === track) dragStartLeft += delta; // keep an active drag anchored
    };
    // Infinite copies are only necessary for the two autoplay rails. Keeping
    // manual shelves finite removes hundreds of duplicate cards and images.
    loopTracks.forEach(track => {
      setupRailLoop(track);
      recenterRail(track, true);
      track.addEventListener('scroll', () => recenterRail(track), { passive: true });
    });

    // soft ratchet ticks while a shelf spins — one tick per ~150px travelled
    let railTickAcc = 0, railTickLast = 0;
    const railLastSL = new Map();
    tracks.forEach(track => {
      railLastSL.set(track, track.scrollLeft);
      track.addEventListener('scroll', () => {
        const d = Math.abs(track.scrollLeft - railLastSL.get(track));
        railLastSL.set(track, track.scrollLeft);
        // Keep continuous rail autoplay silent; manual movement still ticks.
        if (track.dataset.autoScrolling === 'true') return;
        if (d > 400) return; // seamless loop-wrap jump, not real movement
        railTickAcc += d;
        const now = performance.now();
        if (railTickAcc > 150 && now - railTickLast > 85) {
          railTickAcc = 0;
          railTickLast = now;
          SFX.rail();
        }
      }, { passive: true });
    });
    window.addEventListener('resize', () => {
      loopTracks.forEach(t => { setupRailLoop(t); recenterRail(t, true); });
    }, { passive: true });

    // Continuous, seamless rails for the YouTube reel and website-banner lab.
    // Pointer/touch/wheel input takes priority, then autoplay resumes promptly.
    const setupContinuousRailAuto = (railSelector, speed) => {
      const autoRail = railsWrap.querySelector(railSelector);
      const autoTrack = autoRail && autoRail.querySelector('[data-rail-track]');
      if (!autoTrack || REDUCED) return;
      let autoRaf = null, autoLast = 0, autoInView = false, autoInteracting = false;
      let autoResumeTimer = null;
      let autoPosition = autoTrack.scrollLeft;

      const markAuto = value => { autoTrack.dataset.autoScrolling = value ? 'true' : 'false'; };
      const autoFrame = now => {
        if (!autoInView || doc.hidden) {
          autoRaf = null; autoLast = 0; markAuto(false); return;
        }
        if (!autoLast) autoLast = now;
        const delta = Math.min(now - autoLast, 64);
        autoLast = now;
        if (!autoInteracting) {
          markAuto(true);
          const actual = autoTrack.scrollLeft;
          // Preserve sub-pixel movement between frames, but resync after an
          // infinite-loop jump or a manual scroll changes the real position.
          if (Math.abs(actual - autoPosition) > 64) autoPosition = actual;
          autoPosition += speed * delta / 1000;
          autoTrack.scrollLeft = autoPosition;
        } else {
          markAuto(false);
        }
        autoRaf = requestAnimationFrame(autoFrame);
      };
      const startThumbnailAuto = () => {
        if (!autoInView || doc.hidden || autoRaf) return;
        autoLast = 0;
        autoPosition = autoTrack.scrollLeft;
        autoRaf = requestAnimationFrame(autoFrame);
      };
      const stopThumbnailAuto = () => {
        if (autoRaf) cancelAnimationFrame(autoRaf);
        autoRaf = null; autoLast = 0; markAuto(false);
      };
      const setThumbnailInteraction = active => {
        autoInteracting = active;
        markAuto(false);
        if (!active) {
          autoPosition = autoTrack.scrollLeft;
          startThumbnailAuto();
        }
      };
      const resumeThumbnailSoon = delay => {
        clearTimeout(autoResumeTimer);
        setThumbnailInteraction(true);
        autoResumeTimer = setTimeout(() => setThumbnailInteraction(false), delay);
      };

      autoTrack.addEventListener('pointerdown', () => {
        clearTimeout(autoResumeTimer);
        setThumbnailInteraction(true);
      }, { passive: true });
      window.addEventListener('pointerup', () => {
        if (autoInteracting) setThumbnailInteraction(false);
      }, { passive: true });
      window.addEventListener('pointercancel', () => {
        if (autoInteracting) setThumbnailInteraction(false);
      }, { passive: true });
      autoTrack.addEventListener('wheel', () => resumeThumbnailSoon(180), { passive: true });
      autoRail.addEventListener('click', e => {
        if (e.target.closest('[data-rail-prev], [data-rail-next]')) resumeThumbnailSoon(650);
      });

      let visibilityRaf = null;
      const syncAutoVisibility = () => {
        visibilityRaf = null;
        const rect = autoRail.getBoundingClientRect();
        const nextInView = rect.bottom > 0 && rect.top < window.innerHeight;
        if (nextInView === autoInView) return;
        autoInView = nextInView;
        if (autoInView) startThumbnailAuto();
        else stopThumbnailAuto();
      };
      const scheduleAutoVisibility = () => {
        if (!visibilityRaf) visibilityRaf = requestAnimationFrame(syncAutoVisibility);
      };
      window.addEventListener('scroll', scheduleAutoVisibility, { passive: true });
      window.addEventListener('resize', scheduleAutoVisibility, { passive: true });
      scheduleAutoVisibility();
      doc.addEventListener('visibilitychange', () => {
        if (doc.hidden) stopThumbnailAuto();
        else startThumbnailAuto();
      });
    };
    setupContinuousRailAuto('.rail--thumbnails', 24);
    setupContinuousRailAuto('.rail--banners', 24);

    // VK-fest style 3D coverflow — cards curve around the viewer, driven by
    // each rail's scroll position (center card flat & near, edges rotate away)
    if (!REDUCED) {
      const MAX_ANGLE = 34, NEAR_Z = 30, FAR_Z = -70;
      const coverflowTracks = tracks.filter(track => !track.closest('.rail--festivals, .rail--thumbnails, .rail--banners'));
      const updateTrack = track => {
        const isSocial = Boolean(track.closest('.rail--social'));
        const cw = track.clientWidth;
        const mid = cw / 2;
        const sl = track.scrollLeft;
        const lo = sl - cw * 0.6, hi = sl + cw * 1.6; // only touch cards near the viewport
        const st = loopState.get(track);
        const centers = (st && st.centers) ||
          [...track.children].map(el => el.offsetLeft + el.offsetWidth / 2);
        const kids = track.children;
        for (let i = 0; i < kids.length; i++) {
          const c = centers[i];
          if (c < lo || c > hi) continue;
          const card = kids[i];
          const n = Math.max(-1, Math.min(1, (c - sl - mid) / mid));
          const distance = Math.abs(n);
          const maxAngle = isSocial ? 42 : MAX_ANGLE;
          const nearZ = isSocial ? 58 : NEAR_Z;
          const farZ = isSocial ? -118 : FAR_Z;
          const z = nearZ + (farZ - nearZ) * distance;
          const arcY = isSocial ? Math.pow(distance, 1.35) * 24 : 0;
          const scale = isSocial ? 1 - distance * 0.065 : 1;
          const tf = `translateY(${arcY.toFixed(1)}px) translateZ(${z.toFixed(1)}px) rotateY(${(n * maxAngle).toFixed(2)}deg) scale(${scale.toFixed(3)})`;
          if (isSocial) card.style.zIndex = String(100 - Math.round(distance * 60));
          if (card.style.transform !== tf) card.style.transform = tf;
        }
      };
      const queued = new Set();
      let coverflowRaf = null;
      const flushCoverflow = () => { queued.forEach(updateTrack); queued.clear(); coverflowRaf = null; };
      const scheduleCoverflow = t => { queued.add(t); if (!coverflowRaf) coverflowRaf = requestAnimationFrame(flushCoverflow); };
      coverflowTracks.forEach(t => {
        t.addEventListener('scroll', () => scheduleCoverflow(t), { passive: true });
        scheduleCoverflow(t);
      });
      window.addEventListener('resize', () => coverflowTracks.forEach(scheduleCoverflow), { passive: true });
      window.addEventListener('load', () => coverflowTracks.forEach(scheduleCoverflow), { once: true });
    }

    // cursor tilt rides on the inner media so it composes with the coverflow
    if (FINE_POINTER && !REDUCED) {
      let tiltMedia = null;
      const untilt = m => gsap.to(m, { rotateX: 0, rotateY: 0, z: 0, duration: 0.55, ease: 'power2.out' });
      railsWrap.addEventListener('pointermove', e => {
        const card = e.target.closest('.g-card');
        const media = card && card.querySelector('.g-card__media');
        if (tiltMedia && media !== tiltMedia) untilt(tiltMedia);
        tiltMedia = media;
        if (!media || dragTrack) return;
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        gsap.to(media, { rotateY: px * 7, rotateX: -py * 6, z: 10, duration: 0.35, ease: 'power2.out' });
      });
      railsWrap.addEventListener('pointerleave', () => {
        if (tiltMedia) { untilt(tiltMedia); tiltMedia = null; }
      });
    }
    requestAnimationFrame(() => ScrollTrigger.refresh());
  };

  const warmGalleryThumbs = () => {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection && (connection.saveData || /(^|-)2g$/.test(connection.effectiveType || ''))) return;
    const urls = [];
    const categoryRows = GAL.categories.map(([key]) => GAL.items.filter(it => it.cat === key).slice(0, 8));
    // Round-robin keeps the first visible artwork of every section near the
    // front of the queue instead of finishing one category before the next.
    for (let row = 0; row < 8; row++) {
      categoryRows.forEach(items => {
        const it = items[row];
        if (!it) return;
        urls.push((it.thumb || it.cover)[0]);
        (it.previews || []).forEach(preview => urls.push(preview[0]));
      });
    }
    const queue = [...new Set(urls)];
    let cursor = 0;
    const pump = () => {
      const batch = queue.slice(cursor, cursor + 8);
      cursor += batch.length;
      if (!batch.length) return;
      Promise.allSettled(batch.map(src => fetch(encodeURI(src), { cache: 'force-cache' })))
        .finally(() => setTimeout(pump, 60));
    };
    setTimeout(pump, 240);
  };

  if (railsWrap && GAL.items.length) {
    const schedule = window.requestIdleCallback || (cb => setTimeout(cb, 0));
    schedule(() => { initGallery(); warmGalleryThumbs(); }, { timeout: 240 });
  }

  /* Lightbox — flat list of every page of every item in the current filter */
  const lbRoot = doc.querySelector('[data-lb]');
  const lbImg = doc.querySelector('[data-lb-img]');
  const lbTitle = doc.querySelector('[data-lb-title]');
  const lbMeta = doc.querySelector('[data-lb-meta]');
  const lbCount = doc.querySelector('[data-lb-count]');
  const lbPrevBtn = doc.querySelector('[data-lb-prev]');
  const lbNextBtn = doc.querySelector('[data-lb-next]');
  let lbFlat = [];
  let lbIndex = 0;
  let lbLastFocus = null;

  const lbBuildFlat = () => {
    lbFlat = [];
    galList.forEach(it => {
      const pages = it.pages || [it.cover];
      pages.forEach((pg, pi) => lbFlat.push({
        src: pg[0], title: it.title, cat: galCatLabel[it.cat] || '',
        page: pi + 1, pageCount: pages.length, id: it.id
      }));
    });
  };

  const lbPreload = i => {
    if (!lbFlat.length) return;
    const im = new Image();
    im.src = encodeURI(lbFlat[(i + lbFlat.length) % lbFlat.length].src);
  };

  const lbShow = i => {
    lbIndex = (i + lbFlat.length) % lbFlat.length;
    const en = lbFlat[lbIndex];
    lbRoot.classList.add('is-loading');
    lbImg.onload = () => lbRoot.classList.remove('is-loading');
    lbImg.src = encodeURI(en.src);
    lbImg.alt = `${en.title} — ${en.cat}${en.pageCount > 1 ? ` (page ${en.page} of ${en.pageCount})` : ''}`;
    lbTitle.textContent = en.title;
    lbMeta.textContent = en.cat + (en.pageCount > 1 ? ` · Page ${en.page}/${en.pageCount}` : '');
    lbCount.textContent = `${lbIndex + 1} / ${lbFlat.length}`;
    lbPreload(lbIndex + 1);
    lbPreload(lbIndex - 1);
    // keep the shareable URL pointed at whatever is on screen
    if (lbRoot.classList.contains('is-open') && /^#g\//.test(location.hash)) {
      history.replaceState(null, '', '#g/' + encodeURIComponent(en.id));
    }
  };

  const openLb = id => {
    initGallery();
    lbBuildFlat();
    const at = lbFlat.findIndex(en => en.id === id);
    if (at < 0) return;
    SFX.open();
    lbLastFocus = doc.activeElement;
    const single = lbFlat.length < 2;
    lbPrevBtn.hidden = single;
    lbNextBtn.hidden = single;
    lbRoot.classList.add('is-open');
    lbRoot.inert = false;
    lbRoot.setAttribute('aria-hidden', 'false');
    header.inert = true;
    setBackgroundInert(true);
    lockScroll(true);
    lbShow(at);
    lbRoot.querySelector('.lb__close').focus({ preventScroll: true });
    pushDeepLink('#g/' + encodeURIComponent(id));
  };
  const closeLb = () => {
    if (!lbRoot.classList.contains('is-open')) return;
    SFX.close();
    lbRoot.classList.remove('is-open');
    lbRoot.inert = true;
    lbRoot.setAttribute('aria-hidden', 'true');
    lbImg.removeAttribute('src');
    header.inert = false;
    setBackgroundInert(false);
    lockScroll(false);
    if (lbLastFocus && lbLastFocus.isConnected) lbLastFocus.focus({ preventScroll: true });
    lbLastFocus = null;
    clearDeepLink();
  };

  doc.addEventListener('click', e => {
    const opener = e.target.closest('[data-gal-open]');
    if (opener) { openLb(opener.dataset.galOpen); return; }
    if (!lbRoot.classList.contains('is-open')) return;
    if (e.target.closest('[data-lb-close]')) closeLb();
    else if (e.target.closest('[data-lb-prev]')) lbShow(lbIndex - 1);
    else if (e.target.closest('[data-lb-next]')) lbShow(lbIndex + 1);
    else if (e.target === lbImg) lbShow(lbIndex + 1);
  });
  doc.addEventListener('keydown', e => {
    if (!lbRoot.classList.contains('is-open')) return;
    if (e.key === 'Escape') closeLb();
    else if (e.key === 'ArrowRight') { SFX.flip(); lbShow(lbIndex + 1); }
    else if (e.key === 'ArrowLeft') { SFX.flip(); lbShow(lbIndex - 1); }
    else if (e.key === 'Tab') {
      const focusables = [...lbRoot.querySelectorAll('button:not([hidden])')];
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (!lbRoot.contains(doc.activeElement)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  // swipe navigation on touch
  let lbTouchX = null;
  lbRoot.addEventListener('touchstart', e => { lbTouchX = e.touches[0].clientX; }, { passive: true });
  lbRoot.addEventListener('touchend', e => {
    if (lbTouchX === null) return;
    const dx = e.changedTouches[0].clientX - lbTouchX;
    lbTouchX = null;
    if (Math.abs(dx) > 48) lbShow(lbIndex + (dx < 0 ? 1 : -1));
  }, { passive: true });

  /* ---------------- Shareable deep links: #g/<item>, #case/<study> ---------------- */
  const DEEP_RE = /^#(g|case)\/(.+)$/;
  let routing = false;       // true while the URL is driving the UI, not the user
  let overlayPushed = false; // we added a history entry for the open overlay

  const pushDeepLink = hash => {
    if (routing || location.hash === hash) return;
    if (DEEP_RE.test(location.hash)) history.replaceState(null, '', hash);
    else { history.pushState(null, '', hash); overlayPushed = true; }
  };
  const clearDeepLink = () => {
    if (routing || !DEEP_RE.test(location.hash)) return;
    if (overlayPushed) { overlayPushed = false; history.back(); }
    else history.replaceState(null, '', location.pathname + location.search);
  };
  const routeHash = () => {
    const m = location.hash.match(DEEP_RE);
    routing = true;
    if (!m) { closeLb(); closeCase(); }
    else if (m[1] === 'g') { closeCase(); openLb(decodeURIComponent(m[2])); }
    else { closeLb(); openCase(decodeURIComponent(m[2])); }
    routing = false;
  };
  window.addEventListener('popstate', routeHash);
  if (DEEP_RE.test(location.hash)) routeHash();

  /* ---------------- Marquee ---------------- */
  const marqueeTrack = doc.querySelector('[data-marquee-track]');
  if (marqueeTrack && !REDUCED) {
    marqueeTrack.innerHTML += marqueeTrack.innerHTML;
    marqueeTween = gsap.to(marqueeTrack, { xPercent: -50, ease: 'none', duration: 34, repeat: -1 });
    marqueeTrack.parentElement.addEventListener('mouseenter', () => { if (!motionPaused) gsap.to(marqueeTween, { timeScale: 0.25, duration: 0.6 }); });
    marqueeTrack.parentElement.addEventListener('mouseleave', () => { if (!motionPaused) gsap.to(marqueeTween, { timeScale: 1, duration: 0.6 }); });
  }

  /* ---------------- Scroll animations ---------------- */
  const statNums = doc.querySelectorAll('.stat__num[data-count]');
  // real values live in the HTML (no-JS / reduced-motion correct); zero them only if we will animate
  if (!REDUCED) statNums.forEach(el => { el.childNodes[0].nodeValue = '0'; });

  const initScrollFX = () => {
    if (REDUCED) return;
    root.classList.add('scrollfx-ready');

    statNums.forEach(el => {
      const target = +el.dataset.count;
      const obj = { v: 0 };
      gsap.to(obj, {
        v: target, duration: 1.6, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 92%', once: true },
        onUpdate: () => { el.childNodes[0].nodeValue = Math.round(obj.v); }
      });
    });

    // (feature images show at natural aspect ratio — no parallax crop headroom)
    const aboutImg = doc.querySelector('.s-about__portrait-frame img');
    if (aboutImg) {
      gsap.fromTo(aboutImg, { scale: 1.12 }, {
        scale: 1, ease: 'none',
        scrollTrigger: { trigger: aboutImg, start: 'top bottom', end: 'top 30%', scrub: true }
      });
    }

  };

  /* ---------------- Active nav link ---------------- */
  const navLinks = [...doc.querySelectorAll('[data-nav-link]')];
  const sectionFor = a => doc.querySelector(a.getAttribute('href'));
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          navLinks.forEach(a => a.classList.toggle('is-active', sectionFor(a) === en.target));
        }
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    navLinks.map(sectionFor).filter(Boolean).forEach(s => io.observe(s));
  }

  /* ---------------- Footer clock / year ---------------- */
  const clock = doc.querySelector('[data-local-time]');
  const tickClock = () => {
    const t = new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' }).format(new Date());
    clock.textContent = `GGN ${t} IST`;
  };
  if (clock) { tickClock(); setInterval(tickClock, 30000); }
  const yearEl = doc.querySelector('[data-year]');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------------- Preloader + hero intro ---------------- */
  const preloader = doc.getElementById('preloader');
  const heroIntro = () => {
    initMagnetic();
    if (REDUCED) { initScrollFX(); return; }
    const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
    tl.fromTo('[data-hero-line]', { yPercent: 115 }, { yPercent: 0, duration: 1.15, stagger: 0.12 }, 0)
      .fromTo('[data-hero-accent]', { yPercent: 90, opacity: 0, rotate: 4 }, { yPercent: 0, opacity: 1, rotate: 0, duration: 1.2 }, 0.35)
      .fromTo('[data-hero-meta] > *', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.08 }, 0.5)
      .fromTo('[data-hero-sub]', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.8 }, 0.65)
      .fromTo('[data-hero-cta] > *', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.09 }, 0.75)
      .fromTo('[data-hero-bottom]', { opacity: 0 }, { opacity: 1, duration: 0.9, onComplete: initScrollFX }, 0.9);
  };

  const runPreloader = () => {
    if (REDUCED || !preloader || session.get('ng-intro-seen') === '1') {
      preloader && preloader.remove();
      heroIntro();
      return;
    }
    session.set('ng-intro-seen', '1');
    lockScroll(true);
    const count = doc.querySelector('[data-preloader-count]');
    const bar = doc.querySelector('[data-preloader-bar]');
    const letters = doc.querySelectorAll('[data-preloader-word] span');
    const state = { v: 0 };
    const minTime = new Promise(res => setTimeout(res, 420));
    // window load can take 30s+ with a 583-image gallery; never hold the
    // door longer than 3.5s — lazy images keep loading behind the intro
    const loaded = Promise.race([
      new Promise(res => {
        if (doc.readyState !== 'loading') res();
        else doc.addEventListener('DOMContentLoaded', res, { once: true });
      }),
      new Promise(res => setTimeout(res, 900))
    ]);

    gsap.fromTo(letters, { yPercent: 120 }, { yPercent: 0, duration: 0.85, stagger: 0.055, ease: 'power4.out' });
    gsap.to(state, {
      v: 100, duration: 0.52, ease: 'power2.inOut',
      onUpdate: () => {
        count.textContent = String(Math.round(state.v)).padStart(2, '0');
        bar.style.transform = `scaleX(${state.v / 100})`;
      }
    });

    let introRan = false;
    const startIntro = () => { if (introRan) return; introRan = true; heroIntro(); };

    Promise.all([minTime, loaded]).then(() => {
      const out = gsap.timeline({
        onComplete: () => preloader.remove()
      });
      out.to(letters, { yPercent: -120, duration: 0.32, stagger: 0.018, ease: 'power3.in' })
        .to('.preloader__meta, .preloader__bar', { opacity: 0, duration: 0.18 }, '<0.08')
        .to(preloader, { clipPath: 'inset(0 0 100% 0)', duration: 0.48, ease: 'power4.inOut' }, '-=0.1')
        // unlock the moment the wipe starts, not after it ends — while Lenis
        // is stopped every wheel/touchpad event is swallowed, which read as
        // seconds of dead scroll input right after load
        .add(() => lockScroll(false), '<')
        .add(startIntro, '-=0.34');
    });

    // last-resort: GSAP's ticker sleeps in hidden tabs, so if the exit
    // animation never got to run, rip the loader off without ceremony
    setTimeout(() => {
      if (preloader.isConnected) {
        gsap.killTweensOf(preloader);
        preloader.remove();
        lockScroll(false);
        startIntro();
      }
    }, 3000);
  };
  runPreloader();
})();
