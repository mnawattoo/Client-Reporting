/* ==========================================================================
   world.js — one persistent Three.js particle world behind every page.
   ~16k particles morph between shapes as you scroll section to section:
   the Canopy mark, a living ocean, a tunnel, the coastline, a sun, a galaxy.
   The cursor pushes particles away and lights them up. Igloo-style HUD pins
   track points of the 3D logo.
   Sections opt in with: data-shape="logo|wave|ring|coast|sphere|galaxy"
   optional: data-shape-x="-1..1" (horizontal placement), data-shape-s (scale),
             data-shape-a (opacity 0..1)
   ========================================================================== */
(function () {
  "use strict";
  var THREE = window.THREE;
  var canvas = document.querySelector(".world");
  if (!canvas || !THREE) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mobile = window.matchMedia("(max-width: 860px)").matches;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  var renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, alpha: true, powerPreference: "high-performance" }); }
  catch (e) { canvas.remove(); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75));
  renderer.setClearColor(0x000000, 0);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(45, 1, .1, 100);
  camera.position.set(0, 0, 9);
  var group = new THREE.Group();
  scene.add(group);

  var N = mobile ? 5200 : 11000;   // light edition: fewer, finer particles read calmer on a pale page
  var rand = function () { return Math.random(); };

  /* ---------------- shape generators (N * xyz) ---------------- */
  var LOGO_S = 4.8, logoInfo = null;

  function shapeLogo(img) {
    var c = document.createElement("canvas"), w = img.width * 2, h = img.height * 2;
    c.width = w; c.height = h;
    var x = c.getContext("2d"); x.drawImage(img, 0, 0, w, h);
    var data = x.getImageData(0, 0, w, h).data, pts = [];
    for (var py = 0; py < h; py += 1) for (var px = 0; px < w; px += 1) if (data[(py * w + px) * 4 + 3] > 110) pts.push(px, py);
    var a = new Float32Array(N * 3), asp = w / h, M = pts.length / 2;
    logoInfo = { w: w, h: h, asp: asp };
    for (var i = 0; i < N; i++) {
      var k = (Math.random() * M | 0) * 2;
      var u = (pts[k] + rand() - .5) / w - .5, v = (pts[k + 1] + rand() - .5) / h - .5;
      a[i * 3] = u * LOGO_S * asp;
      a[i * 3 + 1] = -v * LOGO_S;
      a[i * 3 + 2] = (rand() - .5) * .45 - (u * u + v * v) * 1.2;
    }
    return a;
  }
  function logoPoint(u, v) { // u,v in 0..1 of the mark image
    var asp = logoInfo ? logoInfo.asp : 1;
    return new THREE.Vector3((u - .5) * LOGO_S * asp, -(v - .5) * LOGO_S, 0);
  }
  function shapeWave() {
    var a = new Float32Array(N * 3), cols = Math.ceil(Math.sqrt(N * 2.4)), rows = Math.ceil(N / cols);
    for (var i = 0; i < N; i++) {
      var cx = i % cols, cz = (i / cols) | 0;
      a[i * 3] = (cx / cols - .5) * 22 + (rand() - .5) * .05;
      a[i * 3 + 1] = -1.7;
      a[i * 3 + 2] = -cz / rows * 16 + 3.2;
    }
    return a;
  }
  function shapeRing() {
    var a = new Float32Array(N * 3);
    for (var i = 0; i < N; i++) {
      var t = rand() * Math.PI * 2, r = 3.4 + Math.pow(rand(), 3) * 3.5;
      a[i * 3] = Math.cos(t) * r * 1.35; a[i * 3 + 1] = Math.sin(t) * r * .9; a[i * 3 + 2] = -rand() * 18 + 4;
    }
    return a;
  }
  function shapeCoast() {
    var a = new Float32Array(N * 3);
    var line = function (x) { return .55 * Math.sin(x * .42 + .6) + .22 * Math.sin(x * 1.3) + .08 * Math.sin(x * 3.1); };
    var pins = [-4.9, -4.55, .45, .95, 4.5]; // west to east, matches the five homes
    for (var i = 0; i < N; i++) {
      var r = rand(), x, y, z = (rand() - .5) * .2;
      if (r < .42) { x = (rand() - .5) * 12; y = line(x) + (rand() - .5) * .06; }
      else if (r < .52) { var p = pins[(rand() * pins.length) | 0]; x = p + (rand() - .5) * .04; y = line(p) + rand() * 1.5; }
      else if (r < .62) { var p2 = pins[(rand() * pins.length) | 0], ang = rand() * 6.283, rr = .12 + rand() * .05; x = p2 + Math.cos(ang) * rr; y = line(p2) + 1.5 + Math.sin(ang) * rr; }
      else { x = (rand() - .5) * 13; y = line(x) - .25 - Math.pow(rand(), 1.4) * 2.6; z += (rand() - .5) * .4; }
      a[i * 3] = x; a[i * 3 + 1] = y - .2; a[i * 3 + 2] = z;
    }
    return a;
  }
  function shapeSphere() {
    var a = new Float32Array(N * 3), g = Math.PI * (3 - Math.sqrt(5));
    for (var i = 0; i < N; i++) {
      var y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), t = g * i, R = 2.3;
      if (i % 7 === 0) R = 2.3 + Math.pow(rand(), 2) * 2.2; // corona
      a[i * 3] = Math.cos(t) * r * R; a[i * 3 + 1] = y * R; a[i * 3 + 2] = Math.sin(t) * r * R;
    }
    return a;
  }
  function shapeGalaxy() {
    var a = new Float32Array(N * 3), arms = 4;
    for (var i = 0; i < N; i++) {
      var r = Math.pow(rand(), 1.6) * 5.2, arm = (i % arms) / arms * Math.PI * 2, t = arm + r * .75 + (rand() - .5) * (.5 / (r + .3));
      a[i * 3] = Math.cos(t) * r; a[i * 3 + 1] = (rand() - .5) * .35 * (1.2 - r / 5.2); a[i * 3 + 2] = Math.sin(t) * r;
    }
    return a;
  }

  /* ---------------- page sections -> shape list ---------------- */
  var sections = Array.prototype.slice.call(document.querySelectorAll("[data-shape]")).slice(0, 6);
  if (!sections.length) { canvas.remove(); return; }
  var types = sections.map(function (s) { return s.getAttribute("data-shape"); });
  var K = types.length;

  var ANIM = {
    logo: "q.z += sin(uTime*.5 + q.x*1.7) * .035; q.xy *= 1. + sin(uTime*.4)*.006;",
    wave: "q.y += sin(q.x*.55 + uTime*.55)*.2 + sin(q.z*.8 + uTime*.75)*.14 + sin((q.x+q.z)*1.7 + uTime*1.1)*.03;",
    ring: "q.z = mod(q.z + uTime*.5 + 14., 18.) - 14.; q.xy = rot(uTime*.025) * q.xy;",
    coast: "q.y += step(q.y, -.3) * sin(q.x*1.8 + uTime*.8) * .03;",
    sphere: "q.xz = rot(uTime*.09) * q.xz; q.yz = rot(.35) * q.yz;",
    galaxy: "q.xz = rot(uTime*(.06 / (length(q.xz)*.25 + .4))) * q.xz; q.yz = rot(-.55) * q.yz;"
  };

  var attrDecl = "", body = "", sum = "vec3 p = vec3(0.);";
  for (var k = 0; k < K; k++) {
    attrDecl += "attribute vec3 s" + k + ";\n";
    body += "{ vec3 q = s" + k + "; " + (ANIM[types[k]] || "") + " p += q * wgt(" + k + ".); }\n";
  }

  var VERT = [
    attrDecl,
    "attribute vec4 aR;",
    "uniform float uTime; uniform float uShape; uniform vec3 uMouse; uniform float uMouseOn; uniform float uPix; uniform float uVel;",
    "varying vec3 vCol; varying float vA;",
    "float i0; float tt;",
    "float wgt(float k){ return (1.-tt)*(1.-step(.5,abs(i0-k))) + tt*(1.-step(.5,abs(i0+1.-k))); }",
    "mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }",
    "void main(){",
    "  i0 = floor(uShape); float f = uShape - i0;",
    "  float d0 = aR.x * .3;",
    "  tt = smoothstep(d0, d0 + .7, f);",
    "  tt = tt * tt * (3. - 2. * tt);",
    sum,
    body,
    "  float burst = sin(tt * 3.14159);",
    "  p += (aR.yzw - .5) * burst * 1.05;",
    "  p += vec3(sin(uTime*.45 + aR.x*40.), cos(uTime*.4 + aR.y*40.), sin(uTime*.35 + aR.z*40.)) * (.014 + burst*.05);",
    "  vec3 d = p - uMouse; float dist = length(d.xy);",
    "  float m = smoothstep(2.1, 0., dist); m = m * m * (3. - 2. * m) * uMouseOn;",
    "  vec2 dir = normalize(d.xy + vec2(.0001));",
    "  p.xy += dir * m * 1.0 + vec2(-dir.y, dir.x) * m * .35;",
    "  p.z += m * .8;",
    "  p.y += uVel * (aR.y - .5) * .18;",
    "  vec4 mv = modelViewMatrix * vec4(p, 1.);",
    "  gl_Position = projectionMatrix * mv;",
    "  float size = (.5 + aR.w * 1.25) * (1. + m * .9);",
    "  gl_PointSize = clamp(uPix * size / -mv.z, 1., 18.);",
    "  vec3 em = vec3(.043,.478,.396), sh = vec3(.42,.52,.5), co = vec3(.91,.47,.29);",
    "  vCol = mix(em, sh, smoothstep(.35, .95, aR.y));",
    "  vCol = mix(vCol, co, step(.955, aR.z));",
    "  vCol = mix(vCol, co, m * .65);",
    "  vA = (.2 + .45 * aR.w) * smoothstep(-22., -5., mv.z) * (1. - smoothstep(-2.5, -.6, mv.z)) + m * .35;",
    "}"
  ].join("\n");

  var FRAG = [
    "uniform float uAlpha; varying vec3 vCol; varying float vA;",
    "void main(){ vec2 c = gl_PointCoord - .5; float d = length(c);",
    "  float a = smoothstep(.5, .0, d); a = a*a;",
    "  gl_FragColor = vec4(vCol, a * vA * uAlpha); }"
  ].join("\n");

  var geo = new THREE.BufferGeometry();
  var R = new Float32Array(N * 4);
  for (var i = 0; i < N * 4; i++) R[i] = rand();
  geo.setAttribute("aR", new THREE.BufferAttribute(R, 4));

  var uniforms = {
    uTime: { value: 0 }, uShape: { value: 0 }, uMouse: { value: new THREE.Vector3(99, 99, 0) },
    uMouseOn: { value: 0 }, uPix: { value: 30 }, uAlpha: { value: 1 }, uVel: { value: 0 }
  };
  var mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: uniforms, transparent: true, depthWrite: false, blending: THREE.NormalBlending });
  var points;

  function build(logoImg) {
    var gens = { wave: shapeWave, ring: shapeRing, coast: shapeCoast, sphere: shapeSphere, galaxy: shapeGalaxy };
    var first = null;
    types.forEach(function (t, k) {
      var arr = t === "logo" ? (logoImg ? shapeLogo(logoImg) : shapeSphere()) : (gens[t] || shapeSphere)();
      geo.setAttribute("s" + k, new THREE.BufferAttribute(arr, 3));
      if (!first) first = arr;
    });
    geo.setAttribute("position", new THREE.BufferAttribute(first, 3));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 50);
    points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    group.add(points);
    measure();
    start();
  }

  /* ---------------- layout + scroll mapping ---------------- */
  var stops = [], W = 1, H = 1;
  function attrF(el, name, def) { var v = parseFloat(el.getAttribute(name)); return isNaN(v) ? def : v; }
  function measure() {
    W = window.innerWidth; H = window.innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.updateProjectionMatrix();
    uniforms.uPix.value = (mobile ? 26 : 34) * renderer.getPixelRatio() * Math.min(1.25, H / 900);
    var sy = window.scrollY;
    stops = sections.map(function (s, idx) {
      var r = s.getBoundingClientRect(), top = r.top + sy;
      var heroY = (mobile && idx === 0) ? attrF(s, "data-shape-my", 1.75) : attrF(s, "data-shape-y", 0);
      var focus = Math.max(0, top + Math.min(r.height, H) * .5 - H * .5);
      return {
        at: focus, end: Math.max(focus, top + r.height - H * .5),
        x: attrF(s, "data-shape-x", 0) * (mobile ? 0 : 1),
        y: heroY,
        s: attrF(s, "data-shape-s", 1) * (mobile ? .72 : 1),
        a: attrF(s, "data-shape-a", 1) * (mobile ? .75 : 1)
      };
    });
  }
  window.addEventListener("resize", function () { mobile = window.matchMedia("(max-width: 860px)").matches; measure(); }, { passive: true });
  window.addEventListener("load", measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

  var cur = { shape: 0, x: 0, y: 0, s: 1, a: 1 };
  function targetFor(y) {
    if (!stops.length) return cur;
    var k = 0;
    for (var i = 0; i < stops.length; i++) if (y >= stops[i].at) k = i;
    var A = stops[k], B = stops[Math.min(k + 1, stops.length - 1)];
    var t = 0;
    if (B !== A) { var span = B.at - A.end; t = span > 0 ? (y - A.end) / span : (y >= B.at ? 1 : 0); t = Math.max(0, Math.min(1, t)); }
    var e = t * t * (3 - 2 * t);
    return { shape: k + e, x: A.x + (B.x - A.x) * e, y: A.y + (B.y - A.y) * e, s: A.s + (B.s - A.s) * e, a: A.a + (B.a - A.a) * e };
  }

  /* ---------------- input ---------------- */
  var mouse = { x: 0, y: 0, tx: 0, ty: 0, on: 0, ton: 0, px: -9999, py: -9999, sx: -9999, sy: -9999 };
  var ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit = new THREE.Vector3(), ndc = new THREE.Vector2();
  window.addEventListener("pointermove", function (e) {
    mouse.tx = e.clientX / W * 2 - 1; mouse.ty = -(e.clientY / H * 2 - 1);
    mouse.px = e.clientX; mouse.py = e.clientY; mouse.ton = reduce ? 0 : 1;
  }, { passive: true });
  document.addEventListener("pointerleave", function () { mouse.ton = 0; });
  if (!fine) mouse.ton = 0;

  var lastY = window.scrollY, vel = 0;

  /* ---------------- HUD pins on the logo ---------------- */
  var pins = Array.prototype.slice.call(document.querySelectorAll("[data-pin]"));
  var pinPts = pins.map(function (p) { var uv = p.getAttribute("data-pin").split(","); return { u: +uv[0], v: +uv[1] }; });
  var tmp = new THREE.Vector3();
  function updatePins(logoW) {
    if (!pins.length) return;
    var vis = Math.max(0, 1 - Math.abs(cur.shape - 0) * 3) * (logoW ? 1 : 0);
    pins.forEach(function (el, i) {
      tmp.copy(logoPoint(pinPts[i].u, pinPts[i].v));
      tmp.applyMatrix4(group.matrixWorld).project(camera);
      var x = (tmp.x * .5 + .5) * W, y = (-tmp.y * .5 + .5) * H;
      el.style.transform = "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0)";
      el.style.opacity = vis.toFixed(3);
      el.style.visibility = vis < .02 ? "hidden" : "visible";
    });
  }

  /* ---------------- loop ---------------- */
  var clock = new THREE.Clock(), running = false, visible = true, t = 0;
  document.addEventListener("visibilitychange", function () { visible = !document.hidden; if (visible && running) requestAnimationFrame(frame); });

  function frame() {
    if (!visible) return;
    if (!reduce) requestAnimationFrame(frame);
    var dt = Math.min(clock.getDelta(), .05);
    if (!reduce) t += dt;
    var y = window.scrollY;
    vel += ((y - lastY) / Math.max(dt, .008) * .0004 - vel) * .06; lastY = y;
    var tg = targetFor(y);
    var ease = reduce ? 1 : .05;
    cur.shape += (tg.shape - cur.shape) * ease;
    cur.x += (tg.x - cur.x) * ease; cur.y += (tg.y - cur.y) * ease;
    cur.s += (tg.s - cur.s) * ease; cur.a += (tg.a - cur.a) * ease;

    mouse.x += (mouse.tx - mouse.x) * .045; mouse.y += (mouse.ty - mouse.y) * .045;
    mouse.on += (mouse.ton - mouse.on) * .05;
    if (mouse.sx < -9000) { mouse.sx = mouse.px; mouse.sy = mouse.py; }
    mouse.sx += (mouse.px - mouse.sx) * .12; mouse.sy += (mouse.py - mouse.sy) * .12;   // the field trails the pointer smoothly

    // place by fraction of the visible half-width so it lands in the same spot on any screen
    var visH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), visW = visH * camera.aspect;
    var fit = mobile ? .78 : Math.min(1, camera.aspect / 1.55) * (Math.abs(cur.x) > .2 ? .92 : 1);
    group.position.set(cur.x * visW * .5, cur.y, 0);
    group.scale.setScalar(cur.s * fit);
    group.rotation.y = mouse.x * .2 + Math.sin(t * .1) * .04;
    group.rotation.x = -mouse.y * .12;
    group.updateMatrixWorld();

    camera.position.x += (mouse.x * .35 - camera.position.x) * .03;
    camera.position.y += (mouse.y * .25 - camera.position.y) * .03;
    camera.lookAt(0, 0, 0);

    // cursor -> local plane point
    ndc.set((mouse.sx / W) * 2 - 1, -(mouse.sy / H) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (ray.ray.intersectPlane(plane, hit)) { group.worldToLocal(hit); uniforms.uMouse.value.copy(hit); }

    uniforms.uTime.value = t;
    uniforms.uShape.value = Math.max(0, Math.min(K - 1.0001, cur.shape));
    uniforms.uMouseOn.value = mouse.on;
    uniforms.uAlpha.value = cur.a;
    uniforms.uVel.value = Math.max(-2, Math.min(2, vel));
    renderer.render(scene, camera);
    updatePins(types[0] === "logo");
  }
  function start() {
    running = true; measure(); clock.start(); requestAnimationFrame(frame);
    if (reduce) { window.addEventListener("scroll", function () { requestAnimationFrame(frame); }, { passive: true }); }
    window.CanopyWorld = { refresh: measure };
    document.documentElement.classList.add("has-world");
  }

  if (types.indexOf("logo") > -1 && window.CANOPY_MARK) {
    var img = new Image();
    img.onload = function () { build(img); };
    img.onerror = function () { build(null); };
    img.src = window.CANOPY_MARK;
  } else build(null);
})();
