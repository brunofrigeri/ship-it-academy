/* Interactive labs. Each widget: function(mountElement). */
(function () {
  var W = window.WIDGETS = {};
  var esc = function (s) { return window.__esc(s); };
  function frame(mount, title, html) {
    mount.innerHTML = '<div class="frame"><div class="frame-title"><span>' + title + '</span><span>lab</span></div><div class="frame-body">' + html + '</div></div>';
    return mount.firstChild;
  }
  function $(r, s) { return r.querySelector(s); }
  function $$(r, s) { return Array.prototype.slice.call(r.querySelectorAll(s)); }
  function alive(el) { return document.body.contains(el); }
  function fmt(n) {
    if (!isFinite(n)) return '-';
    var a = Math.abs(n);
    if (a >= 1e12) return (n / 1e12).toFixed(1).replace(/\.0$/, '') + 'T';
    if (a >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
    if (a >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (a >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    return a < 10 ? n.toFixed(1).replace(/\.0$/, '') : String(Math.round(n));
  }
  function fmtBytes(b) {
    var u = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB'], i = 0;
    while (b >= 1000 && i < u.length - 1) { b /= 1000; i++; }
    return (b < 10 ? b.toFixed(1).replace(/\.0$/, '') : Math.round(b)) + ' ' + u[i];
  }
  var COLORS = ['#1b4dff', '#e8650a', '#12a37a', '#b832d9', '#c99a06', '#d23b6a', '#00a3c4', '#6b7a90'];

  /* ---- Day 1: back-of-envelope estimator ---- */
  W.estimator = function (m) {
    var presets = {
      'Tweet-like feed': { dau: 100, acts: 30, rw: 100, size: 0.3, years: 5, peak: 3 },
      'URL shortener': { dau: 20, acts: 5, rw: 100, size: 0.5, years: 5, peak: 3 },
      'Photo sharing': { dau: 50, acts: 20, rw: 20, size: 2000, years: 5, peak: 3 },
      'Chat app': { dau: 200, acts: 40, rw: 1, size: 0.2, years: 3, peak: 4 }
    };
    var f = frame(m, 'Back-of-envelope estimator',
      '<div class="ctl" id="pre" style="margin-bottom:12px">' + Object.keys(presets).map(function (k) { return '<button class="btn" data-p="' + esc(k) + '">' + esc(k) + '</button>'; }).join('') + '</div>' +
      '<div class="field">' +
      '<label>Daily active users (millions)<input type="number" id="dau" min="0" step="any"></label>' +
      '<label>Actions per user per day<input type="number" id="acts" min="0" step="any"></label>' +
      '<label>Reads per 1 write<input type="number" id="rw" min="0" step="any"></label>' +
      '<label>Size of one write (KB)<input type="number" id="size" min="0" step="any"></label>' +
      '<label>Keep data (years)<input type="number" id="years" min="0" step="any"></label>' +
      '<label>Peak vs average (x)<input type="number" id="peak" min="1" step="any"></label></div>' +
      '<div class="out" id="out"></div><p class="note-sm">Round aggressively. Interviewers want to see the method and the order of magnitude, not the third digit. 1 day is about 100,000 seconds (86,400).</p>');
    function set(p) { Object.keys(p).forEach(function (k) { $(f, '#' + k).value = p[k]; }); calc(); }
    function calc() {
      var v = function (id) { return parseFloat($(f, '#' + id).value) || 0; };
      var dau = v('dau') * 1e6, reqPerDay = dau * v('acts'), qps = reqPerDay / 86400, peak = qps * Math.max(1, v('peak'));
      var wfrac = 1 / (v('rw') + 1), wqps = qps * wfrac, rqps = qps - wqps;
      var perDay = wqps * 86400 * v('size') * 1000, total = perDay * 365 * v('years');
      var bw = peak * v('size') * 1000 * (1 - wfrac) + 0; // rough: responses of similar size
      var cells = [['Average QPS', fmt(qps)], ['Peak QPS', fmt(peak)], ['Read QPS (avg)', fmt(rqps)], ['Write QPS (avg)', fmt(wqps)], ['New data per day', fmtBytes(perDay)], ['Total storage', fmtBytes(total)], ['Peak read bandwidth', fmtBytes(bw) + '/s']];
      $(f, '#out').innerHTML = cells.map(function (c) { return '<div><span>' + c[0] + '</span><b>' + c[1] + '</b></div>'; }).join('');
    }
    $(f, '#pre').addEventListener('click', function (e) { var k = e.target.getAttribute('data-p'); if (k) set(presets[k]); });
    $$(f, 'input').forEach(function (i) { i.addEventListener('input', calc); });
    set(presets['Tweet-like feed']);
  };

  /* ---- Day 1: latency numbers ---- */
  W.latency = function (m) {
    var rows = [
      ['Read from CPU L1 cache', 1], ['Read from main memory (RAM)', 100], ['Random read from SSD', 100000],
      ['Round trip inside one datacenter', 500000], ['Read 1 MB sequentially from SSD', 1000000], ['Disk seek (spinning HDD)', 10000000],
      ['Round trip across an ocean', 150000000]
    ];
    var human = false;
    var f = frame(m, 'Latency numbers every engineer should know', '<div class="ctl" style="margin-bottom:10px"><button class="btn" id="tg">Show as "if 1 ns took 1 second"</button></div><div id="rows"></div><p class="note-sm">Memory is about 1,000x faster than SSD, which is about 100x faster than crossing the ocean. This is why caches live in RAM and why chatty cross-region calls are poison.</p>');
    function nice(ns) {
      if (ns < 1e3) return ns + ' ns'; if (ns < 1e6) return ns / 1e3 + ' us'; if (ns < 1e9) return ns / 1e6 + ' ms'; return ns / 1e9 + ' s';
    }
    function hum(s) {
      if (s < 120) return Math.round(s) + ' seconds'; if (s < 7200) return Math.round(s / 60) + ' minutes'; if (s < 172800) return Math.round(s / 3600) + ' hours';
      if (s < 86400 * 90) return Math.round(s / 86400) + ' days'; if (s < 86400 * 365 * 2) return (s / (86400 * 30)).toFixed(0) + ' months'; return (s / (86400 * 365)).toFixed(1) + ' years';
    }
    function draw() {
      var max = Math.log10(rows[rows.length - 1][1] + 1);
      $(f, '#rows').innerHTML = rows.map(function (r) {
        var w = Math.max(2, (Math.log10(r[1] + 1) / max) * 100);
        return '<div class="meterbar"><i style="width:' + w + '%;opacity:.28"></i><span>' + esc(r[0]) + ': <b>' + (human ? hum(r[1]) : nice(r[1])) + '</b></span></div>';
      }).join('');
      $(f, '#tg').textContent = human ? 'Show real units' : 'Show as "if 1 ns took 1 second"';
    }
    $(f, '#tg').addEventListener('click', function () { human = !human; draw(); });
    draw();
  };

  /* ---- Day 3: load balancer ---- */
  W.lb = function (m) {
    var N = 4, st = [], seq = 0, rr = 0, log = [];
    for (var k = 0; k < N; k++) st.push({ up: true, active: 0, total: 0, slow: k === 0 });
    var f = frame(m, 'Load balancer playground',
      '<div class="field"><label>Algorithm<select id="alg"><option value="rr">Round robin</option><option value="lc">Least connections</option><option value="ip">IP hash (sticky)</option><option value="rand">Random</option></select></label>' +
      '<div class="ctl"><button class="btn pri" id="b1">Send 12 requests</button><button class="btn" id="b2">Reset counts</button></div></div>' +
      '<div class="cells" id="srv" style="gap:10px"></div><div class="log" id="lg">Send some requests to see where they go.</div>' +
      '<p class="note-sm">Server 1 is slow (requests take 3x longer). Try round robin, then least connections, and compare how many requests are in flight on Server 1. Then take a server down with its button: the balancer stops routing to it (that is a health check).</p>');
    function draw() {
      $(f, '#srv').innerHTML = st.map(function (s, i) {
        return '<div style="flex:1;min-width:128px;border:1px solid var(--line);border-radius:8px;padding:10px;background:' + (s.up ? 'var(--bg)' : 'var(--code)') + ';opacity:' + (s.up ? 1 : .55) + '">' +
          '<b>Server ' + (i + 1) + '</b>' + (s.slow ? ' <span class="note-sm">(slow)</span>' : '') + '<div class="meterbar" title="in flight"><i style="width:' + Math.min(100, s.active * 12) + '%"></i><span>' + s.active + ' in flight</span></div>' +
          '<div class="note-sm" style="margin:2px 0 8px">' + s.total + ' served</div><button class="btn danger" data-t="' + i + '">' + (s.up ? 'Take down' : 'Bring up') + '</button></div>';
      }).join('');
      $(f, '#lg').innerHTML = log.slice(-7).map(esc).join('<br>') || 'Send some requests to see where they go.';
    }
    function pick(alg, client) {
      var up = st.map(function (s, i) { return s.up ? i : -1; }).filter(function (i) { return i >= 0; });
      if (!up.length) return -1;
      if (alg === 'rr') { var i = up[rr % up.length]; rr++; return i; }
      if (alg === 'rand') return up[Math.floor(Math.random() * up.length)];
      if (alg === 'ip') return up[client % up.length];
      return up.slice().sort(function (a, b) { return st[a].active - st[b].active || a - b; })[0];
    }
    function send() {
      var alg = $(f, '#alg').value, n = 12, i = 0;
      (function step() {
        if (i++ >= n || !alive(f)) return;
        var client = 1 + Math.floor(Math.random() * 6), s = pick(alg, client); seq++;
        if (s < 0) log.push('#' + seq + ' no healthy servers: 503');
        else {
          st[s].active++; st[s].total++;
          log.push('#' + seq + ' client ' + client + ' to Server ' + (s + 1) + (alg === 'lc' ? ' (had fewest in flight)' : ''));
          var dur = (700 + Math.random() * 900) * (st[s].slow ? 3 : 1);
          setTimeout(function () { st[s].active = Math.max(0, st[s].active - 1); if (alive(f)) draw(); }, dur);
        }
        draw(); setTimeout(step, 130);
      })();
    }
    $(f, '#b1').addEventListener('click', send);
    $(f, '#b2').addEventListener('click', function () { st.forEach(function (s) { s.total = 0; s.active = 0; }); log = []; seq = 0; draw(); });
    $(f, '#srv').addEventListener('click', function (e) { var t = e.target.getAttribute('data-t'); if (t != null) { st[+t].up = !st[+t].up; log.push('Server ' + (+t + 1) + (st[+t].up ? ' is back (health check passes)' : ' went down (health check fails)')); draw(); } });
    draw();
  };

  /* ---- Day 4: index vs scan ---- */
  W.index = function (m) {
    var f = frame(m, 'Why indexes matter',
      '<div class="field"><label>Rows in table<select id="n"><option value="1000">1,000</option><option value="100000">100,000</option><option value="10000000" selected>10 million</option><option value="1000000000">1 billion</option></select></label>' +
      '<label>Index fan-out (keys per page)<select id="fo"><option>100</option><option selected>300</option><option>500</option></select></label>' +
      '<label>Indexes on the table: <span id="kv">2</span><input type="range" id="k" min="0" max="8" value="2"></label></div>' +
      '<div class="out" id="out"></div><p class="note-sm">Query: <code>SELECT * FROM users WHERE email = ?</code>. Without an index on <code>email</code> the database reads every row. With a B-tree index it walks a few pages from root to leaf. Every extra index must also be updated on each write.</p>');
    function calc() {
      var n = +$(f, '#n').value, fo = +$(f, '#fo').value, k = +$(f, '#k').value; $(f, '#kv').textContent = k;
      var h = Math.max(1, Math.ceil(Math.log(n) / Math.log(fo)));
      var scanMs = n / 5000; // ~5M rows/sec => 5000 rows per ms
      var idxMs = h * 0.1 + 0.1;
      var cells = [['Rows read, no index', fmt(n)], ['Pages read, with index', h + ' (tree height)'], ['Rough time, no index', scanMs < 1000 ? fmt(scanMs) + ' ms' : fmt(scanMs / 1000) + ' s'], ['Rough time, with index', idxMs.toFixed(1) + ' ms'], ['Write cost', (1 + k) + 'x (1 table + ' + k + ' indexes)']];
      $(f, '#out').innerHTML = cells.map(function (c) { return '<div><span>' + c[0] + '</span><b>' + c[1] + '</b></div>'; }).join('');
    }
    $$(f, 'select,input').forEach(function (e) { e.addEventListener('input', calc); });
    calc();
  };

  /* ---- Day 5: consistent hashing ---- */
  W.hashring = function (m) {
    function h32(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 15; h = Math.imul(h, 2246822507); h ^= h >>> 13; return (h >>> 0); }
    var KEYS = []; for (var k = 0; k < 240; k++) KEYS.push('user:' + k);
    var KH = KEYS.map(h32), nodes = ['A', 'B', 'C'], vn = 1, nextName = 3;
    var f = frame(m, 'Modulo hashing vs consistent hashing',
      '<div class="ctl"><button class="btn pri" id="add">Add a server</button><button class="btn danger" id="rm">Remove last server</button>' +
      '<label class="check">Virtual nodes per server: <select id="vn" class="btn"><option value="1">1</option><option value="20">20</option><option value="100">100</option></select></label></div>' +
      '<div class="svgwrap" style="margin-top:10px"><svg id="ring" viewBox="0 0 300 300" style="min-width:0;max-width:340px;margin:0 auto"></svg></div>' +
      '<div class="out" id="out"></div><div class="cells" id="own"></div><p class="note-sm" id="msg">240 keys sit on the ring (dots). Each key belongs to the first server clockwise from it. Add a server and compare how many keys had to move under each scheme.</p>');
    function ringMap(list) {
      var pts = []; list.forEach(function (n, ni) { for (var v = 0; v < vn; v++) pts.push([h32(n + '#' + v), ni]); });
      pts.sort(function (a, b) { return a[0] - b[0]; });
      return { pts: pts, owner: function (h) { for (var i = 0; i < pts.length; i++) if (pts[i][0] >= h) return pts[i][1]; return pts[0][1]; } };
    }
    function assign(list) { var r = ringMap(list); return { ring: KH.map(function (h) { return list[r.owner(h)]; }), mod: KH.map(function (h) { return list[h % list.length]; }), r: r }; }
    var cur = assign(nodes);
    function draw(moved) {
      var svg = $(f, '#ring'), col = function (n) { return COLORS[(n.charCodeAt(0) - 65) % COLORS.length]; }, s = '<circle cx="150" cy="150" r="110" fill="none" stroke="var(--line)" stroke-width="2"/>';
      cur.r.pts.forEach(function (p) { var a = p[0] / 4294967296 * 2 * Math.PI - Math.PI / 2; s += '<line x1="' + (150 + 104 * Math.cos(a)) + '" y1="' + (150 + 104 * Math.sin(a)) + '" x2="' + (150 + 120 * Math.cos(a)) + '" y2="' + (150 + 120 * Math.sin(a)) + '" stroke="' + col(nodes[p[1]]) + '" stroke-width="' + (vn > 1 ? 1.5 : 4) + '"/>'; });
      KH.forEach(function (h, i) { var a = h / 4294967296 * 2 * Math.PI - Math.PI / 2; s += '<circle cx="' + (150 + 92 * Math.cos(a)) + '" cy="' + (150 + 92 * Math.sin(a)) + '" r="2.6" fill="' + col(cur.ring[i]) + '"/>'; });
      svg.innerHTML = s + '<text x="150" y="155" text-anchor="middle" fill="var(--muted)" font-size="12" font-family="IBM Plex Mono">' + nodes.length + ' servers</text>';
      var counts = {}; nodes.forEach(function (n) { counts[n] = 0; }); cur.ring.forEach(function (o) { counts[o]++; });
      $(f, '#own').innerHTML = nodes.map(function (n) { return '<span class="cell" style="border-color:' + col(n) + '">Server ' + n + ': ' + counts[n] + ' keys</span>'; }).join('');
      $(f, '#out').innerHTML = moved ? '<div><span>Keys moved, modulo hashing</span><b style="color:var(--bad)">' + moved.mod + ' of 240</b></div><div><span>Keys moved, consistent hashing</span><b style="color:var(--ok)">' + moved.ring + ' of 240</b></div>' : '';
    }
    function change(newList) {
      var before = cur; nodes = newList; cur = assign(nodes);
      var mv = { mod: 0, ring: 0 };
      for (var i = 0; i < KH.length; i++) { if (before.mod[i] !== cur.mod[i]) mv.mod++; if (before.ring[i] !== cur.ring[i]) mv.ring++; }
      draw(mv);
    }
    $(f, '#add').addEventListener('click', function () { if (nodes.length >= 7) return; change(nodes.concat([String.fromCharCode(65 + nextName++)])); });
    $(f, '#rm').addEventListener('click', function () { if (nodes.length <= 2) return; change(nodes.slice(0, -1)); });
    $(f, '#vn').addEventListener('change', function () { vn = +this.value; cur = assign(nodes); draw(null); });
    draw(null);
  };

  /* ---- Day 5: CAP partition ---- */
  W.cap = function (m) {
    var n = [1, 1], part = false, log = [];
    var f = frame(m, 'CAP theorem: break the network',
      '<div class="field"><label>During a partition choose<select id="mode"><option value="cp">Consistency (CP)</option><option value="ap">Availability (AP)</option></select></label>' +
      '<div class="ctl"><button class="btn danger" id="pt">Cut the network</button></div></div>' +
      '<div class="cells" id="nodes" style="gap:12px"></div><div class="ctl" style="margin-top:12px"><button class="btn" id="w">Write x = next value on Node 1</button><button class="btn" id="r">Read x from Node 2</button></div><div class="log" id="lg"></div>' +
      '<p class="note-sm">Two replicas hold <code>x</code>. A partition means they cannot talk. A CP system refuses requests it cannot answer correctly. An AP system answers anyway and reconciles later. The choice only exists <b>during</b> a partition.</p>');
    var ver = 1;
    function draw() {
      $(f, '#nodes').innerHTML = [0, 1].map(function (i) { return '<div style="flex:1;min-width:140px;border:1px solid var(--line);border-radius:8px;padding:10px;background:var(--bg)"><b>Node ' + (i + 1) + '</b><div style="font-family:var(--display);font-size:30px;font-weight:800">x = ' + n[i] + '</div></div>'; }).join('') + '<div class="note-sm" style="align-self:center;min-width:90px;text-align:center">' + (part ? '<b style="color:var(--bad)">// PARTITION //</b>' : 'connected') + '</div>';
      $(f, '#pt').textContent = part ? 'Heal the network' : 'Cut the network';
      $(f, '#lg').innerHTML = log.slice(-6).map(esc).join('<br>') || 'Try: write a value, read it, then cut the network and repeat.';
    }
    $(f, '#pt').addEventListener('click', function () {
      part = !part;
      if (part) log.push('Network partitioned.');
      else { if (n[0] !== n[1]) { var w = Math.max(n[0], n[1]); n = [w, w]; log.push('Healed. Conflict resolved by last-write-wins: both nodes now x = ' + w + '.'); } else log.push('Healed.'); }
      draw();
    });
    $(f, '#w').addEventListener('click', function () {
      ver++; var mode = $(f, '#mode').value;
      if (!part) { n = [ver, ver]; log.push('Write x=' + ver + ' accepted, replicated to both nodes.'); }
      else if (mode === 'cp') { ver--; log.push('Write REJECTED (503): Node 1 cannot reach Node 2, so it cannot guarantee consistency. Not available, but never wrong.'); }
      else { n[0] = ver; log.push('Write x=' + ver + ' accepted on Node 1 only. Available, but Node 2 is now stale.'); }
      draw();
    });
    $(f, '#r').addEventListener('click', function () {
      var mode = $(f, '#mode').value;
      if (!part) log.push('Read from Node 2: x = ' + n[1] + '. Correct.');
      else if (mode === 'cp') log.push('Read REJECTED (503): Node 2 cannot confirm it has the latest value.');
      else log.push('Read from Node 2: x = ' + n[1] + (n[1] !== n[0] ? '  <- STALE, Node 1 has ' + n[0] : '. (still correct)'));
      draw();
    });
    draw();
  };

  /* ---- Day 6: cache simulator ---- */
  W.cache = function (m) {
    var keys = 'ABCDEFGHIJKL'.split(''), cache = [], hits = 0, miss = 0, last = '', t = 0;
    var f = frame(m, 'Cache eviction simulator',
      '<div class="field"><label>Capacity<select id="cap"><option>3</option><option selected>4</option><option>6</option><option>8</option></select></label><label>Eviction policy<select id="pol"><option value="lru">LRU (least recently used)</option><option value="lfu">LFU (least frequently used)</option><option value="fifo">FIFO (oldest in)</option></select></label>' +
      '<div class="ctl"><button class="btn pri" id="z">Send 40 realistic requests</button><button class="btn" id="rs">Reset</button></div></div>' +
      '<div class="ctl" id="keys"></div><div class="cells" id="cells"></div><div class="out" id="out"></div>' +
      '<p class="note-sm">Click a key to request it, or send 40 requests where a few keys are much more popular (as in real traffic). Then change capacity and policy and watch the hit ratio. Real caches mix a policy with a TTL.</p>');
    $(f, '#keys').innerHTML = keys.map(function (k) { return '<button class="btn" data-k="' + k + '">' + k + '</button>'; }).join('');
    function access(k) {
      t++; var pol = $(f, '#pol').value, cap = +$(f, '#cap').value, e = null;
      cache.forEach(function (c) { if (c.k === k) e = c; });
      if (e) { hits++; last = 'hit'; e.f++; e.t = t; if (pol === 'lru') { cache.splice(cache.indexOf(e), 1); cache.unshift(e); } }
      else {
        miss++; last = 'miss';
        if (cache.length >= cap) {
          var v;
          if (pol === 'lru') v = cache[cache.length - 1];
          else if (pol === 'fifo') v = cache.slice().sort(function (a, b) { return a.born - b.born; })[0];
          else v = cache.slice().sort(function (a, b) { return a.f - b.f || a.t - b.t; })[0];
          cache.splice(cache.indexOf(v), 1);
        }
        cache.unshift({ k: k, f: 1, t: t, born: t });
      }
    }
    function draw(k) {
      var cap = +$(f, '#cap').value; while (cache.length > cap) cache.pop();
      $(f, '#cells').innerHTML = cache.map(function (c, i) { return '<span class="cell' + (c.k === k ? (last === 'hit' ? ' hit' : ' miss') : '') + '">' + c.k + '<small style="color:var(--muted)"> x' + c.f + '</small></span>'; }).join('') || '<span class="note-sm">empty</span>';
      var tot = hits + miss;
      $(f, '#out').innerHTML = '<div><span>Hit ratio</span><b>' + (tot ? Math.round(hits / tot * 100) : 0) + '%</b></div><div><span>Hits / misses</span><b>' + hits + ' / ' + miss + '</b></div><div><span>Database reads</span><b>' + miss + '</b></div>';
    }
    $(f, '#keys').addEventListener('click', function (e) { var k = e.target.getAttribute('data-k'); if (k) { access(k); draw(k); } });
    $(f, '#z').addEventListener('click', function () {
      for (var i = 0; i < 40; i++) { var r = Math.random(), idx = Math.min(keys.length - 1, Math.floor(Math.pow(r, 2.6) * keys.length)); access(keys[idx]); } draw(null);
    });
    $(f, '#rs').addEventListener('click', function () { cache = []; hits = miss = 0; draw(null); });
    $$(f, 'select').forEach(function (s) { s.addEventListener('change', function () { cache = []; hits = miss = 0; draw(null); }); });
    draw(null);
  };

  /* ---- Day 7: queue and consumers ---- */
  W.queue = function (m) {
    var depth = 0, series = [], boost = 0, kill = 0;
    var f = frame(m, 'Queue depth simulator',
      '<div class="field"><label>Producers: <span id="pv">20</span> msgs/sec<input type="range" id="p" min="0" max="60" value="20"></label><label>Consumers: <span id="cv">3</span> (each handles 10 msgs/sec)<input type="range" id="c" min="0" max="8" value="3"></label>' +
      '<div class="ctl"><button class="btn pri" id="sp">Traffic spike (5x for 4 s)</button></div></div>' +
      '<svg id="sk" viewBox="0 0 600 120" style="width:100%;height:120px;min-width:0;background:var(--code)"></svg><div class="out" id="out"></div>' +
      '<p class="note-sm">When arrivals exceed capacity the queue grows without limit and latency grows with it. Add consumers to drain it. A queue turns a spike into a delay instead of an outage, but only if capacity eventually exceeds the average arrival rate.</p>');
    var iv = setInterval(function () {
      if (!alive(f)) { clearInterval(iv); return; }
      var p = +$(f, '#p').value * (boost > 0 ? 5 : 1), c = +$(f, '#c').value * 10; if (boost > 0) boost--;
      depth = Math.max(0, depth + (p - c) * 0.2); series.push(depth); if (series.length > 120) series.shift();
      var mx = Math.max(50, Math.max.apply(null, series)), pts = series.map(function (v, i) { return (i / 119 * 600).toFixed(1) + ',' + (115 - v / mx * 105).toFixed(1); }).join(' ');
      $(f, '#sk').innerHTML = '<polyline points="' + pts + '" fill="none" stroke="var(--accent)" stroke-width="2"/><text x="6" y="14" fill="var(--muted)" font-size="11" font-family="IBM Plex Mono">depth (max ' + Math.round(mx) + ')</text>';
      $(f, '#pv').textContent = +$(f, '#p').value; $(f, '#cv').textContent = +$(f, '#c').value;
      var lag = c ? depth / c : Infinity;
      $(f, '#out').innerHTML = '<div><span>Messages waiting</span><b>' + Math.round(depth) + '</b></div><div><span>Arrival rate</span><b>' + p + '/s</b></div><div><span>Capacity</span><b>' + c + '/s</b></div><div><span>Wait for new message</span><b style="color:' + (lag > 5 ? 'var(--bad)' : 'var(--ok)') + '">' + (isFinite(lag) ? lag.toFixed(1) + ' s' : 'never') + '</b></div>';
    }, 200);
    $(f, '#sp').addEventListener('click', function () { boost = 20; });
  };

  /* ---- Day 8: token bucket ---- */
  W.tokenbucket = function (m) {
    var tokens = 5, ok = 0, bad = 0, log = [];
    var f = frame(m, 'Token bucket rate limiter',
      '<div class="field"><label>Bucket size (max burst): <span id="bv">5</span><input type="range" id="b" min="1" max="12" value="5"></label><label>Refill: <span id="rv">2</span> tokens/sec<input type="range" id="r" min="1" max="10" value="2"></label>' +
      '<div class="ctl"><button class="btn pri" id="one">Send 1 request</button><button class="btn" id="ten">Send burst of 10</button></div></div>' +
      '<div class="cells" id="tk"></div><div class="out" id="out"></div><div class="log" id="lg">Each request needs 1 token. No token means HTTP 429.</div>' +
      '<p class="note-sm">The bucket refills steadily but never beyond its size. That allows short bursts while enforcing the long-run average rate. In a real system the bucket lives in Redis keyed by user or IP.</p>');
    function draw() {
      var cap = +$(f, '#b').value; $(f, '#bv').textContent = cap; $(f, '#rv').textContent = $(f, '#r').value;
      var s = ''; for (var i = 0; i < cap; i++) s += '<span class="cell' + (i < Math.floor(tokens) ? ' new' : '') + '" style="min-width:26px;padding:6px 0">' + (i < Math.floor(tokens) ? 'T' : '') + '</span>';
      $(f, '#tk').innerHTML = s;
      $(f, '#out').innerHTML = '<div><span>Tokens</span><b>' + Math.floor(tokens) + '</b></div><div><span>Allowed</span><b style="color:var(--ok)">' + ok + '</b></div><div><span>Rejected (429)</span><b style="color:var(--bad)">' + bad + '</b></div>';
      $(f, '#lg').innerHTML = log.slice(-5).join('<br>') || 'Each request needs 1 token. No token means HTTP 429.';
    }
    function req() { if (tokens >= 1) { tokens--; ok++; log.push('200 OK'); } else { bad++; log.push('<span style="color:var(--bad)">429 Too Many Requests</span>'); } }
    var iv = setInterval(function () { if (!alive(f)) { clearInterval(iv); return; } var cap = +$(f, '#b').value; tokens = Math.min(cap, tokens + (+$(f, '#r').value) / 10); draw(); }, 100);
    $(f, '#one').addEventListener('click', function () { req(); draw(); });
    $(f, '#ten').addEventListener('click', function () { for (var i = 0; i < 10; i++) req(); draw(); });
    draw();
  };

  /* ---- Day 13: debounce + stale responses ---- */
  W.debounce = function (m) {
    var seq = 0, latest = 0, timer = null, sent = 0, log = [], shown = '';
    var f = frame(m, 'Typeahead: debounce and stale responses',
      '<div class="field"><label>Debounce<select id="db"><option value="0">none</option><option value="200" selected>200 ms</option><option value="400">400 ms</option></select></label><label class="check" style="align-self:end"><input type="checkbox" id="cx"> Ignore stale responses</label>' +
      '<div class="ctl"><button class="btn pri" id="ty">Type "react" fast</button><button class="btn" id="cl">Clear</button></div></div>' +
      '<div class="field"><label>Search box<input type="text" id="q" autocomplete="off" style="width:240px"></label></div>' +
      '<div class="out" id="out"></div><div class="log" id="lg">Requests will appear here. Each takes a random 100 to 900 ms to come back.</div>' +
      '<p class="note-sm">Without the stale check, a slow response for "re" can arrive after the one for "react" and overwrite it. That is a real, common bug. Debounce cuts the number of requests; ignoring stale responses (or aborting them) fixes the ordering.</p>');
    function draw() { $(f, '#out').innerHTML = '<div><span>Requests sent</span><b>' + sent + '</b></div><div><span>Results shown for</span><b style="font-size:18px">' + (shown ? esc(shown) : '-') + '</b></div>'; $(f, '#lg').innerHTML = log.slice(-8).map(function (l) { return l; }).join('<br>') || 'Requests will appear here.'; }
    function fire(q) {
      if (!q) return; var id = ++seq; latest = id; sent++; var lat = Math.round(100 + Math.random() * 800);
      log.push('send #' + id + ' q="' + esc(q) + '" (latency ' + lat + ' ms)'); draw();
      setTimeout(function () {
        if (!alive(f)) return;
        if ($(f, '#cx').checked && id < latest) log.push('<span style="color:var(--muted)">#' + id + ' ignored (stale)</span>');
        else { shown = q; log.push('<span style="color:var(--ok)">#' + id + ' shown "' + esc(q) + '"</span>' + (id < latest ? ' <b style="color:var(--bad)">&lt;- older than the newest request!</b>' : '')); }
        draw();
      }, lat);
    }
    function onInput() { var d = +$(f, '#db').value, q = $(f, '#q').value; clearTimeout(timer); if (d === 0) fire(q); else timer = setTimeout(function () { fire(q); }, d); }
    $(f, '#q').addEventListener('input', onInput);
    $(f, '#cl').addEventListener('click', function () { $(f, '#q').value = ''; seq = latest = sent = 0; log = []; shown = ''; draw(); });
    $(f, '#ty').addEventListener('click', function () { var s = 'react', i = 0; $(f, '#q').value = ''; (function nxt() { if (i >= s.length || !alive(f)) return; $(f, '#q').value = s.slice(0, ++i); onInput(); setTimeout(nxt, 90); })(); });
    draw();
  };

  /* ---- Day 11: rendering waterfall ---- */
  W.waterfall = function (m) {
    var f = frame(m, 'CSR vs SSR vs static: when does the user see something?',
      '<div class="field"><label>Network<select id="net"><option value="0.15">Slow 3G</option><option value="1.5" selected>4G</option><option value="6">Wi-Fi</option></select></label><label>Round-trip time<select id="rtt"><option value="60">60 ms</option><option value="150" selected>150 ms</option><option value="300">300 ms</option></select></label><label>JS bundle: <span id="jv">400</span> KB<input type="range" id="js" min="50" max="1500" step="50" value="400"></label></div>' +
      '<div id="lanes"></div><div class="out" id="out"></div>' +
      '<p class="note-sm">Rough model: JS parse and run costs about 0.6 ms per KB on a mid-range phone. Static pages come from a CDN edge close to the user (30 ms round trip). Bar colors: blue is network, orange is CPU work, green is the moment the user sees content.</p>');
    function calc() {
      var bw = +$(f, '#net').value, rtt = +$(f, '#rtt').value, kb = +$(f, '#js').value; $(f, '#jv').textContent = kb;
      var exec = kb * 0.6, jsDl = kb / bw, api = rtt + 80, edge = 30;
      var strat = {};
      var t = rtt + 20; // html shell
      var csr = [['HTML shell', 0, t, ''], ['Download JS', t, jsDl + rtt, ''], ['Run JS', t + jsDl + rtt, exec, 'alt'], ['Fetch data', t + jsDl + rtt + exec, api, '']];
      var csrEnd = t + jsDl + rtt + exec + api + 40; csr.push(['Render', csrEnd - 40, 40, 'good']);
      var ssrFcp = rtt + 160 + 30;
      var ssr = [['Server renders', 0, ssrFcp, ''], ['Paint HTML', ssrFcp, 20, 'good'], ['Download JS', ssrFcp, jsDl + rtt, ''], ['Hydrate', ssrFcp + jsDl + rtt, exec, 'alt']];
      var ssrTti = ssrFcp + jsDl + rtt + exec;
      var sFcp = edge + 20;
      var ssg = [['CDN edge HTML', 0, sFcp, ''], ['Paint HTML', sFcp, 20, 'good'], ['Download JS', sFcp, jsDl + edge, ''], ['Hydrate', sFcp + jsDl + edge, exec, 'alt']];
      var ssgTti = sFcp + jsDl + edge + exec;
      var all = [['Client-side (CSR)', csr, csrEnd, csrEnd], ['Server-side (SSR)', ssr, ssrFcp, ssrTti], ['Static + CDN (SSG)', ssg, sFcp, ssgTti]];
      var max = Math.max(csrEnd, ssrTti, ssgTti) * 1.05;
      $(f, '#lanes').innerHTML = '<div class="grid-lanes">' + all.map(function (s) {
        return '<div><div class="lane"><b>' + s[0] + '</b><div class="track">' + s[1].map(function (g) { return '<div class="seg ' + g[3] + '" style="left:' + g[1] / max * 100 + '%;width:' + Math.max(0.8, g[2] / max * 100) + '%;top:' + (g[0].indexOf('Download') === 0 || g[0] === 'Hydrate' ? '14px' : '3px') + ';bottom:' + (g[0].indexOf('Download') === 0 || g[0] === 'Hydrate' ? '0' : '14px') + '" title="' + esc(g[0]) + '"></div>'; }).join('') + '</div></div></div>';
      }).join('') + '</div>';
      $(f, '#out').innerHTML = all.map(function (s) { return '<div><span>' + s[0] + '</span><b style="font-size:17px">sees content ' + Math.round(s[2]) + ' ms<br>interactive ' + Math.round(s[3]) + ' ms</b></div>'; }).join('');
    }
    $$(f, 'select,input').forEach(function (e) { e.addEventListener('input', calc); });
    calc();
  };

  /* ---- Day 14: interview timer ---- */
  W.mocktimer = function (m) {
    var phases = [
      ['Requirements', 5, 'Ask scope questions. Write functional and non-functional requirements. Agree on what is out of scope.'],
      ['Estimation', 5, 'Users, QPS, storage, read:write ratio. Say the numbers out loud, round hard.'],
      ['High-level design', 10, 'Draw clients, LB, services, data stores. Walk one request end to end. Define APIs and data model.'],
      ['Deep dive', 15, 'Pick the hardest component (or the one the interviewer points at) and go deep: data layout, scaling, failure.'],
      ['Bottlenecks and trade-offs', 7, 'Single points of failure, hot keys, consistency, cost. Name what you would do with more time.'],
      ['Wrap up', 3, 'Summarize the design in 30 seconds. Mention monitoring and what you would build first.']
    ];
    var total = 45 * 60, left = total, run = false, iv = null;
    var f = frame(m, '45-minute interview timer',
      '<div class="ctl"><button class="btn pri" id="go">Start</button><button class="btn" id="rs">Reset</button><span style="font-family:var(--display);font-size:34px;font-weight:800" id="clock">45:00</span></div><div id="ph" style="margin-top:12px"></div>');
    function draw() {
      var el = total - left, acc = 0, cur = 0;
      phases.forEach(function (p, i) { if (el >= acc * 60) cur = i; acc += p[1]; });
      var mm = Math.floor(left / 60), ss = left % 60; $(f, '#clock').textContent = (mm < 10 ? '0' : '') + mm + ':' + (ss < 10 ? '0' : '') + ss;
      var start = 0;
      $(f, '#ph').innerHTML = phases.map(function (p, i) {
        var s = start; start += p[1];
        return '<div class="meterbar" style="height:auto;padding:6px 8px;' + (i === cur && run ? 'outline:2px solid var(--accent)' : '') + '"><i style="width:' + (el / 60 >= start ? 100 : el / 60 > s ? (el / 60 - s) / p[1] * 100 : 0) + '%;opacity:.18"></i><span style="line-height:1.4;display:block"><b>' + p[0] + '</b> (' + p[1] + ' min, from minute ' + s + ')<br><span class="note-sm">' + esc(p[2]) + '</span></span></div>';
      }).join('');
      $(f, '#go').textContent = run ? 'Pause' : (left === total ? 'Start' : 'Resume');
    }
    $(f, '#go').addEventListener('click', function () {
      run = !run; clearInterval(iv);
      if (run) iv = setInterval(function () { if (!alive(f)) { clearInterval(iv); return; } left = Math.max(0, left - 1); if (!left) { run = false; clearInterval(iv); } draw(); }, 1000);
      draw();
    });
    $(f, '#rs').addEventListener('click', function () { run = false; clearInterval(iv); left = total; draw(); });
    draw();
  };
})();
