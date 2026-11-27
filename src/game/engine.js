// Code-phase engine: interprets block programs and scores challenges.
// ===== ENGINE (shared by game + tests) =====
const COST = { earn: 1, fix: 4, if: 1, commit: 1, deploy: 2, repeat: 0, func: 0, call: 1, each: 1, ship: 2, try: 1 };
const KIDS = ['body', 'then', 'else', 'catch'];
const MAX_ORDERS = 40;
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function countBlocks(list) { let c = 0; for (const n of list) { c++; for (const k of KIDS) if (n[k]) c += countBlocks(n[k]); } return c; }
function findFunc(list) { for (const n of list) { if (n.t === 'func') return n; for (const k of KIDS) if (n[k]) { const f = findFunc(n[k]); if (f) return f; } } return null; }
function evalCond(n, st) {
  if (n.cond === 'bug') return st.bugs > 0;
  if (n.cond === 'nobug') return st.bugs === 0;
  if (n.cond === 'changes') return st.changes >= (n.k || 1);
  if (n.cond === 'orders') return (st.orders || 0) > 0;
  return false;
}
// env: {cpu, earnValue, bugChance, deployValue, maxLoop, orderRate, orderValue}
// st: {bugs, changes, orders}  (persists between ticks)
const THROWN = {};
function runTick(prog, env, st, rng) {
  const r = { earned: 0, ops: 0, bugs: 0, fixes: 0, wasted: 0, blocked: 0, lost: 0, rollbacks: 0, deploys: 0, halted: false, counts: {}, bugFrom: [], caught: 0, shipped: 0, overflow: 0, stack: false, arrived: 0,
    // diagnostics: per-block money and ops, why ops were wasted, where the CPU ran out, which loops hit the bit limit
    money: {}, opsBy: {}, why: {}, wastedOps: 0, haltAt: null, capped: {}, from: { earn: 0, ship: 0, deploy: 0 }, opsType: {} };
  if (env.orderRate) { const before = st.orders || 0, next = before + env.orderRate; st.orders = Math.min(MAX_ORDERS, next); r.arrived = st.orders - before; r.overflow = next - st.orders; }
  const fn = findFunc(prog);
  let tryDepth = 0, depth = 0;
  function pay(c, n) { if (r.ops + c > env.cpu) { r.halted = true; if (!r.haltAt) r.haltAt = n.id; return false; } r.ops += c; r.opsBy[n.id] = (r.opsBy[n.id] || 0) + c; r.opsType[n.t] = (r.opsType[n.t] || 0) + c; return true; }
  function waste(n, why) { r.wasted++; r.wastedOps += COST[n.t] || 0; r.why[why] = (r.why[why] || 0) + 1; }
  function gain(n, v, src) { r.earned += v; r.money[n.id] = (r.money[n.id] || 0) + v; r.from[src] += v; }
  // a bug inside try { } becomes an exception: it is caught instead of opening a bug, and the rest of the try body is skipped
  function maybeBug(src) { if (env.bugChance > 0 && rng() < env.bugChance) { if (tryDepth > 0) { r.caught++; throw THROWN; } st.bugs++; r.bugs++; r.bugFrom.push(src); } }
  function exec(list) {
    for (const n of list) {
      if (r.halted) return;
      const c = COST[n.t] || 0;
      if (!pay(c, n)) return;
      r.counts[n.id] = (r.counts[n.id] || 0) + 1;
      switch (n.t) {
        case 'earn':
          if (st.bugs > 0) { waste(n, 'blocked'); r.blocked++; } else { maybeBug('earn'); gain(n, env.earnValue, 'earn'); }
          break;
        case 'fix':
          if (st.bugs > 0) { st.bugs--; r.fixes++; } else waste(n, 'fixIdle');
          break;
        case 'repeat': {
          const times = Math.max(1, Math.min(n.n || 1, env.maxLoop)); if ((n.n || 1) > env.maxLoop) r.capped[n.id] = true;
          // an iteration that used no ops (empty body, only a function definition) changes nothing: skip the rest instead of spinning
          for (let i = 0; i < times && !r.halted; i++) { const o = r.ops; exec(n.body); if (r.ops === o) break; }
          break;
        }
        case 'each': { // for (const order of orders): runs once per order waiting right now, no bits needed
          const times = Math.min(st.orders || 0, MAX_ORDERS); if (!times) { r.why.eachEmpty = (r.why.eachEmpty || 0) + 1; r.wastedOps += COST.each; }
          for (let i = 0; i < times && !r.halted; i++) { const o = r.ops; exec(n.body); if (r.ops === o) break; }
          break;
        }
        case 'ship':
          if (!(st.orders > 0)) { waste(n, 'shipEmpty'); break; }
          if (st.bugs > 0) { waste(n, 'blocked'); r.blocked++; break; }
          st.orders--; maybeBug('ship'); gain(n, env.orderValue || 0, 'ship'); r.shipped++;
          break;
        case 'if':
          exec(evalCond(n, st) ? n.then : n.else);
          break;
        case 'func': break; // a definition does nothing until it is called
        case 'call':
          if (!fn) { waste(n, 'noFunc'); break; }
          if (depth >= 8) { r.stack = true; r.halted = true; return; }
          depth++; exec(fn.body); depth--;
          break;
        case 'try':
          tryDepth++;
          try { exec(n.body); tryDepth--; } catch (e) { tryDepth--; if (e !== THROWN) throw e; exec(n.catch || []); }
          break;
        case 'commit': // the release branch holds at most env.maxChanges changes; more commits are wasted
          if (env.maxChanges && st.changes >= env.maxChanges) { waste(n, 'full'); r.full = true; break; }
          maybeBug('commit'); st.changes++;
          break;
        case 'deploy':
          if (st.changes === 0) { waste(n, 'deployEmpty'); break; }
          if (st.bugs > 0) { r.lost += st.changes; st.changes = 0; r.rollbacks++; r.why.rollback = (r.why.rollback || 0) + 1; }
          else { gain(n, st.changes * st.changes * env.deployValue, 'deploy'); st.changes = 0; r.deploys++; }
          break;
      }
    }
  }
  exec(prog);
  return r;
}
function runChallenge(ch, prog) {
  let total = 0, worst = Infinity;
  for (let s = 1; s <= ch.seeds; s++) {
    const rng = mulberry32(s * 7919 + 13), st = { bugs: 0, changes: 0, orders: 0 };
    let e = 0;
    for (let t = 0; t < (ch.ticks || 1); t++) e += runTick(prog, ch.env, st, rng).earned;
    total += e; worst = Math.min(worst, e);
  }
  return { avg: total / ch.seeds, worst };
}
const CHALLENGES = [
  { id: 'c1', tier: 'Warm-up', title: 'Stop copy-pasting', blocks: ['earn', 'repeat'], maxBlocks: 2, seeds: 1,
    env: { cpu: 20, earnValue: 1, bugChance: 0, deployValue: 1, maxLoop: 10 }, target: 10,
    desc: 'Earn $10 in one tick using only 2 blocks.', reward: { unlock: 'repeat' } },
  { id: 'c2', tier: 'Warm-up', need: 'repeat', title: 'Loops inside loops', blocks: ['earn', 'repeat'], maxBlocks: 3, seeds: 1,
    env: { cpu: 100, earnValue: 1, bugChance: 0, deployValue: 1, maxLoop: 5 }, target: 25,
    desc: 'Loops are capped at 5 iterations. Earn $25 in one tick with 3 blocks.', reward: { mult: 1.5 } },
  { id: 'c3', tier: 'Core', need: 'bugs', title: 'Bug triage', blocks: ['earn', 'repeat', 'fix', 'if'], maxBlocks: 6, seeds: 20,
    env: { cpu: 40, earnValue: 1, bugChance: 0.2, deployValue: 1, maxLoop: 20 }, target: 11,
    desc: 'Each earn() has a 20% chance to create a bug. fix() costs 4 ops. Average $11 per tick on a 40-op CPU.', reward: { unlock: 'if' } },
  { id: 'c5', tier: 'Core', need: 'if', title: 'Zero waste', blocks: ['earn', 'repeat', 'fix', 'if'], maxBlocks: 5, seeds: 30,
    env: { cpu: 30, earnValue: 1, bugChance: 0.35, deployValue: 1, maxLoop: 30 }, target: 8.5,
    desc: '35% bug rate, 30 ops, 5 blocks. Average $8.50 per tick. Every wasted op hurts.', reward: { mult: 2 } },
  { id: 'c7', tier: 'Core', need: 'if', title: 'Write a helper', blocks: ['earn', 'repeat', 'fix', 'if', 'func', 'call'], maxBlocks: 7, seeds: 20, must: ['func', 'call'],
    env: { cpu: 40, earnValue: 1, bugChance: 0.2, deployValue: 1, maxLoop: 4 }, target: 7,
    desc: 'Put the "fix or earn" logic in function helper(), then call it. 20% bug rate, loops capped at 4. Average $7 per tick.', reward: { unlock: 'func' } },
  { id: 'c8', tier: 'Core', need: 'func', title: 'Clear the backlog', blocks: ['earn', 'repeat', 'each', 'ship'], maxBlocks: 4, seeds: 1, ticks: 5,
    env: { cpu: 30, earnValue: 1, bugChance: 0, deployValue: 1, maxLoop: 3, orderRate: 6, orderValue: 5 }, target: 160,
    desc: '6 orders arrive every tick and ship() pays $5 (2 ops). Shipping when the array is empty wastes ops. Earn $160 over 5 ticks.', reward: { unlock: 'each' } },
  { id: 'c9', tier: 'Hard', need: 'each', title: 'Fail gracefully', blocks: ['earn', 'repeat', 'fix', 'if', 'try'], maxBlocks: 4, seeds: 30,
    env: { cpu: 30, earnValue: 1, bugChance: 0.3, deployValue: 1, maxLoop: 20 }, target: 9.5,
    desc: '30% bug rate, 30 ops, 4 blocks. if/else tops out around $8.50. Catch errors instead: average $9.50 per tick.', reward: { unlock: 'try' } },
  { id: 'c4', tier: 'Hard', need: 'try', title: 'Ship in batches', blocks: ['repeat', 'fix', 'if', 'commit', 'deploy'], maxBlocks: 6, seeds: 20,
    env: { cpu: 40, earnValue: 1, bugChance: 0.1, deployValue: 1, maxLoop: 30 }, target: 120,
    desc: 'deploy() pays changes². Deploying with a live bug rolls everything back. Average $120 per tick.', reward: { unlock: 'commit' } },
  { id: 'c6', tier: 'Hard', need: 'commit', title: 'Release train', blocks: ['repeat', 'fix', 'if', 'commit', 'deploy'], maxBlocks: 7, seeds: 20, ticks: 10,
    env: { cpu: 12, earnValue: 1, bugChance: 0.08, deployValue: 1, maxLoop: 12 }, target: 1000,
    desc: 'Only 12 ops per tick, but changes persist between ticks. Earn $1,000 over 10 ticks.', reward: { mult: 2 } },
];
export { runTick, runChallenge, CHALLENGES, countBlocks, mulberry32, KIDS, MAX_ORDERS, COST };
