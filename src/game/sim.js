// Startup-phase traffic simulation: routes request kinds through the player's diagram.
// ===== SYSTEM DESIGN SIM (shared by game + tests) =====
const COMP = {
  users:   { name: 'Users', cap: Infinity, cost: 0, upk: 0 },
  lb:      { name: 'Load balancer', cap: 4000, cost: 1500, upk: 2, concept: 'horizontal', d: 'Spreads requests evenly across app servers or gateways.' },
  app:     { name: 'App server', cap: 100, cost: 400, upk: 1, concept: 'clientServer', d: 'Runs your code. Every non-cached request passes through one.' },
  db:      { name: 'Database', cap: 150, cost: 600, upk: 2, concept: 'database', d: 'Source of truth (SQL). Writes cost 2×.' },
  replica: { name: 'Read replica', cap: 150, cost: 1200, upk: 2, concept: 'replicas', d: 'Serves reads. Must be fed by a Database (draw DB → Replica).' },
  cache:   { name: 'Cache', cap: 3000, cost: 2000, upk: 3, concept: 'cache', d: 'In-memory (Redis). Serves 85% of reads before they reach the DB.' },
  cdn:     { name: 'CDN', cap: 30000, cost: 4000, upk: 5, concept: 'cdn', d: 'Edge servers near users. Serves 92% of media before your origin.' },
  blob:    { name: 'Blob storage', cap: 2000, cost: 1000, upk: 2, concept: 'blob', d: 'Object storage (S3) for photos, files, audio and video.' },
  queue:   { name: 'Queue', cap: 4000, cost: 1500, upk: 2, concept: 'queue', d: 'Accepts jobs instantly and buffers them (up to 60 s of its intake) until Workers are free. Also acts as a pub/sub broker for realtime messages.' },
  worker:  { name: 'Worker', cap: 60, cost: 600, upk: 1, concept: 'workers', d: 'Background processor that consumes jobs from a queue.' },
  ws:      { name: 'WebSocket gateway', cap: 2000, cost: 2500, upk: 3, concept: 'websocket', d: 'Holds persistent connections so servers can push instantly.' },
  geo:     { name: 'Geo index', cap: 3000, cost: 2500, upk: 3, concept: 'geo', d: 'Spatial index (e.g. Redis GEO) for "who is near me?" queries.' },
};
const PALETTE = ['lb', 'app', 'db', 'replica', 'cache', 'cdn', 'blob', 'queue', 'worker', 'ws', 'geo'];
// which component may send requests to which
const ALLOWED = {
  users: ['lb', 'app', 'cdn', 'ws'], cdn: ['lb', 'app', 'blob'], lb: ['app', 'ws'], ws: ['queue', 'app'],
  app: ['cache', 'db', 'replica', 'blob', 'queue', 'geo'], cache: ['db', 'replica'], queue: ['worker'],
  worker: ['db', 'blob', 'cache', 'geo'], db: ['replica'], replica: [], blob: [], geo: [],
};
// request kinds: which components they may travel through, where they finish, cache layers, per-component cost weight
const KINDS = {
  read:     { path: ['cdn', 'lb', 'app', 'cache', 'db', 'replica'], term: ['db', 'replica'], hit: { cache: 0.85 }, w: {} },
  write:    { path: ['cdn', 'lb', 'app', 'db'], term: ['db'], hit: {}, w: { db: 2 } },
  media:    { path: ['cdn', 'lb', 'app', 'blob'], term: ['blob'], hit: { cdn: 0.92 }, w: { app: 6 } },
  upload:   { path: ['cdn', 'lb', 'app', 'blob'], term: ['blob'], hit: {}, w: { app: 3 } },
  async:    { path: ['cdn', 'lb', 'app', 'queue', 'worker'], term: ['worker'], hit: {}, w: { worker: 4 } },
  realtime: { path: ['cdn', 'lb', 'ws', 'app', 'queue', 'db'], term: ['queue', 'db'], hit: {}, w: { app: 3, db: 4 } },
  geo:      { path: ['cdn', 'lb', 'app', 'geo', 'db'], term: ['geo', 'db'], hit: {}, w: { db: 5 } },
};
const KIND_NEEDS = { read: 'a Database', write: 'a Database', media: 'Blob storage', upload: 'Blob storage', async: 'a Queue → Worker', realtime: 'a Queue (or Database)', geo: 'a Geo index (or Database)' };
const RPS_PER_USER = 0.1;
// the free starter App server / Database are small free-tier instances (20% capacity) until upgraded
const FREE_CAP = 0.2;
const capOf = n => COMP[n.type].cap * Math.pow(2, n.lvl || 0) * (n.free && !n.lvl ? FREE_CAP : 1);
const upkOf = n => (n.free && !n.lvl) ? 0 : COMP[n.type].upk * Math.pow(2, n.lvl || 0);

