// The game's Library reads lessons straight from the course content (single source of truth).
import '../course/content-1.js';
import '../course/content-2.js';
import '../course/content-3.js';
import '../course/content-4.js';
import '../course/extras.js';
import '../course/extras-ai.js';
import '../course/deep-all.js';
import '../course/names.js';

const clean = body => body.filter(b => typeof b === 'string' || !(b.diagram || b.widget));
const days = (window.DAYS || []).slice().sort((a, b) => a.n - b.n).map(d => ({
  n: d.n, title: d.title, tagline: d.tagline, goals: d.goals || [], cheat: d.cheat || [], cards: d.cards || [],
  quiz: (d.quiz || []).map(q => ({ q: q.q, opts: q.opts, a: q.a, why: q.why })),
  lessons: d.lessons.map(l => ({ title: l.title, min: l.min, body: clean(l.body) })),
}));
const extra = (window.EXTRA || []).map(e => ({ id: e.id, title: e.title, min: e.min, body: clean(e.body) }));
export const COURSE = { days, extra };
