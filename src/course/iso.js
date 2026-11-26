/* Isometric scene renderer + step player. Scenes are plain data (see scenes-*.js). */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg', CW = 56, CH = 28;
  var esc = function (s) { return window.__esc(s); }, md = function (s) { return window.__md(s); };

  var ICONS = {
    server: '<rect x="3" y="4" width="18" height="6" rx="2"/><rect x="3" y="14" width="18" height="6" rx="2"/><path d="M7 7h.01M7 17h.01"/>',
    lb: '<path d="M12 21v-9M12 12 5 5M12 12l7-7M5 9V5h4M15 5h4v4"/>',
    db: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
    cache: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    queue: '<path d="M12 3 2 8l10 5 10-5z"/><path d="M2 13l10 5 10-5"/>',
    cdn: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>',
    worker: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
    blob: '<path d="M4 8h16l-2 12H6z"/><ellipse cx="12" cy="8" rx="8" ry="2.5"/>',
    service: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 9h6M9 13h6M9 17h3"/>',
    ext: '<path d="M7 18a4 4 0 0 1-.5-8 5.5 5.5 0 0 1 10.6-1A4.5 4.5 0 0 1 17 18z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    check: '<path d="M5 12l5 5L20 7"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
    alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v5M12 17.5h.01"/>',
    replay: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>', pause: '<path d="M8 5v14M16 5v14"/>', play: '<path d="M7 4l13 8-13 8z"/>',
    key: '<circle cx="8" cy="14" r="4"/><path d="M11 12l9-9M16 7l3 3"/>', shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>', lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>', doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>',
    folder: '<path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>', moon: '<path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10z"/>', sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', back: '<path d="M19 12H5M11 6l-6 6 6 6"/>', chev: '<path d="M9 6l6 6-6 6"/>',
    idea: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>', book: '<path d="M4 4h6a3 3 0 0 1 2 1 3 3 0 0 1 2-1h6v15h-6a3 3 0 0 0-2 1 3 3 0 0 0-2-1H4z"/><path d="M12 5v15"/>',
    flask: '<path d="M9 3h6M10 3v6l-6 10a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3l-6-10V3"/>', cards: '<rect x="3" y="6" width="14" height="14" rx="2"/><path d="M7 3h12a2 2 0 0 1 2 2v12"/>',
    plan: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>', target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    sheet: '<path d="M4 6h16M4 12h16M4 18h10"/>', globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>',
    cube: '<path d="M12 2l9 5v10l-9 5-9-5V7z"/><path d="M12 12l9-5M12 12v10M12 12 3 7"/>', branch: '<circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="9" r="2"/><path d="M6 7v10M18 11c0 4-6 3-12 6"/>',
    cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M3 4h3l2.5 11h10L21 7H7"/>', money: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9 9.5c0-1 1.3-1.8 3-1.8s3 .8 3 1.8-1.3 1.6-3 2-3 1-3 2 1.3 1.8 3 1.8 3-.8 3-1.8"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>', chat: '<path d="M4 5h16v11H9l-5 4z"/>', image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
    file: '<path d="M6 3h8l4 4v14H6z"/>', link: '<path d="M10 14a4 4 0 0 0 5.6 0l3-3a4 4 0 0 0-5.6-5.6l-1 1M14 10a4 4 0 0 0-5.6 0l-3 3a4 4 0 0 0 5.6 5.6l1-1"/>', eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    skull: '<circle cx="12" cy="10" r="7"/><path d="M9 21v-4h6v4M9 10h.01M15 10h.01"/>', zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>', map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>'
  };
  function icon(name, size, cls) {
    return '<svg class="i ' + (cls || '') + '" ' + (size ? 'style="width:' + size + 'px;height:' + size + 'px" ' : '') + 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || ICONS.doc) + '</svg>';
  }
  window.ICON = icon;

  var HEIGHT = { server: 44, lb: 46, db: 40, cache: 36, queue: 30, cdn: 42, worker: 40, blob: 40, service: 44, ext: 40, client: 10, user: 10 };
  function el(tag, attrs, parent) { var e = document.createElementNS(NS, tag); if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  /* ship_it() look: a flat systems board. Grid units map straight to x/y; nodes are cards. */
  var FX = 48, FY = 54, HW = 64, HH = 27;
  function proj(gx, gy) { return { x: gx * FX, y: gy * FY }; }

  /* ---------- scene renderer ---------- */
  function IsoScene(host, spec) {
    var self = {}, nodes = {}, svg, L = {}, packets = [], paused = false, pausedAcc = 0, pauseAt = 0, raf = 0, prevChips = {}, cur = 0, uid = Math.random().toString(36).slice(2, 7);
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    spec.nodes.forEach(function (n) {
      var o = Object.assign({ from: 0, to: 999, dx: 44, off: 0 }, n);
      o.isClient = o.kind === 'client' || o.kind === 'user';
      if (o.isClient) o.dx = 54; else o.dx = Math.max(o.dx, 52);
      o.h = o.h || HEIGHT[o.kind] || 44; nodes[o.id] = o;
    });
    var list = spec.nodes.map(function (n) { return nodes[n.id]; });
    var minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9, gx0 = 1e9, gx1 = -1e9, gy0 = 1e9, gy1 = -1e9;
    list.forEach(function (n) {
      var p = proj(n.gx, n.gy); n.sx = p.x; n.sy = p.y;
      minx = Math.min(minx, p.x - HW - 60); maxx = Math.max(maxx, p.x + HW + 60);
      miny = Math.min(miny, p.y - HH - 52); maxy = Math.max(maxy, p.y + HH + 46);
      gx0 = Math.min(gx0, n.gx); gx1 = Math.max(gx1, n.gx); gy0 = Math.min(gy0, n.gy); gy1 = Math.max(gy1, n.gy);
    });
    miny -= 34;
    var vw = maxx - minx, vh = maxy - miny, asp = 2.1;
    if (vw / vh < asp) { var nw = vh * asp; minx -= (nw - vw) / 2; vw = nw; } else { var nh = vw / asp; miny -= (nh - vh) / 2; vh = nh; }
    svg = el('svg', { class: 'iso flat', viewBox: minx + ' ' + miny + ' ' + vw + ' ' + vh, preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': spec.title });
    var defs = el('defs', null, svg);
    var mk = el('marker', { id: 'ar' + uid, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
    el('path', { d: 'M0,1 L9,5 L0,9 z', fill: 'var(--ink-2)' }, mk);
    ['floor', 'tiles', 'edges', 'pk', 'nodes', 'chips'].forEach(function (k) { L[k] = el('g', { class: k }, svg); });
    /* floor grid */
    var pat = el('pattern', { id: 'dots' + uid, width: 16, height: 16, patternUnits: 'userSpaceOnUse' }, defs);
    el('circle', { cx: 2, cy: 2, r: 1.2, class: 'dot' }, pat);
    el('rect', { x: minx - 200, y: miny - 200, width: vw + 400, height: vh + 400, fill: 'url(#dots' + uid + ')' }, L.floor);
    /* tiles + nodes (depth sorted) */
    var sorted = list.slice().sort(function (a, b) { return (a.gx + a.gy) - (b.gx + b.gy) || a.gy - b.gy; });
    sorted.forEach(function (n) {
      n.tile = el('rect', { class: 'tile', x: n.sx - HW - 7, y: n.sy - HH - 7, width: 2 * HW + 14, height: 2 * HH + 14, rx: 18 }, L.tiles);
      n.g = buildNode(n); L.nodes.appendChild(n.g);
    });
    /* static edges */
    var edges = (spec.edges || []).map(function (e) {
      var o = Object.assign({ from: 0, to: 999 }, e[2] || {}); o.a = e[0]; o.b = e[1];
      var r = route(o.a, o.b, o.via, 0);
      o.el = el('path', { class: 'edge' + (o.dash ? ' dash' : ''), d: r.d, 'marker-end': 'url(#ar' + uid + ')' }, L.edges);
      if (o.both) o.el.setAttribute('marker-start', 'url(#ar' + uid + ')');
      if (o.nomark) { o.el.removeAttribute('marker-end'); o.el.removeAttribute('marker-start'); }
      return o;
    });
    host.appendChild(svg);

    function route(a, b, via, off) {
      var A = nodes[a], B = nodes[b], pts;
      if (Math.abs(A.gx - B.gx) < 1e-6 || Math.abs(A.gy - B.gy) < 1e-6) pts = [[A.gx, A.gy], [B.gx, B.gy]];
      else pts = via === 'yx' ? [[A.gx, A.gy], [A.gx, B.gy], [B.gx, B.gy]] : [[A.gx, A.gy], [B.gx, A.gy], [B.gx, B.gy]];
      var sp = pts.map(function (p) { var q = proj(p[0], p[1]); return { x: q.x, y: q.y }; });
      function clip(p, q, extra) { var dx = q.x - p.x, dy = q.y - p.y, len = Math.sqrt(dx * dx + dy * dy) || 1, cut = (Math.abs(dx) >= Math.abs(dy) ? HW : HH) + extra; cut = Math.min(cut, len * 0.48); return { x: p.x + dx / len * cut, y: p.y + dy / len * cut }; }
      var last = sp.length - 1;
      sp[0] = clip(sp[0], sp[1], 3); sp[last] = clip(sp[last], sp[last - 1], 8);
      sp = sp.map(function (q) { return { x: q.x, y: q.y + (off || 0) }; });
      var d = 'M' + sp[0].x + ',' + sp[0].y;
      if (sp.length === 2) d += ' L' + sp[1].x + ',' + sp[1].y;
      else {
        var r = 14, p0 = sp[0], p1 = sp[1], p2 = sp[2];
        var u1 = unit(p1, p0), u2 = unit(p1, p2);
        d += ' L' + (p1.x + u1.x * r) + ',' + (p1.y + u1.y * r) + ' Q' + p1.x + ',' + p1.y + ' ' + (p1.x + u2.x * r) + ',' + (p1.y + u2.y * r) + ' L' + p2.x + ',' + p2.y;
      }
      return { d: d, pts: sp };
    }
    function unit(a, b) { var dx = b.x - a.x, dy = b.y - a.y, l = Math.sqrt(dx * dx + dy * dy) || 1; return { x: dx / l, y: dy / l }; }

    function buildNode(n) {
      var g = el('g', { class: 'nd k-' + n.kind, transform: 'translate(' + n.sx + ',' + n.sy + ')' }), inner = el('g', { class: 'inner' }, g);
      el('rect', { class: 'cshadow', x: -HW, y: -HH + 3, width: 2 * HW, height: 2 * HH, rx: 13 }, inner);
      el('rect', { class: 'face ft card', x: -HW, y: -HH, width: 2 * HW, height: 2 * HH, rx: 13 }, inner);
      el('rect', { class: 'face fr strip', x: -HW + 6, y: -HH + 6, width: 4, height: 2 * HH - 12, rx: 2 }, inner);
      var ibg = el('rect', { class: 'ibox', x: -HW + 15, y: -11, width: 22, height: 22, rx: 7 }, inner);
      var ic = el('g', { class: 'nicon', transform: 'translate(' + (-HW + 19) + ',-7) scale(.58)', fill: 'none', stroke: 'var(--ink)', 'stroke-width': 2.3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, inner);
      ic.innerHTML = ICONS[n.icon || (n.isClient ? 'user' : n.kind)] || ICONS.server;
      var lines = String(n.label).split('\n'), nl = lines.length, hasSub = !!n.sub, total = nl + (hasSub ? 1 : 0), y0 = -((total - 1) * 12) / 2 + 4;
      lines.forEach(function (ln, k) { var t = el('text', { class: 'nlabel flat', x: -HW + 44, y: y0 + k * 12.5, style: 'font-size:' + (ln.length > 10 ? 10.5 : 11.5) + 'px' }, inner); t.textContent = ln; });
      if (hasSub) { var st = el('text', { class: 'nsub', x: -HW + 44, y: y0 + nl * 12.5 }, inner); st.textContent = n.sub; }
      var xg = el('g', { class: 'deadx', style: 'display:none' }, inner);
      el('path', { d: 'M-12,-12 L12,12 M12,-12 L-12,12', stroke: 'var(--bad)', 'stroke-width': 4.5, 'stroke-linecap': 'round' }, xg);
      return g;
    }

    function chip(txt, tone, ic, x, y, popIt) {
      // the outer group holds the position; the inner one animates (a CSS transform would override the SVG translate)
      var w = txt.length * 6.9 + (ic ? 30 : 18), outer = el('g', { transform: 'translate(' + x + ',' + y + ')' }, L.chips), g = el('g', { class: 'chip ' + (tone || '') + (popIt ? ' pop' : '') }, outer);
      el('rect', { x: -w / 2, y: -11, width: w, height: 22, rx: 11 }, g);
      if (ic) { var ig = el('g', { class: 'ico', transform: 'translate(' + (-w / 2 + 8) + ',-6.5) scale(.54)', fill: 'none', stroke: 'currentColor', 'stroke-width': 2.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g); ig.innerHTML = ICONS[ic] || ''; }
      var t = el('text', { x: ic ? 8 : 0, y: 4, 'text-anchor': 'middle' }, g); t.textContent = txt;
      return g;
    }

    function stateMap(i) {
      var m = {};
      for (var s = 0; s <= i; s++) { var st = (spec.steps[s] || {}).st; if (st) for (var k in st) { if (st[k] === 'ok') delete m[k]; else m[k] = st[k]; } }
      return m;
    }
    function setStep(i) {
      cur = i; var step = spec.steps[i], sm = stateMap(i), hot = {}, flows = step.flows || [];
      flows.forEach(function (f) { hot[f[0]] = 1; hot[f[1]] = 1; });
      list.forEach(function (n) {
        var vis = i >= n.from && i < n.to, s = sm[n.id];
        n.g.setAttribute('class', 'nd k-' + n.kind + (vis ? '' : ' hidden') + (s === 'dead' ? ' dead' : '') + (s === 'fail' ? ' fail' : '') + (s === 'dim' ? ' dim' : '') + ((s === 'hot' || (hot[n.id] && !s)) ? ' hot' : ''));
        n.g.querySelector('.deadx').style.display = s === 'dead' ? 'block' : 'none';
        n.tile.setAttribute('class', 'tile' + (!vis ? ' dead' : s === 'dead' ? ' dead' : s === 'fail' ? ' fail' : s === 'warn' ? ' warn' : (s === 'hot' || hot[n.id]) ? ' hot' : ''));
        n.tile.style.display = vis ? '' : 'none';
      });
      edges.forEach(function (e) {
        var A = nodes[e.a], B = nodes[e.b], vis = i >= e.from && i < e.to && i >= A.from && i < A.to && i >= B.from && i < B.to;
        e.el.setAttribute('class', 'edge' + (e.dash ? ' dash' : '') + (vis ? '' : ' off'));
      });
      /* packets */
      while (L.pk.firstChild) L.pk.removeChild(L.pk.firstChild); packets = [];
      flows.forEach(function (f, k) {
        var o = f[4] || {}, edge = null;
        edges.forEach(function (e) { if ((e.a === f[0] && e.b === f[1]) || (e.a === f[1] && e.b === f[0])) edge = e; });
        var type = f[2] || 'req', rv = route(f[0], f[1], o.via || (edge && (edge.a === f[0] ? edge.via : (edge.via === 'yx' ? 'xy' : 'yx'))), o.off != null ? o.off : (edge && edge.both ? (type === 'res' ? 6 : -6) : (type === 'res' ? 7 : 0)));
        var path = el('path', { d: rv.d, fill: 'none', stroke: 'none' }, L.pk);
        var g = el('g', { class: 'pkt ' + type }, L.pk);
        if (type === 'write') el('rect', { class: 'p', x: -5.5, y: -5.5, width: 11, height: 11, rx: 2 }, g); else el('circle', { class: 'p', r: 6.5 }, g);
        if (type === 'fail') { var xt = el('text', { y: 3.5 }, g); xt.textContent = '×'; }
        var pk = { g: g, path: path, len: path.getTotalLength(), delay: o.delay != null ? o.delay : k * 0.35, fail: type === 'fail' };
        packets.push(pk);
        if (f[3]) {
          var mid = path.getPointAtLength(pk.len * 0.5), w = String(f[3]).length * 6.3 + 12, lg = el('g', { class: 'elabel', transform: 'translate(' + mid.x + ',' + (mid.y - 14) + ')' }, L.pk);
          el('rect', { x: -w / 2, y: -9, width: w, height: 18, rx: 9 }, lg); var lt = el('text', { y: 3.5, 'text-anchor': 'middle' }, lg); lt.textContent = f[3];
        }
        place(pk, reduce ? 0.5 : 0);
      });
      /* chips */
      while (L.chips.firstChild) L.chips.removeChild(L.chips.firstChild);
      var seen = {}, chips = step.chips || {}, placed = [];
      function bx(x, y, w) { return { x0: x - w / 2 - 3, x1: x + w / 2 + 3, y0: y - 12, y1: y + 12 }; }
      function hits(b, self) {
        return placed.some(function (p) { return !(b.x1 < p.x0 || b.x0 > p.x1 || b.y1 < p.y0 || b.y0 > p.y1); }) ||
          list.some(function (m) { return m !== self && i >= m.from && i < m.to && !(b.x1 < m.sx - HW || b.x0 > m.sx + HW || b.y1 < m.sy - HH || b.y0 > m.sy + HH); });
      }
      Object.keys(chips).forEach(function (id) {
        var n = nodes[id]; if (!n || i < n.from || i >= n.to) return;
        var arr = Array.isArray(chips[id]) && Array.isArray(chips[id][0]) ? chips[id] : [chips[id]];
        arr.forEach(function (c, idx) {
          var txt = Array.isArray(c) ? c[0] : c; if (!txt) return; var  tone = Array.isArray(c) ? c[1] : '', ic = Array.isArray(c) ? c[2] : '', pos = Array.isArray(c) ? c[3] : '', key = id + '|' + txt + '|' + idx; seen[key] = 1;
          var w = txt.length * 6.9 + (ic ? 30 : 18), x, y;
          if (pos === 'r') { x = n.sx + HW + 10 + w / 2; y = n.sy - idx * 26; }
          else if (pos === 'l') { x = n.sx - HW - 10 - w / 2; y = n.sy - idx * 26; }
          else if (pos === 'b') { x = n.sx; y = n.sy + HH + 20 + idx * 26; }
          else { x = n.sx; y = n.sy - HH - 20 - idx * 26; }
          var dir = pos === 'b' ? 1 : -1, tries = 0;
          while (hits(bx(x, y, w), n) && tries++ < 6) y += dir * 25;
          placed.push(bx(x, y, w));
          chip(txt, tone, ic, x, y, !prevChips[key]);
        });
      });
      prevChips = seen;
    }
    function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
    function place(pk, p) {
      if (p < 0) { pk.g.style.opacity = 0; return; }
      pk.g.style.opacity = 1; var q = pk.path.getPointAtLength(pk.len * Math.min(1, Math.max(0, p)));
      pk.g.setAttribute('transform', 'translate(' + q.x + ',' + q.y + ')');
    }
    function tick() {
      raf = requestAnimationFrame(tick); if (paused || reduce) return;
      var now = performance.now() / 1000 - pausedAcc, cycle = 2.7, travel = 1.6;
      packets.forEach(function (pk) {
        var t = (((now - pk.delay) % cycle) + cycle) % cycle;
        if (t > travel + (pk.fail ? 0.5 : 0)) { pk.g.style.opacity = 0; return; }
        var p = ease(Math.min(1, t / travel)); if (pk.fail) p = Math.min(p, 0.8);
        place(pk, p);
      });
    }
    self.setStep = setStep;
    self.pause = function (v) { if (v && !paused) { paused = true; pauseAt = performance.now() / 1000; } else if (!v && paused) { paused = false; pausedAcc += performance.now() / 1000 - pauseAt; } return paused; };
    self.isPaused = function () { return paused; };
    self.restart = function () { pausedAcc = performance.now() / 1000; prevChips = {}; };
    self.destroy = function () { cancelAnimationFrame(raf); };
    raf = requestAnimationFrame(tick);
    return self;
  }

  /* ---------- player (stage + panel + timeline) ---------- */
  var active = null;
  var KIND = { setup: 'CONTEXT', problem: 'SYMPTOM', fix: 'REMEDY', idea: 'AHA', edge: 'CORNER CASE', recap: 'WRAP-UP', try: 'YOUR TURN' };
  var KCLS = { setup: 'setup', problem: 'problem', fix: 'fix', idea: 'idea', edge: 'edge', recap: 'recap', try: 'idea' };
  function mountPlayer(hosts, spec, opts) {
    if (active) active.destroy();
    opts = opts || {};
    var n = spec.steps.length, i = Math.min(n - 1, opts.start || 0), maxSeen = Math.min(n - 1, opts.start || 0), kpiVals = [], lastVals = [];
    var labels = spec.kpiLabels || ['', '', '', ''];
    hosts.stage.innerHTML = '<div class="stage"><div class="kpis"></div><div class="stage-tools"><button class="tool" data-a="replay">' + icon('replay') + ' Restart</button><button class="tool" data-a="pause">' + icon('pause') + ' <span>Pause</span></button></div><div class="legend"><span><i class="req"></i>request</span><span><i class="res"></i>response</span><span><i class="write"></i>write</span><span><i class="fail"></i>failed request</span></div></div>';
    var stage = hosts.stage.querySelector('.stage'), kpiEl = stage.querySelector('.kpis');
    var scene = IsoScene(stage, spec);
    hosts.timeline.innerHTML = '<div class="th"><span class="cap">Storyboard</span><span class="cap" id="tlc"></span></div><div class="tl" style="--n:' + n + '"><div class="fill"></div>' + spec.steps.map(function (s, k) { return '<button data-s="' + k + '"><span class="c">' + (k + 1) + '</span><span>' + esc(s.lab || ('Step ' + (k + 1))) + '</span></button>'; }).join('') + '</div>';
    var learn = spec.learn || spec.steps.slice(0, Math.min(5, n)).map(function (s, k) { return [s.title, Math.min(n - 1, k * Math.max(1, Math.floor(n / 5)))]; });
    hosts.panel.innerHTML = '<div class="step sheet"><div class="top2"><span class="cap" id="stc"></span><span class="kind" id="stk"></span></div><div class="swap" id="stb"></div><div class="nav2"><button class="btn-pop" data-a="back">' + icon('back') + ' Back</button><button class="btn-pop btn-next" data-a="next"><span id="nxl"></span>' + icon('arrow') + '</button></div><div class="keys"><kbd>←</kbd><kbd>→</kbd> step · <kbd>R</kbd> replay · <kbd>Space</kbd> pause</div></div>';
    if (hosts.learn) hosts.learn.innerHTML = '<div class="learn sheet"><span class="cap">By the end</span>' + learn.map(function (l) { return '<label data-at="' + l[1] + '"><span class="box">' + icon('check') + '</span><span>' + md(l[0]) + '</span></label>'; }).join('') + '</div>';

    function kv(step) {
      for (var k = 0; k < 4; k++) { if (step.kpi && step.kpi[k] != null) { var v = step.kpi[k]; kpiVals[k] = Array.isArray(v) ? v : [v, '']; } }
    }
    function render(first) {
      var s = spec.steps[i]; kpiVals = []; for (var k = 0; k <= i; k++) kv(spec.steps[k]);
      kpiEl.innerHTML = labels.map(function (lb, k) { var v = kpiVals[k] || ['-', '']; var chg = lastVals[k] !== undefined && lastVals[k] !== v[0]; return lb ? '<div class="kpi ' + (v[1] || '') + '"><span class="l">' + esc(lb) + '</span><span class="v' + (chg ? ' flash' : '') + '">' + esc(v[0]) + '</span></div>' : ''; }).join('');
      lastVals = kpiVals.map(function (v) { return v ? v[0] : undefined; });
      scene.setStep(i);
      var b = hosts.panel.querySelector('#stb'), html = '<h2>' + md(s.title) + '</h2><div class="body">' + String(s.text || '').split('\n\n').map(function (p) { return '<p>' + md(p) + '</p>'; }).join('') + '</div>';
      [['idea', 'BIG IDEA', 'idea'], ['warn', 'PITFALL', 'alert'], ['edge', 'CORNER CASE', 'flag'], ['tip', 'PRO TIP', 'check']].forEach(function (c) { if (s[c[0]]) html += '<div class="cal cal--' + c[0] + '"><span class="ic">' + icon(c[2]) + '</span><div><b>' + c[1] + '</b>' + md(s[c[0]]) + '</div></div>'; });
      if (s.chg && s.chg.length) html += '<div class="cap" style="margin-top:4px">Diff</div><div class="chg">' + s.chg.map(function (c) { var m = c.charAt(0), cls = m === '+' ? 'p' : m === '-' ? 'm' : 'c'; return '<div class="' + cls + '"><i>' + (m === '~' ? '↔' : m === '-' ? '−' : '+') + '</i><span>' + md(c.slice(1).trim()) + '</span></div>'; }).join('') + '</div>';
      b.innerHTML = html;
      var step = hosts.panel.querySelector('.step'); step.classList.remove('anim'); void step.offsetWidth; step.classList.add('anim');
      hosts.panel.querySelector('#stc').textContent = 'STEP ' + (i + 1) + ' / ' + n;
      var kk = hosts.panel.querySelector('#stk'); kk.textContent = KIND[s.kind] || 'STEP'; kk.className = 'kind kind--' + (KCLS[s.kind] || 'setup');
      hosts.panel.querySelector('[data-a=back]').disabled = i === 0;
      hosts.panel.querySelector('#nxl').textContent = i < n - 1 ? 'Next: ' + (spec.steps[i + 1].lab || 'Step ' + (i + 2)) : (opts.nextLabel || 'Finish lesson');
      maxSeen = Math.max(maxSeen, i);
      hosts.timeline.querySelector('#tlc').textContent = 'Step ' + (i + 1) + ' of ' + n;
      Array.prototype.forEach.call(hosts.timeline.querySelectorAll('.tl button'), function (bt, k) { bt.classList.toggle('cur', k === i); bt.classList.toggle('seen', k <= maxSeen && k !== i); });
      hosts.timeline.querySelector('.fill').style.width = 'calc((100% - 100% / ' + n + ') * ' + (i / Math.max(1, n - 1)) + ')';
      if (hosts.learn) Array.prototype.forEach.call(hosts.learn.querySelectorAll('label'), function (lb) { lb.classList.toggle('on', maxSeen >= +lb.dataset.at); });
      if (opts.onStep) opts.onStep(i);
      if (i === n - 1 && opts.onComplete) opts.onComplete();
    }
    function go(k) { if (k < 0 || k > n - 1) return; i = k; render(); }
    function act(a) {
      if (a === 'next') { if (i < n - 1) go(i + 1); else if (opts.onFinish) opts.onFinish(); }
      else if (a === 'back') go(i - 1);
      else if (a === 'replay') { scene.pause(false); stage.querySelector('[data-a=pause] span').textContent = 'Pause'; scene.restart(); maxSeen = 0; i = 0; lastVals = []; render(); }
      else if (a === 'pause') { var p = scene.pause(!scene.isPaused()); var bt = stage.querySelector('[data-a=pause]'); bt.querySelector('span').textContent = p ? 'Play' : 'Pause'; bt.firstChild.outerHTML = icon(p ? 'play' : 'pause'); }
    }
    function onClick(e) { var a = e.target.closest('[data-a]'); if (a && (hosts.stage.contains(a) || hosts.panel.contains(a))) { act(a.dataset.a); return; } var s = e.target.closest('[data-s]'); if (s && hosts.timeline.contains(s)) go(+s.dataset.s); }
    function onKey(e) {
      var t = e.target; if (t && (/INPUT|TEXTAREA|SELECT/.test(t.tagName) || t.isContentEditable)) return; if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowRight') { act('next'); e.preventDefault(); } else if (e.key === 'ArrowLeft') { act('back'); e.preventDefault(); }
      else if (e.key === 'r' || e.key === 'R') act('replay'); else if (e.key === ' ' && !(t && t.tagName === 'BUTTON')) { act('pause'); e.preventDefault(); }
    }
    document.addEventListener('click', onClick); document.addEventListener('keydown', onKey);
    render(true);
    active = { destroy: function () { scene.destroy(); document.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey); } };
    return active;
  }
  window.Player = { mount: mountPlayer, destroy: function () { if (active) { active.destroy(); active = null; } } };
})();
