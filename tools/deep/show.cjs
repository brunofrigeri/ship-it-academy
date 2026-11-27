// node tools/deep/show.cjs <day|extraId...> : print what a lesson already covers (compact)
global.window = {};
for (const f of ['content-1', 'content-2', 'content-3', 'content-4', 'extras', 'extras-ai']) require('../../src/course/' + f + '.js');
const cut = (s, n = 160) => (s.length > n ? s.slice(0, n) + '…' : s);
const show = (title, body) => {
  console.log('\n## ' + title);
  for (const b of body) {
    if (typeof b === 'string') console.log('- ' + cut(b));
    else if (b.h) console.log('### ' + b.h);
    else if (b.table) console.log('[table] ' + cut(b.table.head.join(' | ') + ' :: ' + b.table.rows.map(r => r[0]).join(', ')));
    else console.log('[' + Object.keys(b)[0] + '] ' + cut(JSON.stringify(Object.values(b)[0])));
  }
};
for (const a of process.argv.slice(2)) {
  if (/^\d+$/.test(a)) { const d = window.DAYS.find(d => d.n === +a); d.lessons.forEach((l, i) => show(`D${a}.${i} ${l.title}`, l.body)); }
  else { const e = window.EXTRA.find(e => e.id === a); show('X ' + e.title, e.body); }
}
