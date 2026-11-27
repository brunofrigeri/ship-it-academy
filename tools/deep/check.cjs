// node tools/deep/check.cjs : runs pure JS samples in all deep-*.js files and parse-checks the rest
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '../../src/course');
let ran = 0, parsed = 0, bad = 0;
for (const f of fs.readdirSync(dir).filter(f => /^deep-(?!all).*\.js$/.test(f))) {
  global.window = { DAYS: Array.from({ length: 14 }, (_, i) => ({ n: i + 1, lessons: Array.from({ length: 8 }, () => ({ body: [] })) })), EXTRA: [] };
  const src = fs.readFileSync(path.join(dir, f), 'utf8');
  const m = src.match(/var extra = ([\s\S]*?);\n  (extra\.forEach|\(window\.EXTRA)/);
  const data = JSON.parse(m[1]);
  const lists = Array.isArray(data) ? data : Object.values(data);
  lists.forEach((blocks, li) => blocks.forEach(b => {
    if (!b.code || !['js', 'javascript'].includes(b.lang)) return;
    const env = /\b(app|db|req|res|require|fetch|document|performance|WebSocket|EventSource|window|navigator|localStorage|React|useState|useEffect|useMutation|useQuery|queryClient|api|redis|kafka|queue|crypto\.subtle|self|caches|bus|render|import|export|process|setInterval)\b/.test(b.code);
    try {
      if (env) { new Function('return async () => {\n' + b.code.replace(/^\s*(import|export) .*$/gm, '') + '\n}'); parsed++; }
      else { const out = []; const log = console.log; console.log = (...a) => out.push(a.join(' ')); try { new Function(b.code)(); } finally { console.log = log; } ran++; if (process.argv[2] === '-v') console.log(`[${f}#${li}]`, out.join(' | ')); }
    } catch (e) { bad++; console.log(`FAIL ${f} lesson ${li}: ${e.message}\n${b.code.slice(0, 200)}`); }
  }));
}
console.log(`ran ${ran}, parse-checked ${parsed}, failed ${bad}`);
process.exit(bad ? 1 : 0);
