/* App: course tree, animated lessons, reading lessons, plan, practice, labs, review, cheatsheets, search. */
(function () {
  'use strict';
  if (window.applyShipNames) window.applyShipNames();
  var DAYS = (window.DAYS || []).slice().sort(function (a, b) { return a.n - b.n; });
  var SC = window.SCENES || {};
  var KEY = 'two-weeks-to-scale-v2', OLD = 'two-weeks-to-scale-v1', memStore = null;

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function md(s) { return esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*\s][^*]*)\*/g, '<em>$1</em>'); }
  window.__esc = esc; window.__md = md;
  var I = function (n, s) { return window.ICON(n, s); };

  function load() {
    try { var s = localStorage.getItem(KEY) || localStorage.getItem(OLD); if (s) return JSON.parse(s); } catch (e) { }
    return memStore || {};
  }
  var S = load();
  S.done = S.done || {}; S.quiz = S.quiz || {}; S.notes = S.notes || {}; S.srs = S.srs || {}; S.open = S.open || {};
  function save() { memStore = S; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }
  function ymd(d) { var m = d.getMonth() + 1, dd = d.getDate(); return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (dd < 10 ? '0' : '') + dd; }
  if (!S.start) { S.start = ymd(new Date()); save(); }
  function todayN() {
    var p = S.start.split('-').map(Number), a = new Date(p[0], p[1] - 1, p[2]), b = new Date();
    b = new Date(b.getFullYear(), b.getMonth(), b.getDate());
    var n = Math.round((b - a) / 86400000) + 1; return n >= 1 && n <= DAYS.length ? n : 0;
  }
  function dayByN(n) { return DAYS.filter(function (d) { return d.n === n; })[0]; }
  function items(d) {
    var a = []; d.lessons.forEach(function (l, i) { if (!l.deep) a.push('d' + d.n + '-l' + i); });
    if (d.lab) a.push('d' + d.n + '-lab'); a.push('d' + d.n + '-quiz'); if (d.practice) a.push('d' + d.n + '-practice'); return a;
  }
  function prog(d) { var it = items(d), n = it.filter(function (k) { return S.done[k]; }).length; return { n: n, t: it.length, p: n / it.length }; }

  /* ---------- course structure ---------- */
  var COURSE = [
    { id: 'foundations', name: 'Ground rules', color: '#1fb57a', items: ['t:1:0', 's:capacity-math', 't:1:1', 's:web-request', 't:1:2', 't:1:3', 'x:concurrency'] },
    { id: 'scaling', name: 'Growing out', color: '#ff8a4c', items: ['s:scale-journey', 't:3:0', 's:stateless', 's:lb-health', 't:3:1', 's:cdn-flow', 't:3:2', 't:3:3', 't:3:4', 'x:microservices'] },
    { id: 'data', name: 'Keeping data', color: '#6b4eff', items: ['t:4:0', 't:4:1', 't:4:2', 't:4:3', 't:4:4', 'x:search', 'x:booking', 'x:analytics', 'x:specialdb', 's:replication', 't:5:0', 's:sharding', 't:5:1', 't:5:2', 't:5:3', 't:5:4'] },
    { id: 'comm', name: 'Wires and messages', color: '#2f80ed', items: ['t:2:0', 't:2:1', 't:2:2', 't:2:3', 't:2:4', 's:queue-flow', 't:7:0', 's:pubsub', 't:7:1', 't:7:2', 't:7:3', 't:7:4'] },
    { id: 'caching', name: 'Fast paths', color: '#ff5c8a', items: ['t:6:0', 's:cache-aside', 't:6:1', 's:write-back', 't:6:2', 's:stampede', 't:6:3'] },
    { id: 'reliability', name: 'Staying up', color: '#e5484d', items: ['t:8:0', 's:rate-limit', 't:8:1', 's:circuit-breaker', 's:idempotency', 't:8:2', 's:raft-election', 's:saga', 't:8:3', 't:8:4', 't:8:5', 't:8:6', 'x:release', 'x:multiregion', 'x:locks', 'x:payments', 'x:privacy', 'x:gossip'] },
    { id: 'designs', name: 'Blueprints', color: '#0fa3a3', items: ['t:9:0', 's:url-shortener', 't:9:1', 't:9:2', 't:9:3', 't:9:4', 't:10:0', 's:feed-fanout', 't:10:1', 's:chat-system', 't:10:2', 't:10:3', 't:10:4', 't:10:5'] },
    { id: 'frontend', name: 'The client side', color: '#b55cf0', items: ['t:11:0', 't:11:1', 's:ssr-hydration', 't:11:2', 't:11:3', 't:11:4', 't:12:0', 't:12:1', 's:optimistic-ui', 't:12:2', 't:12:3', 't:12:4', 't:13:0', 't:13:1', 's:typeahead', 't:13:2', 't:13:3', 't:13:4', 'x:ai-frontend'] },
    { id: 'ai', name: 'Models in production', color: '#f0a500', items: ['x:ai-llm', 'x:ai-embeddings', 's:rag-flow', 'x:ai-rag', 'x:ai-serving', 's:llm-serving', 'x:ai-agents', 's:agent-loop', 'x:ai-safety', 'x:ai-evals', 'x:ai-cost', 's:ai-gateway', 'x:ai-finetune', 'x:ai-mlsystems', 'x:ai-recsys'] },
    { id: 'interview', name: 'The whiteboard round', color: '#6e6888', items: ['t:14:0', 't:14:1', 't:14:2', 't:14:3'] }
  ];
  var LESSONS = [], BYID = {};
  COURSE.forEach(function (sec, si) {
    sec.n = si + 1; sec.list = [];
    sec.items.forEach(function (it) {
      var p = it.split(':'), L;
      if (p[0] === 's') { var sp = SC[p[1]]; if (!sp) return; L = { type: 's', id: 's-' + p[1], key: 's-' + p[1], sid: p[1], title: sp.title, short: sp.title, hash: 'l-' + p[1], sec: sec, min: sp.min || 10, spec: sp, deep: false }; }
      else if (p[0] === 'x') { var xe = (window.EXTRA || []).filter(function (e) { return e.id === p[1]; })[0]; if (!xe) return; L = { type: 't', id: 'x-' + xe.id, key: 'x-' + xe.id, day: null, title: xe.title, short: xe.short || xe.title, hash: 'x-' + xe.id, sec: sec, min: xe.min || 15, deep: false, lesson: xe, extra: true }; }
      else { var d = dayByN(+p[1]), l = d && d.lessons[+p[2]]; if (!l) return; L = { type: 't', id: 't-' + p[1] + '-' + p[2], key: 'd' + p[1] + '-l' + p[2], day: d, di: +p[2], title: l.title, short: l.short || l.title, hash: 't-' + p[1] + '-' + p[2], sec: sec, min: l.min || 20, deep: !!l.deep, lesson: l }; }
      L.idx = LESSONS.length; LESSONS.push(L); BYID[L.id] = L; sec.list.push(L);
    });
  });
  var seenScene = {}; LESSONS.forEach(function (l) { if (l.type === 's') seenScene[l.sid] = 1; });
  function lessonDone(L) { return !!S.done[L.key]; }
  function courseProg() { var t = 0, n = 0; LESSONS.forEach(function (l) { if (!l.deep) { t++; if (lessonDone(l)) n++; } }); return { n: n, t: t }; }
  function sceneLesson(id) { return BYID['s-' + id]; }
  function firstUndone() { var f = LESSONS.filter(function (l) { return !l.deep && !lessonDone(l); })[0]; return f || LESSONS[0]; }

  var app = document.getElementById('app');

  /* ---------- content blocks ---------- */
  var PARTS = { read: { i: '📖', t: 'Read: the full explanation', s: 'Slower, with worked examples' }, real: { i: '🌍', t: 'In the real world', s: 'What happened at real companies' }, apply: { i: '🛠', t: 'Apply it', s: 'Code you can run and a checklist for your own system' } };
  function blocks(list) {
    return (list || []).map(function (b) {
      if (typeof b === 'string') return '<p>' + md(b) + '</p>';
      if (b.h) return '<h3>' + md(b.h) + '</h3>';
      if (b.ul) return '<ul>' + b.ul.map(function (x) { return '<li>' + md(x) + '</li>'; }).join('') + '</ul>';
      if (b.ol) return '<ol>' + b.ol.map(function (x) { return '<li>' + md(x) + '</li>'; }).join('') + '</ol>';
      if (b.tip) return '<div class="callout tip"><b>Pro tip</b><p>' + md(b.tip) + '</p></div>';
      if (b.warn) return '<div class="callout warn"><b>Pitfall</b><p>' + md(b.warn) + '</p></div>';
      if (b.say) return '<div class="callout say"><b>Try saying</b><p>' + md(b.say) + '</p></div>';
      if (b.part) { var P = PARTS[b.part] || { i: '', t: b.part, s: '' }; return '<h3 class="lpart lp-' + esc(b.part) + '"><span class="lp-i">' + P.i + '</span><span class="lp-t">' + esc(b.title || P.t) + '<small>' + esc(P.s) + '</small></span></h3>'; }
      if (b.case) { var c = b.case; return '<div class="case"><div class="case-h"><b>' + esc(c.who) + '</b><span>' + esc(c.when || '') + '</span></div><h4>' + md(c.title) + '</h4>' + (c.body || []).map(function (x) { return '<p>' + md(x) + '</p>'; }).join('') + (c.lesson ? '<p class="case-l"><b>Takeaway:</b> ' + md(c.lesson) + '</p>' : '') + (c.src ? '<p class="case-s">Source: ' + c.src.map(function (x) { return '<a href="' + esc(x[1]) + '" target="_blank" rel="noopener">' + esc(x[0]) + ' ↗</a>'; }).join(' · ') + '</p>' : '') + '</div>'; }
      if (b.check) return '<ul class="steps">' + b.check.map(function (x) { return '<li><label><input type="checkbox"><span>' + md(x) + '</span></label></li>'; }).join('') + '</ul>';
      if (b.code) return (b.cap ? '<div class="codecap"><span>' + esc(b.lang || 'code') + '</span>' + md(b.cap) + '</div>' : '') + '<pre' + (b.cap ? ' class="capped"' : '') + '><code>' + esc(b.code) + '</code></pre>';
      if (b.table) return '<div class="tbl"><table><thead><tr>' + b.table.head.map(function (x) { return '<th>' + md(x) + '</th>'; }).join('') + '</tr></thead><tbody>' + b.table.rows.map(function (r) { return '<tr>' + r.map(function (x) { return '<td>' + md(x) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
      if (b.diagram) { var sl = sceneLesson(b.diagram); return sl ? '<div class="callout say" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><span>' + I('play', 15) + '</span><span style="flex:1;min-width:200px"><b style="margin:0">Watch it move</b>' + esc(sl.title) + ' (' + sl.spec.steps.length + ' steps)</span><a class="btn-pop btn-next" href="#' + sl.hash + '">Watch it</a></div>' : ''; }
      if (b.widget) return '<div data-widget="' + esc(b.widget) + '"></div>';
      return '';
    }).join('');
  }
  function mountDynamic(root) {
    Array.prototype.forEach.call(root.querySelectorAll('[data-widget]'), function (el) {
      if (el.dataset.ready) return; el.dataset.ready = 1;
      var w = window.WIDGETS && window.WIDGETS[el.dataset.widget];
      if (w) { try { w(el); } catch (e) { el.textContent = 'Widget failed: ' + e.message; } } else el.textContent = 'Missing widget ' + el.dataset.widget;
    });
  }
  function textOf(bl) {
    var t = [];
    (bl || []).forEach(function (b) {
      if (typeof b === 'string') t.push(b); else if (b.h) t.push(b.h); else if (b.ul) t = t.concat(b.ul); else if (b.ol) t = t.concat(b.ol);
      else if (b.case) { t.push(b.case.title); t = t.concat(b.case.body || []); } else if (b.check) t = t.concat(b.check);
      else if (b.tip) t.push(b.tip); else if (b.warn) t.push(b.warn); else if (b.say) t.push(b.say); else if (b.table) b.table.rows.forEach(function (r) { t = t.concat(r); });
    });
    return t.join(' ');
  }

  /* ---------- chrome ---------- */
  var TABS = [['learn', 'Lessons', 'book'], ['plan', 'Roadmap', 'plan'], ['practice', 'Drills', 'target'], ['labs', 'Sandbox', 'flask'], ['ex', 'Mock rounds', 'flag'], ['review', 'Recall', 'cards'], ['cheat', 'Quick refs', 'sheet']];
  var LOGO = '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="2" y="3" width="28" height="26" rx="9" fill="var(--pri)"/><path d="M9.5 12.5l4.5 3.5-4.5 3.5" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M16.5 20h6" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><circle cx="25" cy="8" r="4" fill="var(--acc)" stroke="var(--paper)" stroke-width="1.6"/></svg>';
  function theme() { return S.theme || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); }
  /* When the course runs on top of the game (same site, inside the game page), "Game" just hides the course. */
  var IN_GAME = false; try { IN_GAME = window.parent !== window && window.name === 'course' && window.parent.location.origin === location.origin; } catch (e) { }
  function backToGame() { try { window.parent.postMessage({ ship: 'game' }, location.origin); } catch (e) { } }
  document.addEventListener('click', function (e) { var g = e.target.closest('[data-togame]'); if (g && IN_GAME) { e.preventDefault(); backToGame(); } });
  function applyTheme() { document.documentElement.setAttribute('data-theme', theme()); }
  window.addEventListener('message', function (e) { var d = e.data; if (e.origin !== location.origin || !d || d.ship !== 'theme' || (d.theme !== 'dark' && d.theme !== 'light')) return; S.theme = d.theme; save(); applyTheme(); var b = document.getElementById('themeBtn'); if (b) b.innerHTML = I(S.theme === 'dark' ? 'sun' : 'moon', 15); });

  function topHTML(tab) {
    var tn = todayN();
    return '<header class="top"><button class="iconbtn menubtn" id="menuBtn" aria-label="Course menu" style="display:none">' + I('sheet', 15) + '</button><a class="brand" href="#learn">' + LOGO + '<span>ship_it() <mark>Academy</mark></span></a><nav class="appsw" aria-label="Switch between game and course"><a href="' + window.SITE.routes.game + '" data-togame>⚡ Game</a><a class="on" href="' + window.SITE.routes.course + '" aria-current="page">🎓 Course</a></nav><nav class="tabs">' + TABS.map(function (t) { return '<a class="tab' + (t[0] === tab ? ' on' : '') + (t[0] === 'play' ? ' tab-play' : '') + '" href="#' + t[0] + '">' + I(t[2], 14) + '<span>' + t[1] + '</span></a>'; }).join('') + '</nav><span class="sp"></span><button class="search" id="openSearch">' + I('search', 14) + '<span>Search lessons</span><kbd>⌘K</kbd></button>' + (window.COFFEE || '') + '<button class="iconbtn" id="themeBtn" aria-label="Toggle dark mode">' + I(theme() === 'dark' ? 'sun' : 'moon', 15) + '</button>' + (tn ? '<a class="chip-day" href="#plan-' + tn + '">' + I('flag', 13) + ' Day ' + tn + ' · today</a>' : '') + '</header>';
  }
  var openSecs = null;
  function treeHTML(cur) {
    var h = '<div class="tree-head">' + I('book', 16) + 'Course<small>' + LESSONS.length + ' lessons</small></div>';
    COURSE.forEach(function (sec) {
      var done = sec.list.filter(function (l) { return !l.deep && lessonDone(l); }).length, tot = sec.list.filter(function (l) { return !l.deep; }).length;
      var isOpen = (cur && cur.sec === sec) || (openSecs && openSecs[sec.id]);
      h += '<div class="sec' + (isOpen ? ' open' : '') + '" data-sec="' + sec.id + '"><button>' + I('chev', 11).replace('class="i ', 'class="i chev ') + '<span style="color:' + sec.color + '">' + I('folder', 14) + '</span><span>' + String(sec.n).padStart(2, '0') + ' ' + sec.name + '</span><span class="cnt">' + done + '/' + tot + '</span></button><div class="lessons">';
      sec.list.forEach(function (l) { h += '<a href="#' + l.hash + '" class="' + (cur === l ? 'cur' : '') + (lessonDone(l) ? ' done' : '') + '">' + (l.type === 's' ? I('play', 12) : lessonDone(l) ? I('check', 12) : I('doc', 12)).replace('class="i ', 'class="i doc ') + '<span>' + esc(l.short) + '</span>' + (l.deep ? '<span class="deep">deep</span>' : '') + '</a>'; });
      h += '</div></div>';
    });
    var cp = courseProg();
    h += '<a class="prog" href="#learn"><span>Progress</span><b>' + cp.n + '/' + cp.t + '</b><i style="width:' + Math.round(100 * cp.n / cp.t) + '%"></i></a>';
    return h;
  }
  function refreshTree() { var s = document.getElementById('side'); if (!s) return; var sc = s.scrollTop; s.innerHTML = treeHTML(window.__curL || null); s.scrollTop = sc; }

  /* ---------- lesson pages ---------- */
  function tags(L) {
    var t = '<span class="tag tag--orange">' + L.min + ' min</span>';
    if (L.type === 's') { var lv = L.spec.level || 'Beginner'; t += '<span class="tag ' + (lv === 'Beginner' ? 'tag--mint' : lv === 'Advanced' ? 'tag--rose' : 'tag--green') + '">' + lv + '</span><span class="tag tag--violet">' + L.spec.steps.length + ' steps</span>'; }
    else t += '<span class="tag ' + (L.deep ? 'tag--violet' : 'tag--mint') + '">' + (L.deep ? 'Deep dive' : 'Core reading') + '</span>';
    return t;
  }
  function crumbHTML(L) { return '<div class="crumb"><b>' + String(L.sec.n).padStart(2, '0') + '. ' + L.sec.name + '</b> / Lesson ' + (L.sec.list.indexOf(L) + 1) + ' of ' + L.sec.list.length + '</div>'; }
  function depId(p) { if (typeof p === 'string') { var q = p.split(':'); return q[0] === 't' ? 't-' + q[1] + '-' + q[2] : q[0] + '-' + q[1]; } return 't-' + p[0] + '-' + p[1]; }
  function relatedLinks(spec) {
    return (spec.deeper || []).map(function (p) { var L = BYID[depId(p)]; return L ? '<a class="btn-pop" href="#' + L.hash + '">' + I('book', 14) + ' ' + esc(L.short) + '</a>' : ''; }).join('');
  }
  function sceneOf(L) { var out = []; Object.keys(SC).forEach(function (k) { var sp = SC[k]; (sp.deeper || []).forEach(function (p) { if (depId(p) === L.id) out.push(sceneLesson(k)); }); }); return out.filter(Boolean); }
  function next(L) { return LESSONS[L.idx + 1] || null; }
  function prev(L) { return LESSONS[L.idx - 1] || null; }

  function scenePage(L, step) {
    var sp = L.spec, nx = next(L);
    return '<div class="shell"><aside class="side" id="side"></aside><main class="main"><div class="lesson-grid"><div class="center"><div class="sheet lhead">' + crumbHTML(L) + '<div class="row"><h1>' + esc(sp.title) + '</h1><div class="tags">' + tags(L) + '</div></div><p class="sub">' + md(sp.sub || '') + '</p></div><div class="sheet stage-card" id="stageHost"></div><div class="sheet timeline" id="tlHost"></div>' +
      '<div class="sheet read"><h2>' + I('book', 18) + ' Go deeper</h2><div class="prose"><p>This animation shows the idea. Reading lessons below go through the details, numbers and interview phrasing.</p></div></div><div class="related">' + relatedLinks(sp) + '</div><div class="lfoot sheet"><label class="check"><input type="checkbox" data-check="' + L.key + '"' + (S.done[L.key] ? ' checked' : '') + '> Mark lesson complete</label><span style="display:flex;gap:8px;flex-wrap:wrap">' + (prev(L) ? '<a class="btn-pop" href="#' + prev(L).hash + '">' + I('back', 13) + ' Previous</a>' : '') + (nx ? '<a class="btn-pop btn-next" href="#' + nx.hash + '">Next lesson ' + I('arrow', 13) + '</a>' : '') + '</span></div></div><div class="rightcol"><div id="panelHost"></div><div id="learnHost"></div>' + practiceCard(L) + '</div></div></main></div>';
  }
  function mountScene(L, step) {
    var nx = next(L);
    window.Player.mount({ stage: document.getElementById('stageHost'), timeline: document.getElementById('tlHost'), panel: document.getElementById('panelHost'), learn: document.getElementById('learnHost') }, L.spec, {
      start: step,
      nextLabel: nx ? 'Next lesson' : 'Done',
      onComplete: function () { if (!S.done[L.key]) { S.done[L.key] = true; save(); refreshTree(); var c = document.querySelector('[data-check="' + L.key + '"]'); if (c) c.checked = true; } },
      onFinish: function () { if (nx) location.hash = '#' + nx.hash; },
      onStep: function (i) { try { history.replaceState(null, '', '#' + L.hash + '-' + (i + 1)); } catch (e) { } }
    });
  }
  function textPage(L) {
    var l = L.lesson, nx = next(L), pv = prev(L), heads = [];
    (l.body || []).forEach(function (b) { if (b.h) heads.push(b.h); else if (b.part) heads.push((PARTS[b.part] || {}).t || b.part); });
    var sc = sceneOf(L);
    var outline = heads.length ? '<div class="learn sheet outline"><span class="cap">On this page</span>' + heads.map(function (h, i) { return '<a href="#" data-jump="' + i + '">' + md(h) + '</a>'; }).join('') + '</div>' : '';
    var scenes = sc.length ? '<div class="learn sheet"><span class="cap">See it move</span>' + sc.map(function (s) { return '<a class="btn-pop btn-next" href="#' + s.hash + '">' + I('play', 13) + ' ' + esc(s.short) + '</a>'; }).join('') + '</div>' : '';
    var bodyHTML = blocks(l.body), n = 0; bodyHTML = bodyHTML.replace(/<h3(?=[ >])/g, function () { return '<h3 id="hd' + (n++) + '"'; });
    return '<div class="shell"><aside class="side" id="side"></aside><main class="main"><div class="lesson-grid"><div class="center"><div class="sheet lhead">' + crumbHTML(L) + '<div class="row"><h1>' + esc(l.title) + '</h1><div class="tags">' + tags(L) + '</div></div><p class="sub">' + (L.day ? 'Day ' + L.day.n + ' · ' + esc(L.day.title) : 'Concept deep dive added to cover a gap in the basics') + '</p></div>' +
      '<div class="sheet read"><div class="prose">' + bodyHTML + '</div><div class="lfoot" style="padding-left:0;padding-right:0"><label class="check"><input type="checkbox" data-check="' + L.key + '"' + (S.done[L.key] ? ' checked' : '') + '> ' + (L.deep ? 'I read this' : 'Mark as read') + '</label><span style="display:flex;gap:8px;flex-wrap:wrap">' + (pv ? '<a class="btn-pop" href="#' + pv.hash + '">' + I('back', 13) + ' Previous</a>' : '') + (nx ? '<a class="btn-pop btn-next" href="#' + nx.hash + '">Next: ' + esc(nx.short.length > 28 ? nx.short.slice(0, 27) + '…' : nx.short) + ' ' + I('arrow', 13) + '</a>' : '') + '</span></div></div></div><div class="rightcol">' + scenes + outline + '' + (L.day ? '<div class="learn sheet"><span class="cap">Today</span><a class="btn-pop" href="#plan-' + L.day.n + '">' + I('plan', 13) + ' Day ' + L.day.n + ' plan</a><a class="btn-pop" href="#practice-' + L.day.n + '">' + I('target', 13) + ' Quiz and practice</a></div>' : '<div class="learn sheet"><span class="cap">Apply it</span><a class="btn-pop btn-next" href="#ex">' + I('flag', 13) + ' Mock rounds</a></div>') + '</div></div></main></div>';
  }

  /* ---------- other pages ---------- */
  function wrap(inner) { return '<div class="shell"><aside class="side" id="side"></aside><main class="main"><div class="page">' + inner + '</div></main></div>'; }
  function goTo(to, n) { if (!to) return ''; if (/^l\d+$/.test(to)) return '#t-' + n + '-' + to.slice(1); if (to === 'lab') return '#labs-' + n; return '#practice-' + n; }

  function planPage(n) {
    if (!n) {
      var tn = todayN(), h = '<div><h1>Your 14-day roadmap</h1><p class="lead">Two hours a day. Each day has a reading and animation block, a lab, a quiz and a practice question. The course tree on the left holds extra deep dives for when you want to go further.</p></div><div class="daycards">';
      DAYS.forEach(function (d) {
        var p = prog(d);
        h += '<a class="dcard sheet' + (d.n === tn ? ' today' : '') + '" href="#plan-' + d.n + '" style="text-decoration:none"><h3>Day ' + d.n + ' · ' + esc(d.title) + (d.n === tn ? '<span class="tag tag--green">today</span>' : '') + '<span class="tag tag--violet" style="margin-left:auto">' + p.n + '/' + p.t + '</span></h3><p style="margin:0;color:var(--muted)">' + md(d.tagline) + '</p><div class="bar"><i style="width:' + Math.round(p.p * 100) + '%"></i></div></a>';
      });
      h += '<a class="dcard sheet" href="#' + (BYID['x-ai-llm'] ? 'x-ai-llm' : 'learn') + '" style="text-decoration:none"><h3>Bonus: models in production<span class="tag tag--violet" style="margin-left:auto">15 lessons</span></h3><p style="margin:0;color:var(--muted)">LLMs, embeddings, RAG, serving, agents, evaluation, safety, cost, ML systems and recommendations. Includes 4 animated lessons and 7 interview exercises.</p></a></div><div class="sheet pad"><h3 style="font-size:15px;margin-bottom:8px">Schedule</h3><div class="field"><label for="startDate">Day 1 is on<input type="text" id="startDate" value="' + esc(S.start) + '" placeholder="YYYY-MM-DD"></label><button class="btn" id="startSave">Save date</button><button class="btn danger" id="resetAll">Reset all progress</button></div><p class="note-sm">The date only decides which day shows as today. Progress is saved in this browser.</p></div>';
      return wrap(h);
    }
    var d = dayByN(n); if (!d) return wrap('<h1>Not found</h1>');
    var total = 0, h2 = '<div><div class="crumb"><b>Plan</b> / Day ' + d.n + ' of ' + DAYS.length + '</div><h1>' + esc(d.title) + '</h1><p class="lead">' + md(d.tagline) + '</p></div>';
    h2 += '<div class="sheet pad"><span class="cap">Today you\'ll be able to</span><ul style="margin:8px 0 0;padding-left:20px">' + d.goals.map(function (g) { return '<li>' + md(g) + '</li>'; }).join('') + '</ul></div><div class="sheet dcard"><span class="cap">Today\'s 2 hours</span><div class="rows">';
    d.plan.forEach(function (r) { total += r.min; var key = r.to ? 'd' + d.n + '-' + r.to : ''; h2 += '<div class="r' + (key && S.done[key] ? ' done' : '') + '"><span class="m">' + r.min + ' min</span><span class="w">' + md(r.what) + '</span>' + (r.to ? '<a href="' + goTo(r.to, d.n) + '">open →</a>' : '<span></span>') + '</div>'; });
    h2 += '</div><div class="r" style="font-weight:800"><span class="m">' + total + ' min</span><span>Total</span><span></span></div></div>';
    h2 += '<div class="sheet dcard"><span class="cap">Today\'s lessons</span>' + d.lessons.map(function (l, i) { var L = BYID['t-' + d.n + '-' + i]; return L ? '<a href="#' + L.hash + '" style="text-decoration:none;display:flex;gap:10px;align-items:center">' + (lessonDone(L) ? I('check', 13) : I('doc', 13)) + '<span>' + (l.deep ? 'Deep: ' : '') + esc(l.title) + '</span></a>' : ''; }).join('') + Object.keys(SC).filter(function (k) { return (SC[k].deeper || []).some(function (p) { return typeof p !== 'string' && p[0] === d.n; }); }).map(function (k) { var L = sceneLesson(k); return L ? '<a href="#' + L.hash + '" style="text-decoration:none;display:flex;gap:10px;align-items:center">' + I('play', 13) + '<span><b>See it move:</b> ' + esc(L.title) + '</span></a>' : ''; }).join('') + '</div>';
    if (d.cheat && d.cheat.length) h2 += '<div class="sheet pad"><div class="callout say" style="margin:0"><b>Keep these ' + d.cheat.length + ' lines</b><ul style="margin:0;padding-left:18px">' + d.cheat.map(function (c) { return '<li>' + md(c) + '</li>'; }).join('') + '</ul></div></div>';
    h2 += '<div class="pills">' + (dayByN(n - 1) ? '<a class="pill" href="#plan-' + (n - 1) + '">← Day ' + (n - 1) + '</a>' : '') + (dayByN(n + 1) ? '<a class="pill on" href="#plan-' + (n + 1) + '">Day ' + (n + 1) + ' →</a>' : '') + '</div>';
    return wrap(h2);
  }
  function dayPills(base, cur) { return '<div class="pills">' + DAYS.map(function (d) { return '<a class="pill' + (cur === d.n ? ' on' : '') + '" href="#' + base + '-' + d.n + '">Day ' + d.n + '</a>'; }).join('') + '</div>'; }

  function practicePage(n) {
    if (!n) {
      var h = '<div><h1>Practice</h1><p class="lead">A quiz and a say-it-out-loud design question for every day. Write your answer and get feedback from Claude, then compare with the model outline.</p></div><div class="daycards">';
      DAYS.forEach(function (d) { var q = S.quiz['d' + d.n]; h += '<a class="dcard sheet" href="#practice-' + d.n + '" style="text-decoration:none"><h3>Day ' + d.n + ' · ' + esc(d.title) + '<span class="tag ' + (q ? 'tag--mint' : '') + '" style="margin-left:auto">' + (q ? q.score + '/' + q.total : 'not taken') + '</span></h3>' + (d.practice ? '<p style="margin:0;color:var(--muted)">' + md(Array.isArray(d.practice.prompt) ? (typeof d.practice.prompt[0] === 'string' ? d.practice.prompt[0] : '') : String(d.practice.prompt)).slice(0, 220) + '</p>' : '') + '</a>'; });
      return wrap(h + '</div>');
    }
    var d = dayByN(n); if (!d) return wrap('<h1>Not found</h1>');
    var h2 = '<div><div class="crumb"><b>Practice</b> / Day ' + d.n + '</div><h1>' + esc(d.title) + '</h1></div>' + dayPills('practice', n);
    h2 += '<div class="sheet read"><h2>' + I('target', 18) + ' Quiz <span class="tag tag--violet" style="margin-left:auto" id="quizBest"></span></h2><div id="quizMount"></div></div>';
    if (d.practice) { var pk = 'd' + d.n + '-practice'; h2 += '<div class="sheet read"><h2>' + I('chat', 18) + ' Say it out loud<label class="check" style="margin-left:auto;font-weight:400"><input type="checkbox" data-check="' + pk + '"' + (S.done[pk] ? ' checked' : '') + '> Done</label></h2><div class="prose">' + blocks(d.practice.prompt) + '</div><div id="practiceMount"></div></div>'; }
    return wrap(h2);
  }
  function labsPage(n) {
    var withLab = DAYS.filter(function (d) { return d.lab; });
    if (n) { var d = dayByN(n); if (d && d.lab) { var lk = 'd' + d.n + '-lab'; return wrap('<div><div class="crumb"><b>Sandbox</b> / Day ' + d.n + '</div><h1>' + esc(d.lab.title) + '</h1></div><div class="pills"><a class="pill" href="#labs">All labs</a></div><div class="sheet read"><div class="prose">' + blocks(d.lab.body) + '</div><div class="lfoot" style="padding-left:0"><label class="check"><input type="checkbox" data-check="' + lk + '"' + (S.done[lk] ? ' checked' : '') + '> I tried it</label></div></div>'); } }
    var h = '<div><h1>Sandbox</h1><p class="lead">Break things on purpose. Each lab lets you change a number and watch the system react.</p></div><div class="labgrid">';
    withLab.forEach(function (d) { h += '<a class="dcard sheet" href="#labs-' + d.n + '" style="text-decoration:none"><h3>' + I('flask', 16) + esc(d.lab.title) + '<span class="tag tag--violet" style="margin-left:auto">Day ' + d.n + '</span></h3><p style="margin:0;color:var(--muted)">' + esc(d.title) + ' · ' + (d.lab.min || 20) + ' min</p></a>'; });
    return wrap(h + '</div>');
  }
  function cheatPage() {
    var h = '<div><h1>Quick refs</h1><p class="lead">The one-liners from every day. Read this the night before and the morning of the interview.</p></div><div class="cheat-grid">';
    DAYS.forEach(function (d) { h += '<div class="sheet cheat-day"><h3><a href="#plan-' + d.n + '" style="text-decoration:none">Day ' + d.n + ': ' + esc(d.title) + '</a></h3><ul>' + (d.cheat || []).map(function (c) { return '<li>' + md(c) + '</li>'; }).join('') + '</ul></div>'; });
    return wrap(h + '</div>');
  }

  /* ---------- spaced repetition ---------- */
  var INTERVALS = [0, 1, 3, 7, 16, 35];
  function allCards() { var out = []; DAYS.forEach(function (d) { (d.cards || []).forEach(function (c, i) { out.push({ id: 'd' + d.n + '-c' + i, day: d.n, q: c[0], a: c[1] }); }); }); return out; }
  function dueCards() {
    var now = Date.now(), tn = todayN();
    return allCards().filter(function (c) { var s = S.srs[c.id]; if (s) return s.due <= now; var d = dayByN(c.day); return c.day <= tn || (d && prog(d).n > 0); });
  }
  function reviewPage() {
    var all = allCards(), learned = all.filter(function (c) { return S.srs[c.id] && S.srs[c.id].box >= 3; }).length;
    return wrap('<div><h1>Review</h1><p class="lead">Flashcards that come back just before you would forget them. Say the answer out loud before you reveal it. Ten minutes a day beats a long cram.</p></div><div class="out"><div><span>Cards in total</span><b>' + all.length + '</b></div><div><span>Due now</span><b>' + dueCards().length + '</b></div><div><span>Well learned (box 3+)</span><b>' + learned + '</b></div></div><div class="sheet pad" id="srsBox"></div><p class="note-sm">Rating: <b>Forgot</b> returns the card to box 0 and shows it again this session. <b>Hard</b> keeps it in its box. <b>Got it</b> moves it up a box, so the gap grows: 1, 3, 7, 16, 35 days.</p>');
  }
  function mountReview() {
    var box = document.getElementById('srsBox'); if (!box) return;
    var queue = dueCards().sort(function () { return Math.random() - 0.5; }).slice(0, 25), done = 0, total = queue.length, shown = false;
    function draw() {
      if (!queue.length) { box.innerHTML = '<h3 style="font-size:20px;margin-bottom:6px">' + (total ? 'Session complete' : 'Nothing due right now') + '</h3><p class="note-sm">' + (total ? 'You reviewed ' + done + ' cards. Come back tomorrow for the next batch.' : 'New cards unlock as you add days, and reviewed cards return on schedule.') + '</p>'; return; }
      var c = queue[0];
      box.innerHTML = '<div class="cap" style="margin-bottom:10px">Card ' + (done + 1) + ' of ' + total + ' · from Day ' + c.day + '</div><div style="font-size:20px;font-weight:800;line-height:1.35;margin-bottom:16px">' + md(c.q) + '</div>' + (shown ? '<div class="callout say" style="margin-top:0"><b>Answer</b><p>' + md(c.a) + '</p></div><div class="ctl"><button class="btn danger" data-r="again">Forgot</button><button class="btn" data-r="hard">Hard</button><button class="btn pri" data-r="good">Got it</button></div>' : '<button class="btn pri" data-r="show">Show answer</button>');
    }
    box.onclick = function (e) {
      var r = e.target.getAttribute && e.target.getAttribute('data-r'); if (!r) return;
      if (r === 'show') { shown = true; draw(); return; }
      var c = queue.shift(), s = (S.srs[c.id] = S.srs[c.id] || { box: 0, due: 0 }), day = 86400000;
      if (r === 'again') { s.box = 0; s.due = Date.now() + 600000; queue.push(c); }
      else if (r === 'hard') { s.due = Date.now() + Math.max(0.5, INTERVALS[Math.max(1, s.box)] * 0.5) * day; done++; }
      else { s.box = Math.min(5, s.box + 1); s.due = Date.now() + INTERVALS[s.box] * day; done++; }
      save(); shown = false; draw();
    };
    draw();
  }

  /* ---------- quiz + practice ---------- */
  function mountQuiz(d) {
    var m = document.getElementById('quizMount'); if (!m) return; var answered = 0, score = 0;
    function head() { var b = document.getElementById('quizBest'), q = S.quiz['d' + d.n]; if (b) b.textContent = q ? 'Last score ' + q.score + '/' + q.total : d.quiz.length + ' questions'; }
    function build() {
      answered = 0; score = 0;
      m.innerHTML = d.quiz.map(function (q, qi) { return '<div class="q" data-q="' + qi + '"><div class="q-text">' + (qi + 1) + '. ' + md(q.q) + '</div><div class="opts">' + q.opts.map(function (o, oi) { return '<button class="opt" data-o="' + oi + '">' + md(o) + '</button>'; }).join('') + '</div><div class="why" hidden></div></div>'; }).join('') + '<div class="score" id="quizScore"></div>'; head();
    }
    build();
    m.addEventListener('click', function (e) {
      var btn = e.target.closest('.opt');
      if (btn && !btn.disabled) {
        var qEl = btn.closest('.q'), q = d.quiz[+qEl.dataset.q], pick = +btn.dataset.o;
        Array.prototype.forEach.call(qEl.querySelectorAll('.opt'), function (o) { o.disabled = true; if (+o.dataset.o === q.a) o.classList.add('right'); });
        if (pick !== q.a) btn.classList.add('wrong'); else score++;
        var w = qEl.querySelector('.why'); w.hidden = false; w.innerHTML = (pick === q.a ? '<b>Correct.</b> ' : '<b>Not quite.</b> ') + md(q.why); answered++;
        if (answered === d.quiz.length) { S.quiz['d' + d.n] = { score: score, total: d.quiz.length }; S.done['d' + d.n + '-quiz'] = true; save(); head(); document.getElementById('quizScore').innerHTML = 'You scored ' + score + ' of ' + d.quiz.length + '. ' + (score >= d.quiz.length - 1 ? 'Solid. Move on.' : 'Re-read the lessons for the ones you missed, then retry.') + ' <button class="btn" id="quizRetry">Retry quiz</button>'; }
        return;
      }
      if (e.target.id === 'quizRetry') build();
    });
  }
  function mountPractice(d) {
    var m = document.getElementById('practiceMount'); if (!m) return; var p = d.practice, nk = 'd' + d.n;
    var h = '<textarea class="ans" id="ans" placeholder="Write your answer the way you would say it: requirements first, then the design, then the trade-offs."></textarea><div class="ctl" style="margin-top:10px"><button class="btn pri" id="fbBtn" hidden>Get feedback from Claude</button><span class="note-sm" id="fbNote" style="margin:0"></span></div><div class="fb" id="fbOut" hidden></div>';
    if (p.hints && p.hints.length) h += '<details class="dd"><summary>Hints (try first without them)</summary><div class="inner"><ul>' + p.hints.map(function (x) { return '<li>' + md(x) + '</li>'; }).join('') + '</ul></div></details>';
    h += '<details class="dd"><summary>Model outline (open after you answered)</summary><div class="inner prose">' + blocks(p.outline) + '</div></details>';
    m.innerHTML = h;
    var ta = document.getElementById('ans'); ta.value = S.notes[nk] || ''; var t = null;
    ta.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { S.notes[nk] = ta.value; save(); }, 400); });
    var btn = document.getElementById('fbBtn'), out = document.getElementById('fbOut'), note = document.getElementById('fbNote');
    var getSample = (window.claude && window.claude.use) ? window.claude.use('sample') : Promise.resolve(null);
    Promise.resolve(getSample).then(function (sample) {
      if (!sample) return; btn.hidden = false;
      btn.addEventListener('click', function () {
        var txt = ta.value.trim(); if (txt.length < 40) { note.textContent = 'Write a few sentences first.'; return; }
        note.textContent = ''; btn.disabled = true; out.hidden = false; out.textContent = 'Reading your answer...';
        var q = Array.isArray(p.prompt) ? p.prompt.map(function (x) { return typeof x === 'string' ? x : (x.ul ? x.ul.join('; ') : ''); }).join(' ') : String(p.prompt);
        var prompt = 'You are a staff engineer coaching a candidate for a system design interview. The candidate is new to backend, so explain jargon briefly when you use it.\n\nQuestion: ' + q + '\n\nWhat a strong answer covers: ' + (p.rubric || '') + '\n\nCandidate answer:\n"""\n' + txt + '\n"""\n\nReply in plain text, no markdown tables, under 260 words, in this shape:\nWhat works: two short bullets.\nWhat is missing or wrong: up to five bullets, most important first, each with the fix.\nNext question an interviewer would ask: one question.';
        sample(prompt, { onText: function (r) { out.textContent = r.text; }, modelTier: 'default', cache: false }).then(function (r) { out.textContent = r.text; btn.disabled = false; }).catch(function (err) { btn.disabled = false; out.textContent = err && err.code === 'rate_limited' ? 'Too many requests right now. Wait a minute and try again.' : err && err.code === 'not_granted' ? 'Feedback needs your permission. Click the button again and allow it.' : 'Feedback failed: ' + (err && err.message ? err.message : 'unknown error'); });
      });
    }).catch(function () { });
  }

  /* ---------- interview exercises ---------- */
  S.attempts = S.attempts || {};
  function exById(id) { return (window.EXERCISES || []).filter(function (e) { return e.id === id; })[0]; }
  function crit(e) { return (window.RUBRICS || {})[e.id] || []; }
  function refL(ref) { var p = ref.split(':'); return BYID[p[0] === 't' ? 't-' + p[1] + '-' + p[2] : p[0] + '-' + p[1]]; }
  function linkPills(refs) { var seen = {}; return refs.map(refL).filter(function (L) { if (!L || seen[L.id]) return false; seen[L.id] = 1; return true; }).map(function (L) { return '<a class="pill" href="#' + L.hash + '">' + (L.type === 's' ? '▶ ' : '') + esc(L.short.length > 34 ? L.short.slice(0, 33) + '…' : L.short) + '</a>'; }).join(''); }
  function scoreOf(v) { var s = 0; v.forEach(function (x) { s += x === 'hit' ? 1 : x === 'partial' ? 0.5 : 0; }); return Math.round(s / v.length * 100) / 10; }
  function lastAttempt(id) { var a = S.attempts[id]; return a && a.length ? a[a.length - 1] : null; }
  function grade(s) { return s >= 8.5 ? 'Strong hire' : s >= 7 ? 'Hire' : s >= 5 ? 'Borderline' : 'Not yet'; }
  function exFor(L) { var out = []; (window.EXERCISES || []).forEach(function (e) { if (needLessons(e).some(function (x) { return x.id === L.id; })) out.push(e); }); return out; }
  function practiceCard(L) {
    var l = exFor(L).slice(0, 5); if (!l.length) return '';
    return '<div class="learn sheet"><span class="cap">Mock round practice</span>' + l.map(function (e) { var at = lastAttempt(e.id); return '<a class="btn-pop" href="#ex-' + e.id + '">' + I('flag', 13) + ' <span style="flex:1;text-align:left">' + esc(e.title.replace(/^Design /, '')) + '</span>' + (at ? '<span class="tag tag--' + (at.s >= 7 ? 'mint' : at.s >= 5 ? 'orange' : 'rose') + '">' + at.s + '</span>' : '') + '</a>'; }).join('') + '</div>';
  }

  function skillMap() {
    var weak = {}, secs = {}, any = false;
    (window.EXERCISES || []).forEach(function (e) {
      var at = lastAttempt(e.id); if (!at) return; any = true;
      crit(e).forEach(function (c, i) {
        var v = at.v[i], w = v === 'hit' ? 1 : v === 'partial' ? 0.5 : 0, seenSec = {};
        c[1].forEach(function (r) {
          var L = refL(r); if (!L) return;
          if (w < 1) weak[L.id] = (weak[L.id] || 0) + (1 - w);
          if (!seenSec[L.sec.id]) { seenSec[L.sec.id] = 1; var o = secs[L.sec.id] = secs[L.sec.id] || { n: 0, s: 0 }; o.n++; o.s += w; }
        });
      });
    });
    if (!any) return '<div class="sheet pad"><span class="cap">Skill radar</span><p class="note-sm" style="margin-top:6px">Finish an exercise and score it. Here you will see which course sections your interview answers are strong in, and which lessons to study next.</p></div>';
    var top = Object.keys(weak).sort(function (a, b) { return weak[b] - weak[a]; }).slice(0, 6);
    var h = '<div class="sheet pad"><span class="cap">Your skill map (from your latest scored attempts)</span><div style="display:grid;gap:8px;margin-top:10px">';
    COURSE.forEach(function (sec) { var o = secs[sec.id]; if (!o) return; var p = Math.round(100 * o.s / o.n); h += '<div style="display:grid;grid-template-columns:150px 1fr 44px;gap:10px;align-items:center;font-size:12px"><span>' + sec.name + '</span><div class="bar"><i style="width:' + p + '%;background:' + (p >= 70 ? 'var(--green-3)' : p >= 45 ? 'var(--warn)' : 'var(--bad)') + '"></i></div><b>' + p + '%</b></div>'; });
    h += '</div><span class="cap" style="display:block;margin-top:14px">Study next (your biggest gaps)</span><div class="pills" style="margin-top:8px">' + top.map(function (id) { var L = BYID[id]; return '<a class="pill" href="#' + L.hash + '">' + (L.type === 's' ? '▶ ' : '') + esc(L.short) + '</a>'; }).join('') + '</div></div>';
    return h;
  }
  function exListPage() {
    var list = window.EXERCISES || [], done = list.filter(function (e) { return S.done['ex-' + e.id]; }).length;
    var h = '<div><h1>Mock rounds</h1><p class="lead">' + list.length + ' full design questions modeled on ones commonly reported at Airbnb, Twitter/X, Meta, Uber, Google, Amazon, Stripe, Dropbox and others (companies rotate questions, so treat tags as "often asked"). Each is scored against a checklist of what a strong answer covers, and every missed point links back to the lesson that teaches it.</p></div><div class="out"><div><span>Exercises</span><b>' + list.length + '</b></div><div><span>Passed (7+/10)</span><b>' + done + '</b></div><div><span>Attempts</span><b>' + Object.keys(S.attempts).reduce(function (n, k) { return n + S.attempts[k].length; }, 0) + '</b></div></div>' + skillMap() + '<div class="daycards">';
    list.forEach(function (e) {
      var at = lastAttempt(e.id);
      h += '<a class="dcard sheet" href="#ex-' + e.id + '" style="text-decoration:none"><h3>' + (S.done['ex-' + e.id] ? I('check', 16) : I('flag', 16)) + esc(e.title) + (at ? '<span class="tag tag--' + (at.s >= 7 ? 'mint' : at.s >= 5 ? 'orange' : 'rose') + '" style="margin-left:auto">' + at.s + '/10</span>' : '') + '</h3><div class="pills"><span class="tag tag--orange">' + esc(e.company) + '</span><span class="tag ' + (e.level === 'Staff' ? 'tag--rose' : 'tag--violet') + '">' + e.level + '</span><span class="tag">' + e.min + ' min</span><span class="tag tag--' + (readiness(e).p >= 0.8 ? 'mint' : 'violet') + '">ready ' + readiness(e).n + '/' + readiness(e).t + ' lessons</span></div><p style="margin:0;color:var(--muted)">' + esc(e.prompt.length > 190 ? e.prompt.slice(0, 188) + '…' : e.prompt) + '</p></a>';
    });
    return wrap(h + '</div>');
  }
  function needList(e) { var refs = (window.NEEDS && window.NEEDS[e.id] || []).slice(); crit(e).forEach(function (c) { refs = refs.concat(c[1]); }); return refs; }
  function needLessons(e) { var seen = {}, out = []; needList(e).forEach(function (r) { var L = refL(r); if (L && !seen[L.id]) { seen[L.id] = 1; out.push(L); } }); return out.sort(function (a, b) { return a.idx - b.idx; }); }
  function readiness(e) { var l = needLessons(e), d = l.filter(lessonDone).length; return { n: d, t: l.length, p: l.length ? d / l.length : 0, next: l.filter(function (x) { return !lessonDone(x); })[0] }; }
  function prereqHTML(e) {
    var l = needLessons(e), r = readiness(e), by = {};
    l.forEach(function (L) { (by[L.sec.id] = by[L.sec.id] || []).push(L); });
    var h = '<div class="sheet pad"><div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap"><div style="flex:1;min-width:240px"><span class="cap">What you need from the course</span><div style="font-size:13px;margin-top:4px">' + l.length + ' lessons across ' + Object.keys(by).length + ' sections · <b>' + r.n + ' done</b></div><div class="bar" style="margin-top:8px"><i style="width:' + Math.round(r.p * 100) + '%"></i></div></div>' + (r.next ? '<a class="btn-pop btn-next" href="#' + r.next.hash + '">' + I('arrow', 13) + ' Study next: ' + esc(r.next.short.length > 26 ? r.next.short.slice(0, 25) + '…' : r.next.short) + '</a>' : '<span class="tag tag--mint">' + I('check', 12) + ' All prerequisites done</span>') + '</div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px;margin-top:14px">';
    COURSE.forEach(function (sec) {
      var g = by[sec.id]; if (!g) return; var dn = g.filter(lessonDone).length;
      h += '<div style="border:1px solid var(--line-strong);border-radius:10px;padding:10px 12px;background:var(--card)"><div style="display:flex;align-items:center;gap:8px;font-weight:800;font-size:12.5px"><span style="color:' + sec.color + '">' + I('folder', 14) + '</span>' + String(sec.n).padStart(2, '0') + ' ' + sec.name + '<span style="margin-left:auto;font-weight:400;font-size:11px;color:var(--muted)">' + dn + '/' + g.length + '</span></div><div style="display:grid;gap:2px;margin-top:6px">' + g.map(function (L) { return '<a href="#' + L.hash + '" style="display:flex;gap:8px;align-items:flex-start;text-decoration:none;font-size:12px;padding:3px 0;color:' + (lessonDone(L) ? 'var(--muted)' : 'var(--ink)') + '"><span style="color:' + (lessonDone(L) ? 'var(--good)' : 'var(--muted-2)') + ';flex:none">' + (lessonDone(L) ? I('check', 12) : L.type === 's' ? I('play', 12) : I('doc', 12)) + '</span><span' + (lessonDone(L) ? ' style="text-decoration:line-through"' : '') + '>' + esc(L.short) + '</span></a>'; }).join('') + '</div></div>';
    });
    return h + '</div></div>';
  }
  function exPage(e) {
    var list = window.EXERCISES, ix = list.indexOf(e), pv = list[ix - 1], nx = list[ix + 1], k = 'ex-' + e.id;
    return wrap('<div><div class="crumb"><b>Interviews</b> / ' + esc(e.company) + '</div><h1>' + esc(e.title) + '</h1><div class="pills" style="margin-top:8px"><span class="tag tag--orange">' + esc(e.company) + '</span>' + (e.more || []).slice(0, 3).map(function (c) { return '<span class="tag">also ' + esc(c) + '</span>'; }).join('') + '<span class="tag ' + (e.level === 'Staff' ? 'tag--rose' : 'tag--violet') + '">' + e.level + '</span><span class="tag tag--mint">' + e.min + ' min</span></div></div>' +
      prereqHTML(e) +
      '<div class="sheet read"><h2>' + I('chat', 18) + ' The question</h2><div class="prose"><p style="font-size:14px">' + md(e.prompt) + '</p><p class="note-sm">Method: 5 min requirements, 5 min estimates, 15 min high-level design, 15 min deep dives, 5 min trade-offs. Say your assumptions out loud.</p></div><div class="ctl" style="margin:10px 0"><button class="btn" id="exTimer">' + I('clock', 13) + ' <span>Start ' + e.min + ' min timer</span></button></div><div id="exMount"></div></div>' +
      '<div id="exResult"></div><div id="exHist"></div>' +
      '<details class="dd sheet" id="exWalk"><summary style="font-size:14px;padding:12px 16px">' + I('eye', 14) + ' Reveal the model walkthrough (after you tried)</summary><div class="inner prose" style="padding:0 18px 12px">' + blocks(e.walk) + '</div></details>' +
      '<div class="sheet read"><h2>' + I('target', 18) + ' Follow-ups the interviewer may ask</h2><div class="prose"><ul>' + e.follow.map(function (f) { return '<li>' + md(f) + '</li>'; }).join('') + '</ul></div></div>' +
      '<div class="lfoot sheet"><label class="check"><input type="checkbox" data-check="' + k + '"' + (S.done[k] ? ' checked' : '') + '> Mark as completed</label><span style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn-pop" href="#ex">All exercises</a>' + (pv ? '<a class="btn-pop" href="#ex-' + pv.id + '">' + I('back', 13) + ' Previous</a>' : '') + (nx ? '<a class="btn-pop btn-next" href="#ex-' + nx.id + '">Next ' + I('arrow', 13) + '</a>' : '') + '</span></div>');
  }
  var VI = { hit: ['✓', 'Covered', 'good'], partial: ['◐', 'Partly', 'warn'], miss: ['✕', 'Missing', 'bad'] };
  function scorecardHTML(e, v, notes, extra, editable) {
    var cs = crit(e), s = scoreOf(v), weakRefs = [];
    var h = '<div class="sheet read"><h2>' + I('target', 18) + ' Scorecard<span class="tag tag--' + (s >= 7 ? 'mint' : s >= 5 ? 'orange' : 'rose') + '" style="margin-left:auto;font-size:13px">' + s + ' / 10 · ' + grade(s) + '</span></h2><div class="bar" style="margin:4px 0 14px"><i style="width:' + s * 10 + '%;background:' + (s >= 7 ? 'var(--green-3)' : s >= 5 ? 'var(--warn)' : 'var(--bad)') + '"></i></div>';
    if (extra && extra.summary) h += '<p style="margin:0 0 12px">' + md(extra.summary) + '</p>';
    h += '<div style="display:grid;gap:8px">';
    cs.forEach(function (c, i) {
      var x = v[i] || 'miss', vi = VI[x]; if (x !== 'hit') weakRefs = weakRefs.concat(c[1]);
      h += '<div class="kpi ' + vi[2] + '" style="padding:8px 12px 8px 14px"><div style="display:flex;gap:10px;align-items:flex-start"><b style="color:var(--' + (vi[2] === 'good' ? 'good' : vi[2] === 'warn' ? 'warn' : 'bad') + ');width:16px">' + vi[0] + '</b><span style="flex:1;font-size:12.3px">' + esc(c[0]) + (notes && notes[i] ? '<br><span style="color:var(--muted)">' + esc(notes[i]) + '</span>' : '') + '</span>' +
        (editable ? '<span class="pills" data-ci="' + i + '">' + ['hit', 'partial', 'miss'].map(function (o) { return '<button class="pill' + (x === o ? ' on' : '') + '" data-v="' + o + '">' + VI[o][1] + '</button>'; }).join('') + '</span>' : '') + '</div>' +
        (x !== 'hit' ? '<div class="pills" style="margin-top:6px;padding-left:26px"><span class="cap" style="align-self:center">Study</span>' + linkPills(c[1]) + '</div>' : '') + '</div>';
    });
    h += '</div>';
    if (extra && extra.follow) h += '<div class="callout say"><b>Follow-up I would ask</b><p>' + md(extra.follow) + '</p></div>';
    return h + (editable ? '<div class="ctl" style="margin-top:12px"><button class="btn pri" id="saveSelf">Save this self-check</button></div>' : '') + '</div>';
  }
  function histHTML(e) {
    var a = S.attempts[e.id] || []; if (!a.length) return '';
    return '<div class="sheet pad"><span class="cap">Your attempts</span><div class="pills" style="margin-top:8px">' + a.map(function (x, i) { return '<span class="tag tag--' + (x.s >= 7 ? 'mint' : x.s >= 5 ? 'orange' : 'rose') + '" title="' + new Date(x.t).toLocaleString() + '">#' + (i + 1) + ' · ' + x.s + '/10 · ' + (x.src === 'ai' ? 'Claude' : 'self') + '</span>'; }).join('') + '</div></div>';
  }
  function recordAttempt(e, v, src) {
    var a = S.attempts[e.id] = S.attempts[e.id] || []; a.push({ t: Date.now(), s: scoreOf(v), v: v, src: src }); if (a.length > 12) a.shift();
    if (scoreOf(v) >= 7) S.done['ex-' + e.id] = true; save(); var c = document.querySelector('[data-check="ex-' + e.id + '"]'); if (c) c.checked = !!S.done['ex-' + e.id];
    var hh = document.getElementById('exHist'); if (hh) hh.innerHTML = histHTML(e);
  }
  function parseJSON(t) { try { var s = t.indexOf('{'), f = t.lastIndexOf('}'); return JSON.parse(t.slice(s, f + 1)); } catch (err) { return null; } }
  function mountEx(e) {
    var m = document.getElementById('exMount'); if (!m) return; var nk = 'ex-' + e.id, res = document.getElementById('exResult'), cs = crit(e);
    m.innerHTML = '<textarea class="ans" id="ans" placeholder="Write your design the way you would say it: requirements, estimates, high-level design, deep dive, trade-offs."></textarea><div class="ctl" style="margin-top:10px"><button class="btn pri" id="fbBtn" hidden>Evaluate with Claude</button><button class="btn" id="selfBtn">Self-check against the rubric</button><span class="note-sm" id="fbNote" style="margin:0"></span></div>';
    document.getElementById('exHist').innerHTML = histHTML(e);
    var la = lastAttempt(e.id); if (la && la.v.length === cs.length) res.innerHTML = scorecardHTML(e, la.v, la.n, la.x, false);
    var ta = document.getElementById('ans'); ta.value = S.notes[nk] || ''; var t = null;
    ta.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { S.notes[nk] = ta.value; save(); }, 400); });
    var tb = document.getElementById('exTimer'), iv = null, left = 0;
    tb.addEventListener('click', function () {
      if (iv) { clearInterval(iv); iv = null; tb.lastElementChild.textContent = 'Start ' + e.min + ' min timer'; return; }
      left = e.min * 60; function tick() { if (!document.getElementById('exTimer')) { clearInterval(iv); return; } var mm = Math.floor(left / 60), ss = left % 60; tb.lastElementChild.textContent = (left > 0 ? mm + ':' + (ss < 10 ? '0' : '') + ss + ' left (click to stop)' : 'Time is up: wrap up the trade-offs'); if (left-- <= 0) { clearInterval(iv); iv = null; } }
      tick(); iv = setInterval(tick, 1000);
    });
    var note = document.getElementById('fbNote');
    document.getElementById('selfBtn').addEventListener('click', function () {
      var v = cs.map(function () { return 'miss'; }); res.innerHTML = scorecardHTML(e, v, null, null, true); res.scrollIntoView({ behavior: 'smooth', block: 'start' });
      res.onclick = function (ev) {
        var b = ev.target.closest('[data-v]'); if (b) { var i = +b.parentNode.dataset.ci; v[i] = b.dataset.v; res.innerHTML = scorecardHTML(e, v, null, null, true); return; }
        if (ev.target.id === 'saveSelf') { recordAttempt(e, v.slice(), 'self'); res.innerHTML = scorecardHTML(e, v, null, null, false); }
      };
    });
    var btn = document.getElementById('fbBtn');
    var getSample = (window.claude && window.claude.use) ? window.claude.use('sample') : Promise.resolve(null);
    Promise.resolve(getSample).then(function (sample) {
      if (!sample) return; btn.hidden = false;
      btn.addEventListener('click', function () {
        var txt = ta.value.trim(); if (txt.length < 80) { note.textContent = 'Write more of your design first (at least a few sentences).'; return; }
        note.textContent = ''; btn.disabled = true; res.innerHTML = '<div class="sheet pad">Evaluating your answer against ' + cs.length + ' criteria…</div>';
        var list = cs.map(function (c, i) { return i + '. ' + c[0]; }).join('\n');
        var prompt = 'You are a strict but fair staff engineer grading a system design interview answer. The candidate is learning backend.\n\nQuestion (' + e.company + ' style, ' + e.level + ' level): ' + e.prompt + '\n\nGrade the answer against exactly these criteria:\n' + list + '\n\nFor each criterion decide: "hit" (clearly and correctly covered), "partial" (mentioned but vague, shallow or partly wrong), or "miss" (absent or wrong). Judge only what the candidate wrote; do not give credit for things implied but not said.\n\nCandidate answer:\n"""\n' + txt + '\n"""\n\nReply with ONLY a JSON object, no other text, in this exact shape:\n{"summary":"two sentences on the overall quality","criteria":[{"i":0,"v":"hit|partial|miss","note":"one short sentence: what was good or what exactly is missing"}, ...one entry per criterion...],"follow":"one follow-up question an interviewer would ask next"}';
        sample(prompt, { modelTier: 'default', cache: false }).then(function (r) {
          btn.disabled = false; var j = parseJSON(r.text || '');
          if (!j || !j.criteria) { res.innerHTML = '<div class="fb">Could not read the evaluation. Raw reply:\n\n' + esc(r.text || '') + '</div>'; return; }
          var v = cs.map(function () { return 'miss'; }), notes = [];
          j.criteria.forEach(function (c) { if (typeof c.i === 'number' && c.i >= 0 && c.i < cs.length) { v[c.i] = c.v === 'hit' || c.v === 'partial' ? c.v : 'miss'; notes[c.i] = c.note || ''; } });
          var ex = { summary: j.summary, follow: j.follow };
          var a = S.attempts[e.id] = S.attempts[e.id] || []; recordAttempt(e, v, 'ai'); a[a.length - 1].n = notes; a[a.length - 1].x = ex; save();
          res.innerHTML = scorecardHTML(e, v, notes, ex, false); res.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }).catch(function (err) { btn.disabled = false; res.innerHTML = '<div class="fb">' + (err && err.code === 'rate_limited' ? 'Too many requests right now. Wait a minute and try again.' : err && err.code === 'not_granted' ? 'Evaluation needs your permission. Click the button again and allow it.' : 'Evaluation failed: ' + esc(err && err.message ? err.message : 'unknown error')) + '</div>'; });
      });
    }).catch(function () { });
  }

  /* ---------- search ---------- */
  var searchIdx = null;
  function buildSearch() {
    searchIdx = LESSONS.map(function (L) {
      var text = L.type === 's' ? L.spec.sub + ' ' + L.spec.steps.map(function (s) { return s.title + ' ' + s.text + ' ' + (s.edge || '') + ' ' + (s.idea || ''); }).join(' ') : textOf(L.lesson.body);
      return { L: L, hay: (L.title + ' ' + L.sec.name + ' ' + text).toLowerCase(), text: text };
    });
  }
  var searchSel = 0, searchRes = [];
  function openSearch() {
    if (document.getElementById('ovl')) return; if (!searchIdx) buildSearch();
    var o = document.createElement('div'); o.className = 'overlay'; o.id = 'ovl';
    o.innerHTML = '<div class="cmd"><input id="sq" placeholder="Search lessons, concepts, edge cases…" autocomplete="off"><div class="res" id="sres"></div></div>';
    document.body.appendChild(o); var q = o.querySelector('#sq'); q.focus();
    function run() {
      var terms = q.value.toLowerCase().split(/\s+/).filter(Boolean);
      searchRes = (terms.length ? searchIdx.filter(function (x) { return terms.every(function (t) { return x.hay.indexOf(t) >= 0; }); }) : searchIdx.slice(0, 12));
      if (terms.length) searchRes.sort(function (a, b) { return (b.L.title.toLowerCase().indexOf(terms[0]) >= 0) - (a.L.title.toLowerCase().indexOf(terms[0]) >= 0); });
      searchRes = searchRes.slice(0, 30); searchSel = 0; draw();
    }
    function draw() { document.getElementById('sres').innerHTML = searchRes.length ? searchRes.map(function (x, i) { var ix = terms0(x); return '<a href="#' + x.L.hash + '" class="' + (i === searchSel ? 'sel' : '') + '"><b>' + (x.L.type === 's' ? '▶ ' : '') + esc(x.L.title) + '</b><small>' + x.L.sec.name + ' · ' + esc(x.text.slice(0, 110)) + '…</small></a>'; }).join('') : '<div class="note-sm" style="padding:10px">No lessons match.</div>'; }
    function terms0() { return 0; }
    q.addEventListener('input', run);
    q.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { searchSel = Math.min(searchRes.length - 1, searchSel + 1); draw(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { searchSel = Math.max(0, searchSel - 1); draw(); e.preventDefault(); }
      else if (e.key === 'Enter' && searchRes[searchSel]) { location.hash = '#' + searchRes[searchSel].L.hash; closeSearch(); }
    });
    o.addEventListener('click', function (e) { if (e.target === o || e.target.closest('a')) closeSearch(); });
    run();
  }
  function closeSearch() { var o = document.getElementById('ovl'); if (o) o.remove(); }
  function toast(msg) { var t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2200); }

  /* ---------- router ---------- */
  function render() {
    window.Player.destroy();
    var hash = (location.hash || '#learn').replace(/^#/, ''), m, tab = 'learn', body = '', L = null, after = null, step = 0;
    if ((m = /^day-(\d+)$/.exec(hash))) hash = 'plan-' + m[1];
    if (hash === 'learn' || hash === 'home' || hash === '') { L = firstUndone(); location.replace('#' + L.hash); return; }
    if ((m = /^l-(.+?)(?:-(\d+))?$/.exec(hash)) && SC[m[1]]) {
      L = sceneLesson(m[1]); if (!L) { location.replace('#learn'); return; } step = m[2] ? Math.max(0, +m[2] - 1) : 0; body = scenePage(L); after = function () { mountScene(L, step); }; document.title = L.title + ' · ship_it() Academy';
    } else if ((/^t-(\d+)-(\d+)$/.test(hash) || /^x-/.test(hash)) && BYID[hash]) {
      L = BYID[hash]; body = textPage(L); after = function () { mountDynamic(document.querySelector('.read')); }; document.title = L.title + ' · ship_it() Academy';
    } else if ((m = /^plan(?:-(\d+))?$/.exec(hash))) { tab = 'plan'; body = planPage(m[1] ? +m[1] : 0); document.title = 'Roadmap · ship_it() Academy'; }
    else if ((m = /^practice(?:-(\d+))?$/.exec(hash))) { tab = 'practice'; var pd = m[1] ? dayByN(+m[1]) : null; body = practicePage(m[1] ? +m[1] : 0); if (pd) after = function () { mountQuiz(pd); if (pd.practice) mountPractice(pd); }; document.title = 'Drills · ship_it() Academy'; }
    else if ((m = /^labs(?:-(\d+))?$/.exec(hash))) { tab = 'labs'; body = labsPage(m[1] ? +m[1] : 0); after = function () { mountDynamic(document.querySelector('.main')); }; document.title = 'Sandbox · ship_it() Academy'; }
    else if ((m = /^ex(?:-(.+))?$/.exec(hash))) { tab = 'ex'; var ex = m[1] ? exById(m[1]) : null; if (m[1] && !ex) { location.replace('#ex'); return; } body = ex ? exPage(ex) : exListPage(); if (ex) after = function () { mountEx(ex); mountDynamic(document.querySelector('.main')); }; document.title = (ex ? ex.title : 'Mock rounds') + ' · ship_it() Academy'; }
    else if (hash === 'review') { tab = 'review'; body = reviewPage(); after = mountReview; document.title = 'Recall · ship_it() Academy'; }
    else if (hash === 'play') { if (IN_GAME) { backToGame(); location.replace('#learn'); } else location.replace(window.SITE.routes.game); return; }
    else if (hash === 'cheat' || hash === 'cheatsheet') { tab = 'cheat'; body = cheatPage(); document.title = 'Quick refs · ship_it() Academy'; }
    else { location.replace('#learn'); return; }
    window.__curL = L;
    var prevSide = document.getElementById('side'), sc = prevSide ? prevSide.scrollTop : 0;
    app.innerHTML = topHTML(tab) + body;
    var side = document.getElementById('side'); side.innerHTML = treeHTML(L); side.scrollTop = sc;
    var cur = side.querySelector('a.cur'); if (cur && !prevSide) cur.scrollIntoView({ block: 'center' });
    document.body.classList.remove('menu');
    if (after) after();
    if (!(/^l-/.test(hash))) window.scrollTo(0, 0); else window.scrollTo(0, 0);
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    var sec = t.closest('.sec > button'); if (sec) { var p = sec.parentNode; p.classList.toggle('open'); openSecs = openSecs || {}; openSecs[p.dataset.sec] = p.classList.contains('open'); return; }
    if (t.closest('#openSearch')) { openSearch(); return; }
    if (t.closest('#themeBtn')) { S.theme = theme() === 'dark' ? 'light' : 'dark'; save(); applyTheme(); var b = document.getElementById('themeBtn'); if (b) b.innerHTML = I(S.theme === 'dark' ? 'sun' : 'moon', 15); return; }
    if (t.closest('#menuBtn')) { document.body.classList.toggle('menu'); return; }
    var j = t.closest('[data-jump]'); if (j) { e.preventDefault(); var h3 = document.getElementById('hd' + j.dataset.jump); if (h3) h3.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (t.id === 'startSave') { var v = document.getElementById('startDate').value.trim(); if (/^\d{4}-\d{2}-\d{2}$/.test(v)) { S.start = v; save(); render(); } return; }
    if (t.id === 'resetAll') { if (t.dataset.sure) { S.done = {}; S.quiz = {}; S.notes = {}; S.srs = {}; save(); render(); } else { t.dataset.sure = 1; t.textContent = 'Click again to erase everything'; } }
  });
  document.addEventListener('change', function (e) { var c = e.target.closest('[data-check]'); if (!c) return; S.done[c.dataset.check] = c.checked; save(); refreshTree(); });
  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); }
    else if (e.key === 'Escape') closeSearch();
    else if (e.key === '/' && !/INPUT|TEXTAREA/.test(e.target.tagName)) { e.preventDefault(); openSearch(); }
  });
  window.addEventListener('hashchange', function () { var h = location.hash; if (window.__skipHash === h) { window.__skipHash = null; return; } render(); });
  applyTheme();
  render();
  if (IN_GAME) { try { window.parent.postMessage({ ship: 'ready' }, location.origin); } catch (e) { } }
})();
