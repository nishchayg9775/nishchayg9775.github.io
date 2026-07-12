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
    };
    if (doc.startViewTransition && !REDUCED) doc.startViewTransition(apply);
    else apply();
  });

  /* ---------------- Smooth scroll (Lenis + GSAP) ---------------- */
  gsap.registerPlugin(ScrollTrigger);
  let lenis = null;
  if (!REDUCED) {
    lenis = new Lenis({ duration: 1.15, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const scrollTo = target => {
    if (lenis) lenis.scrollTo(target, { offset: -70, duration: 1.3 });
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
  if (heroCanvas && !REDUCED) {
    // animated field only on fine pointers; a still field on touch (no battery cost)
    heroField = new HeroField(heroCanvas, FINE_POINTER);
    if (FINE_POINTER) heroField.toggle();
    else heroField.drawFrame(0);
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
      toggle: () => blip(520, 0.09, 'triangle', 0.035, 780)
    };
  })();
  const syncSound = () => {
    root.classList.toggle('sfx-off', !SFX.enabled);
    soundToggle.setAttribute('aria-pressed', String(SFX.enabled));
    soundToggle.setAttribute('aria-label', SFX.enabled ? 'Mute interface sounds' : 'Unmute interface sounds');
  };
  if (soundToggle) {
    syncSound();
    soundToggle.addEventListener('click', () => { SFX.set(!SFX.enabled); syncSound(); SFX.toggle(); });
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
    const [src, w, h] = it.cover;
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
    };
    const recenterRail = (track, tight) => {
      const st = loopState.get(track);
      if (!st || !st.setW) return;
      const drift = track.scrollLeft - (track.scrollWidth - track.clientWidth) / 2;
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
    window.addEventListener('resize', () => {
      tracks.forEach(t => { setupRailLoop(t); recenterRail(t, true); });
    }, { passive: true });

    // VK-fest style 3D coverflow — cards curve around the viewer, driven by
    // each rail's scroll position (center card flat & near, edges rotate away)
    if (!REDUCED) {
      const MAX_ANGLE = 34, NEAR_Z = 30, FAR_Z = -70;
      const updateTrack = track => {
        const mid = track.clientWidth / 2;
        const sl = track.scrollLeft;
        for (const card of track.children) {
          const off = card.offsetLeft + card.offsetWidth / 2 - sl - mid;
          const n = Math.max(-1, Math.min(1, off / mid));
          const z = NEAR_Z + (FAR_Z - NEAR_Z) * Math.abs(n);
          card.style.transform = `translateZ(${z.toFixed(1)}px) rotateY(${(n * MAX_ANGLE).toFixed(2)}deg)`;
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
    const loaded = new Promise(res => {
      if (doc.readyState === 'complete') res();
      else window.addEventListener('load', res, { once: true });
    });

    gsap.fromTo(letters, { yPercent: 120 }, { yPercent: 0, duration: 0.85, stagger: 0.055, ease: 'power4.out' });
    gsap.to(state, {
      v: 100, duration: 1.7, ease: 'power2.inOut',
      onUpdate: () => {
        count.textContent = String(Math.round(state.v)).padStart(2, '0');
        bar.style.transform = `scaleX(${state.v / 100})`;
      }
    });

    Promise.all([minTime, loaded]).then(() => {
      const out = gsap.timeline({
        onComplete: () => { preloader.remove(); lockScroll(false); }
      });
      out.to(letters, { yPercent: -120, duration: 0.6, stagger: 0.035, ease: 'power3.in' })
        .to('.preloader__meta, .preloader__bar', { opacity: 0, duration: 0.3 }, '<0.2')
        .to(preloader, { clipPath: 'inset(0 0 100% 0)', duration: 0.85, ease: 'power4.inOut' }, '-=0.15')
        .add(heroIntro, '-=0.55');
    });
  };
  runPreloader();
})();
