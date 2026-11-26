// Code-phase engine: interprets block programs and scores challenges.
// ===== ENGINE (shared by game + tests) =====
const COST = { earn: 1, fix: 4, if: 1, commit: 1, deploy: 2, repeat: 0 };
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function countBlocks(list) { let c = 0; for (const n of list) { c++; if (n.body) c += countBlocks(n.body); if (n.then) c += countBlocks(n.then); if (n.else) c += countBlocks(n.else); } return c; }
function evalCond(n, st) {
  if (n.cond === 'bug') return st.bugs > 0;
  if (n.cond === 'nobug') return st.bugs === 0;
  if (n.cond === 'changes') return st.changes >= (n.k || 1);
  return false;
}
// env: {cpu, earnValue, bugChance, deployValue, maxLoop}
// st: {bugs, changes}  (persists between ticks)
function runTick(prog, env, st, rng) {
  const r = { earned: 0, ops: 0, bugs: 0, fixes: 0, wasted: 0, blocked: 0, lost: 0, rollbacks: 0, deploys: 0, halted: false, counts: {}, bugFrom: [] };
  function pay(c) { if (r.ops + c > env.cpu) { r.halted = true; return false; } r.ops += c; return true; }
  function maybeBug(src) { if (env.bugChance > 0 && rng() < env.bugChance) { st.bugs++; r.bugs++; r.bugFrom.push(src); } }
  function exec(list) {
    for (const n of list) {
      if (r.halted) return;
      const c = COST[n.t] || 0;
      if (!pay(c)) return;
      r.counts[n.id] = (r.counts[n.id] || 0) + 1;
      switch (n.t) {
        case 'earn':
          if (st.bugs > 0) { r.wasted++; r.blocked++; } else { r.earned += env.earnValue; maybeBug('earn'); }
          break;
        case 'fix':
          if (st.bugs > 0) { st.bugs--; r.fixes++; } else r.wasted++;
          break;
        case 'repeat': {
          const times = Math.max(1, Math.min(n.n || 1, env.maxLoop));
          for (let i = 0; i < times && !r.halted; i++) exec(n.body);
          break;
        }
        case 'if':
          exec(evalCond(n, st) ? n.then : n.else);
          break;
        case 'commit':
          st.changes++; maybeBug('commit');
          break;
        case 'deploy':
          if (st.changes === 0) { r.wasted++; break; }
          if (st.bugs > 0) { r.lost += st.changes; st.changes = 0; r.rollbacks++; }
          else { r.earned += st.changes * st.changes * env.deployValue; st.changes = 0; r.deploys++; }
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
    const rng = mulberry32(s * 7919 + 13), st = { bugs: 0, changes: 0 };
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
  { id: 'c2', tier: 'Warm-up', title: 'Loops inside loops', blocks: ['earn', 'repeat'], maxBlocks: 3, seeds: 1,
    env: { cpu: 100, earnValue: 1, bugChance: 0, deployValue: 1, maxLoop: 5 }, target: 25,
    desc: 'Loops are capped at 5 iterations. Earn $25 in one tick with 3 blocks.', reward: { mult: 1.5 } },
  { id: 'c3', tier: 'Core', title: 'Bug triage', blocks: ['earn', 'repeat', 'fix', 'if'], maxBlocks: 6, seeds: 20,
    env: { cpu: 40, earnValue: 1, bugChance: 0.2, deployValue: 1, maxLoop: 20 }, target: 11,
    desc: 'Each earn() has a 20% chance to create a bug. fix() costs 4 ops. Average $11 per tick on a 40-op CPU.', reward: { unlock: 'if' } },
  { id: 'c4', tier: 'Core', title: 'Ship in batches', blocks: ['repeat', 'fix', 'if', 'commit', 'deploy'], maxBlocks: 6, seeds: 20,
    env: { cpu: 40, earnValue: 1, bugChance: 0.1, deployValue: 1, maxLoop: 30 }, target: 120,
    desc: 'deploy() pays changes². Deploying with a live bug rolls everything back. Average $120 per tick.', reward: { unlock: 'commit' } },
  { id: 'c5', tier: 'Hard', title: 'Zero waste', blocks: ['earn', 'repeat', 'fix', 'if'], maxBlocks: 5, seeds: 30,
    env: { cpu: 30, earnValue: 1, bugChance: 0.35, deployValue: 1, maxLoop: 30 }, target: 8.5,
    desc: '35% bug rate, 30 ops, 5 blocks. Average $8.50 per tick. Every wasted op hurts.', reward: { mult: 2 } },
  { id: 'c6', tier: 'Hard', title: 'Release train', blocks: ['repeat', 'fix', 'if', 'commit', 'deploy'], maxBlocks: 7, seeds: 20, ticks: 10,
    env: { cpu: 12, earnValue: 1, bugChance: 0.08, deployValue: 1, maxLoop: 12 }, target: 1000,
    desc: 'Only 12 ops per tick, but changes persist between ticks. Earn $1,000 over 10 ticks.', reward: { mult: 2 } },
];
export { runTick, runChallenge, CHALLENGES, countBlocks, mulberry32 };
