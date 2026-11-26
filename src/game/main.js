// ship_it() game: code phase (block programming) + startup phase (system design).
import '../shared/support.css';
import './game.css';
import { runTick, runChallenge, CHALLENGES, countBlocks, mulberry32, KIDS, COST } from './engine.js';
import { simulate, STARTUPS, COMP, PALETTE, ALLOWED, KINDS, KIND_NEEDS, RPS_PER_USER, capOf, upkOf } from './sim.js';
import { COURSE } from './course-data.js';
import { SITE } from '../site.config.js';
import { coffeeButton, coffeeNote } from '../shared/support.js';

{
const $ = id => document.getElementById(id);
$('coffeeSlot').outerHTML = coffeeButton();
const EMBED = true;
try { const cs = JSON.parse(localStorage.getItem('two-weeks-to-scale-v2') || '{}'); if (cs.theme === 'dark' || cs.theme === 'light') document.documentElement.dataset.theme = cs.theme; } catch (e) {} // course links are always available: the course is course.html in the same app
let hostHidden = false;
window.addEventListener('message', e => {
  const d = e.data; if (!d || typeof d !== 'object') return;
  if (d.ship === 'visible') hostHidden = !d.v;
  if (d.ship === 'theme' && (d.theme === 'dark' || d.theme === 'light')) document.documentElement.dataset.theme = d.theme;
});
// The course opens in a full-screen frame on top of the game. The game page never unloads,
// so switching can't reset it; the game loop is paused while the course is showing.
let courseFrame = null;
function openCourse(hash) {
  save();
  if (!courseFrame) {
    courseFrame = document.createElement('iframe');
    courseFrame.name = 'course'; courseFrame.title = 'Course'; courseFrame.className = 'coursefr';
    courseFrame.src = SITE.routes.course + (hash || '');
    document.body.appendChild(courseFrame);
  } else if (hash) {
    try { courseFrame.contentWindow.location.hash = hash; } catch (e) { courseFrame.src = SITE.routes.course + hash; }
  }
  courseFrame.hidden = false; hostHidden = true; document.body.classList.add('in-course');
  try { courseFrame.focus(); } catch (e) {}
}
function closeCourse() {
  if (courseFrame) courseFrame.hidden = true;
  hostHidden = false; document.body.classList.remove('in-course');
  try { const cs = JSON.parse(localStorage.getItem('two-weeks-to-scale-v2') || '{}'); if (cs.theme === 'dark' || cs.theme === 'light') document.documentElement.dataset.theme = cs.theme; } catch (e) {}
}
window.addEventListener('message', e => { if (e.origin === location.origin && e.data && e.data.ship === 'game') closeCourse(); });
const goCourse = hash => openCourse(hash);
const toCourse = ref => { const p = ref.split(':'); goCourse(p[0] === 't' ? `#t-${p[1]}-${p[2]}` : p[0] === 'x' ? `#x-${p[1]}` : `#l-${p[1]}`); };
const fmt = n => { if (!isFinite(n)) return '∞'; const a = Math.abs(n); if (a < 10) return (Math.round(n * 100) / 100).toString(); if (a < 1000) return (Math.round(n * 10) / 10).toString(); const u = ['K','M','B','T','Qa','Qi']; let i = -1, v = a; while (v >= 1000 && i < u.length - 1) { v /= 1000; i++; } return (n < 0 ? '-' : '') + v.toFixed(v < 10 ? 2 : v < 100 ? 1 : 0) + u[i]; };
const money = n => '$' + fmt(n);

/* ---------- concepts ---------- */
const CONCEPTS = {
  statement: { t: 'Statements', d: 'A program is a list of statements that run top to bottom. Every statement costs CPU time: here, ops. Your CPU can only do so many ops per tick.', c: 'earn(); // runs once\nearn(); // runs again' },
  loop: { t: 'Loops', d: 'A loop runs its body many times. Same work, far fewer lines. Memory limits how many blocks you can write; your bits limit how many times a loop can repeat (max repeats = bits). Buy more bits to loop more.', c: 'for (let i = 0; i < 5; i++) {\n  earn();\n}' },
  nested: { t: 'Nested loops', d: 'Loops multiply: an outer loop of 5 around an inner loop of 5 runs the body 25 times. This is exactly how O(n²) algorithms appear in real code, which is great for earning and terrible for performance.', c: 'for (let i = 0; i < 5; i++)\n  for (let j = 0; j < 5; j++)\n    earn(); // 25 times' },
  bugs: { t: 'Bugs', d: 'Every earn() and commit() can introduce a real defect, like `TypeError: cart.total is undefined`. While any bug is open, earn() pays $0 and deploy() rolls back. fix() patches the oldest open bug for 4 ops; running it when nothing is broken wastes them.', c: 'earn();  // may throw: cart.total is undefined\nfix();   // patches the oldest bug (4 ops)' },
  if: { t: 'Conditionals', d: 'if/else lets the program react to state. Only pay for fix() when there actually is a bug. Checking a condition is cheap (1 op); doing unnecessary work is expensive.', c: 'if (bugs > 0) {\n  fix();\n} else {\n  earn();\n}' },
  func: { t: 'Functions', d: 'A function gives a name to a group of statements. Define it once with `function helper() { }`, then call `helper()` from anywhere: inside loops, in both branches of an if, even from another function. The body is stored once, so every extra call costs just 1 block of memory. A function that calls itself forever never returns: that is a stack overflow, and here it halts the tick.', c: 'function helper() {\n  if (bugs > 0) fix();\n  else earn();\n}\nhelper();\nhelper();' },
  arrays: { t: 'Arrays & iteration', d: 'Customers now place orders, and they pile up in an array: `orders`. ship() takes one order off the array and pays 5× earn(). A repeat loop runs a fixed number of times (wasting ops when there are fewer orders), but `for (const order of orders)` runs exactly once per item, however many there are. Iterating over data, not a hard-coded count, is how real programs handle lists. The array holds at most 40 orders; new orders beyond that are lost.', c: 'const orders = [o1, o2, o3];\nfor (const order of orders) {\n  ship(order); // runs 3 times\n}' },
  trycatch: { t: 'Error handling', d: 'try { } catch { } turns a crash into something you handle. If a bug happens inside try, it is thrown as an exception: the rest of the try body is skipped, that unit of work pays nothing, and the catch body runs instead. The bug never reaches the tracker, so nothing gets blocked. Wrap small units of work: an error in a tiny try loses a little, an error in a huge one loses everything after it.', c: 'for (const order of orders) {\n  try {\n    ship(order);\n  } catch (err) {\n    // skip this order, keep going\n  }\n}' },
  vars: { t: 'Variables & state', d: '`changes` is a variable: state that survives between statements and even between ticks. commit() adds to it; deploy() pays changes² and resets it. But deploying while a bug is open rolls everything back. That is why real teams ship small, tested batches.', c: 'let changes = 0;\nchanges++;            // commit()\nif (changes >= 10) {\n  deploy();           // pays changes²\n}' },
  clientServer: { t: 'Client & server', d: 'Users (clients) send requests. Your app server runs code to answer them, and the database stores the data. Every request travels the whole path.', c: 'GET /abc123  →  app  →  SELECT url FROM links WHERE code = $1' },
  bottleneck: { t: 'Bottlenecks', d: 'A system is only as fast as its slowest part. If the database handles 60 req/s, a faster app server changes nothing. Find the red node first, then fix that.', c: 'throughput = min(app, db, …)' },
  vertical: { t: 'Vertical scaling', d: 'Buy a bigger machine: 2× capacity per size. Simple, no design changes, but there is always a biggest machine (size 4 here), the bill doubles each time, and it is still a single point of failure.', c: 'm5.large → m5.xlarge → m5.2xlarge → m5.4xlarge → the end' },
  horizontal: { t: 'Load balancing', d: 'A load balancer spreads requests across many identical servers. It only works if servers are stateless: any server must be able to answer any request.', c: 'upstream app {\n  server app1; server app2; server app3;\n}' },
  cache: { t: 'Caching', d: 'Keep hot data in memory (e.g. Redis). Timelines, profiles and catalogs are read far more often than they change, so most lookups never need to touch the database. The catch: cached data can go stale, so you need an invalidation strategy.', c: 'let feed = await redis.get(`feed:${userId}`);\nif (!feed) {\n  feed = await db.timeline(userId);\n  await redis.set(`feed:${userId}`, feed, { EX: 60 });\n}' },
  replicas: { t: 'Read replicas', d: 'Copies of the database that serve reads. All writes still go to the primary, and replicas lag slightly behind, so a user might not see their own write instantly (replication lag).', c: 'writes → primary\nreads  → replica-1, replica-2 (eventually consistent)' },
  founding: { t: 'System design', d: 'Your startup is a system: users send requests that flow through components. Each startup has its own traffic mix (reads, writes, media, realtime). Draw the architecture; when traffic grows, the weakest component starts dropping requests and users leave. You start with $2,000 of cloud credits (like AWS Activate): they pay for components and the cloud bill before your cash does.', c: 'Users → Load balancer → App servers → Cache → Database' },
  database: { t: 'Databases', d: 'The database is the source of truth. Reads are cheap; writes cost more because they must be durable (disk, indexes, transactions). A single database is usually the first thing to fall over.', c: 'SELECT * FROM posts WHERE user_id = $1;   -- read\nINSERT INTO posts (...) VALUES (...);     -- write (2×)' },
  cdn: { t: 'CDN', d: 'A Content Delivery Network keeps copies of static media on servers near users. Most image, audio and video requests never reach your infrastructure.', c: 'GET https://cdn.example.com/p/abc.jpg  → served at the edge (92%)' },
  blob: { t: 'Blob storage', d: 'Object storage (like S3) is built for large files. Databases store the metadata (name, owner, size); the bytes live in blob storage.', c: 'PUT s3://bucket/photos/abc.jpg\nINSERT INTO photos (id, key, owner) VALUES (...);' },
  queue: { t: 'Queues', d: 'A queue decouples producers from consumers. The app drops a job and replies immediately; workers process it later. It absorbs spikes and makes slow work asynchronous.', c: 'await queue.publish("fanout", { postId });\nreturn res.status(202).send();' },
  workers: { t: 'Workers', d: 'Workers consume jobs from a queue: fan-out to followers, transcoding, syncing devices, matching rides. Scale them independently of your web servers.', c: 'queue.consume("fanout", async job => {\n  await pushToFollowers(job.postId);\n});' },
  websocket: { t: 'WebSockets', d: 'A WebSocket keeps a connection open so the server can push messages the instant they exist. Without it, clients poll ("anything new?") and hammer the database.', c: 'ws.on("message", m => broker.publish(m.channel, m));\nbroker.subscribe(channel, m => ws.send(m));' },
  geo: { t: 'Geo indexes', d: 'Spatial indexes (geohash, quadtree, Redis GEO) answer "which drivers are within 2 km?" quickly and absorb constant location writes that would crush a normal database.', c: 'GEOADD drivers 13.36 38.11 "driver:42"\nGEOSEARCH drivers FROMLONLAT 13.3 38.1 BYRADIUS 2 km' },
  debt: { t: 'Debt financing', d: 'A loan gives you cash now without giving up equity, but it must be repaid with interest whether or not the bet works. Revenue-based financing takes a cut of every dollar you earn until the debt is cleared.', c: 'owed = principal × 1.4\neach second: repay min(owed, revenue × 25%)' },
  runway: { t: 'Burn rate & runway', d: 'Burn rate is how fast you lose money (costs minus revenue). Runway is how long your cash lasts at that burn. Infrastructure that sits idle still costs money every second.', c: 'burn   = cloudBill + loanPayments − revenue\nrunway = cash / burn' },
  viral: { t: 'Viral growth', d: 'Referrals compound: every user brings more users, so growth is proportional to your user base. But nobody recommends a broken product, so referrals only work while the system is healthy.', c: 'users(t+1) = users(t) × (1 + k)   // only if healthy' },
};

/* ---------- state ---------- */
let uid = 1; const nid = () => 'b' + (uid++);
const BASE = () => ({
  v: 2, study: true, phase: 'code', co: null, exits: 0, founded: [], money: 0, total: 0, mult: 1, prog: [],
  unl: { earn: true }, lv: { earn: 0, cpu: 0, mem: 0, bits: 0, clock: 0, lint: 0, ci: 0, cust: 0 },
  bugsOn: false, st: { bugs: 0, changes: 0, orders: 0 }, bugList: [], learned: ['statement'], solved: {}, chProg: {}, seen: {},
  last: Date.now(), rate: 0,
});
let S = BASE();
const SAVE = 'shipit-v1';
function save() { try { S.last = Date.now(); localStorage.setItem(SAVE, JSON.stringify({ S, uid })); } catch (e) {} }
function load() {
  try { const raw = localStorage.getItem(SAVE); if (!raw) return; const o = JSON.parse(raw); if (!o || !o.S) return; if (o.S.v === 1) { o.S.lv.bits = o.S.lv.loop || 0; delete o.S.lv.loop; delete o.S.start; o.S.v = 2; } if (o.S.v !== 2) return; const b0 = BASE(); S = Object.assign(b0, o.S); S.lv = Object.assign(BASE().lv, o.S.lv); S.st = Object.assign(BASE().st, o.S.st); uid = o.uid || 1000; } catch (e) {}
}

/* ---------- economy ---------- */
const env = () => ({ cpu: 6 + S.lv.cpu * 4, earnValue: 1 + S.lv.earn, bugChance: S.bugsOn ? 0.08 * Math.pow(0.8, S.lv.lint) : 0, deployValue: (1 + S.lv.earn) * 0.03 * Math.pow(2, S.lv.ci), maxLoop: bits(), orderRate: S.unl.each ? 2 + S.lv.cust : 0, orderValue: (1 + S.lv.earn) * 5, maxChanges: maxChanges() });
const maxChanges = () => 1000 + 1000 * (S.lv.ci || 0);
const bits = () => 3 + S.lv.bits;
const memMax = () => 3 + S.lv.mem;
const tps = () => 1 + S.lv.clock * 0.5;
const incomeMult = () => S.mult;
const UPG = [
  { id: 'earn', name: 'Faster typing', d: 'earn() and hand-typing pay +$1 more (ship() pays 5×).', base: 10, g: 1.75, show: () => true },
  { id: 'cpu', name: 'Better CPU', d: '+4 ops per tick. Lets longer programs finish.', base: 20, g: 1.9, show: () => true },
  { id: 'mem', name: 'More RAM', d: '+1 block of memory for your program.', base: 30, g: 2.4, max: 12, show: () => true },
  { id: 'bits', name: 'Buy a bit', d: 'Max repeats = your bits. Each bit lets repeat() loop one more time.', base: 12, g: 1.45, max: 60, show: () => S.unl.repeat },
  { id: 'clock', name: 'Overclock', d: '+0.5 ticks per second.', base: 500, g: 3, max: 6, show: () => S.total > 300 },
  { id: 'lint', name: 'Linter', d: 'Bugs appear 20% less often.', base: 400, g: 2.6, max: 8, show: () => S.bugsOn },
  { id: 'cust', name: 'More customers', d: '+1 order arrives every tick.', base: 60000, g: 1.8, max: 30, show: () => S.unl.each },
  { id: 'ci', name: 'CI pipeline', d: 'deploy() pays twice as much, and a release can hold 1,000 more changes.', base: 2000000, g: 4, max: 10, show: () => S.unl.commit },
];
const cost = u => Math.ceil(u.base * Math.pow(u.g, S.lv[u.id] || 0));
const UNL = [
  { id: 'repeat', name: 'repeat (n) { }', concept: 'loop', price: 25, ch: 'c1', d: 'Loops: write once, run many times.', show: () => true },
  { id: 'if', name: 'if (…) { } else { }', concept: 'if', price: 1000, ch: 'c3', d: 'Conditionals: react to bugs and state.', show: () => S.bugsOn },
  { id: 'func', name: 'function helper() { }', concept: 'func', price: 15000, ch: 'c7', d: 'Functions: name a piece of code, call it anywhere.', show: () => S.unl.if },
  { id: 'each', name: 'for (order of orders)', concept: 'arrays', price: 120000, ch: 'c8', d: 'Arrays: customers send orders; ship() pays 5×.', show: () => S.unl.func },
  { id: 'try', name: 'try { } catch { }', concept: 'trycatch', price: 1000000, ch: 'c9', d: 'Error handling: catch bugs before they block you.', show: () => S.unl.each },
  { id: 'commit', name: 'commit() / deploy()', concept: 'vars', price: 5000000, ch: 'c4', d: 'State: batch changes, deploy pays changes².', show: () => S.unl.try },
];
const START_PRICE = 1e12; // minimum to found the first startup

/* ---------- blocks ---------- */
const BDEF = {
  earn: { k: 'k-act', label: 'earn()', make: () => ({ t: 'earn' }) },
  repeat: { k: 'k-ctl', label: 'repeat (n) { }', make: () => ({ t: 'repeat', n: 3, body: [] }) },
  fix: { k: 'k-fix', label: 'fix()', make: () => ({ t: 'fix' }) },
  if: { k: 'k-ctl', label: 'if { } else { }', make: () => ({ t: 'if', cond: 'bug', k: 10, then: [], else: [] }) },
  commit: { k: 'k-var', label: 'commit()', make: () => ({ t: 'commit' }) },
  deploy: { k: 'k-var', label: 'deploy()', make: () => ({ t: 'deploy' }) },
  func: { k: 'k-fn', label: 'function helper() { }', make: () => ({ t: 'func', body: [] }) },
  call: { k: 'k-fn', label: 'helper()', make: () => ({ t: 'call' }) },
  each: { k: 'k-arr', label: 'for (order of orders) { }', make: () => ({ t: 'each', body: [] }) },
  ship: { k: 'k-arr', label: 'ship()', make: () => ({ t: 'ship' }) },
  try: { k: 'k-try', label: 'try { } catch { }', make: () => ({ t: 'try', body: [], catch: [] }) },
};
const ORDER = ['earn', 'repeat', 'fix', 'if', 'func', 'call', 'each', 'ship', 'try', 'commit', 'deploy'];
// plain-language reference for every block (challenges + palette tooltips); e = challenge env or the live game env
const BHELP = {
  earn: e => ({ what: `Pays ${money(e.earnValue)} each time it runs.`, more: e.bugChance ? `Each run has a ${Math.round(e.bugChance * 100)}% chance to open a bug. While any bug is open, earn() pays $0.` : 'No bugs here, so it always pays.' }),
  repeat: e => ({ what: `Runs the blocks inside it n times. Free: only the blocks inside cost ops.`, more: `n is capped at ${e.maxLoop}. Loops can go inside loops: 3 × 3 = 9 runs.` }),
  fix: () => ({ what: 'Closes the oldest open bug.', more: 'If nothing is broken it does nothing, but you still pay the 4 ops.' }),
  if: () => ({ what: 'Checks a condition, then runs only one side: the first box when it is true, the else box when it is false.', more: 'Use it to fix only when bugs > 0, or to deploy only once changes are high enough.' }),
  func: () => ({ what: 'Defines function helper(). The blocks inside do nothing on their own.', more: 'They run each time helper() is called. Only one helper per program.' }),
  call: () => ({ what: 'Runs everything inside function helper(), right here.', more: 'Costs 1 op plus whatever the helper runs. One block, however big the helper is.' }),
  each: e => ({ what: 'Runs the blocks inside once for every order waiting in the orders array.', more: `No bits needed: 5 orders means 5 runs, 0 orders means 0 runs.${e.orderRate ? ` ${e.orderRate} new orders arrive every tick.` : ''}` }),
  ship: e => ({ what: `Takes one order off the array and pays ${money(e.orderValue || 0)}.`, more: `With no orders waiting it wastes its 2 ops.${e.bugChance ? ' It can open a bug, like earn().' : ''}` }),
  try: () => ({ what: 'Runs the blocks inside. If one of them hits a bug, it is caught: the rest of the try is skipped and the catch box runs.', more: 'A caught bug never opens, so nothing is blocked. You only lose the work that failed.' }),
  commit: e => ({ what: 'Adds 1 to the changes counter (one finished piece of work, not yet released). Pays nothing by itself.', more: `changes is kept between ticks until you deploy.${e.maxChanges ? ` A release holds at most ${fmt(e.maxChanges)} changes; commits beyond that are wasted.` : ''}${e.bugChance ? ` Each commit has a ${Math.round(e.bugChance * 100)}% chance to open a bug.` : ''}` }),
  deploy: e => ({ what: `Releases everything: pays changes × changes${e.deployValue && e.deployValue !== 1 ? ' × ' + money(e.deployValue) : ' dollars'}, then sets changes back to 0.`, more: `Example: 10 commits then deploy pays ${money(100 * (e.deployValue || 1))}; 30 commits pays ${money(900 * (e.deployValue || 1))}. If any bug is open when it runs, the release is rolled back: you get $0 and lose all the changes. With 0 changes it just wastes its 2 ops.` }),
};
const opsTxt = t => t === 'repeat' || t === 'func' ? 'free' : `${COST[t]} op${COST[t] === 1 ? '' : 's'}`;
const blockTip = (t, e) => { const h = BHELP[t](e); return `${BDEF[t].label} · ${opsTxt(t)}\n${h.what} ${h.more}`; };
const B_CONCEPT = { earn: 'statement', repeat: 'loop', fix: 'bugs', if: 'if', func: 'func', call: 'func', each: 'arrays', ship: 'arrays', try: 'trycatch', commit: 'vars', deploy: 'vars' };
const B_JS = {
  earn: 'earn(); // +$ every time it runs', repeat: 'for (let i = 0; i < 3; i++) {\n  earn();\n}', fix: 'fix(); // closes the oldest open bug',
  if: 'if (bugs > 0) {\n  fix();\n} else {\n  earn();\n}', func: 'function helper() {\n  earn();\n  earn();\n}', call: 'helper(); // runs the helper body here',
  each: 'for (const order of orders) {\n  ship(order);\n}', ship: 'ship(orders.shift()); // one order off the array', try: 'try {\n  earn();\n} catch (err) {\n  // the bug is handled here\n}',
  commit: 'changes++; // commit()', deploy: 'pay(changes * changes);\nchanges = 0;',
};
// numbers for the live game: what this block pays, costs and risks right now
function blockFacts(t) {
  const e = env(), m = incomeMult(), bug = e.bugChance ? `${(e.bugChance * 100).toFixed(1)}% per run` : 'none yet';
  const pay = v => `${money(v * m)}${m !== 1 ? ` <span class="lvl">(${money(v)} × ${fmt(m)} income bonus)</span>` : ''}`;
  const F = {
    earn: [['Pays', pay(e.earnValue) + ' per run'], ['Bug risk', bug], ['Blocked when', 'any bug is open (pays $0)']],
    repeat: [['Runs inside', `n times, up to ${bits()} (your bits)`], ['Pays', 'nothing itself: it multiplies what is inside']],
    fix: [['Does', 'closes the oldest open bug'], ['Wasted when', 'no bug is open (you still pay 4 ops)'], ['Open bugs now', String(S.st.bugs)]],
    if: [['Does', 'runs one side: the top box when true, the else box when false'], ['Conditions', ['bugs > 0', 'bugs == 0'].concat(S.unl.each ? ['orders.length > 0'] : [], S.unl.commit ? ['changes >= k'] : []).join(' · ')]],
    func: [['Does', 'nothing on its own: its blocks run when helper() is called'], ['Limit', 'one helper per program']],
    call: [['Runs', 'every block inside function helper()'], ['Watch out', 'a helper that calls itself forever stops the tick (stack overflow)']],
    each: [['Runs inside', 'once per order waiting (no bits needed)'], ['Orders now', `${S.st.orders || 0} waiting · +${e.orderRate} per tick · max 40`]],
    ship: [['Pays', pay(e.orderValue) + ' per order shipped'], ['Bug risk', bug], ['Wasted when', 'no orders are waiting, or a bug is open']],
    try: [['Does', 'catches a bug inside it: the rest of the try is skipped and catch runs'], ['Result', 'the bug never opens, so nothing gets blocked']],
    commit: [['Does', 'changes + 1 (pays nothing by itself)'], ['Bug risk', bug], ['Release size', `at most ${fmt(e.maxChanges)} changes`], ['Changes now', String(S.st.changes)]],
    deploy: [['Pays', `changes × changes × ${pay(e.deployValue)}`], ['Right now', `${fmt(S.st.changes)} changes → ${money(S.st.changes * S.st.changes * e.deployValue * m)}`], ['Rolled back when', 'any bug is open: $0 and the changes are lost']],
  };
  return F[t];
}
function openBlockInfo(t) {
  const e = env(), h = BHELP[t](e), c = CONCEPTS[B_CONCEPT[t]];
  const facts = [['Cost', `${opsTxt(t)} each time it runs · CPU ${e.cpu} ops per tick`]].concat(blockFacts(t));
  modal(`<span class="cap">CODE BLOCK · ${esc(c.t.toUpperCase())}</span><h2><span class="pblk ${BDEF[t].k} binfo-name">${BDEF[t].label}</span></h2>
    <p><b>${h.what}</b> ${h.more}</p>
    <dl class="binfo">${facts.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
    <span class="cap">IN JAVASCRIPT</span><pre class="src" style="min-height:0">${esc(B_JS[t])}</pre>`,
    [{ label: `📖 Learn: ${c.t}`, fn: () => openLibrary('x:' + B_CONCEPT[t]) }, { label: 'Close', cls: 'pri' }]);
}
function blockHelpHTML(blocks, e) {
  return `<details class="bhelp" open><summary>How these blocks work</summary><div class="bhelp-g">${blocks.map(t => { const h = BHELP[t](e); return `<div class="bhelp-i"><div class="bhelp-h"><span class="pblk ${BDEF[t].k}">${BDEF[t].label}</span><span class="tag">${opsTxt(t)}</span></div><p><b>${h.what}</b> ${h.more}</p></div>`; }).join('')}</div></details>`;
}
function findList(prog, pid, key) { if (pid === 'root') return prog; let out = null; (function walk(l) { for (const n of l) { if (n.id === pid) { out = n[key]; return; } KIDS.forEach(k => n[k] && !out && walk(n[k])); } })(prog); return out; }
function findParent(prog, id) { let out = null; (function walk(l) { l.forEach((n, i) => { if (n.id === id) out = { l, i }; KIDS.forEach(k => n[k] && !out && walk(n[k])); }); })(prog); return out; }
function findNode(prog, id) { const p = findParent(prog, id); return p ? p.l[p.i] : null; }
function freshIds(l) { return l.map(n => { const m = Object.assign({}, n, { id: nid() }); KIDS.forEach(k => { if (m[k]) m[k] = freshIds(m[k]); }); return m; }); }

/* Editor component: shared by main program and challenges */
function Editor(host, opts) {
  const ed = { target: { pid: 'root', key: 'body' } };
  const condLabel = { bug: 'bugs > 0', nobug: 'bugs == 0', orders: 'orders.length > 0', changes: 'changes >=' };
  function blockHTML(n) {
    const d = BDEF[n.t]; const runs = `<span class="runs" data-r="${n.id}">×0</span>`;
    const ctl = `<span class="ctl">${opts.info ? `<button data-a="info" data-t="${n.t}" aria-label="About this block" title="What does this block do?">ⓘ</button>` : ''}<button data-a="up" data-id="${n.id}" aria-label="Move up">↑</button><button data-a="down" data-id="${n.id}" aria-label="Move down">↓</button><button data-a="del" data-id="${n.id}" aria-label="Delete">✕</button></span>`;
    if (n.t === 'repeat') { const mx = opts.maxLoop ? opts.maxLoop() : 99; return `<div class="blk ${d.k}" data-b="${n.id}"><div class="bh"><span class="kw">repeat</span>(<input type="number" min="1" max="99" value="${n.n}" data-f="n" data-id="${n.id}" aria-label="Iterations">) {${runs}${n.n > mx ? `<span class="tag r" title="Max repeats = your bits">capped at ${mx}: ${opts.maxLoop === bits ? 'buy bits' : 'challenge limit'}</span>` : ''}${ctl}</div>${slotHTML(n.id, 'body', n.body)}<div class="kw">}</div></div>`; }
    if (n.t === 'if') {
      const conds = opts.conds().map(c => `<option value="${c}" ${n.cond === c ? 'selected' : ''}>${condLabel[c]}</option>`).join('');
      const k = n.cond === 'changes' ? `<input type="number" min="1" max="999" value="${n.k}" data-f="k" data-id="${n.id}" aria-label="Threshold">` : '';
      return `<div class="blk ${d.k}" data-b="${n.id}"><div class="bh"><span class="kw">if</span>(<select data-f="cond" data-id="${n.id}" aria-label="Condition">${conds}</select>${k}) {${runs}${ctl}</div>${slotHTML(n.id, 'then', n.then)}<div class="else-l">} else {</div>${slotHTML(n.id, 'else', n.else)}<div class="kw">}</div></div>`;
    }
    if (n.t === 'func') return `<div class="blk ${d.k}" data-b="${n.id}"><div class="bh"><span class="kw">function</span> helper() {${runs}${ctl}</div>${slotHTML(n.id, 'body', n.body)}<div class="kw">}</div></div>`;
    if (n.t === 'each') return `<div class="blk ${d.k}" data-b="${n.id}"><div class="bh"><span class="kw">for</span> (const order of orders) {${runs}${ctl}</div>${slotHTML(n.id, 'body', n.body)}<div class="kw">}</div></div>`;
    if (n.t === 'try') return `<div class="blk ${d.k}" data-b="${n.id}"><div class="bh"><span class="kw">try</span> {${runs}${ctl}</div>${slotHTML(n.id, 'body', n.body)}<div class="else-l">} catch (err) {</div>${slotHTML(n.id, 'catch', n.catch)}<div class="kw">}</div></div>`;
    return `<div class="blk ${d.k}" data-b="${n.id}"><div class="bh"><span class="kw">${d.label}</span>${runs}${ctl}</div></div>`;
  }
  function slotHTML(pid, key, list) {
    const on = ed.target.pid === pid && ed.target.key === key;
    return `<div class="slot ${pid === 'root' ? 'root' : ''} ${on ? 'target' : ''}" data-pid="${pid}" data-key="${key}">${list.map(blockHTML).join('')}<button class="addhere" data-a="tgt" data-pid="${pid}" data-key="${key}">${on ? '▸ new blocks go here' : '+ insert here'}</button></div>`;
  }
  ed.render = () => {
    const prog = opts.get();
    if (ed.target.pid !== 'root' && !findNode(prog, ed.target.pid)) ed.target = { pid: 'root', key: 'body' };
    host.innerHTML = `<div class="fn">function tick() {</div>${slotHTML('root', 'body', prog)}<div class="fn" style="margin:6px 0 0">}</div>`;
    const pal = opts.palette;
    if (pal) pal.innerHTML = ORDER.filter(t => opts.allowed(t) !== 'hide').map(t => {
      const a = opts.allowed(t), one = t === 'func' && a && JSON.stringify(prog).includes('"t":"func"'); const btn = `<button class="pblk ${BDEF[t].k} ${a && !one ? '' : 'locked'}" data-add="${t}" ${a ? (one ? 'disabled title="Only one helper() per program"' : `title="${esc(blockTip(t, opts.env ? opts.env() : env()))}"`) : 'disabled title="Locked"'}>${a ? '' : '🔒 '}${BDEF[t].label}</button>`; return opts.info && a ? `<span class="pwrap">${btn}<button class="pinfo" data-info="${t}" aria-label="About ${BDEF[t].label}" title="What does ${BDEF[t].label} do?">i</button></span>` : btn;
    }).join('');
    opts.after && opts.after();
  };
  ed.add = t => {
    const prog = opts.get();
    if (countBlocks(prog) >= opts.max()) { opts.full && opts.full(); host.animate && host.animate([{ transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'none' }], { duration: 200 }); return; }
    const l = findList(prog, ed.target.pid, ed.target.key) || prog;
    const n = Object.assign({ id: nid() }, BDEF[t].make()); l.push(n);
    if (n.t === 'repeat' || n.t === 'func' || n.t === 'each' || n.t === 'try') ed.target = { pid: n.id, key: 'body' };
    if (n.t === 'if') ed.target = { pid: n.id, key: 'then' };
    opts.changed(); ed.render();
  };
  host.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return; const a = b.dataset.a, prog = opts.get();
    if (a === 'tgt') { ed.target = { pid: b.dataset.pid, key: b.dataset.key }; ed.render(); return; }
    if (a === 'info') { openBlockInfo(b.dataset.t); return; }
    const p = findParent(prog, b.dataset.id); if (!p) return;
    if (a === 'del') p.l.splice(p.i, 1);
    if (a === 'up' && p.i > 0) [p.l[p.i - 1], p.l[p.i]] = [p.l[p.i], p.l[p.i - 1]];
    if (a === 'down' && p.i < p.l.length - 1) [p.l[p.i + 1], p.l[p.i]] = [p.l[p.i], p.l[p.i + 1]];
    opts.changed(); ed.render();
  });
  host.addEventListener('change', e => {
    const f = e.target.dataset.f; if (!f) return; const n = findNode(opts.get(), e.target.dataset.id); if (!n) return;
    if (f === 'n') n.n = Math.max(1, Math.min(99, parseInt(e.target.value) || 1));
    if (f === 'k') n.k = Math.max(1, Math.min(999, parseInt(e.target.value) || 1));
    if (f === 'cond') n.cond = e.target.value;
    opts.changed(); ed.render();
  });
  if (opts.palette) opts.palette.addEventListener('click', e => { const inf = e.target.closest('[data-info]'); if (inf) { openBlockInfo(inf.dataset.info); return; } const b = e.target.closest('[data-add]'); if (b && !b.disabled) ed.add(b.dataset.add); });
  /* drag and drop: palette → anywhere, block → anywhere (also into repeat/if/function/for/try bodies); drop on the palette to delete */
  let drag = null, suppress = false;
  const within = (el, sel) => el && el.closest(sel);
  function startCandidate(e, info) {
    if (e.button > 0) return;
    drag = Object.assign({ x0: e.clientX, y0: e.clientY, on: false, pid: e.pointerId }, info);
    window.addEventListener('pointermove', onMove, { passive: false }); window.addEventListener('pointerup', onUp); window.addEventListener('pointercancel', onCancel);
  }
  host.addEventListener('pointerdown', e => {
    const bh = within(e.target, '.bh'); if (!bh || within(e.target, 'input,select,button')) return;
    const blk = bh.closest('[data-b]'); if (!blk || !host.contains(blk)) return;
    startCandidate(e, { id: blk.dataset.b, el: blk, label: bh.querySelector('.kw') ? bh.textContent.replace(/×\d+.*$/, '').trim() : '' });
  });
  if (opts.palette) opts.palette.addEventListener('pointerdown', e => { const b = within(e.target, '[data-add]'); if (!b || b.disabled) return; startCandidate(e, { add: b.dataset.add, el: b, label: BDEF[b.dataset.add].label }); });
  function clearMarks() { document.querySelectorAll('.dropline').forEach(x => x.remove()); host.querySelectorAll('.slot.dropin').forEach(x => x.classList.remove('dropin')); if (opts.palette) opts.palette.classList.remove('trash'); }
  function onMove(e) {
    if (!drag) return;
    if (!drag.on) {
      if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 6) return;
      drag.on = true; suppress = true;
      drag.ghost = document.createElement('div'); drag.ghost.className = 'dragghost ' + (BDEF[drag.add || (findNode(opts.get(), drag.id) || {}).t] || {}).k;
      drag.ghost.textContent = drag.add ? BDEF[drag.add].label : (drag.label || 'block').slice(0, 40); document.body.appendChild(drag.ghost);
      if (drag.id) drag.el.classList.add('dragsrc'); document.body.classList.add('dragging');
    }
    e.preventDefault();
    drag.ghost.style.transform = `translate(${e.clientX + 12}px, ${e.clientY + 8}px)`;
    if (e.clientY < 50) window.scrollBy(0, -12); else if (e.clientY > innerHeight - 50) window.scrollBy(0, 12);
    clearMarks(); drag.drop = null;
    const under = document.elementFromPoint(e.clientX, e.clientY);
    if (drag.id && opts.palette && within(under, '.palette') === opts.palette) { opts.palette.classList.add('trash'); drag.drop = { trash: true }; return; }
    let slot = under && under.closest('.slot');
    if (!slot || !host.contains(slot)) { if (under && host.contains(under)) slot = host.querySelector('.slot.root'); else return; }
    if (drag.id && drag.el.contains(slot)) return; // can't drop a block inside itself
    const kids = [...slot.children].filter(c => c.matches('[data-b]') && c !== drag.el);
    let idx = kids.findIndex(c => { const r = c.getBoundingClientRect(); return e.clientY < r.top + r.height / 2; });
    if (idx < 0) idx = kids.length;
    const line = document.createElement('div'); line.className = 'dropline';
    slot.insertBefore(line, kids[idx] || slot.querySelector(':scope > .addhere'));
    slot.classList.add('dropin');
    drag.drop = { pid: slot.dataset.pid, key: slot.dataset.key, idx };
  }
  function finish() { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onCancel); clearMarks(); document.body.classList.remove('dragging'); if (drag) { drag.ghost && drag.ghost.remove(); drag.el && drag.el.classList.remove('dragsrc'); } setTimeout(() => { suppress = false; }, 0); }
  function onCancel() { finish(); drag = null; }
  function onUp() {
    const d = drag; finish(); drag = null; if (!d || !d.on || !d.drop) return;
    const prog = opts.get();
    if (d.drop.trash) { const p = findParent(prog, d.id); if (p) { p.l.splice(p.i, 1); opts.changed(); ed.render(); } return; }
    const list = findList(prog, d.drop.pid, d.drop.key); if (!list) return;
    if (d.add) {
      if (countBlocks(prog) >= opts.max()) { opts.full && opts.full(); return; }
      if (d.add === 'func' && JSON.stringify(prog).includes('"t":"func"')) return;
      const n = Object.assign({ id: nid() }, BDEF[d.add].make()); list.splice(Math.min(d.drop.idx, list.length), 0, n);
      if (n.body) ed.target = { pid: n.id, key: n.t === 'if' ? 'then' : 'body' };
    } else {
      const p = findParent(prog, d.id); if (!p) return; const [n] = p.l.splice(p.i, 1);
      list.splice(Math.min(d.drop.idx, list.length), 0, n);
    }
    opts.changed(); ed.render();
    const el = host.querySelector(`[data-b="${d.id || ''}"]`); el && el.classList.add('flash');
  }
  host.addEventListener('click', e => { if (suppress) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
  if (opts.palette) opts.palette.addEventListener('click', e => { if (suppress) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
  ed.showRuns = counts => { host.querySelectorAll('[data-r]').forEach(s => { const c = counts[s.dataset.r] || 0; s.textContent = '×' + c; s.classList.toggle('hot', c > 0); }); };
  return ed;
}

/* code generator */
function toJS(prog, ind = 1) {
  const p = '  '.repeat(ind), K = s => `<span class="c-k">${s}</span>`, F = s => `<span class="c-f">${s}</span>`, N = s => `<span class="c-n">${s}</span>`;
  return prog.map(n => {
    if (n.t === 'repeat') { const v = 'ijklm'[Math.min(ind - 1, 4)]; return `${p}${K('for')} (${K('let')} ${v} = ${N(0)}; ${v} &lt; ${N(n.n)}; ${v}++) {\n${toJS(n.body, ind + 1)}${p}}\n`; }
    if (n.t === 'if') { const c = n.cond === 'bug' ? `bugs &gt; ${N(0)}` : n.cond === 'nobug' ? `bugs === ${N(0)}` : n.cond === 'orders' ? `orders.length &gt; ${N(0)}` : `changes &gt;= ${N(n.k)}`; return `${p}${K('if')} (${c}) {\n${toJS(n.then, ind + 1)}${p}} ${K('else')} {\n${toJS(n.else, ind + 1)}${p}}\n`; }
    if (n.t === 'commit') return `${p}${F('commit')}(); <span class="c-c">// changes++</span>\n`;
    if (n.t === 'func') return `${p}${K('function')} ${F('helper')}() {\n${toJS(n.body, ind + 1)}${p}}\n`;
    if (n.t === 'call') return `${p}${F('helper')}();\n`;
    if (n.t === 'each') return `${p}${K('for')} (${K('const')} order ${K('of')} orders) {\n${toJS(n.body, ind + 1)}${p}}\n`;
    if (n.t === 'ship') return `${p}${F('ship')}(orders.${F('shift')}());\n`;
    if (n.t === 'try') return `${p}${K('try')} {\n${toJS(n.body, ind + 1)}${p}} ${K('catch')} (err) {\n${toJS(n.catch || [], ind + 1)}${p}}\n`;
    return `${p}${F(n.t)}();\n`;
  }).join('');
}
const srcOf = prog => `${'<span class="c-k">function</span> <span class="c-f">tick</span>() {'}\n${toJS(prog) || '  <span class="c-c">// empty: add a block</span>\n'}}`;

/* ---------- UI helpers ---------- */
function toast(t) { const d = document.createElement('div'); d.textContent = t; $('toast').appendChild(d); setTimeout(() => d.remove(), 2600); }
const termLines = [];
function log(t, c = '') { const L = termLines[termLines.length - 1]; if (L && L[0] === t) L[2]++; else { termLines.push([t, c, 1]); if (termLines.length > 40) termLines.shift(); } $('term').innerHTML = termLines.map(([t, c, n]) => `<div class="${c}">${t.replace(/</g, '&lt;')}${n > 1 ? ` <b>(×${n})</b>` : ''}</div>`).join(''); $('term').scrollTop = 1e6; }
const mq = [];
function closeModal(all) { $('modal').classList.remove('on'); if (all) mq.length = 0; if (mq.length) { const a = mq.shift(); setTimeout(() => modal(...a), 120); } }
function modal(html, btns, wide) {
  if ($('modal').classList.contains('on')) { mq.push([html, btns, wide]); return; }
  $('mbox').classList.toggle('wide', !!wide);
  $('mbox').innerHTML = html + `<div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">${btns.map((b, i) => `<button class="btn ${b.cls || ''}" data-m="${i}">${b.label}</button>`).join('')}</div>`;
  $('modal').classList.add('on');
  $('mbox').querySelectorAll('[data-m]').forEach(el => el.onclick = () => { const f = btns[+el.dataset.m].fn; closeModal(); f && f(); });
  const first = $('mbox').querySelector('[data-m]'); first && first.focus({ preventScroll: true }); $('mbox').scrollTop = 0;
}
function learn(k) {
  if (!S.learned.includes(k)) S.learned.push(k);
  const c = CONCEPTS[k];
  modal(`<span class="cap">NEW CONCEPT</span><h2>${c.t}</h2><p>${c.d.replace(/`([^`]+)`/g, '<code>$1</code>')}</p><pre class="src">${c.c.replace(/</g, '&lt;')}</pre>`, [{ label: 'Got it', cls: 'pri' }]);
  renderJournal(); renderTabs();
}

/* ---------- main editor ---------- */
const mainEd = Editor($('editor'), {
  get: () => S.prog, palette: $('palette'), max: memMax, maxLoop: bits, info: true,
  allowed: t => { const nx = UNL.find(u => !S.unl[u.id] && u.show()); const peek = id => S.unl[id] ? true : nx && nx.id === id ? false : 'hide'; return ({ earn: true, repeat: S.unl.repeat, fix: S.bugsOn ? true : 'hide', if: S.bugsOn ? S.unl.if : 'hide', func: peek('func'), call: S.unl.func ? true : 'hide', each: peek('each'), ship: S.unl.each ? true : 'hide', try: peek('try'), commit: peek('commit'), deploy: S.unl.commit ? true : 'hide' })[t]; },
  conds: () => ['bug', 'nobug'].concat(S.unl.each ? ['orders'] : [], S.unl.commit ? ['changes'] : []),
  changed: () => { save(); }, full: () => toast('Out of memory! Buy more RAM or use a loop.'),
  after: () => { $('src').innerHTML = srcOf(S.prog); updateMeters(); mentor(); },
});

let lastRun = { earned: 0, ops: 0, wasted: 0, counts: {}, halted: false };
function updateMeters() {
  const e = env(), used = countBlocks(S.prog);
  $('cpuTxt').textContent = `${lastRun.ops} / ${e.cpu}`; $('cpuBar').style.width = Math.min(100, lastRun.ops / e.cpu * 100) + '%'; $('cpuBar').classList.toggle('warn', lastRun.halted);
  $('memTxt').textContent = `${used} / ${memMax()}`; $('memBar').style.width = Math.min(100, used / memMax() * 100) + '%'; $('memBar').classList.toggle('warn', used >= memMax());
  $('memLbl').textContent = `${used}/${memMax()} blocks · ${bits()} bits`;
  $('bitTxt').textContent = `${bits()} bits = repeat up to ${bits()}×`;
  if ($('bitRow').childElementCount !== bits()) $('bitRow').innerHTML = Array.from({ length: bits() }, (_, i) => `<i title="bit ${i + 1}">1</i>`).join('');
  $('tickLbl').textContent = `${tps()} ticks/s · ×${fmt(incomeMult())} income`;
}
function mentor() {
  let m;
  if (!S.prog.length && S.total < 5) m = 'Welcome! Your program is empty, so nothing runs yet. Drag an <b>earn()</b> block into your program (or click it) to start earning every tick, or type code by hand.';
  else if (S.total < 5) m = 'Your program now earns every tick, and you can still type code by hand. Drag blocks to reorder them or drop them inside other blocks.';
  else if (!S.unl.repeat) m = 'Memory is tiny: only a few blocks fit. Buy <b>repeat</b> in Concepts (right), or hit <b>Prove it</b> to earn it free.';
  else if (!has('repeat')) m = 'Drag earn() inside a repeat block. One loop does the work of many lines.';
  else if (S.bugsOn && S.st.bugs > 0 && !has('fix')) m = `Stuck on <b>${esc(S.bugList[0] ? bugTitle(S.bugList[0]) : 'a bug')}</b>. earn() pays $0 until you add <b>fix()</b> to your program.`;
  else if (S.bugsOn && !S.unl.if) m = 'fix() costs 4 ops even when nothing is broken. Unlock <b>if/else</b> so you only fix when bugs > 0.';
  else if (!S.unl.func) m = 'Your program keeps repeating the same pieces. Unlock <b>functions</b>: write a piece once, call it from anywhere.';
  else if (!has('call')) m = 'Put your "fix or earn" logic inside <b>function helper()</b>, then drop <b>helper()</b> calls wherever you need it.';
  else if (!S.unl.each) m = 'Customers want to buy from you. Unlock <b>arrays</b>: orders pile up in a list, and ship() pays 5× earn().';
  else if (!has('each')) m = `${S.st.orders || 0} orders are waiting. Drag <b>for (order of orders)</b> in and put <b>ship()</b> inside it: it runs once per order, no bits needed.`;
  else if (!S.unl.try) m = 'Every bug blocks all your income until fix() runs. Unlock <b>try/catch</b> to handle errors where they happen.';
  else if (!has('try')) m = 'Wrap small units of work in <b>try { }</b>: a bug inside is caught, that one item is lost, and nothing gets blocked.';
  else if (!S.unl.commit) m = 'Last concept before you can start a company: <b>commit/deploy</b>. Big batches pay changes², but one open bug rolls them back.';
  else m = `Save at least ${money(START_PRICE)} and found your first startup. Warning: it costs <b>everything</b> you have and your program is deleted.`;
  $('mentor').innerHTML = m;
}

/* ---------- bug catalog ---------- */
const BUGS = {
  earn: [
    ['TypeError', 'cart.total is undefined', 'checkout crashes before charging'],
    ['Off-by-one', 'loop stops at length - 1', 'the last order of every batch is never charged'],
    ['NaN', "price * qty where qty = ''", 'invoices show $NaN'],
    ['Race condition', 'two requests update one balance', 'customers get double-charged'],
    ['Null reference', 'user.address is null', 'new users cannot check out'],
    ['Retry storm', 'retry() never backs off', 'the payment API rate-limits you'],
  ],
  commit: [
    ['Merge conflict', '<<<<<<< left in config.js', 'the build fails'],
    ['Missing migration', "column 'slug' does not exist", 'every link lookup errors'],
    ['Failing test', 'expected 200, got 500', 'CI is red'],
    ['Leaked secret', 'API key committed to the repo', 'it must be rotated before release'],
    ['Typo', "improt express from 'express'", 'the server will not boot'],
  ],
};
let bugSeq = 1;
function makeBug(src) { const l = BUGS[src] || BUGS.earn, b = l[Math.floor(Math.random() * l.length)]; return { n: bugSeq++, src, name: b[0], detail: b[1], effect: b[2] }; }
const bugTitle = b => `${b.name}: ${b.detail}`;
function syncBugs() { if (!S.bugList) S.bugList = []; while (S.bugList.length < S.st.bugs) S.bugList.push(makeBug('earn')); if (S.bugList.length > S.st.bugs) S.bugList.splice(0, S.bugList.length - S.st.bugs); }
let trackerKey = '';
function renderTracker() {
  $('tracker').hidden = !S.bugsOn; if (!S.bugsOn) return;
  const key = S.bugList.map(b => b.n).join(','); if (key === trackerKey) return; trackerKey = key;
  const l = S.bugList;
  $('bugList').innerHTML = l.length ? l.slice(0, 4).map((b, i) => `<div class="bug"><b>🐛 ${esc(bugTitle(b))}</b><span>from ${b.src}() → ${esc(b.effect)}${i === 0 ? ' · next to be fixed' : ''}</span></div>`).join('') + (l.length > 4 ? `<div class="nobug">+ ${l.length - 4} more open bugs</div>` : '') : '<div class="nobug">✓ No open bugs. earn() and deploy() run normally.</div>';
}
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const has = t => JSON.stringify(S.prog).includes(`"t":"${t}"`);
/* ---------- tick ---------- */
function tick() {
  const e = env();
  lastRun = runTick(S.prog, e, S.st, Math.random);
  const gain = lastRun.earned * incomeMult();
  S.money += gain; S.total += gain;
  S.rate = S.rate * 0.8 + gain * tps() * 0.2;
  mainEd.showRuns(lastRun.counts);
  $('sEarn').textContent = money(gain); $('sBugs').textContent = S.st.bugs; $('sChg').textContent = S.st.changes; $('sOrd').textContent = S.st.orders || 0; $('ordStat').hidden = !S.unl.each; $('sWaste').textContent = lastRun.wasted;
  // bug bookkeeping: new bugs join the queue, fix() patches the oldest
  const born = lastRun.bugFrom.map(makeBug); S.bugList.push(...born);
  const fixed = S.bugList.splice(0, Math.min(lastRun.fixes, S.bugList.length)); syncBugs();
  born.forEach(b => log(`🐛 ${b.src}() introduced ${bugTitle(b)} → ${b.effect}`, 'e'));
  if (fixed.length) log(`🔧 fix() patched ${fixed.length > 2 ? fixed.length + ' bugs' : fixed.map(b => b.name).join(', ')}`, 'g');
  if (lastRun.rollbacks) log(`↩ deploy() rolled back ${lastRun.lost} changes: ${S.bugList[0] ? S.bugList[0].name : 'a bug'} was still open`, 'e');
  if (lastRun.deploys && gain > 0) log(`🚀 deployed → ${money(gain)}`, 'g');
  if (lastRun.full && !S.seen.full) { S.seen.full = 1; log(`📦 The release is full (${fmt(maxChanges())} changes). Extra commits are wasted: deploy, or buy CI pipeline for bigger releases.`, 'y'); }
  if (lastRun.caught) log(`🧯 catch handled ${lastRun.caught} error${lastRun.caught > 1 ? 's' : ''}: that work was skipped, nothing blocked`, 'y');
  if (lastRun.stack && !S.seen.stack) { S.seen.stack = 1; log('💥 RangeError: Maximum call stack size exceeded. helper() keeps calling itself, so the tick was halted.', 'e'); }
  if (lastRun.overflow > 0 && !S.seen.ovf) { S.seen.ovf = 1; log(`📦 The orders array is full (40). New orders are being lost: ship faster!`, 'y'); }
  if (lastRun.halted && !S.seen.halt) { S.seen.halt = 1; log(`⏹ CPU limit hit (${e.cpu} ops). Remaining blocks were skipped this tick.`, 'y'); }
  if (lastRun.blocked && !born.length && S.bugList[0]) log(`⏸ earn() paid $0: blocked by ${S.bugList[0].name}${has('fix') ? '' : '. Add fix()!'}`, 'y');
  renderTracker();
  if (!S.bugsOn && S.unl.repeat && S.total >= 60) { S.bugsOn = true; trackerKey = 'x'; renderTracker(); log('⚠ Your codebase grew. Bugs now appear!', 'e'); learn('bugs'); mainEd.render(); renderShop(true); }
  updateMeters(); renderTop();
}
function renderTop() {
  $('money').firstChild.nodeValue = money(S.money) + ' ';
  $('rate').textContent = (S.co ? money(S.co.rev - (S.co.credits > 0 ? 0 : S.co.upk) - (S.co.loanPay || 0)) : money(S.rate)) + '/s';
  $('money').classList.toggle('neg', S.money < 0);
  $('handVal').textContent = money(env().earnValue * incomeMult());
}
$('typeBtn').onclick = () => { const g = env().earnValue * incomeMult(); S.money += g; S.total += g; renderTop(); };

/* ---------- reveal tracking ---------- */
const shown = new Set(); let firstPaint = true;
const isNew = k => { if (shown.has(k)) return ''; shown.add(k); return firstPaint ? '' : ' new'; };
$('jourBtn').onclick = () => openLibrary();
$('courseBtn').onclick = e => { e.preventDefault(); goCourse(''); };
const anyAffordable = () => false;
function renderTabs() { const s = libSections(); $('jourN').textContent = s.reduce((a, x) => a + x.items.filter(i => i.done).length, 0) + '/' + s.reduce((a, x) => a + x.items.length, 0); }
/* ---------- shop ---------- */
let shopKey = '';
function renderShop(force) {
  const key = JSON.stringify([S.lv, S.unl, S.bugsOn, S.solved, UPG.map(u => S.money >= cost(u)), UNL.map(u => S.money >= u.price), S.money >= START_PRICE, S.total > 60]);
  if (!force && key === shopKey) return; shopKey = key;
  let nextShown = false;
  $('unlocks').innerHTML = UNL.map(u => {
    if (S.unl[u.id]) return `<div class="ur"><h3>${u.name} <span class="tag g">✓</span></h3><p>${u.d}</p></div>`;
    if (!u.show()) { if (nextShown) return ''; nextShown = true; return `<div class="ur locked"><h3>🔒 ???</h3><p>Keep progressing to reveal the next concept.</p></div>`; }
    const ch = CHALLENGES.find(c => c.id === u.ch);
    return `<div class="ur${isNew('u' + u.id)}"><h3>${u.name}</h3><div class="acts"><button class="btn vio" data-go="${u.ch}" title="Solve '${ch.title}' to unlock for free">Prove it</button><button class="btn pri" data-unl="${u.id}" ${S.money < u.price ? 'disabled' : ''}>${money(u.price)}</button></div><p>${u.d}</p></div>`;
  }).join('') + ((S.unl.try || S.total > 1e6) ? `<div class="ur big${isNew('buyst')}"><h3>🚀 Found a startup</h3><button class="btn" data-pick="1" ${S.money < START_PRICE ? 'disabled' : ''}>${S.money < START_PRICE ? 'Need ' + money(START_PRICE) : 'Choose…'}</button><p>Start small: a URL shortener, a todo app, a blog, a newsletter. Costs everything you have; your program is deleted. Unlocks system design.</p></div>` : '');
  $('upgrades').innerHTML = UPG.filter(u => u.show()).map(u => { const maxed = u.max && S.lv[u.id] >= u.max, c = cost(u); return `<div class="ur${isNew('g' + u.id)}"><h3>${u.name} <span class="lvl">lv ${S.lv[u.id]}${u.max ? '/' + u.max : ''}</span></h3>${maxed ? '<span class="tag">max</span>' : `<button class="btn" data-up="${u.id}" ${S.money < c ? 'disabled' : ''}>${money(c)}</button>`}<p>${u.d}</p></div>`; }).join('');
  renderChList();
}
function unlock(id, viaChallenge) {
  if (S.unl[id]) return; const u = UNL.find(x => x.id === id); S.unl[id] = true;
  if (id === 'commit') S.unl.deploy = true;
  if (id === 'func') S.unl.call = true;
  if (id === 'each') { S.unl.ship = true; S.st.orders = S.st.orders || 0; }
  log(`★ unlocked ${u.name}${viaChallenge ? ' (challenge)' : ''}`, 'g'); learn(u.concept); mainEd.render(); renderShop(true); renderTabs(); save();
}
document.body.addEventListener('click', e => {
  const up = e.target.closest('[data-up]'), un = e.target.closest('[data-unl]'), go = e.target.closest('[data-go]'), bs = e.target.closest('[data-buyst]'), ss = e.target.closest('[data-st]');
  if (up) { const u = UPG.find(x => x.id === up.dataset.up), c = cost(u); if (S.money >= c) { S.money -= c; S.lv[u.id]++; renderShop(true); updateMeters(); renderTop(); mainEd.render(); save(); } }
  if (un) { const u = UNL.find(x => x.id === un.dataset.unl); if (S.money >= u.price) { S.money -= u.price; unlock(u.id); } }
  if (go) openChal(go.dataset.go);
});

/* ---------- challenges ---------- */
let chEd = null, chRes = null;
const CH_CONCEPT = { c1: 'loop', c2: 'nested', c3: 'if', c4: 'vars', c7: 'func', c8: 'arrays', c9: 'trycatch' };
const chVisible = c => !c.need || (c.need === 'bugs' ? S.bugsOn : !!S.unl[c.need]);
function renderChList() {
  const vis = CHALLENGES.filter(chVisible);
  $('chCount').textContent = `${Object.keys(S.solved).length}/${CHALLENGES.length} solved`;
  $('chlist').innerHTML = vis.map(c => `<div class="ur${isNew('c' + c.id)}"><h3><span class="tag ${c.tier === 'Hard' ? 'r' : c.tier === 'Core' ? 'o' : 'g'}">${c.tier}</span>${c.title}${S.solved[c.id] ? ' <span class="tag g">✓</span>' : ''}</h3><button class="btn ${S.solved[c.id] ? '' : 'vio'}" data-go="${c.id}">${S.solved[c.id] ? 'Replay' : 'Solve'}</button><p>${c.reward.unlock ? 'Reward: free unlock' : 'Reward: ×' + c.reward.mult + ' income forever'}</p></div>`).join('') + (vis.length < CHALLENGES.length ? '<div class="ur locked"><h3>🔒 more challenges</h3><p>Unlock new concepts to reveal harder ones.</p></div>' : '');
}
function openChal(id) {
  const c = CHALLENGES.find(x => x.id === id); if (!S.chProg[c.id]) S.chProg[c.id] = [];
  $('mbox').classList.add('wide');
  $('mbox').innerHTML = `<div class="sec-h" style="margin:0"><h2>${c.title}</h2><span class="tag ${c.tier === 'Hard' ? 'r' : c.tier === 'Core' ? 'o' : 'g'}">${c.tier}</span><span style="margin-left:auto"><button class="btn" id="chClose">Close</button></span></div><p style="margin:0">${c.desc}</p>
    <div style="display:flex;flex-wrap:wrap;gap:6px"><span class="tag">CPU ${c.env.cpu} ops</span><span class="tag">max ${c.maxBlocks} blocks</span><span class="tag">loop ≤ ${c.env.maxLoop}</span>${c.env.orderRate ? `<span class="tag">+${c.env.orderRate} orders/tick · ship() pays ${money(c.env.orderValue)}</span>` : ''}${c.env.bugChance ? `<span class="tag r">bugs ${Math.round(c.env.bugChance * 100)}%</span>` : ''}${c.ticks ? `<span class="tag v">${c.ticks} ticks</span>` : ''}<span class="tag y">target ${money(c.target)}</span></div>
    <p class="lvl" style="margin:0">${c.ticks ? `Your tick() runs ${c.ticks} times in a row (counters like changes and orders carry over) and the money is added up.` : 'Your tick() runs once.'} ${c.seeds > 1 ? `Bugs are random, so this is repeated ${c.seeds} times and you need the <b>average</b> to reach the target.` : ''} CPU: blocks stop running once the ${c.env.cpu} ops are used up.</p>
    ${blockHelpHTML(c.blocks, c.env)}
    <div class="chl" style="grid-template-columns:minmax(0,1.2fr) minmax(0,1fr)"><div><div class="palette" id="chPal"></div><div class="editor" id="chEdHost"></div></div><div><pre class="src" id="chSrc"></pre><div id="chOut"></div></div></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><button class="btn pri" id="runCh">▶ Run tests (${c.seeds} run${c.seeds > 1 ? 's' : ''})</button><button class="btn" id="clrCh">Clear</button><span class="lvl" id="chMem"></span></div>`;
  $('modal').classList.add('on');
  $('chClose').onclick = () => closeModal();
  chEd = Editor($('chEdHost'), {
    get: () => S.chProg[c.id], palette: $('chPal'), env: () => c.env, max: () => c.maxBlocks, maxLoop: () => c.env.maxLoop,
    allowed: t => c.blocks.includes(t) ? true : 'hide', conds: () => ['bug', 'nobug'].concat(c.blocks.includes('each') ? ['orders'] : [], c.blocks.includes('commit') ? ['changes'] : []),
    changed: () => { chRes = null; $('chOut').innerHTML = ''; save(); }, full: () => toast(`This challenge allows only ${c.maxBlocks} blocks.`),
    after: () => { $('chSrc').innerHTML = srcOf(S.chProg[c.id]); $('chMem').textContent = `${countBlocks(S.chProg[c.id])}/${c.maxBlocks} blocks`; },
  });
  chEd.render();
  $('runCh').onclick = () => {
    const missing = (c.must || []).filter(t => !JSON.stringify(S.chProg[c.id]).includes(`"t":"${t}"`));
    if (missing.length) { $('chOut').innerHTML = `<div class="res no">✗ This challenge is about using ${missing.map(t => '<code>' + BDEF[t].label + '</code>').join(' and ')}. Add ${missing.length > 1 ? 'them' : 'it'} to your solution.</div>`; return; }
    const r = runChallenge(c, S.chProg[c.id]), ok = r.avg >= c.target;
    $('chOut').innerHTML = `<div class="res ${ok ? 'ok' : 'no'}">${ok ? '✓ Passed' : '✗ Not yet'}: average ${money(r.avg)} (worst run ${money(r.worst)}), target ${money(c.target)}${ok ? '' : c.env.bugChance ? '. Tip: look at wasted ops, and when fix() runs.' : '. Tip: count how many times earn() runs.'}</div>`;
    if (ok && !S.solved[c.id]) {
      S.solved[c.id] = true; save();
      setTimeout(() => {
        if (c.reward.unlock) unlock(c.reward.unlock, true);
        if (c.reward.mult) { S.mult *= c.reward.mult; toast(`Income ×${c.reward.mult} forever!`); if (CH_CONCEPT[c.id]) learn(CH_CONCEPT[c.id]); else closeModal(); }
        renderShop(true); save();
      }, 900);
    }
  };
  $('clrCh').onclick = () => { S.chProg[c.id] = []; chEd.render(); save(); };
}

/* ---------- phase 2: startups ---------- */
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const MIN_FOUND = START_PRICE;
const OFFERS = [
  { id: 'angel', at: 25, name: 'Angel investor', amt: 2500, eq: 0.05 },
  { id: 'pre', at: 400, name: 'Pre-seed round', amt: 15000, eq: 0.10 },
  { id: 'seed', at: 3000, name: 'Seed round', amt: 80000, eq: 0.15 },
  { id: 'a', at: 10000, name: 'Series A', amt: 300000, eq: 0.20 },
];
const SHORT = { users: 'Users', lb: 'Load balancer', app: 'App server', db: 'Database', replica: 'Replica', cache: 'Cache', cdn: 'CDN', blob: 'Blob storage', queue: 'Queue', worker: 'Worker', ws: 'WS gateway', geo: 'Geo index' };
const ICO = {
  users: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  lb: '<path d="M12 21v-9M12 12 5 5M12 12l7-7M5 9V5h4M15 5h4v4"/>',
  app: '<rect x="3" y="4" width="18" height="6" rx="2"/><rect x="3" y="14" width="18" height="6" rx="2"/><path d="M7 7h.01M7 17h.01"/>',
  db: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
  replica: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v12c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M9 12h6M12 9v6"/>',
  cache: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  cdn: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>',
  blob: '<path d="M4 8h16l-2 12H6z"/><ellipse cx="12" cy="8" rx="8" ry="2.5"/>',
  queue: '<path d="M12 3 2 8l10 5 10-5z"/><path d="M2 13l10 5 10-5"/>',
  worker: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
  ws: '<path d="M4 5h16v11H9l-5 4z"/><path d="M9 10h6"/>',
  geo: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
};
const ico = (t, s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICO[t]}</svg>`;
const repMult = () => Math.pow(1.5, S.exits || 0);
const defOf = () => STARTUPS.find(s => s.id === S.co.sid);
const TIER_EXITS = { 1: 0, 2: 1, 3: 3, 4: 5 }, TIER_TAG = ['g', 'y', 'o', 'r'];
const tierOpen = t => (S.exits || 0) >= (TIER_EXITS[t] || 0);
let testPick = false;
const foundMin = () => testPick || S.exits ? 0 : MIN_FOUND;
const acqAmt = () => Math.round((8 + 4 * S.co.mkt) * (1 + 0.5 * S.exits));
const CREDITS = 2000;
const wallet = () => S.money + (S.co ? S.co.credits || 0 : 0);
function spendCloud(p) { const c = Math.min(S.co.credits || 0, p); S.co.credits = (S.co.credits || 0) - c; S.money -= p - c; }
const mktRate = () => S.co.mkt * (S.co.mkt + 1) * 0.25 * (1 + 0.5 * S.exits);
const mktCost = () => Math.ceil(200 * Math.pow(2.2, S.co.mkt));
const refCost = () => Math.ceil(1000 * Math.pow(2.6, S.co.ref));
const upCost = n => Math.ceil(COMP[n.type].cost * Math.pow(2, (n.lvl || 0) + 1));
const valuation = () => S.co.users * 30 * repMult() * (1 - S.co.equity);
const ACQ_CD = 4000;
const LOAN = { fee: 0.4, share: 0.25, term: 300, grace: 15 };
const loanLimit = () => Math.max(2000, Math.floor((S.co.rev || 0) * 120 / 500) * 500);
function takeLoan(frac) {
  const co = S.co; if (co.loan) return; const amt = Math.max(500, Math.floor(loanLimit() * frac / 100 / 100) * 100);
  co.loan = { principal: amt, owed: Math.round(amt * (1 + LOAN.fee)), left: LOAN.term }; S.money += amt;
  if (!S.learned.includes('debt')) learn('debt');
  toast(`🏦 Borrowed ${money(amt)}. You owe ${money(co.loan.owed)}.`); coKey = ''; renderCompany(); renderTop();
}
function repayLoan() { const co = S.co, l = co.loan; if (!l) return; const pay = Math.min(Math.max(0, S.money), l.owed); if (pay <= 0) return; S.money -= pay; l.owed -= pay; if (l.owed < 0.5) { co.loan = null; toast('🏦 Loan fully repaid.'); } coKey = ''; renderCompany(); renderTop(); }
function bankrupt() {
  const co = S.co, d = defOf(); S.co = null; S.phase = 'code'; S.money = 0; sel = null; undoStack.length = 0; stepView = (S.exits || 0) > 0 ? 'startup' : 'code';
  setPhase(); shopKey = ''; renderShop(true); mainEd.render(); save();
  modal(`<span class="cap">BANKRUPT</span><h2>${d.name} ran out of money</h2><p>Your balance stayed below $0 for ${LOAN.grace} seconds. ${co.loan ? `The bank wrote off the ${money(co.loan.owed)} you still owed, but the company is gone.` : 'The company is gone.'}</p><p>You're back to freelancing: your upgrades and concepts are kept, but your program is empty. Rebuild it, save up and found again. Watch the <b>cloud bill</b> and keep a runway.</p>`, [{ label: 'Back to coding', cls: 'pri' }]);
}
let SIM = null, sel = null;

let stepView = null;
const startupOpen = () => !!S.co || S.phase === 'pick' || (S.exits || 0) > 0 || (S.founded || []).length > 0;
function renderSteps() {
  const sv = stepView, codeDone = startupOpen();
  $('steps').innerHTML = `<button class="step ${sv === 'code' ? 'on' : ''} ${codeDone ? 'done' : ''}" data-step="code"><b>${codeDone ? '✓' : '1'}</b><span>Code</span></button><i class="step-sep"></i><button class="step ${sv === 'startup' ? 'on' : ''}" data-step="startup" ${codeDone ? '' : 'disabled title="Found a startup to unlock"'}><b>${codeDone ? '2' : '🔒'}</b><span>Startup</span></button>`;
}
function goStep(s) { stepView = s; setPhase(); window.scrollTo({ top: 0 }); }
function renderCodeDone() {
  const codeK = LIB_CODE.filter(k => S.learned.includes(k)), solved = CHALLENGES.filter(c => S.solved[c.id]);
  $('codeDoneBody').innerHTML = `<span class="cap">STEP 1 · COMPLETE</span><h2>You shipped your way out of coding</h2><p>When you founded a startup your program was deleted: there's no time for side projects now. Everything you learned is kept, and the challenges stay open for practice.</p>
    <div class="done-grid">${LIB_CODE.map(k => `<div class="ur" style="border:1px solid var(--line2);border-radius:10px;padding:10px"><h3>${S.learned.includes(k) ? '✓' : '·'} ${CONCEPTS[k].t}</h3><button class="btn" data-libopen="x:${k}">Review</button></div>`).join('')}</div>
    <div class="sec-h" style="margin:6px 0 0"><h2 style="font-size:15px">Challenges</h2><span>${solved.length}/${CHALLENGES.length} solved · replay any time</span></div>
    <div class="done-grid">${CHALLENGES.map(c => `<div class="ur" style="border:1px solid var(--line2);border-radius:10px;padding:10px"><h3><span class="tag ${c.tier === 'Hard' ? 'r' : c.tier === 'Core' ? 'o' : 'g'}">${c.tier}</span> ${c.title} ${S.solved[c.id] ? '<span class="tag g">✓</span>' : ''}</h3><button class="btn vio" data-go="${c.id}">${S.solved[c.id] ? 'Replay' : 'Solve'}</button></div>`).join('')}</div>
    <div><button class="btn big pri" data-step="startup">Go to your startup →</button></div>${coffeeNote('Learning something? Help keep ship_it() free.')}`;
}
function setPhase() {
  if (!stepView || (stepView === 'startup' && !startupOpen())) stepView = startupOpen() ? 'startup' : 'code';
  const p = stepView === 'code' ? (startupOpen() ? 'done' : 'code') : S.co ? 'company' : 'pick';
  $('codeArea').hidden = p !== 'code'; $('codeDone').hidden = p !== 'done'; $('company').hidden = p !== 'company'; $('picker').hidden = p !== 'pick';
  renderSteps(); if (p === 'done') renderCodeDone();
  if (p === 'pick') renderPicker();
  if (p === 'company') { SIM = simulate(S.co, defOf()); setPane(pane); buildCanvas(); coKey = ''; $('coStudy').dataset.k = ''; $('coProblems').dataset.k = ''; renderCompany(); }
}

/* picker */
function pickerHTML() {
  return STARTUPS.map(s => {
    const open = testPick || tierOpen(s.tier), done = (S.founded || []).includes(s.id);
    return `<div class="pick ${open ? '' : 'locked'}"><div class="pick-h"><span class="tag ${TIER_TAG[s.tier - 1]}">Tier ${s.tier}</span>${done ? '<span class="tag g">✓ exited</span>' : ''}</div><h3>${s.name}</h3><div class="lvl">${s.style}</div><p>${s.blurb}</p><div class="mix">${s.classes.map(c => `<span class="tag">${c.label} ${Math.round(c.share * 100)}%</span>`).join('')}</div><div class="foot"><span class="lvl">Goal: ${fmt(s.goal)} users</span>${open ? `<button class="btn pri" data-found="${s.id}" ${S.money < foundMin() ? 'disabled' : ''}>Found it</button>` : `<span class="tag">🔒 ${TIER_EXITS[s.tier]} exit${TIER_EXITS[s.tier] > 1 ? 's' : ''}</span>`}</div></div>`;
  }).join('');
}
function renderPicker() { $('pickGrid').innerHTML = pickerHTML(); $('pickInfo').innerHTML = `You have <b>${money(S.money)}</b> and ${S.exits} exit${S.exits === 1 ? '' : 's'} (revenue ×${fmt(repMult())}). Founding costs everything you have.`; }
function openPicker(test) {
  testPick = !!test;
  modal(`<span class="cap">${test ? '🧪 TEST MODE · ALL STARTUPS UNLOCKED · FREE' : 'FOUND A STARTUP'}</span><h2>Pick your system design problem</h2><p>Founding costs <b>everything you have</b> (${money(S.money)}). There's no time for side projects: <b>your program is deleted</b> and code income stops. You start with zero users, one free app server and one free database.</p><div class="pgrid">${pickerHTML()}</div>`, [{ label: 'Not yet', fn: () => { testPick = false; } }], true);
}
function found(id) {
  const s = STARTUPS.find(x => x.id === id); if (!s || !(testPick || tierOpen(s.tier)) || S.money < foundMin()) return;
  if (testPick) toast('🧪 Test mode: founded for free.');
  closeModal(true);
  undoStack.length = 0; S.money = 0; S.prog = []; S.st = { bugs: 0, changes: 0, orders: 0 }; S.bugList = []; S.rate = 0; S.phase = 'company';
  S.co = { sid: id, users: 0, nodes: [{ id: 'users', type: 'users', x: 16, y: 200, lvl: 0 }], edges: [], seq: 1, free: { app: true, db: true }, credits: CREDITS, mkt: 0, ref: 0, cd: 0, offers: {}, equity: 0, done: false, rev: 0, upk: 0, churn: 0, growth: 0 };
  testPick = false; sel = null; stepView = 'startup'; setPhase(); learn('founding'); save();
  window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
}

/* ---------- study mode ---------- */
const STUDY = {
  users: { what: 'The people using your product: browsers and mobile apps sending requests over the internet.', when: 'Always there. Every request starts here, and every design decision is about serving them quickly and reliably.', watch: 'Traffic is not flat: launches, viral posts and time zones create spikes.', real: 'Clients speak HTTP(S) or WebSockets, usually through DNS that points at your public entry point.', where: 'The edge of your system: nothing is in front of them.' },
  lb: { what: 'Distributes incoming requests across a pool of identical servers (round robin, least connections…).', when: 'As soon as one server is not enough, or you need to survive a server dying. It is what makes horizontal scaling possible.', watch: 'Only works if servers are stateless: any server must be able to handle any request. Session data belongs in a shared store.', real: 'Nginx, HAProxy, AWS ALB/ELB, Cloudflare.', where: 'At the front door, before a group of servers that all do the same job.' },
  app: { what: 'Runs your application code: authentication, business logic, building responses.', when: 'Any request that needs logic. It is the brain, but it should not store data itself.', watch: 'Has a hard limit on requests per second. Shoveling big files through it wastes that capacity.', real: 'A Node, Go, Java or Python service on a VM, container or serverless function.', where: 'In the middle: behind the entry point, in front of the data.' },
  db: { what: 'The source of truth. Stores structured data durably with indexes and transactions (SQL).', when: 'Users, posts, likes, orders: anything you cannot lose and need to query.', watch: 'Usually the first bottleneck. Writes are expensive (durable to disk, indexes updated) and can only go to the primary.', real: 'PostgreSQL, MySQL, Aurora.', where: 'At the back, behind the code that asks it questions.' },
  replica: { what: 'A read-only copy of the database that is kept in sync automatically.', when: 'Read traffic is too much for one database, even after caching.', watch: 'Replication lag: a replica can be milliseconds to seconds behind, so a user may not see their own write. It never accepts writes, and it needs a primary to copy from.', real: 'Postgres streaming replication, MySQL replicas, Aurora readers.', where: 'Next to the primary database, which feeds it.' },
  cache: { what: 'Keeps frequently read data in memory so it can be returned without touching the database.', when: 'Read-heavy data that is requested over and over: timelines, profiles, catalogs.', watch: 'Stale data. When the source changes, the cached copy must be invalidated or expire. Writes still need the database.', real: 'Redis, Memcached. Pattern: cache-aside (check cache, on miss read DB and fill cache).', where: 'Between your code and the database, on the read path.' },
  cdn: { what: 'A network of servers around the world that keeps copies of static content close to users.', when: 'Images, audio, video, JS/CSS: big files that many people download.', watch: 'Best for content that rarely changes. Private or per-user files need signed URLs or bypass it.', real: 'Cloudflare, Akamai, CloudFront, Fastly.', where: 'At the very edge, between users and wherever the files are stored.' },
  blob: { what: 'Object storage for large binary files, addressed by a key, practically unlimited in size.', when: 'Photos, documents, audio, video, backups. The database stores only the metadata (name, owner, key).', watch: 'Not a database: no queries or joins. Reads from far away are slow without a CDN.', real: 'Amazon S3, Google Cloud Storage, Azure Blob.', where: 'At the back, wherever files need to be stored or fetched.' },
  queue: { what: 'A buffer that accepts jobs or messages instantly and hands them out later. Also works as a pub/sub broker.', when: 'Work that should not make the user wait (fan-out, emails, transcoding), smoothing traffic spikes, or delivering messages.', watch: 'Work becomes asynchronous: results arrive later. If consumers are too slow, the backlog grows.', real: 'Kafka, RabbitMQ, SQS, Redis Streams, NATS.', where: 'Between whoever produces work and whoever processes it.' },
  worker: { what: 'A background process that pulls jobs and does the slow work.', when: 'Anything that can finish after the response is sent: fan-out to followers, video encoding, syncing devices, ride matching.', watch: 'Needs something feeding it jobs. Scale workers to keep the backlog (and the delay) low.', real: 'Sidekiq, Celery, BullMQ, Kubernetes jobs, Lambda consumers.', where: 'Behind the thing that holds pending jobs.' },
  ws: { what: 'Holds long-lived WebSocket connections so the server can push data the moment it exists.', when: 'Chat, presence, live notifications, multiplayer: anything that must feel instant.', watch: 'Every connected user holds a connection open. Without it, clients poll ("anything new?") many times a second.', real: 'Socket.IO servers, AWS API Gateway WebSockets, Phoenix Channels.', where: 'At the entry, for the realtime traffic, connected to whatever distributes messages.' },
  geo: { what: 'A spatial index that answers "what is near this point?" quickly and absorbs constant location updates.', when: 'Maps, ride hailing, delivery, "near me" search.', watch: 'A normal database scans badly for distance queries and drowns in location writes.', real: 'Redis GEO, PostGIS, geohashes, quadtrees, Uber H3.', where: 'Next to your application logic, as a specialized store.' },
};
const KIND_STUDY = {
  read: 'Reading data that changes rarely. Usually far more common than writes, and the same items are read again and again.',
  write: 'Changing data. It must end up durably in the source of truth, and it cannot be served from a copy.',
  media: 'Large files (images, audio, video) downloaded many times. Size, not logic, is the cost.',
  upload: 'Users sending or fetching large files. They need storage built for files, not rows.',
  async: 'Work that can finish later: the user should not wait for it. It needs something to hold it and something to do it.',
  realtime: 'Messages that must reach other connected users instantly. Asking "anything new?" over and over is expensive.',
  geo: 'A constant stream of location updates plus "who is near me?" queries.',
};
let studyFocus = null; // {type} or {node}
function studyCard(t) {
  const c = STUDY[t]; if (!c) return '';
  return `<div class="study-card"><div style="display:flex;gap:8px;align-items:center"><span class="pi nt-${t}">${ico(t, 16)}</span><h3>${COMP[t].name}</h3>${COMP[t].cost ? `<span class="lvl">${money(COMP[t].cost)} · ${fmt(COMP[t].cap)}/s</span>` : ''}</div>
    <dl><dt>What it is</dt><dd>${c.what}</dd><dt>Use it when</dt><dd>${c.when}</dd><dt>Watch out</dt><dd>${c.watch}</dd><dt>Where it lives</dt><dd>${c.where}</dd><dt>In the real world</dt><dd>${c.real}</dd></dl></div>`;
}
function studyBrief() {
  const d = defOf();
  return `<div class="study-card"><h3>What does ${d.name} need?</h3><p class="lvl" style="margin:2px 0 8px">${d.blurb}</p>${d.classes.map(c => `<div class="kind"><b>${c.label} <span class="lvl">${Math.round(c.share * 100)}%</span></b><span>${KIND_STUDY[c.kind]}</span></div>`).join('')}<p class="lvl" style="margin:8px 0 0">Hover a component on the left, or select one on the canvas, to study it.</p></div>`;
}
function renderStudy() {
  const box = $('coStudy'); if (!box) return;
  $('studyBtn').classList.toggle('on', !!S.study); $('studyBtn').setAttribute('aria-pressed', !!S.study);
  if (!S.study || !S.co) return;
  const t = studyFocus || (sel && sel.kind === 'node' && nodeById(sel.id) ? nodeById(sel.id).type : null);
  const addBtn = t && studyFocus && t !== 'users' ? (() => { const free = (t === 'app' || t === 'db') && S.co.free[t], p = free ? 0 : COMP[t].cost; return `<button class="btn pri" data-addcomp="${t}" ${wallet() < p ? 'disabled' : ''} style="width:100%;margin:0 0 10px">＋ Add to canvas · ${free ? 'free' : money(p)}</button>`; })() : '';
  const html = `<div class="sec-h" style="margin:0 0 8px;flex-wrap:wrap"><h2 style="font-size:14px">📖 Study</h2>${t ? '<button class="btn" id="studyBack" style="min-height:28px;padding:0 8px">Traffic needs</button>' : ''}<button class="btn" data-libopen="${t ? 'c:' + t : 'k:read'}" style="min-height:28px;padding:0 8px">Library</button></div>` + (t ? addBtn + studyCard(t) : studyBrief());
  if (box.dataset.k !== (t || 'brief') + S.co.sid + (wallet() >= (t ? COMP[t].cost : 0))) { box.innerHTML = html; box.dataset.k = (t || 'brief') + S.co.sid + (wallet() >= (t ? COMP[t].cost : 0)); const sp = box.closest('.spane'); if (sp) sp.scrollTop = 0; const b = $('studyBack'); if (b) b.onclick = () => { studyFocus = null; document.querySelectorAll('.pal').forEach(p => p.classList.remove('picked')); if (sel && sel.kind === 'node') sel = null; drawNodes(); renderStudy(); renderInspector(); }; }
}
function openStudy(t) { openLibrary('c:' + t); }

/* ---------- library ---------- */
const KIND_NAME = { read: 'Reads', write: 'Writes', media: 'Media downloads', upload: 'File uploads & downloads', async: 'Background jobs', realtime: 'Realtime messages', geo: 'Location data' };
const LIB_CODE = ['statement', 'loop', 'nested', 'bugs', 'if', 'func', 'arrays', 'trycatch', 'vars'], LIB_BIZ = ['founding', 'bottleneck', 'vertical', 'viral', 'debt', 'runway'];
const LIB_THINK = {
  read: 'How often is the same item read? Does it change often? Can a slightly stale copy be served?',
  write: 'Where is the single source of truth? What happens if two writes arrive at once?',
  media: 'How large is each file, and how far is the user from where it is stored?',
  upload: 'Should these bytes really pass through the machines that run your business logic?',
  async: 'Does the user need the result right now, or just confirmation that it will happen?',
  realtime: 'How does the receiver find out a message exists: by asking repeatedly, or by being told?',
  geo: 'How would you find "everything within 2 km" without checking every row?',
};
// which course lessons go deeper on each topic (t:day:index, x:deep-dive id)
const LINKS = {
  'c:users': ['t:2:0', 't:1:1', 't:2:2', 't:2:4'], 'c:lb': ['t:3:1', 't:3:0', 't:3:3', 't:3:4'], 'c:app': ['t:3:0', 't:2:1', 't:2:3', 't:2:4', 'x:microservices', 'x:concurrency'],
  'c:db': ['t:4:0', 't:4:1', 't:4:2', 't:4:3', 't:4:4', 't:5:1', 'x:specialdb'], 'c:replica': ['t:5:0', 't:5:2', 't:5:3'], 'c:cache': ['t:6:0', 't:6:1', 't:6:2', 't:6:3'],
  'c:cdn': ['t:3:2', 't:10:4'], 'c:blob': ['t:9:1', 't:9:2'], 'c:queue': ['t:7:0', 't:7:1', 't:7:2'], 'c:worker': ['t:7:0', 't:7:4', 't:7:3', 't:10:2'],
  'c:ws': ['t:2:2', 't:10:1', 't:12:2'], 'c:geo': ['t:10:3', 'x:specialdb'],
  'k:read': ['t:6:0', 't:4:1', 't:5:0'], 'k:write': ['t:4:2', 't:2:3', 't:5:4'], 'k:media': ['t:3:2', 't:10:4'], 'k:upload': ['t:9:1'], 'k:async': ['t:7:0', 't:7:2'], 'k:realtime': ['t:2:2', 't:10:1'], 'k:geo': ['t:10:3'],
  's:shortly': ['t:6:0', 't:6:1'], 's:tickit': ['t:3:0', 't:4:2'], 's:inkwell': ['t:3:2', 't:10:4'], 's:mailblast': ['t:7:0', 't:7:2'], 's:snapshelf': ['t:9:1', 't:3:2'], 's:snipbin': ['t:5:0', 't:5:2'],
  's:chirp': ['t:10:0', 't:6:1', 't:7:0'], 's:pixgram': ['t:10:0', 't:9:1', 't:3:2'], 's:drivebox': ['t:9:1', 't:5:3', 't:4:0'], 's:wavelength': ['t:10:4', 't:3:2', 'x:ai-recsys'],
  's:textr': ['t:10:1', 't:10:2', 't:7:2'], 's:guildhall': ['t:10:1', 't:2:2', 't:5:1'], 's:streamflix': ['t:10:4', 't:7:4', 't:3:2'], 's:ryde': ['t:10:3', 'x:payments', 'x:locks'],
  'x:bottleneck': ['t:1:3', 't:1:1'], 'x:vertical': ['t:3:0', 't:3:4'], 'x:founding': ['t:1:0', 't:1:1', 't:14:1'], 'x:runway': ['t:3:4'], 'x:viral': ['t:9:4'],
  'x:vars': ['x:concurrency'], 'x:bugs': ['x:release'],
};
const DAY_OF = { 'c:users': 2, 'c:lb': 3, 'c:app': 3, 'c:db': 4, 'c:replica': 5, 'c:cache': 6, 'c:cdn': 3, 'c:blob': 9, 'c:queue': 7, 'c:worker': 7, 'c:ws': 10, 'c:geo': 10, 'k:read': 6, 'k:write': 4, 'k:async': 7, 'k:realtime': 10, 'k:media': 3, 'k:upload': 9, 'k:geo': 10, 'x:bottleneck': 1, 'x:vertical': 3, 'x:founding': 1 };
const SCENE_T = Object.fromEntries(Object.entries(window.SCENE_NAMES || {}).map(([k, v]) => [k, v[0]]));
const SCENES_OF = { 'c:users': ['web-request', 'capacity-math'], 'c:lb': ['lb-health', 'stateless', 'scale-journey'], 'c:app': ['stateless', 'scale-journey', 'circuit-breaker'], 'c:db': ['sharding', 'replication'], 'c:replica': ['replication'], 'c:cache': ['cache-aside', 'write-back', 'stampede'], 'c:cdn': ['cdn-flow'], 'c:queue': ['queue-flow', 'pubsub'], 'c:worker': ['queue-flow'], 'c:ws': ['chat-system', 'pubsub'], 'k:read': ['cache-aside'], 'k:write': ['idempotency'], 'k:media': ['cdn-flow'], 'k:async': ['queue-flow'], 'k:realtime': ['chat-system'], 's:shortly': ['cache-aside'], 's:tickit': ['scale-journey'], 's:inkwell': ['cdn-flow'], 's:mailblast': ['queue-flow'], 's:snapshelf': ['cdn-flow'], 's:snipbin': ['replication'], 's:chirp': ['feed-fanout'], 's:textr': ['chat-system'], 's:guildhall': ['chat-system', 'pubsub'], 's:pixgram': ['feed-fanout', 'cdn-flow'], 's:wavelength': ['cdn-flow'], 's:streamflix': ['cdn-flow', 'queue-flow'], 'x:bottleneck': ['capacity-math'], 'x:vertical': ['scale-journey'], 'x:founding': ['capacity-math', 'web-request'], 'x:runway': ['capacity-math'] };
const scenesBlock = id => EMBED && SCENES_OF[id] ? `<div class="lib-sec"><span class="cap">▶ ANIMATED LESSONS IN THE COURSE</span><div class="pacts">${SCENES_OF[id].map(s => `<button class="hbtn lbtn" data-course="s:${s}">▶ ${SCENE_T[s] || s}</button>`).join('')}</div></div>` : '';
const lessonRef = ref => { const p = ref.split(':'); if (p[0] === 't') { const d = COURSE.days[+p[1] - 1], l = d && d.lessons[+p[2]]; return l && { ref, title: l.title, min: l.min, body: l.body, from: `Day ${d.n} · ${d.title}` }; } const x = COURSE.extra.find(e => e.id === p[1]); return x && { ref, title: x.title, min: x.min, body: x.body, from: 'Deep dive' }; };
const md = s => s.replace(/`([^`]+)`/g, '<code>$1</code>');
const mdx = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\*([^*\s][^*]*)\*/g, '<em>$1</em>');
function renderBody(body) {
  return body.map(b => {
    if (typeof b === 'string') return `<p>${mdx(b)}</p>`;
    if (b.h) return `<h4>${mdx(b.h)}</h4>`;
    if (b.ul) return `<ul>${b.ul.map(i => `<li>${mdx(i)}</li>`).join('')}</ul>`;
    if (b.ol) return `<ol>${b.ol.map(i => `<li>${mdx(i)}</li>`).join('')}</ol>`;
    if (b.code) return `<pre class="src" style="min-height:0">${esc(b.code)}</pre>`;
    if (b.table) return `<div class="scroll"><table class="ltab"><thead><tr>${b.table.head.map(h => `<th>${mdx(h)}</th>`).join('')}</tr></thead><tbody>${b.table.rows.map(r => `<tr>${r.map(c => `<td>${mdx(String(c))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    if (b.say) return `<div class="callout say"><b>Say it in the interview</b>${mdx(b.say)}</div>`;
    if (b.tip) return `<div class="callout tip"><b>Tip</b>${mdx(b.tip)}</div>`;
    if (b.warn) return `<div class="callout warn"><b>Common mistake</b>${mdx(b.warn)}</div>`;
    return '';
  }).join('');
}
function lessonsBlock(id) {
  const ls = (LINKS[id] || []).map(lessonRef).filter(Boolean); if (!ls.length) return '';
  return `<div class="lib-sec"><span class="cap">DEEP DIVE IN THE COURSE · ${ls.length} LESSON${ls.length > 1 ? 'S' : ''}</span><div class="deeps">${ls.map(l => `<button class="deeplink" data-course="${l.ref}"><span><b>${esc(l.title)}</b><span class="lvl">${esc(l.from)}${l.min ? ' · ' + l.min + ' min' : ''}</span></span><span aria-hidden="true">↗</span></button>`).join('')}</div></div>`;
}
function dayExtras(n, label) {
  const d = COURSE.days[n - 1]; if (!d) return '';
  return `${d.cheat.length ? `<div class="lib-sec"><span class="cap">CHEAT SHEET · ${label || 'DAY ' + n}</span><ul class="cheat">${d.cheat.map(c => `<li>${mdx(c)}</li>`).join('')}</ul></div>` : ''}
    ${d.cards.length ? `<div class="lib-sec"><span class="cap">FLASHCARDS · TAP TO FLIP</span><div class="cards">${d.cards.map(([q, a]) => `<details class="fcard"><summary>${mdx(q)}</summary><div>${mdx(a)}</div></details>`).join('')}</div></div>` : ''}
    ${d.quiz.length ? `<div class="lib-sec"><span class="cap">QUICK CHECK · ${d.quiz.length} QUESTIONS</span>${d.quiz.map((q, qi) => `<div class="quiz" data-day="${n}" data-qi="${qi}"><p><b>${qi + 1}.</b> ${mdx(q.q)}</p><div class="qopts">${q.opts.map((o, oi) => `<button class="qopt" data-opt="${oi}">${mdx(o)}</button>`).join('')}</div><div class="qwhy" hidden></div></div>`).join('')}</div>` : ''}`;
}
function libSections() {
  const learned = k => S.learned.includes(k);
  return [
    { sec: 'Components', items: ['users', ...PALETTE].map(t => ({ id: 'c:' + t, name: COMP[t].name, t, done: t === 'users' || learned(COMP[t].concept) })) },
    { sec: 'Traffic types', items: Object.keys(KIND_STUDY).map(k => ({ id: 'k:' + k, name: KIND_NAME[k], done: (S.founded || []).length > 0 || !!S.co })) },
    { sec: 'Startups', items: STARTUPS.map(s => ({ id: 's:' + s.id, name: s.name, sub: s.style.replace(/-style.*/, ''), done: (S.founded || []).includes(s.id) || (S.co && S.co.sid === s.id) })) },
    { sec: 'Code', items: LIB_CODE.map(k => ({ id: 'x:' + k, name: CONCEPTS[k].t, done: learned(k) })) },
    { sec: 'Systems & business', items: LIB_BIZ.map(k => ({ id: 'x:' + k, name: CONCEPTS[k].t, done: learned(k) })) },
    { sec: 'Go deeper in the course', items: [['go:#plan', '📅 The 14-day plan'], ['go:#learn', '▶ Animated lessons'], ['go:#labs', '🧪 Design Lab'], ['go:#ex', '🎯 Interview exercises'], ['go:#review', '🗂 Review & flashcards']].map(([id, name]) => ({ id, name, ext: true })) },
  ];
}
function libDetail(id) {
  const [kind, key, sub] = id.split(':');
  if (kind === 'c') {
    const cc = COMP[key].concept && CONCEPTS[COMP[key].concept];
    return studyCard(key) + scenesBlock(id) + (cc ? `<div class="lib-sec"><span class="cap">CONCEPT · ${cc.t.toUpperCase()}</span><p>${md(cc.d)}</p><pre class="src" style="min-height:0">${esc(cc.c)}</pre></div>` : '') + lessonsBlock(id) + dayExtras(DAY_OF[id]);
  }
  if (kind === 'k') {
    const users = STARTUPS.filter(s => s.classes.some(c => c.kind === key));
    return `<div class="study-card"><h3>${KIND_NAME[key]}</h3><p style="margin:8px 0">${KIND_STUDY[key]}</p><dl><dt>Think about</dt><dd>${LIB_THINK[key]}</dd><dt>Appears in</dt><dd>${users.map(s => `<a href="#" data-libgo="s:${s.id}">${s.name}</a> <span class="lvl">(${s.style})</span>: ${s.classes.filter(c => c.kind === key).map(c => `${c.label} ${Math.round(c.share * 100)}%`).join(', ')}`).join('<br>')}</dd></dl></div>` + scenesBlock(id) + lessonsBlock(id) + dayExtras(DAY_OF[id]);
  }
  if (kind === 's') {
    const s = STARTUPS.find(x => x.id === key);
    return `<div class="study-card"><span class="tag ${TIER_TAG[s.tier - 1]}">Tier ${s.tier}</span><h3 style="margin-top:6px">${s.name}</h3><div class="lvl">${s.style} · goal ${fmt(s.goal)} users</div><p style="margin:8px 0">${s.blurb}</p><dl><dt>Traffic mix</dt><dd>${s.classes.map(c => `<a href="#" data-libgo="k:${c.kind}">${c.label}</a> ${Math.round(c.share * 100)}% <span class="lvl">(${KIND_NAME[c.kind].toLowerCase()})</span>`).join('<br>')}</dd><dt>Before you build</dt><dd>Estimate it first: at ${fmt(s.goal)} users and ${RPS_PER_USER} requests/s each, that is ${fmt(s.goal * RPS_PER_USER)} requests/s at the goal. Which share of that is reads, writes, files or realtime, and what is the slowest part of each path?</dd></dl></div>` + scenesBlock(id) + lessonsBlock(id);
  }
  if (kind === 'd') {
    const d = COURSE.days[+key - 1]; markRead(id);
    return `<div class="study-card"><span class="cap">DAY ${d.n} OF 14</span><h3 style="margin-top:4px">${esc(d.title)}</h3>${EMBED ? `<button class="hbtn lbtn" data-coursehash="#plan-${d.n}" style="margin-top:8px">Open Day ${d.n} in the course ↗</button>` : ''}<p style="margin:6px 0">${mdx(d.tagline || '')}</p>${d.goals.length ? `<dl><dt>By the end you can</dt><dd><ul>${d.goals.map(g => `<li>${mdx(g)}</li>`).join('')}</ul></dd></dl>` : ''}</div>
      <div class="lib-sec"><span class="cap">LESSONS</span>${d.lessons.map((l, i) => `<details class="lesson"${i === 0 ? ' open' : ''}><summary><span>${i + 1}. ${esc(l.title)}</span><span class="lvl">${l.min ? l.min + ' min' : ''}</span></summary><div class="lbody">${renderBody(l.body)}</div></details>`).join('')}</div>` + dayExtras(d.n, 'DAY ' + d.n);
  }
  if (kind === 'l') {
    const l = lessonRef(id.slice(2)); markRead(id);
    return l ? `<div class="study-card"><span class="cap">${esc(l.from).toUpperCase()}${l.min ? ' · ' + l.min + ' MIN' : ''}</span><h3 style="margin-top:4px">${esc(l.title)}</h3>${EMBED ? `<button class="hbtn lbtn" data-course="${l.ref}" style="margin-top:8px">Open in the course ↗</button>` : ''}</div><div class="lib-sec lbody">${renderBody(l.body)}</div>` : '';
  }
  const c = CONCEPTS[key];
  return `<div class="study-card"><h3>${c.t}</h3><p style="margin:8px 0">${md(c.d)}</p><pre class="src" style="min-height:0">${esc(c.c)}</pre></div>` + scenesBlock(id) + lessonsBlock(id) + (DAY_OF[id] ? dayExtras(DAY_OF[id]) : '');
}
function markRead(id) { S.read = S.read || {}; if (!S.read[id]) { S.read[id] = 1; save(); } }
// full-text search over everything in the library
let libIndex = null;
const plain = body => body.map(b => typeof b === 'string' ? b : b.h || (b.ul || b.ol || []).join(' ') || b.code || b.say || b.tip || b.warn || (b.table ? [b.table.head, ...b.table.rows].flat().join(' ') : '')).join(' ');
function buildIndex() {
  libIndex = [];
  libSections().forEach(s => s.items.forEach(i => libIndex.push({ id: i.id, name: i.name, sec: s.sec, text: (i.name + ' ' + (i.id.startsWith('c:') ? Object.values(STUDY[i.id.slice(2)] || {}).join(' ') : '')).toLowerCase() })));
  COURSE.days.forEach(d => d.lessons.forEach((l, li) => libIndex.push({ id: `l:t:${d.n}:${li}`, name: l.title, sec: `Day ${d.n}`, text: (l.title + ' ' + plain(l.body)).toLowerCase() })));
  COURSE.extra.forEach(x => { const e = libIndex.find(i => i.id === 'l:x:' + x.id); if (e) e.text += ' ' + plain(x.body).toLowerCase(); });
}
let libCur = 'c:lb', libQ = '';
function libNavHTML() {
  if (libQ.trim().length >= 2) {
    if (!libIndex) buildIndex();
    const q = libQ.trim().toLowerCase(), hits = libIndex.filter(i => i.text.includes(q)).sort((a, b) => (b.name.toLowerCase().includes(q) ? 1 : 0) - (a.name.toLowerCase().includes(q) ? 1 : 0)).slice(0, 60);
    return `<div class="cap" style="margin:8px 0 4px">${hits.length} RESULT${hits.length === 1 ? '' : 'S'}</div>` + (hits.length ? hits.map(h => `<button class="lib-i${h.id === libCur ? ' on' : ''}" data-lib="${h.id}"><span><span class="lvl" style="display:block">${esc(h.sec)}${h.id.startsWith('l:') ? ' · opens in the course' : ''}</span>${esc(h.name)}</span>${h.id.startsWith('l:') ? '<span class="ext" aria-hidden="true">↗</span>' : ''}</button>`).join('') : '<p class="lvl">Nothing found. Try "cache", "shard" or "idempotency".</p>');
  }
  return libSections().map(s => `<div class="cap" style="margin:10px 0 4px">${s.sec.toUpperCase()}</div>${s.items.map(i => `<button class="lib-i${i.id === libCur ? ' on' : ''}" data-lib="${i.id}">${i.t ? `<span class="pi nt-${i.t}">${ico(i.t, 13)}</span>` : ''}<span>${esc(i.name)}${i.sub ? ` <span class="lvl">${esc(i.sub)}</span>` : ''}</span>${i.done ? '<span class="tag g">✓</span>' : ''}${i.ext ? '<span class="ext" aria-hidden="true">↗</span>' : ''}</button>`).join('')}`).join('');
}
const libOpen = () => $('modal').classList.contains('on') && !!$('libNav');
function openLibrary(start) {
  if (start) libCur = start;
  const secs = libSections(), total = secs.reduce((s, x) => s + x.items.length, 0), done = secs.reduce((s, x) => s + x.items.filter(i => i.done).length, 0);
  modal(`<div class="sec-h" style="margin:0;flex-wrap:wrap"><h2>📖 Library</h2>${S.co ? '<span class="tag y">⏸ Your startup is paused while you study</span>' : ''}<span>Quick reference for the game · full lessons open in the course ↗</span></div>
    <input class="lib-search" id="libSearch" type="search" placeholder="Search everything: cache, sharding, idempotency…" value="${esc(libQ)}" aria-label="Search the library">
    <div class="lib"><nav class="lib-nav" id="libNav">${libNavHTML()}</nav><div class="lib-body" id="libBody">${libDetail(libCur)}</div></div>`, [{ label: 'Close', cls: 'pri' }], true);
  const nav = $('libNav'); if (!nav) return;
  const cur = nav.querySelector('.lib-i.on'); if (cur) cur.scrollIntoView({ block: 'center' });
  const show = id => { libCur = id; nav.querySelectorAll('.lib-i').forEach(x => x.classList.toggle('on', x.dataset.lib === id)); $('libBody').innerHTML = libDetail(id); $('libBody').scrollTop = 0; };
  nav.onclick = e => {
    const b = e.target.closest('[data-lib]'); if (!b) return; const id = b.dataset.lib;
    if (id.startsWith('go:')) { closeModal(true); openCourse(id.slice(3)); return; }
    if (id.startsWith('l:')) { closeModal(true); toCourse(id.slice(2)); return; }
    show(id);
  };
  $('libSearch').oninput = e => { libQ = e.target.value; nav.innerHTML = libNavHTML(); };
  $('libBody').onclick = e => {
    const go = e.target.closest('[data-libgo]'); if (go) { e.preventDefault(); libQ = ''; $('libSearch').value = ''; nav.innerHTML = libNavHTML(); show(go.dataset.libgo); return; }
    const o = e.target.closest('.qopt'); if (!o) return; const box = o.closest('.quiz'); if (box.dataset.done) return;
    const q = COURSE.days[+box.dataset.day - 1].quiz[+box.dataset.qi], pick = +o.dataset.opt; box.dataset.done = 1;
    box.querySelectorAll('.qopt').forEach((b, i) => { b.classList.toggle('right', i === q.a); b.classList.toggle('wrong', i === pick && pick !== q.a); b.disabled = true; });
    const w = box.querySelector('.qwhy'); w.hidden = false; w.innerHTML = `<b>${pick === q.a ? '✓ Right.' : '✗ Not quite.'}</b> ${mdx(q.why || '')}`;
  };
}

/* canvas */
const NW = 128, NH = 50;
const cf = v => v >= 1000 ? fmt(v) : v >= 10 ? String(Math.round(v)) : v >= 0.05 ? v.toFixed(1) : '0';
let view = null, spaceDown = false, overCanvas = false;
const isSel = id => sel && ((sel.kind === 'node' && sel.id === id) || (sel.kind === 'multi' && sel.ids.includes(id)));
const nodeById = id => S.co.nodes.find(n => n.id === id);
function nodeLabel(n) { if (n.type === 'users') return 'Users'; const same = S.co.nodes.filter(x => x.type === n.type); return SHORT[n.type] + (same.length > 1 ? ' ' + (same.indexOf(n) + 1) : ''); }
const aspect = () => { const c = $('canvas'); return c && c.clientHeight ? c.clientWidth / c.clientHeight : 1.6; };
function fitView() {
  const ns = S.co.nodes, A = aspect();
  const x0 = Math.min(...ns.map(n => n.x)) - 70, y0 = Math.min(...ns.map(n => n.y)) - 70, x1 = Math.max(...ns.map(n => n.x + NW)) + 90, y1 = Math.max(...ns.map(n => n.y + NH)) + 70;
  let w = Math.max(x1 - x0, 760), h = Math.max(y1 - y0, 760 / A);
  if (w / h < A) w = h * A; else h = w / A;
  view = { x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - h / 2, w, h }; applyView();
}
function applyView() { const sv = $('cv'); if (!sv || !view) return; view.h = view.w / aspect(); sv.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`); const z = $('zoomLbl'); if (z) z.textContent = Math.round(1000 / view.w * 100) + '%'; }
function zoomAt(f, cx, cy) { const nw = Math.max(350, Math.min(4000, view.w * f)), k = nw / view.w; view.x = cx - (cx - view.x) * k; view.y = cy - (cy - view.y) * k; view.w = nw; applyView(); }
function buildCanvas() {
  $('canvas').innerHTML = `<svg id="cv" role="img" aria-label="Architecture diagram editor"><defs><pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.3" class="dotp"/></pattern><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,1 L9,5 L0,9 z" class="ahp"/></marker></defs><rect x="-5000" y="-5000" width="12000" height="12000" fill="url(#dots)"/><g id="cvE"></g><g id="cvP"></g><g id="cvN"></g><line id="cvTmp" class="tmpl" x1="0" y1="0" x2="0" y2="0" visibility="hidden"/><rect id="cvSel" class="marq" visibility="hidden"/></svg>
    <div class="zoomctl"><button class="zb" data-z="out" aria-label="Zoom out">−</button><span id="zoomLbl" class="lvl"></span><button class="zb" data-z="in" aria-label="Zoom in">+</button><button class="zb" data-z="fit">Fit</button><button class="zb" id="undoBtn" data-z="undo" aria-label="Undo">↶</button></div>
    <div class="cvhint">Ctrl/⌘ + scroll: zoom · Space/middle-drag: pan · drag empty space: select · Ctrl/⌘+Z: undo (3)</div>`;
  fitView(); drawEdges(); drawNodes(); bindCanvas(); renderUndo();
}
function drawNodes() {
  $('cvN').innerHTML = S.co.nodes.map(n => {
    const hasOut = ALLOWED[n.type].length > 0;
    return `<g class="nd nt-${n.type}${isSel(n.id) ? ' sel' : ''}" data-n="${n.id}" transform="translate(${n.x},${n.y})">
      <rect class="sh" x="2" y="3" width="${NW}" height="${NH}" rx="11"/><rect class="bd" width="${NW}" height="${NH}" rx="11"/>
      <g transform="translate(9,8)" class="ic">${ico(n.type, 14)}</g>
      <text x="28" y="19" class="nl">${nodeLabel(n)}</text>
      <text x="10" y="34" class="ns" data-s="${n.id}"></text>
      ${n.type === 'users' ? '' : `<rect x="10" y="40" width="${NW - 20}" height="4" rx="2" class="lb0"/><rect x="10" y="40" width="0" height="4" rx="2" class="lb1" data-l="${n.id}"/>`}
      ${hasOut ? `<circle class="port" data-port="${n.id}" cx="${NW}" cy="${NH / 2}" r="7"/>` : ''}</g>`;
  }).join('');
  liveNodes();
}
function clipPt(cx, cy, tx, ty) { const dx = tx - cx, dy = ty - cy, hw = NW / 2 + 4, hh = NH / 2 + 4; if (!dx && !dy) return { x: cx, y: cy }; const t = Math.min(dx ? hw / Math.abs(dx) : 1e9, dy ? hh / Math.abs(dy) : 1e9); return { x: cx + dx * t, y: cy + dy * t }; }
let edgeGeo = {}, packets = [];
function drawEdges() {
  edgeGeo = {};
  $('cvE').innerHTML = S.co.edges.map(e => {
    const A = nodeById(e.a), B = nodeById(e.b); if (!A || !B) return '';
    const ac = { x: A.x + NW / 2, y: A.y + NH / 2 }, bc = { x: B.x + NW / 2, y: B.y + NH / 2 };
    const p1 = clipPt(ac.x, ac.y, bc.x, bc.y), p2 = clipPt(bc.x, bc.y, ac.x, ac.y), rep = A.type === 'db' && B.type === 'replica';
    const flow = SIM ? (SIM.edgeFlow[e.a + '>' + e.b] || 0) : 0, bad = SIM && B.type !== 'users' && B.type !== 'worker' && (SIM.ratio[B.id] || 1) < 0.99;
    edgeGeo[e.id] = { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, flow, bad, rep };
    const s = (sel && sel.kind === 'edge' && sel.id === e.id) || (sel && sel.kind === 'multi' && sel.ids.includes(e.a) && sel.ids.includes(e.b));
    return `<g class="ed${rep ? ' rep' : ''}${s ? ' sel' : ''}${flow > 0 ? ' live' : ''}" data-e="${e.id}"><line class="hit" x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}"/><line class="ln" x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" marker-end="url(#ah)"/></g>`;
  }).join('');
  const pg = $('cvP'); pg.innerHTML = ''; packets = [];
  Object.values(edgeGeo).forEach(g => {
    const k = g.rep ? (S.co.users > 0 ? 1 : 0) : g.flow > 0 ? Math.max(1, Math.min(6, Math.ceil(Math.log10(g.flow + 1) * 1.8))) : 0;
    for (let i = 0; i < k; i++) { const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); c.setAttribute('r', 4); c.setAttribute('class', 'pk' + (g.rep ? ' rp' : g.bad ? ' drop' : '')); pg.appendChild(c); packets.push({ g, t: i / k, el: c }); }
  });
}
const pctTxt = p => p < 0.001 ? '0%' : p < 0.01 ? '<1%' : p < 0.1 ? (p * 100).toFixed(1) + '%' : Math.round(p * 100) + '%';
function liveNodes() {
  if (!S.co) return;
  S.co.nodes.forEach(n => {
    const s = document.querySelector(`[data-s="${n.id}"]`), l = document.querySelector(`[data-l="${n.id}"]`), g = document.querySelector(`[data-n="${n.id}"]`); if (!s) return;
    if (n.type === 'users') { s.textContent = `${cf(S.co.users)} · ${cf(SIM ? SIM.demand : 0)} req/s`; return; }
    const load = SIM ? SIM.load[n.id] || 0 : 0, cap = capOf(n), pct = load / cap, th = SIM ? SIM.thru[n.id] || 0 : 0, lv = n.lvl ? ' · L' + (n.lvl + 1) : '';
    let txt = `${cf(th)}/s · ${pctTxt(pct)}${lv}`;
    if (n.type === 'replica' && SIM && !SIM.fed.has(n.id)) txt = 'no primary!';
    else if ((n.type === 'cdn' || n.type === 'cache') && th > 0) txt = `${cf(th)}/s · ${cf(SIM.hitN[n.id])} hit`;
    else if (n.type === 'queue') txt = (S.co.backlog || 0) >= 1 ? `${cf(th)}/s · ${cf(S.co.backlog)} wait` : `${cf(th)}/s · empty`;
    s.textContent = txt;
    if (l) { l.setAttribute('width', Math.min(1, pct) * (NW - 20)); l.classList.toggle('hot', pct > 1); l.classList.toggle('warm', pct > 0.8 && pct <= 1); }
    if (g) g.classList.toggle('over', pct > 1 && n.type !== 'worker' || (n.type === 'queue' && (S.co.qdelay || 0) > 120));
  });
}
function animatePackets() {
  requestAnimationFrame(animatePackets);
  if (!S.co || reduce) return;
  packets.forEach(p => { const sp = p.g.rep ? 0.004 : 0.004 + Math.min(0.012, Math.log10(p.g.flow + 1) * 0.0025); p.t = (p.t + sp) % 1; const { x1, y1, x2, y2 } = p.g; p.el.setAttribute('cx', x1 + (x2 - x1) * p.t); p.el.setAttribute('cy', y1 + (y2 - y1) * p.t); });
}
const svgPt = ev => { const sv = $('cv'), p = sv.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY; return p.matrixTransform(sv.getScreenCTM().inverse()); };
const nodeAt = (x, y) => S.co.nodes.slice().reverse().find(n => x >= n.x - 6 && x <= n.x + NW + 10 && y >= n.y - 6 && y <= n.y + NH + 6);
const clampX = x => Math.max(-3000, Math.min(6000, x)), clampY = y => Math.max(-3000, Math.min(6000, y));
let drag = null;
function bindCanvas() {
  const sv = $('cv'), host = $('canvas');
  host.onmouseenter = () => overCanvas = true; host.onmouseleave = () => overCanvas = false;
  host.querySelector('.zoomctl').onclick = e => { const b = e.target.closest('[data-z]'); if (!b) return; const z = b.dataset.z; if (z === 'undo') { undo(); return; } if (z === 'fit') fitView(); else zoomAt(z === 'in' ? 0.8 : 1.25, view.x + view.w / 2, view.y + view.h / 2); };
  sv.addEventListener('wheel', ev => { if (!(ev.ctrlKey || ev.metaKey)) return; ev.preventDefault(); const p = svgPt(ev); zoomAt(Math.exp(Math.max(-60, Math.min(60, ev.deltaY)) * 0.006), p.x, p.y); }, { passive: false });
  sv.addEventListener('pointerdown', ev => {
    const pt = svgPt(ev), port = ev.target.closest('[data-port]'), nd = ev.target.closest('[data-n]'), ed = ev.target.closest('[data-e]');
    if (ev.button === 1 || (spaceDown && ev.button === 0)) { drag = { mode: 'pan', cx: ev.clientX, cy: ev.clientY, vx: view.x, vy: view.y }; host.classList.add('panning'); }
    else if (port) { drag = { mode: 'link', from: port.dataset.port }; const n = nodeById(drag.from); const t = $('cvTmp'); t.setAttribute('x1', n.x + NW); t.setAttribute('y1', n.y + NH / 2); t.setAttribute('x2', pt.x); t.setAttribute('y2', pt.y); t.setAttribute('visibility', 'visible'); }
    else if (nd) {
      const id = nd.dataset.n;
      if (ev.shiftKey) { const ids = sel && sel.kind === 'multi' ? [...sel.ids] : sel && sel.kind === 'node' ? [sel.id] : []; const i = ids.indexOf(id); i >= 0 ? ids.splice(i, 1) : ids.push(id); select(ids.length > 1 ? { kind: 'multi', ids } : ids.length ? { kind: 'node', id: ids[0] } : null); return; }
      const group = sel && sel.kind === 'multi' && sel.ids.includes(id) ? sel.ids : [id];
      drag = { mode: 'move', snap: snapCo(), id, group, start: group.map(g => { const n = nodeById(g); return { n, x: n.x, y: n.y }; }), sx: pt.x, sy: pt.y, moved: false };
    }
    else if (ed) { select({ kind: 'edge', id: ed.dataset.e }); return; }
    else { drag = { mode: 'marq', sx: pt.x, sy: pt.y, add: ev.shiftKey }; }
    sv.setPointerCapture(ev.pointerId); ev.preventDefault();
  });
  sv.addEventListener('pointermove', ev => {
    if (!drag) return;
    if (drag.mode === 'pan') { const k = view.w / sv.clientWidth; view.x = drag.vx - (ev.clientX - drag.cx) * k; view.y = drag.vy - (ev.clientY - drag.cy) * k; applyView(); return; }
    const pt = svgPt(ev);
    if (drag.mode === 'link') { const t = $('cvTmp'); t.setAttribute('x2', pt.x); t.setAttribute('y2', pt.y); return; }
    if (drag.mode === 'marq') { const r = $('cvSel'), x = Math.min(pt.x, drag.sx), y = Math.min(pt.y, drag.sy); r.setAttribute('x', x); r.setAttribute('y', y); r.setAttribute('width', Math.abs(pt.x - drag.sx)); r.setAttribute('height', Math.abs(pt.y - drag.sy)); r.setAttribute('visibility', 'visible'); drag.ex = pt.x; drag.ey = pt.y; return; }
    if (Math.hypot(pt.x - drag.sx, pt.y - drag.sy) > 4) drag.moved = true;
    if (!drag.moved) return;
    const dx = pt.x - drag.sx, dy = pt.y - drag.sy;
    drag.start.forEach(s => { s.n.x = clampX(s.x + dx); s.n.y = clampY(s.y + dy); const el = document.querySelector(`[data-n="${s.n.id}"]`); if (el) el.setAttribute('transform', `translate(${s.n.x},${s.n.y})`); });
    drawEdges();
  });
  const end = ev => {
    if (!drag) return; const d = drag; drag = null; host.classList.remove('panning');
    if (d.mode === 'pan') return;
    const pt = svgPt(ev);
    if (d.mode === 'link') { $('cvTmp').setAttribute('visibility', 'hidden'); const t = nodeAt(pt.x, pt.y); if (t && t.id !== d.from) connect(d.from, t.id); else if (!t) toast('Drop the line onto another component to connect.'); return; }
    if (d.mode === 'marq') {
      $('cvSel').setAttribute('visibility', 'hidden');
      if (d.ex == null || Math.hypot(d.ex - d.sx, d.ey - d.sy) < 5) { select(null); return; }
      const x0 = Math.min(d.sx, d.ex), x1 = Math.max(d.sx, d.ex), y0 = Math.min(d.sy, d.ey), y1 = Math.max(d.sy, d.ey);
      let ids = S.co.nodes.filter(n => n.x < x1 && n.x + NW > x0 && n.y < y1 && n.y + NH > y0).map(n => n.id);
      if (d.add && sel) ids = [...new Set([...(sel.kind === 'multi' ? sel.ids : sel.kind === 'node' ? [sel.id] : []), ...ids])];
      select(ids.length > 1 ? { kind: 'multi', ids } : ids.length ? { kind: 'node', id: ids[0] } : null); return;
    }
    if (!d.moved) { if (!(sel && sel.kind === 'multi' && sel.ids.includes(d.id))) select({ kind: 'node', id: d.id }); } else { pushUndo(d.group.length > 1 ? `move ${d.group.length} components` : 'move ' + nodeLabel(nodeById(d.id)), d.snap, 0); save(); }
  };
  sv.addEventListener('pointerup', end); sv.addEventListener('pointercancel', () => { drag = null; $('cvTmp').setAttribute('visibility', 'hidden'); $('cvSel').setAttribute('visibility', 'hidden'); });
  if (!window.__cvRO) { window.__cvRO = new ResizeObserver(() => { if (view) applyView(); }); }
  window.__cvRO.disconnect(); window.__cvRO.observe(host);
}
document.addEventListener('keydown', e => { if (e.code === 'Space' && overCanvas && S.co && !/INPUT|SELECT|TEXTAREA|BUTTON/.test(document.activeElement.tagName)) { spaceDown = true; e.preventDefault(); $('canvas').classList.add('grab'); } });
document.addEventListener('keyup', e => { if (e.code === 'Space') { spaceDown = false; const c = $('canvas'); c && c.classList.remove('grab'); } });
function select(s) { sel = s; studyFocus = null; if (s) setPane('inspect'); drawNodes(); drawEdges(); coKey = ''; renderInspector(); renderStudy(); }
function connect(a, b) { act('connect ' + nodeLabel(nodeById(a)) + ' → ' + nodeLabel(nodeById(b)), () => connect_(a, b)); }
function connect_(a, b) {
  const A = nodeById(a), B = nodeById(b);
  if (!ALLOWED[A.type].includes(B.type)) { const ok = ALLOWED[A.type].map(t => COMP[t].name); toast(`${COMP[A.type].name} can't send requests to ${COMP[B.type].name}. ${ok.length ? 'It can connect to: ' + ok.join(', ') + '.' : 'It is an endpoint.'}`); return false; }
  if (S.co.edges.some(e => e.a === a && e.b === b)) return false;
  S.co.edges.push({ id: 'e' + (S.co.seq++), a, b });
  if (A.type === 'db' && B.type === 'replica') toast('Replication: the database now copies its data to this replica.');
  restructure();
}
function addNode(type, x, y) { act('add ' + SHORT[type], () => addNode_(type, x, y)); }
function addNode_(type, x, y) {
  const c = COMP[type], free = (type === 'app' || type === 'db') && S.co.free[type], price = free ? 0 : c.cost;
  if (wallet() < price) { toast(`A ${c.name} costs ${money(price)}. Grow revenue, take a loan or accept an investor.`); return false; }
  spendCloud(price); if (free) S.co.free[type] = false;
  if (x == null) {
    const free = (px, py) => !S.co.nodes.some(m => px < m.x + NW + 24 && px + NW + 24 > m.x && py < m.y + NH + 20 && py + NH + 20 > m.y);
    let best = null; const cx = view.x + view.w / 2, cy = view.y + view.h / 2;
    for (let r = 0; r < 14 && !best; r++) for (let a = 0; a < 12 && !best; a++) { const px = cx - NW / 2 + Math.cos(a / 12 * Math.PI * 2) * r * 90, py = cy - NH / 2 + Math.sin(a / 12 * Math.PI * 2) * r * 60; if (free(px, py)) best = [px, py]; }
    [x, y] = best ? [best[0] + NW / 2, best[1] + NH / 2] : [cx, cy];
  }
  const n = { id: 'n' + (S.co.seq++), type, x: clampX(x - NW / 2), y: clampY(y - NH / 2), lvl: 0, free: !!free }; S.co.nodes.push(n);
  sel = { kind: 'node', id: n.id };
  if (free) toast(`Free tier: your first ${c.name} costs $0 and has no cloud bill until you upgrade it.`);
  if (!S.learned.includes(c.concept)) learn(c.concept);
  restructure(); renderTop();
}
const undoStack = [];
function snapCo() { return { nodes: S.co.nodes.map(n => ({ ...n })), edges: S.co.edges.map(e => ({ ...e })), free: { ...S.co.free } }; }
function act(label, fn) { const before = snapCo(), m0 = wallet(); const ok = fn(); if (ok === false) return; pushUndo(label, before, m0 - wallet()); }
function pushUndo(label, before, spent) { undoStack.push({ label, before, spent }); if (undoStack.length > 3) undoStack.shift(); renderUndo(); }
function undo() {
  if (!S.co || !undoStack.length) { toast('Nothing to undo (only the last 3 diagram actions are kept).'); return; }
  const u = undoStack[undoStack.length - 1];
  if (u.spent < 0 && S.money + u.spent < 0) { toast(`Undo needs ${money(-u.spent)} back (the refund you got).`); return; }
  undoStack.pop(); S.co.nodes = u.before.nodes; S.co.edges = u.before.edges; S.co.free = u.before.free; S.money += u.spent;
  sel = null; toast(`↶ Undid: ${u.label}${u.spent > 0 ? ` (+${money(u.spent)} back)` : u.spent < 0 ? ` (−${money(-u.spent)})` : ''}`); restructure(); renderTop(); renderUndo();
}
function renderUndo() { const b = $('undoBtn'); if (b) { b.disabled = !undoStack.length; b.title = undoStack.length ? `Undo: ${undoStack[undoStack.length - 1].label} (${undoStack.length} left)` : 'Nothing to undo'; } }
function restructure() { SIM = simulate(S.co, defOf()); drawEdges(); drawNodes(); coKey = ''; renderCompany(); save(); }
function delNodes(ids) { const k = ids.filter(i => i !== 'users').length; act(k > 1 ? `delete ${k} components` : 'delete ' + (k ? nodeLabel(nodeById(ids.find(i => i !== 'users'))) : ''), () => delNodes_(ids)); }
function delNodes_(ids) {
  ids = ids.filter(id => id !== 'users'); if (!ids.length) { toast('Users can\'t be deleted.'); return false; }
  const refundOf = n => n.free ? 0 : Math.floor(COMP[n.type].cost * 0.5);
  const refund = ids.reduce((s, id) => s + refundOf(nodeById(id)), 0);
  S.co.nodes = S.co.nodes.filter(x => !ids.includes(x.id)); S.co.edges = S.co.edges.filter(e => !ids.includes(e.a) && !ids.includes(e.b));
  S.money += refund; sel = null; toast(`Removed ${ids.length > 1 ? ids.length + ' components and their connections' : 'component'}. Refunded ${money(refund)}.`); restructure();
}
const delNode = id => delNodes([id]);
function delEdge(id) { act('delete connection', () => delEdge_(id)); }
function delEdge_(id) { S.co.edges = S.co.edges.filter(e => e.id !== id); sel = null; restructure(); }
function upgradeNode(id) { const n = nodeById(id); act('upgrade ' + (n ? nodeLabel(n) : ''), () => upgradeNode_(id)); }
function upgradeNode_(id) {
  const n = nodeById(id); if (!n || n.type === 'users' || n.lvl >= 3) return false; const c = upCost(n); if (wallet() < c) return false;
  spendCloud(c); n.lvl++; if (!S.learned.includes('vertical')) learn('vertical'); restructure(); renderTop();
}

/* palette drag-n-drop */
let pdrag = null;
function renderPalette() {
  $('palette2').innerHTML = PALETTE.map(t => { const c = COMP[t], free = (t === 'app' || t === 'db') && S.co.free[t], p = free ? 0 : c.cost; return `<button class="pal nt-${t}" data-comp="${t}" title="${c.d}"><span class="pi">${ico(t, 16)}</span><span class="pt"><span class="pn">${SHORT[t]}</span><span class="pc ${wallet() < p ? 'no' : ''}">${free ? 'free' : money(p)}</span></span></button>`; }).join('');
}
function bindPalette() {
  $('stabs').onclick = e => { const b = e.target.closest('[data-pane]'); if (b) setPane(b.dataset.pane); };
  $('studyBtn').onclick = () => { S.study = !S.study; if (S.study) setPane('study'); studyFocus = null; $('coStudy').dataset.k = ''; renderStudy(); $('coMentor').innerHTML = coMentor(problems()); save(); };
  $('palette2').addEventListener('pointerdown', ev => {
    const b = ev.target.closest('[data-comp]'); if (!b) return; ev.preventDefault();
    pdrag = { type: b.dataset.comp, sx: ev.clientX, sy: ev.clientY, moved: false, ghost: null };
  });
  document.addEventListener('pointermove', ev => {
    if (!pdrag) return;
    if (!pdrag.moved && Math.hypot(ev.clientX - pdrag.sx, ev.clientY - pdrag.sy) > 6) { pdrag.moved = true; const g = document.createElement('div'); g.className = 'ghost nt-' + pdrag.type; g.innerHTML = `${ico(pdrag.type, 16)} ${SHORT[pdrag.type]}`; document.body.appendChild(g); pdrag.ghost = g; }
    if (pdrag.ghost) { pdrag.ghost.style.left = ev.clientX + 'px'; pdrag.ghost.style.top = ev.clientY + 'px'; const r = $('canvas').getBoundingClientRect(); $('canvas').classList.toggle('drop', ev.clientX > r.left && ev.clientX < r.right && ev.clientY > r.top && ev.clientY < r.bottom); }
  });
  document.addEventListener('pointerup', ev => {
    if (!pdrag) return; const d = pdrag; pdrag = null; $('canvas').classList.remove('drop');
    if (d.ghost) d.ghost.remove();
    if (!d.moved) { studyFocus = d.type; if (!S.study) { S.study = true; } setPane('study'); $('coStudy').dataset.k = ''; renderStudy(); document.querySelectorAll('.pal').forEach(p => p.classList.toggle('picked', p.dataset.comp === d.type)); return; }
    const r = $('canvas').getBoundingClientRect();
    if (ev.clientX > r.left && ev.clientX < r.right && ev.clientY > r.top && ev.clientY < r.bottom) { const p = svgPt(ev); addNode(d.type, p.x, p.y); }
  });
}

/* problems + mentor */
const upstream = (n, t) => S.co.edges.some(e => e.b === n.id && nodeById(e.a) && nodeById(e.a).type === t);
const anyType = t => S.co.nodes.some(n => n.type === t);
function overHint(n, R) {
  const up = n.lvl < 3 ? `upgrade it (size ${n.lvl + 1}/4 → ${n.lvl + 2}/4)` : '', maxed = n.lvl >= 3 ? 'It is already at max size, so ' : '';
  const or = s => up ? `${s}, or ${up}.` : `${maxed}${s.charAt(0).toLowerCase() + s.slice(1)}.`;
  const k = R.loadK[n.id] || {};
  if (n.type === 'app') {
    const heavy = (k.media || 0) > R.load[n.id] * 0.3 ? ' Media is the main load here: route it through a CDN.' : '';
    if (upstream(n, 'lb')) return or(`Add another App server and connect the Load balancer to it`) + heavy;
    if (anyType('lb')) return or(`This server isn't behind your Load balancer: connect Load balancer → ${nodeLabel(n)}`) + heavy;
    return or('Add a Load balancer in front (Users → LB → App servers) so you can run several servers') + heavy;
  }
  if (n.type === 'db') {
    const w = (k.write || 0) + (k.realtime || 0) + (k.geo || 0);
    if (w > capOf(n) * 0.6) return up ? `Writes can only go to the primary, so ${up}.` + (k.realtime ? ' Realtime polling also lands here: use a WebSocket gateway → Queue.' : '') + (k.geo ? ' Location updates belong in a Geo index.' : '') : 'Writes are maxing out the biggest primary: move realtime traffic to a Queue and locations to a Geo index.';
    if (!anyType('cache')) return or('Most traffic here is reads: add a Cache between App servers and the Database');
    if (!S.co.nodes.some(r => r.type === 'replica' && R.fed.has(r.id))) return or('Add a Read replica (connect Database → Replica and App → Replica)');
    return or('Add another Read replica');
  }
  if (n.type === 'ws') return upstream(n, 'lb') ? or('Add another WebSocket gateway behind the Load balancer') : or('Put a Load balancer in front of several WebSocket gateways');
  if (n.type === 'replica') return or('Add another Read replica');
  if (n.type === 'blob') return anyType('cdn') ? or('Uploads and misses still land here') : or('Put a CDN in front so most reads never reach it');
  return up ? `Upgrade it (size ${n.lvl + 1}/4 → ${n.lvl + 2}/4), or add another one.` : 'Already at max size: add another one.';
}
const OVER_HINT = { app: 'Put a Load balancer in front of more App servers, or upgrade this one.', db: 'Add a Cache for reads, Read replicas, or upgrade it.', replica: 'Add more replicas or upgrade.', worker: 'Add more Workers to the Queue.', lb: 'Upgrade the load balancer.', cache: 'Upgrade the cache.', blob: 'Upgrade blob storage, or put a CDN in front.', queue: 'Upgrade the queue.', ws: 'Add gateways behind a Load balancer.', geo: 'Upgrade the geo index.', cdn: 'Upgrade the CDN.' };
const KIND_GOAL = { read: 'store and return data', write: 'durably store data', media: 'store large files', upload: 'store large files', async: 'hold the job and process it in the background', realtime: 'deliver messages', geo: 'store and query locations' };
const KIND_NUDGE = {
  read: 'Where does structured data live permanently?', write: 'Where does structured data live permanently?',
  media: 'Photos and videos are large binary files. Which component is built for files rather than rows?', upload: 'Which component is built to store large files?',
  async: 'Work that can finish later should not block the request. What holds jobs until someone is free, and who does the work?',
  realtime: 'Messages need to be handed from sender to receivers. What can accept messages and pass them on?',
  geo: 'Locations need a store that can answer "who is near me?". Which one specializes in that?',
};
const OVER_NUDGE = {
  app: 'One machine always has a ceiling. How do large sites run many copies of the same server and split traffic between them?',
  db: 'Look at what kind of traffic hits it. Reads can be answered by something faster or by copies; writes can only go to the primary.',
  ws: 'Same idea as app servers: can you run more than one and split the connections?', replica: 'More copies, or bigger copies?',
  blob: 'Is most of this traffic people downloading the same files again and again?', cache: 'Bigger machine?', lb: 'Bigger machine?', queue: 'Bigger machine?', geo: 'Bigger machine?', cdn: 'Bigger plan?',
};
function problems() {
  const co = S.co, L = [], R = SIM; if (!R) return L;
  const P = (k, id, t, why, h1, h2, lib) => L.push({ k, id, t, why, h: [h1, h2].filter(Boolean), lib });
  if (S.money < 0) P('bad', 'bankrupt', `Bankrupt in ${LOAN.grace - (co.neg || 0)} s (balance ${money(S.money)})`, 'Your cash is below $0.', 'Delete idle components (50% refund), take a loan, or accept an investor.', null, 'x:runway');
  else if (co.upk + (co.loanPay || 0) > co.rev && S.money < (co.upk - co.rev) * 30) P('bad', 'runway', `Runway: about ${Math.max(0, Math.floor(S.money / Math.max(0.01, co.upk + (co.loanPay || 0) - co.rev)))} s of cash left`, 'Your cloud bill is bigger than your revenue.', 'Cut components you do not need, grow users, or raise money.', null, 'x:runway');
  if (co.loan && co.loan.left <= 60) P('warn', 'loan', `Loan due in ${co.loan.left} s: ${money(co.loan.owed)} left`, 'Whatever is unpaid when the timer ends is taken all at once.', 'Repay early if you can.', null, 'x:debt');
  if (!co.edges.some(e => e.a === 'users')) P('bad', 'entry', 'Users can\'t reach anything', 'Every request starts at Users, but nothing receives it yet.', 'What is the first thing a web request hits on your side: something that runs code, or something that spreads traffic?', 'Drag from the ● on Users onto an App server (or a Load balancer).', 'c:users');
  R.cls.forEach(c => { if (c.demand > 0 && c.failed / c.demand > 0.05) P('bad', 'route-' + c.label, `${c.label}: no route`, `These requests travel through your diagram but never reach anything that can ${KIND_GOAL[c.kind]}.`, KIND_NUDGE[c.kind], `They need ${KIND_NEEDS[c.kind]} reachable from Users.`, 'k:' + c.kind); });
  if ((co.backlog || 0) >= 1) { const dl = co.qdelay || 0; P(dl > 120 ? 'bad' : 'warn', 'backlog', dl > 120 ? `Jobs wait ${cf(dl)} s in the Queue` : `Queue backlog: ${cf(co.backlog)} jobs (${cf(dl)} s delay)`, 'Jobs arrive faster than they are processed, so they wait in line. Past 2 minutes, users notice.', 'Who does the work after the queue? Is there enough of it?', 'Add Workers (connected to the Queue) or upgrade them.', 'c:queue'); }
  co.nodes.forEach(n => { if (n.type !== 'users' && n.type !== 'worker' && R.ratio[n.id] < 0.99) P('bad', 'over-' + n.id, `${nodeLabel(n)} overloaded (${Math.round(R.load[n.id] / capOf(n) * 100)}%)`, `It receives more work per second than its ${fmt(capOf(n))}/s capacity, so the extra requests are dropped.`, OVER_NUDGE[n.type] || 'Bigger, or more of them?', overHint(n, R), 'c:' + n.type); });
  co.nodes.forEach(n => { if (n.type === 'replica' && !R.fed.has(n.id)) P('warn', 'rep-' + n.id, `${nodeLabel(n)} is empty`, 'A replica is a copy of a database, but nothing is copying data into it.', 'Where does a replica get its data from?', 'Draw Database → Replica.', 'c:replica'); });
  R.cls.forEach(c => {
    if (c.kind === 'media' && c.heavy.app) P('warn', 'heavy-m' + c.label, `${c.label} go through your app servers (6× load)`, 'Big files flow through machines meant for logic. Each one costs as much as six normal requests.', 'Is there a component that serves static files close to users, so they never reach your servers?', 'Users → CDN → Blob storage.', 'c:cdn');
    if (c.kind === 'realtime' && c.heavy.db) P('warn', 'heavy-r' + c.label, `${c.label} poll the database (4× load)`, 'Without a persistent connection, every client keeps asking "anything new?", and each question hits the database.', 'What keeps a connection open so the server can push messages instead?', 'Users → WebSocket gateway → Queue.', 'c:ws');
    if (c.kind === 'geo' && c.heavy.db) P('warn', 'heavy-g' + c.label, `${c.label} hammer the database (5× load)`, 'A general-purpose database is slow at "nearby" queries and constant location writes.', 'Is there a store specialized in locations?', 'Add a Geo index behind your App servers.', 'c:geo');
  });
  if (L.some(p => p.id.startsWith('over-')) && !S.learned.includes('bottleneck')) setTimeout(() => learn('bottleneck'), 50);
  return L.sort((a, b) => (a.k === 'bad' ? 0 : 1) - (b.k === 'bad' ? 0 : 1));
}
const hintLv = {};
function probHTML(p) {
  const lv = hintLv[p.id] || 0;
  return `<div class="prob ${p.k}"><b>${p.k === 'bad' ? '✗' : '!'} ${esc(p.t)}</b><span>${esc(p.why)}</span>${p.h.slice(0, lv).map((h, i) => `<span class="hint">💡 ${i === p.h.length - 1 && p.h.length > 1 ? '<b>Answer:</b> ' : ''}${esc(h)}</span>`).join('')}<div class="pacts">${p.lib ? `<button class="hbtn lbtn" data-libopen="${p.lib}" title="Opens the Library. The game pauses while you read.">📖 Study this</button>` : ''}${lv < p.h.length ? `<button class="hbtn" data-hint="${esc(p.id)}">${lv === 0 ? (p.h.length > 1 ? '💡 Hint' : '💡 What can I do?') : '💡 Show the answer'}</button>` : ''}</div></div>`;
}
function coMentor(P) {
  const co = S.co, d = defOf();
  if (!co.edges.some(e => e.a === 'users')) return `Welcome to <b>${d.name}</b>! Your users need a path through your system to whatever can answer them. Click a component on the left to study it, drag it onto the canvas to add it. You have <b>$2,000 in cloud credits</b> to spend. Stuck? Problems has hints.`;
  if (co.users < 10 && !P.some(p => p.k === 'bad')) return 'The diagram is live. Now get people in: press <b>Acquire users</b> and watch the packets flow.';
  if (P.length) return `<b>${esc(P[0].t)}.</b> ${esc(P[0].why)}`;
  if (co.done) return `You hit the goal! Exit for <b>${money(valuation())}</b> to unlock harder startups, or keep growing.`;
  return 'Healthy! Grow with marketing and referrals. Every new user adds traffic, so the next bottleneck is coming.';
}

/* side panels */
let coKey = '', pane = 'problems';
function setPane(p) { pane = p; document.querySelectorAll('#stabs [data-pane]').forEach(b => { b.classList.toggle('on', b.dataset.pane === p); b.setAttribute('aria-selected', b.dataset.pane === p); }); document.querySelectorAll('.spane').forEach(s => s.classList.toggle('on', s.dataset.p === p)); }
function renderBadges(P) {
  const nb = P.filter(p => p.k === 'bad').length, b = $('bdgP'); b.textContent = P.length || ''; b.className = nb ? 'bad' : P.length ? 'warn' : '';
  const co = S.co, offer = OFFERS.some(o => co.offers[o.id] === 'open'), f = $('bdgF'); f.textContent = offer ? '!' : co.loan && co.loan.left <= 60 ? '⏱' : ''; f.className = offer ? 'dot' : co.loan && co.loan.left <= 60 ? 'warn' : '';
  const m = $('bdgM'); const low = SIM ? SIM.cls.filter(c => c.demand > 0 && c.served / c.demand < 0.9 && !(c.kind === 'async' && c.queued > 0)).length : 0; m.textContent = low || ''; m.className = low ? 'bad' : '';
  $('tabStudy').hidden = !S.study; if (!S.study && pane === 'study') setPane('problems');
}
function renderCompany() {
  const co = S.co; if (!co) return; const d = defOf(), R = SIM, P = problems();
  $('coName').textContent = d.name; $('coStyle').textContent = `${d.style} · revenue ×${fmt(repMult())}`;
  const h = R ? R.health : 1;
  $('coStats').innerHTML = [[fmt(co.users), 'users'], [fmt(R ? R.demand : 0) + '/s', 'requests'], [Math.round(h * 100) + '%', 'served', h < 0.97 ? 'bad' : ''], [money(co.rev) + '/s', 'revenue'], [money(co.upk) + '/s', 'cloud bill'], [(co.growth - co.churn >= 0 ? '+' : '') + fmt(co.growth - co.churn) + '/s', 'user growth', co.churn > co.growth ? 'bad' : ''], ...(co.credits > 0 ? [[money(co.credits), 'cloud credits', 'cred']] : [])].map(([b, t, c]) => `<div class="stat ${c || ''}"><b>${b}</b><span>${t}</span></div>`).join('');
  $('goalBar').style.width = Math.min(100, co.users / d.goal * 100) + '%'; $('goalTxt').textContent = `${fmt(co.users)} / ${fmt(d.goal)} users`;
  $('coMentor').innerHTML = coMentor(P);
  const pk = JSON.stringify(P.slice(0, 6).map(p => [p.t, hintLv[p.id] || 0]));
  if ($('coProblems').dataset.k !== pk) { $('coProblems').dataset.k = pk; $('coProblems').innerHTML = P.length ? P.slice(0, 6).map(probHTML).join('') : '<div class="nobug">✓ No problems. Every request is served.</div>'; }
  renderStudy(); renderBadges(P);
  $('coMix').innerHTML = R ? R.cls.map(c => { const wait = c.kind === 'async' && (co.qdelay || 0) <= 120 ? c.queued : 0, p = c.demand > 0 ? (c.served + wait) / c.demand : 1; return `<div class="mixr"><span>${c.label} <span class="lvl">${Math.round(c.share * 100)}%${wait > 0.01 ? ` · ${Math.round(wait / c.demand * 100)}% waiting in queue` : ''}</span></span><span class="tag ${p >= 0.97 ? 'g' : p > 0.5 ? 'y' : 'r'}">${Math.round(p * 100)}%</span></div>`; }).join('') : '';
  const key = JSON.stringify([!!co.loan, S.money > 0, Math.floor(loanLimit() / 500), co.mkt, co.ref, co.offers, co.done, co.users >= 100, S.money >= mktCost(), S.money >= refCost(), PALETTE.map(t => wallet() >= COMP[t].cost), co.free, sel, wallet() >= (sel && sel.kind === 'node' && nodeById(sel.id) ? upCost(nodeById(sel.id)) : 0)]);
  if (key !== coKey) { coKey = key; renderGrowth(); renderInvest(); renderPalette(); renderInspector(); }
  if (co.loan && $('loanTxt')) { const l = co.loan; $('loanTxt').textContent = `${money(l.owed)} left · ${Math.floor(l.left / 60)}:${String(l.left % 60).padStart(2, '0')}`; $('loanBar').style.width = Math.max(0, 100 - l.owed / (l.principal * (1 + LOAN.fee)) * 100) + '%'; }
  else renderInspector(true);
}
document.addEventListener('click', e => { const c = e.target.closest('[data-course],[data-coursehash]'); if (c) { e.preventDefault(); closeModal(true); if (c.dataset.course) toCourse(c.dataset.course); else goCourse(c.dataset.coursehash); return; } });
document.addEventListener('click', e => { const b = e.target.closest('[data-libopen]'); if (b) openLibrary(b.dataset.libopen); const a = e.target.closest('[data-addcomp]'); if (a && S.co) { addNode(a.dataset.addcomp); $('coStudy').dataset.k = ''; renderStudy(); } });
document.addEventListener('click', e => { const b = e.target.closest('[data-step]'); if (b && !b.disabled) goStep(b.dataset.step); });
document.addEventListener('pointerdown', e => { const b = e.target.closest('[data-hint]'); if (!b) return; e.preventDefault(); const id = b.dataset.hint; hintLv[id] = (hintLv[id] || 0) + 1; $('coProblems').dataset.k = ''; renderCompany(); });
function renderGrowth() {
  const co = S.co;
  $('coAcq').innerHTML = `<button class="btn big org acq" id="acqBtn"><span>📣 Acquire users <b>+${acqAmt()}</b></span><i id="acqCd"></i></button>`;
  $('coGrowth').innerHTML = `<div class="ur"><h3>Marketing <span class="lvl">lv ${co.mkt}</span></h3><button class="btn" data-mkt="1" ${S.money < mktCost() ? 'disabled' : ''}>${money(mktCost())}</button><p>${co.mkt ? `Auto-acquires ${fmt(mktRate())} users/s. ` : ''}Next level: ${fmt((co.mkt + 1) * (co.mkt + 2) * 0.25 * (1 + 0.5 * S.exits))} users/s automatically, bigger button.</p></div>
    ${co.users >= 100 || co.ref ? `<div class="ur${isNew('ref')}"><h3>Referrals <span class="lvl">lv ${co.ref}</span></h3><button class="btn" data-ref="1" ${S.money < refCost() ? 'disabled' : ''}>${money(refCost())}</button><p>Users invite users: +${(0.4 * (co.ref + 1)).toFixed(1)}% users/s, only while ≥ 97% of requests are served.</p></div>` : '<div class="ur locked"><h3>🔒 Referrals</h3><p>Unlocks at 100 users.</p></div>'}
    ${co.done ? `<div class="ur big"><h3>🏁 Exit</h3><button class="btn" data-exit="1">Sell for ${money(valuation())}</button><p>Sell ${defOf().name}. You keep ${Math.round((1 - co.equity) * 100)}% of the value and get a permanent ×1.5 revenue boost.</p></div>` : ''}`;
  $('acqBtn').onclick = () => { if (Date.now() < co.cd) return; co.users += acqAmt(); co.cd = Date.now() + ACQ_CD; SIM = simulate(co, defOf()); renderCompany(); liveNodes(); };
}
function renderInvest() {
  const co = S.co, open = OFFERS.filter(o => co.offers[o.id]);
  const l = co.loan, lim = loanLimit();
  const loanHTML = l ? `<div class="ur loan"><h3>🏦 Bank loan <span class="lvl" id="loanTxt"></span></h3><button class="btn" data-repay="1">Repay now</button><div class="bar" style="grid-column:1/-1"><i id="loanBar"></i></div><p>${Math.round(LOAN.share * 100)}% of revenue goes to the bank automatically. Whatever is left when the timer ends is taken all at once.</p></div>`
    : `<div class="ur"><h3>🏦 Bank loan</h3><div class="acts"><button class="btn" data-loan="50">${money(Math.max(500, Math.floor(lim * 0.5 / 100) * 100))}</button><button class="btn org" data-loan="100">${money(lim)}</button></div><p>Pay back +${Math.round(LOAN.fee * 100)}% within ${LOAN.term / 60} min. ${Math.round(LOAN.share * 100)}% of revenue repays it automatically; the rest is due at the deadline. Limit grows with revenue.</p></div>`;
  $('coInvest').innerHTML = `<div class="sec-h" style="margin:0 0 4px"><h2>Funding</h2><span>you own ${Math.round((1 - co.equity) * 100)}%</span></div>` + loanHTML + (open.length ? open.map(o => co.offers[o.id] === 'open' ? `<div class="ur${isNew('o' + o.id)}"><h3>💰 ${o.name}</h3><div class="acts"><button class="btn" data-decl="${o.id}">Pass</button><button class="btn pri" data-acc="${o.id}">Take ${money(o.amt)}</button></div><p>Invests ${money(o.amt)} for ${Math.round(o.eq * 100)}% of the company. More cash now, a smaller cut at exit.</p></div>` : `<div class="ur"><h3>${o.name} <span class="tag ${co.offers[o.id] === 'taken' ? 'g' : ''}">${co.offers[o.id] === 'taken' ? 'raised ' + money(o.amt) : 'passed'}</span></h3></div>`).join('') : '') + (OFFERS.find(o => !co.offers[o.id]) ? `<div class="ur locked"><h3>Next: ${OFFERS.find(o => !co.offers[o.id]).name}</h3><p>Investors call at ${fmt(OFFERS.find(o => !co.offers[o.id]).at)} users.</p></div>` : '');
}
function renderInspector(liveOnly) {
  const box = $('coInsp'); if (!S.co) return;
  if (!sel) { if (!liveOnly) box.innerHTML = '<div class="nobug">Select a component or arrow to inspect it. Drag from a <b>●</b> to draw a connection; drag a component to move it.</div>'; return; }
  if (sel.kind === 'multi') {
    const ns = sel.ids.map(nodeById).filter(Boolean), del = ns.filter(n => n.type !== 'users'), refund = del.reduce((s, n) => s + (n.free ? 0 : Math.floor(COMP[n.type].cost * 0.5)), 0);
    const cnt = {}; ns.forEach(n => cnt[SHORT[n.type]] = (cnt[SHORT[n.type]] || 0) + 1);
    if (!liveOnly) { box.innerHTML = `<h3>${ns.length} components selected</h3><p>${Object.entries(cnt).map(([k, v]) => `${v}× ${k}`).join(', ')}</p><p class="lvl">Drag any of them to move the group. Shift-click to add or remove. Esc to clear.</p><button class="btn" id="delM" ${del.length ? '' : 'disabled'}>Delete ${del.length} + connections · refund ${money(refund)}</button>`; $('delM').onclick = () => delNodes(sel.ids); }
    return;
  }
  if (sel.kind === 'edge') {
    const e = S.co.edges.find(x => x.id === sel.id); if (!e) { sel = null; return renderInspector(); } const A = nodeById(e.a), B = nodeById(e.b), f = SIM ? SIM.edgeFlow[e.a + '>' + e.b] || 0 : 0;
    if (!liveOnly) box.innerHTML = `<h3>${nodeLabel(A)} → ${nodeLabel(B)}</h3><p id="inspLive"></p><button class="btn" id="delE">Delete connection</button>`;
    $('inspLive').textContent = A.type === 'db' && B.type === 'replica' ? 'Replication: copies every write to the replica.' : `${fmt(f)} req/s flowing.`;
    if (!liveOnly) $('delE').onclick = () => delEdge(e.id); return;
  }
  const n = nodeById(sel.id); if (!n) { sel = null; return renderInspector(); }
  if (n.type === 'users') { if (!liveOnly) box.innerHTML = `<h3>Users</h3><p>Everyone using ${defOf().name}. Each user sends ${RPS_PER_USER} requests/s, split by the traffic mix below.</p>`; return; }
  const c = COMP[n.type], load = SIM ? SIM.load[n.id] || 0 : 0, cap = capOf(n);
  if (!liveOnly) box.innerHTML = `<div style="display:flex;gap:8px;align-items:center"><span class="pi nt-${n.type}">${ico(n.type, 16)}</span><h3>${nodeLabel(n)}</h3><span class="lvl">size ${n.lvl + 1}/4</span></div><p>${c.d}</p><p id="inspLive" class="lvl"></p>
    <div class="acts" style="justify-content:flex-start"><button class="btn" id="learnN">📖 Learn</button>${n.lvl < 3 ? `<button class="btn" id="upN" ${wallet() < upCost(n) ? 'disabled' : ''}>Upgrade 2× · ${money(upCost(n))}</button>` : '<span class="tag">max size</span>'}<button class="btn" id="delN">Delete</button></div>`;
  $('inspLive').textContent = `Load ${fmt(load)} / ${fmt(cap)} per s (${Math.round(load / cap * 100)}%) · bill ${money(upkOf(n))}/s`;
  if (!liveOnly) { const u = $('upN'); if (u) u.onclick = () => upgradeNode(n.id); $('delN').onclick = () => delNode(n.id); $('learnN').onclick = () => openStudy(n.type); }
}
function tickCompany() {
  const co = S.co; if (!co) return; const d = defOf();
  SIM = simulate(co, d); const h = SIM.health;
  // queue backlog: busy workers leave jobs waiting; idle capacity drains them
  co.backlog = co.backlog || 0;
  const drained = Math.min(co.backlog, SIM.workerSpare); co.backlog -= drained;
  co.backlog += SIM.queued; const overflow = Math.max(0, co.backlog - SIM.queueCap); co.backlog -= overflow;
  const asyncRate = SIM.cls.filter(c => c.kind === 'async').reduce((s, c) => s + c.served, 0) + drained;
  co.qdelay = co.backlog > 1 ? co.backlog / Math.max(0.01, asyncRate) : 0;
  if (SIM.demand > 0) { const accepted = co.qdelay <= 120 ? SIM.queued - overflow : 0; SIM.health = Math.min(1, (SIM.served + accepted) / SIM.demand); }
  const auto = mktRate(), refg = SIM.health >= 0.97 ? co.users * 0.004 * co.ref : 0, churn = SIM.health < 0.97 ? co.users * (1 - SIM.health) * 0.03 : 0;
  co.users = Math.max(0, co.users + auto + refg - churn); co.growth = auto + refg; co.churn = churn;
  co.rev = (SIM.served + drained) * d.rpu * repMult(); co.upk = SIM.upkeep;
  S.money += co.rev; S.total += co.rev; spendCloud(co.upk);
  co.loanPay = 0;
  if (co.loan) {
    const l = co.loan, pay = Math.min(l.owed, co.rev * LOAN.share); l.owed -= pay; S.money -= pay; co.loanPay = pay; l.left--;
    if (l.owed < 0.5) { co.loan = null; toast('🏦 Loan fully repaid. Nice.'); coKey = ''; }
    else if (l.left <= 0) { S.money -= l.owed; toast(`🏦 Loan due: the bank took the remaining ${money(l.owed)}.`); co.loan = null; coKey = ''; }
  }
  if (S.money < 0) { co.neg = (co.neg || 0) + 1; if (co.neg === 1) { toast(`⚠ You're below $0! Bankrupt in ${LOAN.grace}s unless you fix it.`); if (!S.learned.includes('runway')) learn('runway'); } if (co.neg >= LOAN.grace) { bankrupt(); return; } } else co.neg = 0;
  OFFERS.forEach(o => { if (!co.offers[o.id] && co.users >= o.at) { co.offers[o.id] = 'open'; toast(`💰 ${o.name} wants to invest!`); } });
  if (!co.done && co.users >= d.goal && SIM.health >= 0.95) { co.done = true; modal(`<span class="cap">GOAL REACHED</span><h2>${fmt(d.goal)} users on ${d.name}</h2><p>Your architecture holds. You can exit now for <b>${money(valuation())}</b> (permanent ×1.5 revenue on future startups, and harder startups unlock), or keep growing to raise the price.</p>`, [{ label: 'Keep growing' }, { label: 'Exit now', cls: 'pri', fn: exitCo }]); }
  drawEdges(); liveNodes(); renderCompany(); renderTop();
}
function exitCo() {
  const co = S.co, d = defOf(), v = valuation() - (co.loan ? co.loan.owed : 0); S.money += v; undoStack.length = 0; S.exits = (S.exits || 0) + 1; S.founded = [...new Set([...(S.founded || []), co.sid])];
  S.co = null; S.phase = 'pick'; sel = null; setPhase(); save();
  modal(`<span class="cap">EXIT</span><h2>You sold ${d.name} for ${money(v)}</h2><p>Revenue on every future startup is now ×${fmt(repMult())}. ${S.exits === 1 ? 'Tier 2 startups (realtime and streaming) are unlocked.' : S.exits === 3 ? 'Tier 3 is unlocked.' : ''} Pick your next challenge: founding costs everything you have.</p>${coffeeNote('Enjoying ship_it()? It is free and ad-free.')}`, [{ label: 'Choose next startup', cls: 'pri' }]);
}
function acqTick() {
  const b = $('acqBtn'), i = $('acqCd'); if (!b || !S.co) return;
  const left = Math.max(0, S.co.cd - Date.now()); b.disabled = left > 0; i.style.width = (left / ACQ_CD * 100) + '%';
}
document.body.addEventListener('click', e => {
  const t = e.target.closest('[data-loan],[data-repay],[data-found],[data-mkt],[data-ref],[data-acc],[data-decl],[data-exit],[data-pick]'); if (!t) return;
  if (t.dataset.found) found(t.dataset.found);
  if (t.dataset.pick) openPicker();
  if (!S.co) return; const co = S.co;
  if (t.dataset.mkt && S.money >= mktCost()) { S.money -= mktCost(); co.mkt++; coKey = ''; renderCompany(); }
  if (t.dataset.ref && S.money >= refCost()) { S.money -= refCost(); co.ref++; if (!S.learned.includes('viral')) learn('viral'); coKey = ''; renderCompany(); }
  if (t.dataset.acc) { const o = OFFERS.find(x => x.id === t.dataset.acc); co.offers[o.id] = 'taken'; S.money += o.amt; co.equity = 1 - (1 - co.equity) * (1 - o.eq); toast(`Raised ${money(o.amt)}!`); coKey = ''; renderCompany(); renderTop(); }
  if (t.dataset.decl) { co.offers[t.dataset.decl] = 'passed'; coKey = ''; renderCompany(); }
  if (t.dataset.exit) exitCo();
  if (t.dataset.loan) takeLoan(+t.dataset.loan);
  if (t.dataset.repay) repayLoan();
  save();
});
document.addEventListener('keydown', e => {
  if (S.co && (e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z' && !$('modal').classList.contains('on') && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); undo(); return; }
  if (!S.co || !sel || $('modal').classList.contains('on') || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
  if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); sel.kind === 'multi' ? delNodes(sel.ids) : sel.kind === 'node' ? delNode(sel.id) : delEdge(sel.id); }
  if (e.key === 'Escape') select(null);
});

/* ---------- journal ---------- */
function renderJournal() {
  $('journal').innerHTML = Object.keys(CONCEPTS).map(k => { const c = CONCEPTS[k], on = S.learned.includes(k); return on ? `<div class="card concept"><span class="cap">${['clientServer', 'bottleneck', 'vertical', 'horizontal', 'cache', 'replicas', 'founding', 'database', 'cdn', 'blob', 'queue', 'workers', 'websocket', 'geo', 'viral', 'debt', 'runway'].includes(k) ? 'SYSTEMS' : 'CODE'}</span><h3>${c.t}</h3><p>${c.d.replace(/`([^`]+)`/g, '<code>$1</code>')}</p><pre class="src" style="min-height:0">${c.c.replace(/</g, '&lt;')}</pre></div>` : `<div class="card dim"><h3>🔒 ???</h3><p>Not discovered yet.</p></div>`; }).join('');
}

/* ---------- theme + reset ---------- */
const SUN = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>';
const MOON = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
const curTheme = () => document.documentElement.dataset.theme || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
const paintThemeBtn = () => { $('themeBtn').innerHTML = curTheme() === 'dark' ? SUN : MOON; };
paintThemeBtn();
$('themeBtn').onclick = () => {
  const t = curTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = t; paintThemeBtn();
  // shared with the course so both pages stay in the same theme
  try { const k = 'two-weeks-to-scale-v2', cs = JSON.parse(localStorage.getItem(k) || '{}'); cs.theme = t; localStorage.setItem(k, JSON.stringify(cs)); } catch (e) {}
  if (courseFrame) try { courseFrame.contentWindow.postMessage({ ship: 'theme', theme: t }, location.origin); } catch (e) {}
};
$('resetBtn').onclick = () => modal('<h2>Reset the game?</h2><p>This wipes money, unlocks, challenges and your startup, and starts over from an empty program. Course progress is kept. It cannot be undone.</p>', [
  { label: 'Cancel' },
  { label: 'Yes, reset', cls: 'org', fn: () => { try { localStorage.removeItem(SAVE); } catch (e) {} S = BASE(); sel = null; termLines.length = 0; $('mbox').classList.remove('wide'); boot(); } },
]);

/* ---------- boot + loop ---------- */
function boot() {
  firstPaint = true; shown.clear(); shopKey = ''; trackerKey = 'x'; syncBugs(); renderTracker();
  renderTabs(); mainEd.render(); renderShop(true); renderJournal(); renderTop();
  setPhase();
  firstPaint = false;
}
load();
const studied = !!S.leftForCourse; delete S.leftForCourse;
const away = studied ? 0 : Math.min(4 * 3600, (Date.now() - (S.last || Date.now())) / 1000);
if (away > 30 && (S.rate > 0 || S.co)) { const g = (S.co ? Math.max(0, S.co.rev - S.co.upk) : S.rate) * away * 0.5; S.money += g; S.total += g; setTimeout(() => toast(`Welcome back! Earned ${money(g)} while away.`), 400); }
bindPalette(); animatePackets();
window.addEventListener('pagehide', () => save());
boot();
log('> booting tick() …', 'g');
let acc = 0, sacc = 0, prev = performance.now(), saveAcc = 0, shopAcc = 0;
setInterval(() => {
  const now = performance.now(), dt = Math.min(1, (now - prev) / 1000); prev = now;
  acc += dt; sacc += dt; saveAcc += dt; shopAcc += dt;
  const period = 1 / tps(); let guard = 0; if (S.co || S.phase === 'pick') acc = 0; while (acc >= period && guard++ < 10) { acc -= period; tick(); }
  if (libOpen() || hostHidden) { acc = 0; sacc = 0; if (S.co) S.co.cd += 100; }
  if (sacc >= 1) { sacc -= 1; tickCompany(); if (S.phase === 'pick') renderPicker(); }
  acqTick();
  if (shopAcc >= 0.25) { shopAcc = 0; if (!S.co) { renderShop(); mentor(); } }
  if (saveAcc >= 5) { saveAcc = 0; save(); }
}, 100);
}