// the traffic mix: the startup's base classes plus features launched while it grows, shares normalised to 100%
function classesOf(co, def) {
  const extra = (def.features || []).filter(f => (co.launched || []).includes(f.id)).map(f => ({ kind: f.kind, label: f.label, share: f.share }));
  const all = def.classes.concat(extra), tot = all.reduce((a, c) => a + c.share, 0);
  return all.map(c => ({ ...c, share: c.share / tot }));
}
function simulate(co, def) {
  const byId = {}; co.nodes.forEach(n => byId[n.id] = n);
  const out = {}; co.nodes.forEach(n => out[n.id] = []);
  const fed = new Set();
  co.edges.forEach(e => { const A = byId[e.a], B = byId[e.b]; if (!A || !B) return; if (A.type === 'db' && B.type === 'replica') fed.add(B.id); else out[A.id].push(B.id); });
  if (out.users) out.users = out.users.slice(0, 1); // users reach the system through one entry point
  const demand = co.users * RPS_PER_USER * (co.spike || 1);
  let ratio = {}; co.nodes.forEach(n => ratio[n.id] = 1);
  let R;
  for (let iter = 0; iter < 5; iter++) {
    const load = {}, edgeFlow = {}, thru = {}, hitN = {}, loadK = {}; co.nodes.forEach(n => { load[n.id] = 0; thru[n.id] = 0; hitN[n.id] = 0; loadK[n.id] = {}; });
    const cls = classesOf(co, def).map(c => ({ ...c, demand: demand * c.share, served: 0, dropped: 0, failed: 0, queued: 0, heavy: {} }));
    for (const c of cls) {
      const K = KINDS[c.kind], memo = {};
      const isTerm = id => { const t = byId[id].type; return !byId[id].down && K.term.includes(t) && !(t === 'replica' && !fed.has(id)); };
      const canReach = id => {
        if (id in memo) return memo[id];
        memo[id] = false; const t = byId[id].type;
        memo[id] = isTerm(id) || (t in K.hit) || validNext(id).length > 0; return memo[id];
      };
      const validNext = id => out[id].filter(b => !byId[b].down && ALLOWED[byId[id].type].includes(byId[b].type) && K.path.includes(byId[b].type) && canReach(b));
      const push = (id, f) => {
        if (f <= 1e-9) return 0;
        const n = byId[id], t = n.type; let o = f;
        if (t !== 'users') { const w = K.w[t] || 1; load[id] += f * w; loadK[id][c.kind] = (loadK[id][c.kind] || 0) + f * w; thru[id] += f; if (w > 1) c.heavy[t] = true; o = f * ratio[id]; if (t === 'worker') c.queued += f - o; else c.dropped += f - o; }
        if (t in K.hit) {
          c.served += o * K.hit[t]; hitN[id] += o * K.hit[t]; const rest = o * (1 - K.hit[t]); const nx = validNext(id);
          if (nx.length) { spread(id, nx, rest); return 0; } return rest;
        }
        if (isTerm(id)) { c.served += o; return 0; }
        const nx = validNext(id); if (!nx.length) { c.failed += o; return 0; }
        spread(id, nx, o); return 0;
      };
      const spread = (from, nx, f) => {
        const hits = nx.filter(b => byId[b].type in K.hit), rest = nx.filter(b => !(byId[b].type in K.hit));
        const send = (list, amt) => { let miss = 0; list.forEach(b => { const k = from + '>' + b; edgeFlow[k] = (edgeFlow[k] || 0) + amt / list.length; miss += push(b, amt / list.length); }); return miss; };
        if (hits.length) { const miss = send(hits, f); if (miss > 1e-9) { if (rest.length) send(rest, miss); else c.failed += miss; } }
        else send(rest, f);
      };
      push('users', c.demand);
    }
    const newRatio = {}; co.nodes.forEach(n => newRatio[n.id] = n.type === 'users' ? 1 : Math.min(1, capOf(n) / Math.max(1e-9, load[n.id])));
    // damped update for stability
    co.nodes.forEach(n => ratio[n.id] = iter === 0 ? newRatio[n.id] : (ratio[n.id] + newRatio[n.id]) / 2);
    R = { load, loadK, edgeFlow, thru, hitN, cls, ratio: newRatio, fed };
  }
  const served = R.cls.reduce((s, c) => s + c.served, 0);
  R.demand = demand; R.served = served; R.health = demand > 0 ? served / demand : 1;
  R.queued = R.cls.reduce((s, c) => s + c.queued, 0);
  // spare worker capacity, in jobs/s (async jobs cost 4 units each)
  R.workerSpare = co.nodes.filter(n => n.type === 'worker').reduce((s, n) => s + Math.max(0, capOf(n) - R.load[n.id]) / (KINDS.async.w.worker || 1), 0);
  R.queueCap = co.nodes.filter(n => n.type === 'queue').reduce((s, n) => s + capOf(n) * 60, 0);
  R.upkeep = co.nodes.reduce((s, n) => s + upkOf(n), 0);
  return R;
}
const STARTUPS = [
  { id: 'shortly', tier: 1, name: 'Shortly', style: 'Bitly-style URL shortener', goal: 15000, features: [{ id: 'f0', at: 0.35, kind: 'async', label: 'Click analytics', share: 0.15, title: 'New feature: click analytics', text: 'Link owners want to see every click. Each redirect now also records a click, but nobody waits for that: it can happen in the background.' }, { id: 'f1', at: 0.65, kind: 'media', label: 'QR code images', share: 0.1, title: 'New feature: QR codes', text: 'Every link now has a QR code image. Images are static files that never change.' }], rpu: 1,
    blurb: 'One write creates a link; then it is clicked thousands of times. The same few rows get read over and over: perfect for a cache.',
    classes: [{ kind: 'read', label: 'Redirect a link', share: 0.9 }, { kind: 'write', label: 'Create a link', share: 0.1 }] },
  { id: 'tickit', tier: 1, name: 'Tickit', style: 'Todo-list app', goal: 12000, features: [{ id: 'f0', at: 0.35, kind: 'upload', label: 'Attachments', share: 0.15, title: 'New feature: attachments', text: 'Users can attach files to tasks. Files are big: they do not belong in your database or on your app servers.' }, { id: 'f1', at: 0.65, kind: 'async', label: 'Reminder emails', share: 0.15, title: 'New feature: reminders', text: 'Due tasks send reminder emails. Sending email is slow, and nobody is waiting for it.' }], rpu: 1,
    blurb: 'Every tick of a checkbox is a write. Writes cost the database twice as much, and caches do not help them.',
    classes: [{ kind: 'write', label: 'Add & check off tasks', share: 0.5 }, { kind: 'read', label: 'Open my lists', share: 0.5 }] },
  { id: 'inkwell', tier: 1, name: 'Inkwell', style: 'Medium-style blog platform', goal: 15000, features: [{ id: 'f0', at: 0.35, kind: 'async', label: 'Email new posts', share: 0.15, title: 'New feature: email subscribers', text: 'Every new post is emailed to the author’s followers. One click can mean thousands of emails.' }, { id: 'f1', at: 0.65, kind: 'upload', label: 'Cover image uploads', share: 0.1, title: 'New feature: cover images', text: 'Writers upload cover images for their posts.' }], rpu: 1,
    blurb: 'Articles are mostly images, fonts and scripts that never change. Serve them from the edge, not from your servers.',
    classes: [{ kind: 'media', label: 'Images & assets', share: 0.5 }, { kind: 'read', label: 'Read articles', share: 0.45 }, { kind: 'write', label: 'Publish & clap', share: 0.05 }] },
  { id: 'mailblast', tier: 1, name: 'Mailblast', style: 'Mailchimp-style newsletter', goal: 12000, features: [{ id: 'f0', at: 0.35, kind: 'media', label: 'Images in emails', share: 0.15, title: 'New feature: images in emails', text: 'Newsletters now include images, loaded every time someone opens an email.' }, { id: 'f1', at: 0.65, kind: 'read', label: 'Open & click tracking', share: 0.2, title: 'New feature: open tracking', text: 'Every open and click calls back to your servers so customers can see their stats.' }], rpu: 1,
    blurb: 'Hitting "send" means thousands of emails. Nobody waits for them: accept the job, then let workers send in the background.',
    classes: [{ kind: 'async', label: 'Send campaigns', share: 0.6 }, { kind: 'read', label: 'Dashboards', share: 0.25 }, { kind: 'write', label: 'Edit lists', share: 0.15 }] },
  { id: 'snapshelf', tier: 1, name: 'Snapshelf', style: 'Imgur-style image host', goal: 15000, features: [{ id: 'f0', at: 0.35, kind: 'async', label: 'Thumbnails', share: 0.15, title: 'New feature: thumbnails', text: 'Every upload is resized into thumbnails. Resizing is slow CPU work.' }, { id: 'f1', at: 0.65, kind: 'write', label: 'Comments & votes', share: 0.15, title: 'New feature: comments', text: 'Users can comment on and vote for images. Every vote is a write.' }], rpu: 1,
    blurb: 'Uploads go into object storage; the database only keeps the file name and owner. Popular images are cached at the edge.',
    classes: [{ kind: 'upload', label: 'Upload images', share: 0.35 }, { kind: 'media', label: 'View images', share: 0.5 }, { kind: 'read', label: 'Galleries', share: 0.15 }] },
  { id: 'snipbin', tier: 1, name: 'Snipbin', style: 'Pastebin-style text sharing', goal: 18000, features: [{ id: 'f0', at: 0.35, kind: 'read', label: 'Raw view for scripts', share: 0.2, title: 'New feature: raw API', text: 'Developers fetch pastes from scripts and CI jobs, over and over.' }, { id: 'f1', at: 0.65, kind: 'async', label: 'Expire old pastes', share: 0.1, title: 'New feature: expiring pastes', text: 'Pastes can expire. Something has to find and delete them in the background.' }], rpu: 1,
    blurb: 'Lots of different pastes are read, and many new ones are written. When one database is too busy, copy it.',
    classes: [{ kind: 'read', label: 'View pastes', share: 0.75 }, { kind: 'write', label: 'Create pastes', share: 0.25 }] },
  { id: 'chirp', tier: 2, name: 'Chirp', style: 'Twitter-style microblog', goal: 50000, features: [{ id: 'f0', at: 0.35, kind: 'realtime', label: 'Live notifications', share: 0.1, title: 'New feature: live notifications', text: 'Users want likes and replies to appear instantly, without refreshing.' }, { id: 'f1', at: 0.65, kind: 'upload', label: 'Video uploads', share: 0.1, title: 'New feature: video', text: 'Users can now upload short videos.' }], rpu: 1,
    blurb: 'Timelines are read far more than written. Posting must fan out to every follower.',
    classes: [{ kind: 'read', label: 'Read timeline', share: 0.7 }, { kind: 'write', label: 'Post', share: 0.1 }, { kind: 'async', label: 'Fan-out to followers', share: 0.1 }, { kind: 'media', label: 'Images', share: 0.1 }] },
  { id: 'pixgram', tier: 2, name: 'Pixgram', style: 'Instagram-style photo feed', goal: 50000, features: [{ id: 'f0', at: 0.35, kind: 'async', label: 'Filters & resizing', share: 0.1, title: 'New feature: filters', text: 'Photos get filters and several sizes. That processing is slow.' }, { id: 'f1', at: 0.65, kind: 'realtime', label: 'Direct messages', share: 0.1, title: 'New feature: DMs', text: 'Users can now message each other in real time.' }], rpu: 1,
    blurb: 'A feed of heavy media. Photos should never be streamed through your app servers.',
    classes: [{ kind: 'read', label: 'Load feed', share: 0.55 }, { kind: 'write', label: 'Like & comment', share: 0.1 }, { kind: 'media', label: 'View photos', share: 0.25 }, { kind: 'upload', label: 'Upload photo', share: 0.1 }] },
  { id: 'drivebox', tier: 2, name: 'DriveBox', style: 'Google Drive-style file storage', goal: 50000, features: [{ id: 'f0', at: 0.35, kind: 'realtime', label: 'Live collaboration', share: 0.1, title: 'New feature: live editing', text: 'Several people can edit the same document at once and see each other’s changes.' }, { id: 'f1', at: 0.65, kind: 'read', label: 'Search', share: 0.15, title: 'New feature: search', text: 'Users search across all their files, all the time.' }], rpu: 1.2,
    blurb: 'Files live in object storage; the database only keeps metadata. Sync runs in the background.',
    classes: [{ kind: 'read', label: 'Browse folders', share: 0.4 }, { kind: 'write', label: 'Rename & share', share: 0.15 }, { kind: 'upload', label: 'Upload & download', share: 0.3 }, { kind: 'async', label: 'Sync devices', share: 0.15 }] },
  { id: 'wavelength', tier: 3, name: 'Wavelength', style: 'Spotify-style music streaming', goal: 100000, features: [{ id: 'f0', at: 0.35, kind: 'upload', label: 'Podcast uploads', share: 0.1, title: 'New feature: podcasts', text: 'Creators upload podcast episodes.' }, { id: 'f1', at: 0.65, kind: 'realtime', label: 'Listening parties', share: 0.1, title: 'New feature: listening parties', text: 'Friends listen together, synced in real time.' }], rpu: 1,
    blurb: 'Most traffic is audio streams. A CDN carries the weight; recommendations run offline.',
    classes: [{ kind: 'media', label: 'Stream songs', share: 0.6 }, { kind: 'read', label: 'Browse catalog', share: 0.25 }, { kind: 'write', label: 'Edit playlists', share: 0.1 }, { kind: 'async', label: 'Recommendations', share: 0.05 }] },
  { id: 'textr', tier: 3, name: 'Textr', style: 'WhatsApp-style messenger', goal: 100000, features: [{ id: 'f0', at: 0.35, kind: 'upload', label: 'File sharing', share: 0.1, title: 'New feature: file sharing', text: 'Users can send documents and videos in chats.' }, { id: 'f1', at: 0.65, kind: 'async', label: 'Push notifications', share: 0.1, title: 'New feature: push', text: 'Offline users get a push notification for every message.' }], rpu: 1,
    blurb: 'Messages must arrive instantly. Polling a database for new messages will melt it.',
    classes: [{ kind: 'realtime', label: 'Send & receive', share: 0.55 }, { kind: 'read', label: 'Chat history', share: 0.2 }, { kind: 'async', label: 'Offline delivery', share: 0.15 }, { kind: 'media', label: 'Photos & voice notes', share: 0.1 }] },
  { id: 'guildhall', tier: 3, name: 'Guildhall', style: 'Discord-style community chat', goal: 100000, features: [{ id: 'f0', at: 0.35, kind: 'media', label: 'Emoji & avatars', share: 0.1, title: 'New feature: custom emoji', text: 'Every server has custom emoji and avatars, loaded constantly.' }, { id: 'f1', at: 0.65, kind: 'async', label: 'Moderation', share: 0.1, title: 'New feature: auto-moderation', text: 'Every message is checked by a moderation model, in the background.' }], rpu: 1,
    blurb: 'Huge channels where one message reaches thousands of open connections.',
    classes: [{ kind: 'realtime', label: 'Channel messages', share: 0.5 }, { kind: 'realtime', label: 'Presence & typing', share: 0.15 }, { kind: 'read', label: 'Scrollback', share: 0.25 }, { kind: 'upload', label: 'File uploads', share: 0.1 }] },
  { id: 'streamflix', tier: 4, name: 'Streamflix', style: 'Netflix-style video streaming', goal: 200000, features: [{ id: 'f0', at: 0.35, kind: 'write', label: 'Watch history', share: 0.1, title: 'New feature: continue watching', text: 'Players save the watch position every few seconds.' }, { id: 'f1', at: 0.65, kind: 'async', label: 'Recommendations', share: 0.05, title: 'New feature: recommendations', text: 'Recommendations are recomputed for every user.' }], rpu: 1,
    blurb: 'Video is enormous. Everything is pre-encoded by workers and served from the edge.',
    classes: [{ kind: 'media', label: 'Watch video', share: 0.7 }, { kind: 'read', label: 'Browse titles', share: 0.2 }, { kind: 'async', label: 'Transcoding', share: 0.1 }] },
  { id: 'ryde', tier: 4, name: 'Ryde', style: 'Uber-style ride hailing', goal: 200000, features: [{ id: 'f0', at: 0.35, kind: 'realtime', label: 'Driver chat', share: 0.1, title: 'New feature: driver chat', text: 'Riders and drivers message each other during a trip.' }, { id: 'f1', at: 0.65, kind: 'media', label: 'Map tiles', share: 0.1, title: 'New feature: live maps', text: 'The app shows live maps. Map tiles are images.' }], rpu: 1.2,
    blurb: 'Drivers send their location every few seconds. Matching riders needs a spatial index.',
    classes: [{ kind: 'geo', label: 'Driver locations', share: 0.5 }, { kind: 'async', label: 'Ride matching', share: 0.2 }, { kind: 'read', label: 'Trip history', share: 0.15 }, { kind: 'write', label: 'Payments', share: 0.15 }] },
];
export { classesOf, simulate, STARTUPS, COMP, PALETTE, ALLOWED, KINDS, KIND_NEEDS, RPS_PER_USER, capOf, upkOf };
