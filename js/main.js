/* ============================================================
   NISHCHAY GUPTA — PORTFOLIO ’26 · interaction & motion engine
   GSAP + ScrollTrigger + Lenis (all local), vanilla everything else.
   ============================================================ */
(() => {
  'use strict';

  const doc = document;
  const root = doc.documentElement;
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE_POINTER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const DATA = window.NG_DATA || { projects: [] };

  if (REDUCED) root.classList.add('no-motion');

  // storage can throw (blocked cookies / enterprise policy) — never let it kill the site
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* theme just won't persist */ } }
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
      heroField && heroField.refreshColors();
      ambientField && ambientField.refreshColors();
    };
    if (doc.startViewTransition && !REDUCED) doc.startViewTransition(apply);
    else apply();
  });

  /* ---------------- Smooth scroll (Lenis + GSAP) ---------------- */
  gsap.registerPlugin(ScrollTrigger);
  let lenis = null;
  if (!REDUCED) {
    // lerp (not duration): touchpads fire continuous small deltas + OS momentum,
    // and a fixed-duration tween restarts on every event — the page trails the
    // gesture by seconds. Exponential damping tracks input tightly instead.
    lenis = new Lenis({ lerp: 0.16 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const scrollTo = target => {
    if (lenis) lenis.scrollTo(target, { offset: -70, duration: 1.3, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    else {
      const el = typeof target === 'string' ? doc.querySelector(target) : target;
      el && el.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' });
    }
  };
  // reference-counted so nested lockers (preloader / menu / case) can't unlock each other
  let lockCount = 0;
  const lockScroll = lock => {
    lockCount = Math.max(0, lockCount + (lock ? 1 : -1));
    const locked = lockCount > 0;
    doc.body.classList.toggle('is-locked', locked);
    if (lenis) locked ? lenis.stop() : lenis.start();
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
  if (lenis) lenis.on('scroll', ({ scroll }) => onScrollHeader(scroll));
  else window.addEventListener('scroll', () => onScrollHeader(window.scrollY), { passive: true });
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

  /* ---------------- Hero particle field ---------------- */
  class HeroField {
    constructor(canvas, animated) {
      this.canvas = canvas;
      this.animated = animated;
      this.ctx = canvas.getContext('2d', { alpha: true });
      this.mouse = { x: -9999, y: -9999 };
      this.running = false;
      this.visible = true;
      this.paused = false;
      this.dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      this.refreshColors();
      this.build();
      let resizeT = null;
      let lastW = innerWidth;
      window.addEventListener('resize', () => {
        clearTimeout(resizeT);
        resizeT = setTimeout(() => {
          // ignore mobile URL-bar height jitter — rebuild only on real changes
          const r = this.canvas.parentElement.getBoundingClientRect();
          if (Math.abs(r.width * this.dpr - this.w) < 2 && Math.abs(r.height * this.dpr - this.h) < 160 * this.dpr) return;
          lastW = innerWidth;
          this.build();
          if (!this.animated) this.drawFrame(0);
        }, 150);
      }, { passive: true });
      if (animated) {
        window.addEventListener('mousemove', e => {
          const r = this.canvas.getBoundingClientRect();
          this.mouse.x = (e.clientX - r.left) * this.dpr;
          this.mouse.y = (e.clientY - r.top) * this.dpr;
        }, { passive: true });
        window.addEventListener('mouseout', () => { this.mouse.x = -9999; this.mouse.y = -9999; });
        new IntersectionObserver(([en]) => {
          this.visible = en.isIntersecting;
          this.toggle();
        }).observe(canvas);
        doc.addEventListener('visibilitychange', () => this.toggle());
      }
    }
    refreshColors() {
      const cs = getComputedStyle(root);
      this.accent = cs.getPropertyValue('--accent').trim();
      const dark = root.dataset.theme === 'dark';
      this.dotAlpha = dark ? 0.34 : 0.3;
      this.dotColor = dark ? '237, 233, 224' : '25, 22, 17';
      if (!this.animated && this.pts) this.drawFrame(0);
    }
    build() {
      const r = this.canvas.parentElement.getBoundingClientRect();
      this.w = this.canvas.width = Math.round(r.width * this.dpr);
      this.h = this.canvas.height = Math.round(r.height * this.dpr);
      const gap = Math.max(26, Math.round(this.w / 68));
      this.pts = [];
      for (let y = gap; y < this.h - gap * 0.4; y += gap) {
        for (let x = gap; x < this.w - gap * 0.4; x += gap) {
          this.pts.push({
            bx: x, by: y, x, y,
            vx: 0, vy: 0,
            seed: Math.random() * Math.PI * 2,
            accent: Math.random() < 0.045
          });
        }
      }
      this.radius = Math.min(this.w, this.h) * 0.22;
    }
    setPaused(p) { this.paused = p; this.toggle(); }
    toggle() {
      const should = this.animated && this.visible && !this.paused && !doc.hidden;
      if (should && !this.running) { this.running = true; this.raf = requestAnimationFrame(t => this.frame(t)); }
      if (!should) { this.running = false; cancelAnimationFrame(this.raf); }
    }
    drawFrame(t) {
      const { ctx, pts, mouse, radius } = this;
      ctx.clearRect(0, 0, this.w, this.h);
      const time = t * 0.00045;
      const size = 1.6 * this.dpr;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const dx0 = Math.sin(time + p.seed) * 3.2 * this.dpr;
        const dy0 = Math.cos(time * 0.8 + p.seed * 1.3) * 3.2 * this.dpr;
        let tx = p.bx + dx0, ty = p.by + dy0;
        const mx = tx - mouse.x, my = ty - mouse.y;
        const d2 = mx * mx + my * my;
        if (d2 < radius * radius) {
          const d = Math.sqrt(d2) || 1;
          const f = (1 - d / radius) * 34 * this.dpr;
          tx += (mx / d) * f;
          ty += (my / d) * f;
        }
        p.vx = (p.vx + (tx - p.x) * 0.09) * 0.86;
        p.vy = (p.vy + (ty - p.y) * 0.09) * 0.86;
        p.x += p.vx; p.y += p.vy;
        const stretch = Math.min(3, Math.abs(p.vx) + Math.abs(p.vy));
        if (p.accent) {
          ctx.fillStyle = this.accent;
          ctx.globalAlpha = 0.8;
        } else {
          ctx.fillStyle = `rgb(${this.dotColor})`;
          ctx.globalAlpha = this.dotAlpha * (0.55 + 0.45 * Math.sin(time * 2 + p.seed * 3));
        }
        ctx.fillRect(p.x, p.y, size + stretch, size);
      }
      ctx.globalAlpha = 1;
    }
    frame(t) {
      if (!this.running) return;
      this.drawFrame(t);
      this.raf = requestAnimationFrame(tt => this.frame(tt));
    }
  }
  const heroCanvas = doc.querySelector('[data-hero-canvas]');
  let heroField = null;
  // hero grid field retired — the site-wide morphing particle field owns the
  // background now (two dot systems in the hero fought each other visually)

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
      const count = Math.min(1000, Math.max(550, Math.round((vw * vh) / 620)));
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
      this.drawFrame(t);
      this.raf = requestAnimationFrame(tt => this.frame(tt));
    }
  }
  const ambientCanvas = doc.querySelector('[data-ambient]');
  let ambientField = null;
  if (ambientCanvas && !REDUCED) {
    ambientField = new AmbientField(ambientCanvas, FINE_POINTER);
    if (FINE_POINTER) ambientField.toggle();
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
      heroField && heroField.setPaused(motionPaused);
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
    featuredList.innerHTML = featured.map((p, i) => `
      <article class="feature" data-reveal>
        <button class="feature__media" data-case-open="${esc(p.id)}" data-cursor-view="Open" aria-label="Open case study: ${esc(p.title)}">
          <span class="feature__badge chip">${esc(p.client)}</span>
          ${imgTag(p.card.img, '', p.card.w, p.card.h)}
        </button>
        <div class="feature__body">
          <span class="feature__index mono-label">F.0${i + 1} — ${esc(p.categoryLabel)}</span>
          <h3 class="feature__title">${esc(p.title)}</h3>
          <p class="feature__desc">${esc(p.sub)}</p>
          <div class="feature__tags">${p.tags.slice(0, 4).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
          <button class="link-more" data-case-open="${esc(p.id)}">Open case study <i>→</i></button>
        </div>
      </article>`).join('');
  }

  // Deck-deal intro: when Selected Work scrolls in, the four project cards
  // stack at the viewport centre, fan out like a hand of cards, then each
  // one flies off toward its real spot down the page.
  if (featuredList && featured.length > 1 && !REDUCED && FINE_POINTER) {
    const deckIntro = () => {
      const workSec = doc.getElementById('work');
      if (!workSec || workSec.getBoundingClientRect().bottom < 0) return; // arrived via deep link, section already behind us
      const cards = [...featuredList.querySelectorAll('.feature__media')];
      if (!cards.length) return;
      const overlay = doc.createElement('div');
      overlay.className = 'deal-overlay';
      overlay.setAttribute('aria-hidden', 'true');
      const clones = featured.map(p => {
        const img = doc.createElement('img');
        img.src = encodeURI(p.card.img);
        img.alt = '';
        img.className = 'deal-card';
        img.style.aspectRatio = `${p.card.w} / ${p.card.h}`;
        overlay.appendChild(img);
        return img;
      });
      doc.body.appendChild(overlay);
      setTimeout(() => overlay.remove(), 9000); // failsafe if the tab hides mid-animation
      const mid = (clones.length - 1) / 2;
      const cx = innerWidth / 2, cy = innerHeight / 2;
      const fanX = Math.min(150, innerWidth * 0.11);
      gsap.set(clones, {
        xPercent: -50, yPercent: -50, x: cx, y: cy,
        rotation: i => (i - mid) * 6, scale: 0.5, opacity: 0
      });
      gsap.timeline({ defaults: { ease: 'power3.out' }, onComplete: () => overlay.remove() })
        .to(clones, { opacity: 1, scale: 1, duration: 0.4, stagger: 0.06 })
        .to(clones, {
          rotation: i => (i - mid) * 17,
          x: i => cx + (i - mid) * fanX,
          y: i => cy - Math.abs(i - mid) * 16,
          duration: 0.55, ease: 'back.out(1.5)'
        }, '+=0.08')
        .to(clones, {
          x: i => { const r = cards[i].getBoundingClientRect(); return r.left + r.width / 2; },
          y: i => { const r = cards[i].getBoundingClientRect(); return Math.min(innerHeight + 300, r.top + r.height / 2); },
          rotation: 0, scale: 1.8, opacity: 0,
          duration: 0.65, stagger: 0.1, ease: 'power2.in'
        }, '+=0.4');
    };
    ScrollTrigger.create({ trigger: '#work', start: 'top 62%', once: true, onEnter: deckIntro });
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
    let enabled = store.get('ng-sfx') !== 'off';
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
    return `
      <button class="g-card" data-gal-open="${esc(it.id)}" data-cursor-view="View"
        aria-label="View: ${esc(it.title)}${pageCount > 1 ? ` — ${pageCount} pages` : ''}">
        <span class="g-card__media" style="--ar: ${w} / ${h}">
          <img src="${encodeURI(src)}" alt="${esc(it.title)} — ${esc(galCatLabel[it.cat] || '')}"
            width="${w}" height="${h}" loading="lazy" decoding="async">
          ${pageCount > 1 ? `<span class="g-card__pages">${pageCount} pages</span>` : ''}
          <span class="g-card__veil"><span class="g-card__title">${esc(it.title)}</span></span>
        </span>
      </button>`;
  };

  if (railsWrap && GAL.items.length) {
    railsWrap.innerHTML = GAL.categories.map(([key, label]) => {
      const items = GAL.items.filter(it => it.cat === key);
      if (!items.length) return '';
      return `
        <div class="rail" data-reveal>
          <div class="rail__head">
            <h3 class="rail__title">${esc(label)}<sup>${items.length}</sup></h3>
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
    tracks.forEach(track => {
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
      tracks.forEach(t => { setupRailLoop(t); recenterRail(t, true); });
    }, { passive: true });

    // VK-fest style 3D coverflow — cards curve around the viewer, driven by
    // each rail's scroll position (center card flat & near, edges rotate away)
    if (!REDUCED) {
      const MAX_ANGLE = 34, NEAR_Z = 30, FAR_Z = -70;
      const updateTrack = track => {
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
          const z = NEAR_Z + (FAR_Z - NEAR_Z) * Math.abs(n);
          const tf = `translateZ(${z.toFixed(1)}px) rotateY(${(n * MAX_ANGLE).toFixed(2)}deg)`;
          if (card.style.transform !== tf) card.style.transform = tf;
        }
      };
      const queued = new Set();
      let coverflowRaf = null;
      const flushCoverflow = () => { queued.forEach(updateTrack); queued.clear(); coverflowRaf = null; };
      const scheduleCoverflow = t => { queued.add(t); if (!coverflowRaf) coverflowRaf = requestAnimationFrame(flushCoverflow); };
      tracks.forEach(t => {
        t.addEventListener('scroll', () => scheduleCoverflow(t), { passive: true });
        scheduleCoverflow(t);
      });
      window.addEventListener('resize', () => tracks.forEach(scheduleCoverflow), { passive: true });
      window.addEventListener('load', () => tracks.forEach(scheduleCoverflow), { once: true });
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
    lbBuildFlat();
    const at = lbFlat.findIndex(en => en.id === id);
    if (at < 0) return;
    SFX.open();
    lbLastFocus = doc.activeElement;
    const single = lbFlat.length < 2;
    lbPrevBtn.hidden = single;
    lbNextBtn.hidden = single;
    lbRoot.classList.add('is-open');
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

    ScrollTrigger.batch('[data-reveal]', {
      start: 'top 88%',
      once: true,
      onEnter: els => gsap.to(els, {
        opacity: 1, y: 0, duration: 0.9, stagger: 0.09, ease: 'power3.out', overwrite: true
      })
    });

    splitTargets.forEach(el => {
      gsap.fromTo(el.querySelectorAll('.swi'),
        { yPercent: 115 },
        {
          yPercent: 0, duration: 0.9, stagger: 0.05, ease: 'power4.out',
          scrollTrigger: { trigger: el, start: 'top 86%', once: true }
        });
    });

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

    gsap.to('.s-hero__canvas', {
      opacity: 0.25, ease: 'none',
      scrollTrigger: { trigger: '.s-hero', start: '40% top', end: 'bottom top', scrub: true }
    });
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
      .fromTo('[data-hero-bottom]', { opacity: 0 }, { opacity: 1, duration: 0.9, onComplete: initScrollFX }, 0.9)
      .fromTo(heroCanvas, { opacity: 0 }, { opacity: 1, duration: 1.6, ease: 'power1.out' }, 0.4);
  };

  const runPreloader = () => {
    if (REDUCED || !preloader) {
      preloader && preloader.remove();
      heroIntro();
      return;
    }
    lockScroll(true);
    const count = doc.querySelector('[data-preloader-count]');
    const bar = doc.querySelector('[data-preloader-bar]');
    const letters = doc.querySelectorAll('[data-preloader-word] span');
    const state = { v: 0 };
    const minTime = new Promise(res => setTimeout(res, 1700));
    // window load can take 30s+ with a 583-image gallery; never hold the
    // door longer than 3.5s — lazy images keep loading behind the intro
    const loaded = Promise.race([
      new Promise(res => {
        if (doc.readyState === 'complete') res();
        else window.addEventListener('load', res, { once: true });
      }),
      new Promise(res => setTimeout(res, 3500))
    ]);

    gsap.fromTo(letters, { yPercent: 120 }, { yPercent: 0, duration: 0.85, stagger: 0.055, ease: 'power4.out' });
    gsap.to(state, {
      v: 100, duration: 1.7, ease: 'power2.inOut',
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
      out.to(letters, { yPercent: -120, duration: 0.6, stagger: 0.035, ease: 'power3.in' })
        .to('.preloader__meta, .preloader__bar', { opacity: 0, duration: 0.3 }, '<0.2')
        .to(preloader, { clipPath: 'inset(0 0 100% 0)', duration: 0.85, ease: 'power4.inOut' }, '-=0.15')
        // unlock the moment the wipe starts, not after it ends — while Lenis
        // is stopped every wheel/touchpad event is swallowed, which read as
        // seconds of dead scroll input right after load
        .add(() => lockScroll(false), '<')
        .add(startIntro, '-=0.55');
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
    }, 9000);
  };
  runPreloader();
})();
