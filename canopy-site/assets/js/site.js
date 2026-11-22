/* ==========================================================================
   site.js — v2 interactions (GSAP + ScrollTrigger + Lenis)
   ========================================================================== */
(function () {
  "use strict";
  var d = document, html = d.documentElement, body = d.body;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var isMobile = function () { return window.matchMedia("(max-width: 860px)").matches; };
  var G = window.gsap, ST = window.ScrollTrigger;
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  if (!G) { html.classList.remove("js"); return; }
  if (ST) G.registerPlugin(ST);
  G.defaults({ ease: "expo.out" });

  /* ---------------- Smooth scroll + velocity ---------------- */
  var lenis = null, velocity = 0;
  if (!reduce && window.Lenis) {
    lenis = new window.Lenis({ duration: 1.2, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true, touchMultiplier: 1.5 });
    lenis.on("scroll", function (l) { velocity = l.velocity || 0; if (ST) ST.update(); });
    G.ticker.add(function (time) { lenis.raf(time * 1000); });
    G.ticker.lagSmoothing(0);
  }
  window.CanopyLenis = lenis;
  function onScroll(fn) { if (lenis) lenis.on("scroll", function (l) { fn(l.scroll); }); else window.addEventListener("scroll", function () { fn(window.scrollY); }, { passive: true }); }

  d.addEventListener("click", function (e) {
    var a = e.target.closest('a[href^="#"]'); if (!a) return;
    var id = a.getAttribute("href"); if (id.length < 2) return;
    var el = d.getElementById(id.slice(1)); if (!el) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(el, { duration: 1.6 }); else el.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  });

  /* ---------------- Split into characters ---------------- */
  function splitChars(el) {
    if (el.dataset.splitDone) return $$(".c", el);
    var label = el.getAttribute("aria-label") || el.textContent.replace(/\s+/g, " ").trim();
    var walk = function (node, into) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { into.appendChild(d.createTextNode(" ")); return; }
            var w = d.createElement("span"); w.className = "w";
            Array.prototype.forEach.call(part, function (ch) { var c = d.createElement("span"); c.className = "c"; c.textContent = ch; w.appendChild(c); });
            into.appendChild(w);
          });
        } else if (n.nodeName === "BR") { into.appendChild(n.cloneNode()); }
        else { var clone = n.cloneNode(false); walk(n, clone); into.appendChild(clone); }
      });
    };
    var frag = d.createElement("span"); walk(el, frag);
    el.innerHTML = ""; while (frag.firstChild) el.appendChild(frag.firstChild);
    el.classList.add("split"); el.dataset.splitDone = "1";
    el.setAttribute("aria-label", label);
    $$(".w", el).forEach(function (w) { w.setAttribute("aria-hidden", "true"); });
    return $$(".c", el);
  }
  function flipIn(chars, opts) {
    return G.from(chars, Object.assign({ rotateX: -100, yPercent: 60, opacity: 0, duration: 1.3, ease: "expo.out", stagger: { each: .016 } }, opts || {}));
  }

  /* ---------------- Loader / veil ---------------- */
  var loader = $(".loader"), veil = $(".veil"), introDone = false;
  function intro() {
    if (introDone) return; introDone = true;
    $$("[data-hero-split]").forEach(function (el) { var c = splitChars(el); if (!reduce) flipIn(c, { delay: .1, stagger: { each: .022 } }); });
    $$("[data-intro]").forEach(function (el, i) { if (!reduce) G.from(el, { opacity: 0, y: 34, duration: 1.4, delay: .45 + i * .1 }); });
    if (ST) ST.refresh();
  }
  function runLoader() {
    if (!loader || html.classList.contains("no-loader") || reduce) {
      if (loader) loader.style.display = "none";
      if (veil && !reduce) { G.set(veil, { clipPath: "circle(150% at 50% 50%)" }); G.to(veil, { clipPath: "circle(0% at 50% 50%)", duration: 1.1, ease: "expo.inOut", delay: .05 }); }
      intro(); return;
    }
    var pct = $(".loader__pct", loader), line = $(".loader__line", loader), logo = $(".loader__logo", loader);
    G.fromTo(logo, { opacity: 0, scale: .9, filter: "blur(10px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 1.4, ease: "expo.out" });
    var loaded = 0, total = 2, shown = { v: 0 }, t0 = performance.now();
    (d.fonts && d.fonts.ready ? d.fonts.ready : Promise.resolve()).then(function () { loaded++; });
    if (d.readyState === "complete") loaded++; else window.addEventListener("load", function () { loaded++; });
    G.ticker.add(function tick() {
      var el = performance.now() - t0, target = Math.min(loaded / total, el / 1300) * 100;
      if (el > 3200) target = 100;
      shown.v += (target - shown.v) * .1;
      var v = Math.round(shown.v > 99.3 ? 100 : shown.v);
      pct.textContent = v;
      G.set(line, { scaleX: shown.v / 100 });
      if (v >= 100) {
        G.ticker.remove(tick);
        try { sessionStorage.setItem("cv-seen", "1"); } catch (e) {}
        G.to(logo, { opacity: 0, scale: 1.15, filter: "blur(8px)", duration: .8, ease: "power2.in" });
        G.to(loader, { clipPath: "circle(0% at 50% 50%)", duration: 1.2, ease: "expo.inOut", delay: .35, onComplete: function () { loader.style.display = "none"; } });
        setTimeout(intro, 750);
      }
    });
  }

  var lastPointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  window.addEventListener("pointerdown", function (e) { lastPointer = { x: e.clientX, y: e.clientY }; }, { passive: true });
  function leaveTo(url) {
    if (!veil || reduce) { location.href = url; return; }
    veil.classList.add("is-on");
    var at = (lastPointer.x / window.innerWidth * 100).toFixed(1) + "% " + (lastPointer.y / window.innerHeight * 100).toFixed(1) + "%";
    G.fromTo(veil, { clipPath: "circle(0% at " + at + ")" }, { clipPath: "circle(150% at " + at + ")", duration: .85, ease: "expo.inOut", onComplete: function () { location.href = url; } });
  }
  d.addEventListener("click", function (e) {
    var a = e.target.closest("a[href]"); if (!a) return;
    var href = a.getAttribute("href");
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (a.target === "_blank" || a.hasAttribute("download") || /^(#|mailto:|tel:|javascript:)/.test(href)) return;
    var url; try { url = new URL(a.href, location.href); } catch (err) { return; }
    if (/^https?:/.test(href) && url.host !== location.host) return;
    if (url.pathname === location.pathname && url.hash) return;
    e.preventDefault(); leaveTo(a.href);
  });
  window.addEventListener("pageshow", function (e) { if (e.persisted && veil) { veil.classList.remove("is-on"); G.set(veil, { clipPath: "circle(0% at 50% 50%)" }); } });

  /* ---------------- Cursor + glowing wake ---------------- */
  var pointer = { x: -999, y: -999 };
  window.addEventListener("pointermove", function (e) { pointer.x = e.clientX; pointer.y = e.clientY; }, { passive: true });
  if (fine && !reduce) {
    var cur = $(".cursor");
    if (cur) {
      html.classList.add("has-cursor");
      var dot = $(".cursor__dot", cur), ring = $(".cursor__ring", cur), lab = $(".cursor__label", cur);
      var dx = G.quickTo(dot, "x", { duration: .05, ease: "none" }), dy = G.quickTo(dot, "y", { duration: .05, ease: "none" });
      var rx = G.quickTo(ring, "x", { duration: .5, ease: "power3.out" }), ry = G.quickTo(ring, "y", { duration: .5, ease: "power3.out" });
      window.addEventListener("pointermove", function (e) { dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); }, { passive: true });
      d.addEventListener("pointerover", function (e) {
        cur.classList.toggle("is-hover", !!e.target.closest("a, button, summary, label[for], .chip, select"));
        var l = e.target.closest("[data-cursor]");
        if (l) { lab.textContent = l.getAttribute("data-cursor"); cur.classList.add("is-label"); } else cur.classList.remove("is-label");
      });
    }
    var wake = $(".wake");
    if (wake) {
      var wx = wake.getContext("2d"), dpr = Math.min(window.devicePixelRatio || 1, 2), parts = [], lx = -999, ly = -999;
      var size = function () { wake.width = innerWidth * dpr; wake.height = innerHeight * dpr; wx.setTransform(dpr, 0, 0, dpr, 0, 0); };
      size(); window.addEventListener("resize", size, { passive: true });
      G.ticker.add(function () {
        var mx = pointer.x - lx, my = pointer.y - ly, sp = Math.sqrt(mx * mx + my * my);
        if (lx > -900 && sp > 1) {
          var n = Math.min(4, 1 + sp / 18 | 0);
          for (var i = 0; i < n; i++) {
            var f = i / n;
            parts.push({ x: lx + mx * f + (Math.random() - .5) * 5, y: ly + my * f + (Math.random() - .5) * 5, vx: (Math.random() - .5) * .35 - mx * .008, vy: (Math.random() - .5) * .35 - my * .008, life: 1, r: Math.random() * 1.8 + .7, c: Math.random() < .14 ? "232,112,64" : (Math.random() < .6 ? "11,122,101" : "70,110,104") });
          }
        }
        lx = pointer.x; ly = pointer.y;
        wx.clearRect(0, 0, innerWidth, innerHeight);
        wx.globalCompositeOperation = "source-over";
        for (var k = parts.length - 1; k >= 0; k--) {
          var p = parts[k];
          p.x += p.vx; p.y += p.vy; p.vx *= .985; p.vy = p.vy * .985 - .003; p.life -= .014;
          if (p.life <= 0) { parts.splice(k, 1); continue; }
          var g = wx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
          g.addColorStop(0, "rgba(" + p.c + "," + (p.life * p.life * .32) + ")"); g.addColorStop(1, "rgba(" + p.c + ",0)");
          wx.fillStyle = g; wx.beginPath(); wx.arc(p.x, p.y, p.r * 4, 0, 6.283); wx.fill();
        }
        if (parts.length > 400) parts.splice(0, parts.length - 400);
      });
    }
  }

  /* ---------------- Magnetic buttons ---------------- */
  if (fine && !reduce) {
    $$("[data-magnetic]").forEach(function (el) {
      var xT = G.quickTo(el, "x", { duration: .7, ease: "elastic.out(1,.4)" }), yT = G.quickTo(el, "y", { duration: .7, ease: "elastic.out(1,.4)" });
      el.addEventListener("pointermove", function (e) { var r = el.getBoundingClientRect(); xT((e.clientX - r.left - r.width / 2) * .32); yT((e.clientY - r.top - r.height / 2) * .32); });
      el.addEventListener("pointerleave", function () { xT(0); yT(0); });
    });
  }

  /* ---------------- Magnetic letters (headings lift toward the cursor) ---------------- */
  function magnetText() {
    if (!fine || reduce) return;
    $$("[data-magnet]").forEach(function (el) {
      var chars = splitChars(el), boxes = [], active = false;
      var setters = chars.map(function (c) { return { y: G.quickTo(c, "y", { duration: .6, ease: "power3.out" }), r: G.quickTo(c, "rotation", { duration: .6, ease: "power3.out" }) }; });
      var measure = function () { boxes = chars.map(function (c) { var r = c.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }); };
      el.addEventListener("pointerenter", function () { active = true; measure(); });
      el.addEventListener("pointerleave", function () { active = false; setters.forEach(function (s) { s.y(0); s.r(0); }); chars.forEach(function (c) { c.style.color = ""; }); });
      el.addEventListener("pointermove", function (e) {
        if (!active) return;
        boxes.forEach(function (b, i) {
          var dxx = e.clientX - b.x, dyy = e.clientY - b.y, dist = Math.sqrt(dxx * dxx + dyy * dyy), f = Math.max(0, 1 - dist / 170);
          setters[i].y(-f * f * 26); setters[i].r(dxx * f * -.06);
          chars[i].style.color = f > .55 ? "var(--emerald)" : "";
        });
      });
    });
  }

  /* ---------------- 3D tilt + glare ---------------- */
  function tilt() {
    if (!fine || reduce) return;
    $$("[data-tilt]").forEach(function (el) {
      var glare = d.createElement("span"); glare.className = "tilt__glare"; el.appendChild(glare); el.classList.add("tilt");
      var rX = G.quickTo(el, "rotationX", { duration: .8, ease: "power3.out" }), rY = G.quickTo(el, "rotationY", { duration: .8, ease: "power3.out" });
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        rY((px - .5) * 14); rX((.5 - py) * 11);
        el.style.setProperty("--gx", (px * 100) + "%"); el.style.setProperty("--gy", (py * 100) + "%");
      });
      el.addEventListener("pointerleave", function () { rX(0); rY(0); });
    });
  }

  /* ---------------- Liquid image hover ---------------- */
  function liquid() {
    var map = d.getElementById("liquid-map"), turb = d.getElementById("liquid-turb");
    if (!fine || reduce || !map || !turb) return;
    var st = { s: 0, f: .008 };
    var apply = function () { map.setAttribute("scale", st.s.toFixed(1)); turb.setAttribute("baseFrequency", st.f.toFixed(4) + " " + (st.f * 1.6).toFixed(4)); };
    $$("[data-liquid]").forEach(function (el) {
      el.addEventListener("pointerenter", function () {
        $$(".is-liquid").forEach(function (x) { x.classList.remove("is-liquid"); });
        el.classList.add("is-liquid");
        G.killTweensOf(st);
        G.fromTo(st, { s: 0, f: .02 }, { s: 46, f: .008, duration: .45, ease: "power2.out", onUpdate: apply, onComplete: function () { G.to(st, { s: 0, duration: 1.1, ease: "power3.out", onUpdate: apply, onComplete: function () { el.classList.remove("is-liquid"); } }); } });
      });
    });
  }

  /* ---------------- Header ---------------- */
  var header = $(".site-header"), lastY = 0, menuOpen = false;
  onScroll(function (y) {
    if (!header || menuOpen) return;
    if (y > 260 && y > lastY + 4) header.classList.add("is-hidden"); else if (y < lastY - 4 || y < 260) header.classList.remove("is-hidden");
    lastY = y;
  });

  /* ---------------- Menu ---------------- */
  var menu = $(".menu"), menuBtn = $(".menu-btn");
  if (menu && menuBtn) {
    var mLinks = $$(".menu__links a span", menu), lastFocus = null;
    menu.setAttribute("inert", "");
    var openMenu = function () {
      menuOpen = true; lastFocus = d.activeElement;
      menuBtn.setAttribute("aria-expanded", "true"); menuBtn.querySelector("span").textContent = "Close";
      menu.classList.add("is-open"); menu.removeAttribute("inert"); if (lenis) lenis.stop();
      G.fromTo(menu, { clipPath: "circle(0% at 100% 0%)" }, { clipPath: "circle(150% at 100% 0%)", duration: reduce ? 0 : 1, ease: "expo.inOut" });
      G.fromTo(mLinks, { yPercent: 110, rotate: 4 }, { yPercent: 0, rotate: 0, duration: reduce ? 0 : 1.2, stagger: .06, delay: reduce ? 0 : .35 });
      setTimeout(function () { var f = $("a", menu); if (f) f.focus(); }, reduce ? 0 : 450);
    };
    var closeMenu = function () {
      menuOpen = false; menuBtn.setAttribute("aria-expanded", "false"); menuBtn.querySelector("span").textContent = "Menu";
      if (lenis) lenis.start();
      G.to(menu, { clipPath: "circle(0% at 100% 0%)", duration: reduce ? 0 : .8, ease: "expo.inOut", onComplete: function () { menu.classList.remove("is-open"); menu.setAttribute("inert", ""); } });
      if (lastFocus) lastFocus.focus();
    };
    menuBtn.addEventListener("click", function () { menuOpen ? closeMenu() : openMenu(); });
    d.addEventListener("keydown", function (e) {
      if (!menuOpen) return;
      if (e.key === "Escape") closeMenu();
      if (e.key === "Tab") { var f = [menuBtn].concat($$("a", menu)), i = f.indexOf(d.activeElement); if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } }
    });
  }

  /* ---------------- Scroll reveals ---------------- */
  function reveals() {
    if (reduce || !ST) return;
    $$("[data-split]").forEach(function (el) {
      var c = splitChars(el);
      G.from(c, { rotateX: -100, yPercent: 60, opacity: 0, duration: 1.2, ease: "expo.out", stagger: { each: .012 }, scrollTrigger: { trigger: el, start: "top 88%", once: true } });
    });
    $$("[data-fade]").forEach(function (el) { G.to(el, { opacity: 1, y: 0, duration: 1.4, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 90%", once: true } }); });
    $$("[data-unveil]").forEach(function (el) {
      var img = $("img", el), tl = G.timeline({ scrollTrigger: { trigger: el, start: "top 88%", once: true } });
      tl.to(el, { clipPath: "inset(0% 0 0 0)", duration: 1.6, ease: "expo.inOut" });
      if (img) tl.from(img, { scale: 1.4, duration: 2, ease: "expo.out" }, 0);
    });
    $$("[data-parallax]").forEach(function (el) {
      var a = parseFloat(el.getAttribute("data-parallax")) || 10;
      G.fromTo(el, { yPercent: -a }, { yPercent: a * .4, ease: "none", scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true } });
    });
    $$(".drive__bar span").forEach(function (el) { G.from(el, { scaleX: 0, duration: 1.8, scrollTrigger: { trigger: el, start: "top 92%", once: true } }); });
    $$("[data-count]").forEach(function (el) {
      var end = parseFloat(el.getAttribute("data-count")), o = { v: 0 }, suf = el.getAttribute("data-suffix") || "";
      ST.create({ trigger: el, start: "top 90%", once: true, onEnter: function () { G.to(o, { v: end, duration: 2.2, onUpdate: function () { el.textContent = Math.round(o.v) + suf; } }); } });
    });
    $$(".prop-hero__media img").forEach(function (img) {
      G.to(img, { yPercent: 14, scale: 1.02, ease: "none", scrollTrigger: { trigger: img.closest("section"), start: "top top", end: "bottom top", scrub: true } });
    });
    // stagger list rows in
    $$("[data-rows]").forEach(function (wrap) {
      G.from(wrap.children, { y: 60, opacity: 0, duration: 1.3, stagger: .08, scrollTrigger: { trigger: wrap, start: "top 85%", once: true } });
    });
  }

  /* ---------------- Velocity skew + marquee ---------------- */
  function velocityFx() {
    if (reduce) return;
    var skews = $$("[data-skew]"), tracks = $$(".marquee__track");
    var sk = 0, x = tracks.map(function () { return 0; }), dir = 1;
    tracks.forEach(function (t) { t.innerHTML += t.innerHTML; });
    G.ticker.add(function () {
      sk += (clamp(velocity * -.18, -7, 7) - sk) * .12;
      skews.forEach(function (el) { el.style.transform = "skewY(" + sk.toFixed(2) + "deg)"; });
      if (velocity > .2) dir = 1; else if (velocity < -.2) dir = -1;
      tracks.forEach(function (t, i) {
        var w = t.scrollWidth / 2; if (!w) return;
        x[i] -= (1.1 + Math.abs(velocity) * 1.4) * dir * (i % 2 ? -1 : 1);
        if (x[i] <= -w) x[i] += w; if (x[i] > 0) x[i] -= w;
        t.style.transform = "translate3d(" + x[i].toFixed(1) + "px,0,0)";
      });
    });
  }

  /* ---------------- Depth carousel ---------------- */
  function depthCarousel() {
    var sec = $(".depth"); if (!sec || reduce || !ST || isMobile()) return;
    var cards = $$(".depth-card", sec), N = cards.length, world = $(".depth__world", sec);
    var countEl = $(".depth__count strong", sec), nameEl = $(".depth__count .meta", sec), a = 0, mx = 0, my = 0, tmx = 0, tmy = 0;
    function place() {
      var vw = innerWidth, vh = innerHeight;
      cards.forEach(function (c, i) {
        var o = i - a;
        var op = clamp(1 - Math.max(0, -o - .3) * 3, 0, 1) * clamp(1 - Math.max(0, o) * .22, 0, 1) * clamp(1 - (o - 3.2) * .9, 0, 1);
        G.set(c, { x: o * vw * .19, y: -o * vh * .13, z: -o * 820, rotateY: -o * 7, rotateZ: o < 0 ? o * 6 : 0, opacity: op, pointerEvents: Math.abs(o) < .5 ? "auto" : "none" });
        var link = $("a", c); if (link) link.tabIndex = Math.abs(o) < .5 ? 0 : -1;
      });
      var idx = clamp(Math.round(a), 0, N - 1);
      if (countEl) countEl.textContent = String(idx + 1).padStart(2, "0") + "/" + String(N).padStart(2, "0");
      if (nameEl) nameEl.textContent = cards[idx].getAttribute("data-place");
    }
    ST.create({ trigger: sec, start: "top top", end: "bottom bottom", scrub: 1, snap: { snapTo: 1 / (N - 1), duration: { min: .3, max: .8 }, delay: .12, ease: "power2.inOut" }, onUpdate: function (s) { a = s.progress * (N - 1); place(); } });
    window.addEventListener("pointermove", function (e) { tmx = e.clientX / innerWidth - .5; tmy = e.clientY / innerHeight - .5; }, { passive: true });
    G.ticker.add(function () { mx += (tmx - mx) * .06; my += (tmy - my) * .06; G.set(world, { rotateY: mx * 10, rotateX: -my * 7 }); });
    cards.forEach(function (c, i) { var l = $("a", c); if (l) l.addEventListener("focus", function () { var y = sec.offsetTop + (sec.offsetHeight - innerHeight) * (i / (N - 1)); if (lenis) lenis.scrollTo(y, { immediate: true }); else scrollTo(0, y); }); });
    place();
  }

  /* ---------------- Circle reveal ---------------- */
  function circleReveal() {
    $$(".reveal").forEach(function (sec) {
      var media = $(".reveal__media", sec), img = $(".reveal__media img", sec), copy = $(".reveal__copy", sec);
      if (reduce || !ST) return;
      var tl = G.timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: sec, start: "top top", end: "bottom bottom", scrub: 1 } });
      tl.fromTo(media, { clipPath: "circle(9% at 50% 50%)" }, { clipPath: "circle(75% at 50% 50%)", duration: .7 })
        .fromTo(img, { scale: 1.35 }, { scale: 1, duration: .9 }, 0)
        .from(copy, { opacity: 0, y: 80, duration: .3 }, .45);
      if (fine) sec.addEventListener("pointermove", function (e) {
        var r = sec.getBoundingClientRect();
        G.to(img, { xPercent: (e.clientX / r.width - .5) * -3, yPercent: (e.clientY / innerHeight - .5) * -3, duration: 1.2, ease: "power3.out", overwrite: "auto" });
      });
    });
  }

  /* ---------------- Rail ---------------- */
  function rail() {
    var nav = $(".rail"), ch = $$("[data-chapter]");
    if (!nav || ch.length < 3 || !ST) { if (nav) nav.remove(); return; }
    ch.forEach(function (sec) {
      var a = d.createElement("a"); a.href = "#" + sec.id;
      a.innerHTML = '<span class="rail__label">' + sec.getAttribute("data-chapter") + '</span><span class="rail__dot"></span>';
      a.setAttribute("aria-label", "Jump to " + sec.getAttribute("data-chapter")); nav.appendChild(a);
      ST.create({ trigger: sec, start: "top 55%", end: "bottom 55%", onToggle: function (s) { if (s.isActive) { $$("a", nav).forEach(function (x) { x.classList.remove("is-active"); x.removeAttribute("aria-current"); }); a.classList.add("is-active"); a.setAttribute("aria-current", "true"); } } });
    });
  }

  /* ---------------- Horizontal gallery + lightbox ---------------- */
  function hgallery() {
    $$(".hgallery").forEach(function (g) {
      var track = $(".hgallery__track", g), bar = $(".hgallery__progress i", g), pin = $(".hgallery__pin", g);
      if (!track || reduce || !ST || isMobile()) return;
      var dist = function () { return Math.max(0, track.scrollWidth - innerWidth); };
      G.to(track, { x: function () { return -dist(); }, ease: "none", scrollTrigger: { trigger: g, pin: pin, start: "top top", end: function () { return "+=" + dist(); }, scrub: 1, invalidateOnRefresh: true, onUpdate: function (s) { if (bar) G.set(bar, { scaleX: s.progress }); } } });
    });
  }
  function lightbox() {
    var lb = $(".lightbox"); if (!lb) return;
    var items = $$("[data-lightbox]"), img = $("img", lb), count = $(".lightbox__count", lb), idx = 0, opener = null;
    var show = function (i) { idx = (i + items.length) % items.length; img.src = items[idx].getAttribute("href"); var im = $("img", items[idx]); img.alt = im ? im.alt : ""; count.textContent = (idx + 1) + " of " + items.length; };
    var open = function (i) { opener = d.activeElement; show(i); lb.classList.add("is-open"); lb.setAttribute("aria-hidden", "false"); if (lenis) lenis.stop(); $(".lightbox__close", lb).focus(); if (!reduce) G.fromTo(img, { opacity: 0, scale: .94 }, { opacity: 1, scale: 1, duration: .7 }); };
    var close = function () { lb.classList.remove("is-open"); lb.setAttribute("aria-hidden", "true"); if (lenis) lenis.start(); if (opener) opener.focus(); };
    items.forEach(function (a, i) { a.addEventListener("click", function (e) { e.preventDefault(); open(i); }); });
    $(".lightbox__close", lb).addEventListener("click", close);
    $(".lightbox__prev", lb).addEventListener("click", function () { show(idx - 1); });
    $(".lightbox__next", lb).addEventListener("click", function () { show(idx + 1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) close(); });
    d.addEventListener("keydown", function (e) {
      if (!lb.classList.contains("is-open")) return;
      if (e.key === "Escape") close(); if (e.key === "ArrowLeft") show(idx - 1); if (e.key === "ArrowRight") show(idx + 1);
      if (e.key === "Tab") { var f = $$("button", lb), k = f.indexOf(d.activeElement); if (e.shiftKey && k <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && k === f.length - 1) { e.preventDefault(); f[0].focus(); } }
    });
  }

  /* ---------------- Rentals list ---------------- */
  function rentals() {
    var list = $(".homes-list"); if (!list) return;
    var rows = $$(".home-row", list), hov = $(".hover-img"), imgs = hov ? $$("img", hov) : [];
    if (hov && fine && !reduce) {
      var xT = G.quickTo(hov, "x", { duration: .8, ease: "power3.out" }), yT = G.quickTo(hov, "y", { duration: .8, ease: "power3.out" }), rT = G.quickTo(hov, "rotation", { duration: .8, ease: "power3.out" }), px = 0;
      list.addEventListener("pointermove", function (e) { xT(e.clientX + 40); yT(e.clientY - 150); rT(clamp((e.clientX - px) * .4, -12, 12)); px = e.clientX; });
      rows.forEach(function (r, i) { r.addEventListener("pointerenter", function () { imgs.forEach(function (im, k) { im.classList.toggle("is-on", k === i); }); G.to(hov, { opacity: 1, scale: 1, duration: .6 }); }); });
      list.addEventListener("pointerleave", function () { G.to(hov, { opacity: 0, scale: .8, duration: .45 }); });
    }
    var chips = $$(".chip[data-filter]"), empty = $(".empty-note"), note = $(".guests-note");
    var guests = parseInt(new URLSearchParams(location.search).get("guests") || "0", 10);
    var apply = function (f) {
      var shown = 0;
      rows.forEach(function (r) { var ok = (f === "all" || (r.getAttribute("data-tags") || "").split(" ").indexOf(f) > -1) && (!guests || +r.getAttribute("data-sleeps") >= guests); r.hidden = !ok; if (ok) shown++; });
      if (empty) empty.hidden = shown > 0;
      if (ST) ST.refresh(); if (window.CanopyWorld) window.CanopyWorld.refresh();
    };
    chips.forEach(function (c) { c.addEventListener("click", function () { chips.forEach(function (x) { x.setAttribute("aria-pressed", "false"); }); c.setAttribute("aria-pressed", "true"); apply(c.getAttribute("data-filter")); }); });
    if (guests && note) { note.hidden = false; $("strong", note).textContent = guests; }
    apply("all");
  }

  /* ---------------- Forms ---------------- */
  function forms() {
    var t = new Date(); t.setMinutes(t.getMinutes() - t.getTimezoneOffset()); var iso = t.toISOString().slice(0, 10);
    $$('input[type="date"]').forEach(function (i) { i.min = iso; });
    $$("[data-pair-start]").forEach(function (s) { var end = d.getElementById(s.getAttribute("data-pair-start")); s.addEventListener("change", function () { if (end) { end.min = s.value; if (end.value && end.value < s.value) end.value = ""; } }); });
    $$("form[data-form]").forEach(function (form) {
      var status = $(".form-status", form) || (form.nextElementSibling && form.nextElementSibling.classList.contains("form-status") ? form.nextElementSibling : null);
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var ok = true, first = null;
        $$("[required]", form).forEach(function (f) {
          var bad = !f.value.trim() || (f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.value));
          var w = f.closest(".field"); if (w) w.classList.toggle("is-invalid", bad);
          f.setAttribute("aria-invalid", bad ? "true" : "false"); if (bad) { ok = false; if (!first) first = f; }
        });
        if (!ok) { if (status) { status.className = "form-status is-err"; status.textContent = "Check the highlighted fields and try again."; } first.focus(); return; }
        var btn = $('button[type="submit"]', form), label = btn ? btn.textContent : "";
        if (btn) { btn.disabled = true; btn.textContent = "Sending…"; }
        var done = function (good, msg) { if (btn) { btn.disabled = false; btn.textContent = label; } if (status) { status.className = "form-status " + (good ? "is-ok" : "is-err"); status.textContent = msg; } if (good) form.reset(); };
        if (location.protocol === "file:") { done(true, form.getAttribute("data-success") + " (Preview copy: messages send once the site is live.)"); return; }
        fetch(form.getAttribute("action") || "/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(new FormData(form)).toString() })
          .then(function (r) { if (!r.ok) throw new Error(r.status); done(true, form.getAttribute("data-success")); })
          .catch(function () { done(false, "Message not sent. Call 850.706.0519 or email stay@canopyvacations.com and we'll pick it up."); });
      });
      $$("[required]", form).forEach(function (f) { f.addEventListener("input", function () { var w = f.closest(".field"); if (w) w.classList.remove("is-invalid"); f.removeAttribute("aria-invalid"); }); });
    });
    $$("form[data-search]").forEach(function (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault(); var q = new URLSearchParams();
        var g = $('[name="guests"]', form).value; if (g && g !== "0") q.set("guests", g);
        ["arrive", "depart"].forEach(function (n) { var v = $('[name="' + n + '"]', form).value; if (v) q.set(n, v); });
        leaveTo(form.getAttribute("action") + (q.toString() ? "?" + q : ""));
      });
    });
    $$("form[data-booking]").forEach(function (form) { form.addEventListener("submit", function (e) { e.preventDefault(); window.open(form.getAttribute("data-booking"), "_blank", "noopener"); }); });
  }

  /* ---------------- Progress / TOC / mobile bar ---------------- */
  function misc() {
    var bar = $(".progress");
    if (bar) {
      var art = $(".article") || $(".legal") || body;
      var upd = function () { var r = art.getBoundingClientRect(); bar.style.transform = "scaleX(" + clamp(-r.top / Math.max(1, r.height - innerHeight), 0, 1) + ")"; };
      onScroll(upd); upd();
    }
    var toc = $$(".legal__toc a");
    if (toc.length) {
      var io = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) toc.forEach(function (a) { a.classList.toggle("is-active", a.getAttribute("href") === "#" + x.target.id); }); }); }, { rootMargin: "-30% 0px -60% 0px" });
      $$(".legal__body h2[id]").forEach(function (h) { io.observe(h); });
    }
    var mbar = $(".mbar");
    if (mbar) {
      body.classList.add("has-mbar");
      var gate = $(".hero") || $(".prop-hero") || $(".page-hero");
      if (gate) { var mb = function (y) { mbar.classList.toggle("is-off", y < gate.offsetHeight * .5); }; mb(scrollY); onScroll(mb); }
    }
    var y = $("[data-year]"); if (y) y.textContent = new Date().getFullYear();
  }

  /* ---------------- Full-page property showcase: scroll switches homes ---------------- */
  function showcase() {
    $$(".showcase").forEach(function (sec) {
      var slides = $$(".showcase__slide", sec), N = slides.length; if (N < 2) return;
      var btns = $$(".showcase__index button", sec), countEl = $(".showcase__count b", sec);
      var medias = slides.map(function (s) { return $(".showcase__media", s); }), copies = slides.map(function (s) { return $(".showcase__copy", s); });
      sec.style.setProperty("--n", N);
      var cur = 0, target = 0, shown = -1;
      var at = function (k) { return sec.offsetTop + (sec.offsetHeight - innerHeight) * (k / (N - 1)); };
      btns.forEach(function (b, k) { b.addEventListener("click", function () { if (lenis) lenis.scrollTo(at(k), { duration: 1.4 }); else scrollTo({ top: at(k), behavior: reduce ? "auto" : "smooth" }); }); });
      function render() {
        for (var k = 0; k < N; k++) {
          var r = k === 0 ? 1 : clamp(cur - (k - 1), 0, 1);       // how far slide k has wiped in
          var c = clamp(cur - k, 0, 1);                            // how far slide k is covered by the next
          var e = r * r * (3 - 2 * r);
          slides[k].style.clipPath = k === 0 ? "none" : "inset(" + ((1 - e) * 100).toFixed(2) + "% 0 0 0)";
          if (medias[k]) medias[k].style.transform = "translate3d(0," + (-c * 7).toFixed(2) + "%,0) scale(" + (1.14 - .14 * e + c * .04).toFixed(4) + ")";
          if (copies[k]) { copies[k].style.transform = "translate3d(0," + ((1 - e) * 70 - c * 50).toFixed(1) + "px,0)"; copies[k].style.opacity = Math.max(0, Math.min(e * 1.6 - .3, 1 - c * 1.8)).toFixed(3); }
        }
        btns.forEach(function (b, k) { b.style.setProperty("--p", clamp(1 - Math.abs(cur - k), 0, 1).toFixed(3)); });
        var idx = clamp(Math.round(cur), 0, N - 1);
        if (idx !== shown) {
          shown = idx;
          btns.forEach(function (b, k) { b.classList.toggle("is-active", k === idx); if (k === idx) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current"); });
          slides.forEach(function (s, k) { if (k === idx) s.removeAttribute("inert"); else s.setAttribute("inert", ""); s.setAttribute("aria-hidden", k === idx ? "false" : "true"); });
          if (countEl) countEl.textContent = String(idx + 1).padStart(2, "0");
        }
      }
      if (reduce || !ST) { slides.forEach(function (s) { s.removeAttribute("inert"); s.style.clipPath = "none"; }); return; }
      ST.create({ trigger: sec, start: "top top", end: "bottom bottom",
        snap: { snapTo: 1 / (N - 1), duration: { min: .45, max: 1 }, delay: .18, ease: "power2.inOut" },
        onUpdate: function (s) { target = s.progress * (N - 1); } });
      G.ticker.add(function () { var dlt = target - cur; if (Math.abs(dlt) < .0005 && shown > -1) return; cur += dlt * .11; render(); });
      render();
    });
  }

  /* ---------------- Favourites (saved on this device) ---------------- */
  function favorites() {
    var KEY = "cv-favs", list = [];
    try { list = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { list = []; }
    var save = function () { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {} };
    function sync() {
      $$("[data-fav]").forEach(function (b) {
        var on = list.indexOf(b.getAttribute("data-fav")) > -1, nm = b.getAttribute("data-name") || "this home";
        b.setAttribute("aria-pressed", on ? "true" : "false");
        b.setAttribute("aria-label", on ? "Remove " + nm + " from favorites" : "Save " + nm + " to favorites");
      });
      $$(".fav-link__n").forEach(function (n) { n.textContent = list.length; n.classList.toggle("is-on", list.length > 0); });
      var wrap = $("[data-favs]");
      if (wrap) {
        var shown = 0;
        $$("[data-fav-card]", wrap).forEach(function (c) { var on = list.indexOf(c.getAttribute("data-fav-card")) > -1; c.hidden = !on; if (on) shown++; });
        var empty = $(".empty-state", wrap.parentNode); if (empty) empty.hidden = shown > 0;
        if (ST) ST.refresh();
      }
    }
    d.addEventListener("click", function (e) {
      var b = e.target.closest("[data-fav]"); if (!b) return;
      e.preventDefault(); e.stopPropagation();
      var s = b.getAttribute("data-fav"), i = list.indexOf(s);
      if (i > -1) list.splice(i, 1); else list.push(s);
      save(); sync();
      if (!reduce) G.fromTo(b, { scale: .82 }, { scale: 1, duration: .7, ease: "elastic.out(1,.45)" });
    });
    window.addEventListener("storage", function (e) { if (e.key === KEY) { try { list = JSON.parse(e.newValue || "[]"); } catch (er) { list = []; } sync(); } });
    sync();
  }

  /* ---------------- Contrast: logo + cursor turn white over photos / dark areas ---------------- */
  function contrast() {
    var header = $(".site-header"), brand = $(".brand", header), cur = $(".cursor");
    var OVERLAYS = ".site-header, .cursor, .wake, .grain, .world, .pins, .veil, .rail, .mbar, .hover-img";
    var DARK = ".on-photo, .showcase__stage, .reveal__media, .depth-card__frame, .hgallery__item, .media-pair figure, .home-card__img, .post-card__img, .next-home__bg, .lightbox, .wide-img, .article-img, [data-dark]";
    // What is visible at (x, y), skipping fixed chrome layered on top of the page
    function under(x, y) {
      if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) return null;
      var stack = d.elementsFromPoint(x, y);
      for (var i = 0; i < stack.length; i++) if (!stack[i].closest(OVERLAYS)) return stack[i];
      return null;
    }
    function isDark(el, y) {
      if (!el) return false;
      if (el.closest(".menu")) return false;
      var ph = el.closest(".prop-hero");
      if (ph) { var r = ph.getBoundingClientRect(); return (y - r.top) / r.height > .42; } // top of that hero is washed light for the header
      return !!(el.tagName === "IMG" || el.closest(DARK));
    }
    var headerDark = null, cursorDark = null, px = -1, py = -1, queued = false;
    function check() {
      queued = false;
      if (brand) {
        var b = brand.getBoundingClientRect(), y = b.top + b.height / 2;
        var hd = isDark(under(b.left + b.width * .18, y), y) || isDark(under(b.left + b.width * .7, y), y);
        if (hd !== headerDark) { headerDark = hd; header.classList.toggle("is-on-dark", hd); }
      }
      if (cur && px > -1) {
        var cd = isDark(under(px, py), py);
        if (cd !== cursorDark) { cursorDark = cd; cur.classList.toggle("is-on-dark", cd); }
      }
    }
    var queue = function () { if (!queued) { queued = true; requestAnimationFrame(check); } };
    window.addEventListener("pointermove", function (e) { px = e.clientX; py = e.clientY; queue(); }, { passive: true });
    onScroll(queue); window.addEventListener("resize", queue, { passive: true });
    // slides and reveals change under a still pointer, so re-check a few times a second too
    setInterval(queue, 250);
    queue();
  }

  magnetText(); reveals(); tilt(); liquid(); velocityFx(); depthCarousel(); showcase(); circleReveal(); rail(); hgallery(); lightbox(); rentals(); forms(); favorites(); misc(); contrast();
  runLoader();
  if (ST) { window.addEventListener("load", function () { ST.refresh(); }); if (d.fonts && d.fonts.ready) d.fonts.ready.then(function () { ST.refresh(); }); }
})();
