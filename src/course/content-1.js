/* Days 1 to 4 */
(window.DAYS = window.DAYS || []).push(
{
  n: 1, title: 'Think in trade-offs', tagline: 'The method, the numbers and the vocabulary that every later design stands on.',
  goals: ['Run a design interview with a fixed method instead of improvising', 'Turn a vague product into QPS, storage and bandwidth numbers in two minutes', 'Explain latency, throughput, availability and durability without mixing them up', 'Map a symptom (slow reads, hot key, single point of failure) to the technique that fixes it'],
  plan: [{ min: 25, what: 'Lesson 1: what the interview tests and the method', to: 'l0' }, { min: 25, what: 'Lesson 2: estimating scale', to: 'l1' }, { min: 20, what: 'Lesson 3: availability and failure', to: 'l2' }, { min: 15, what: 'Lab: estimator and latency numbers', to: 'lab' }, { min: 10, what: 'Quiz', to: 'quiz' }, { min: 25, what: 'Practice: size a messaging service', to: 'practice' }],
  lessons: [
    {
      title: 'What the interview tests, and a method', short: 'The method', min: 25, body: [
        "A system design interview has no single right answer. The interviewer is watching how you handle a problem that is deliberately vague: do you ask questions, structure your thinking, size the problem, pick tools for reasons, and see how it breaks. A memorized architecture for 'design Twitter' fails the moment they change one requirement. A method survives any change.",
        { h: 'The six steps' },
        { ol: ['**Clarify requirements.** Functional (what the system does) and non-functional (how well it must do it). Agree what is out of scope.', '**Estimate scale.** Users, requests per second, data volume. Numbers decide the design.', '**Define the API and data model.** The 3 to 5 core calls, and the main entities.', '**Draw the high-level design.** Client, entry point, services, data stores. Walk one request end to end.', '**Deep dive.** Take the hardest part (or the one the interviewer points at) and go into data layout, scaling and failure.', '**Find bottlenecks and wrap up.** Single points of failure, hot spots, trade-offs, what you would do next.'] },
        { say: "Before I draw anything, can I ask a few questions about scope and scale? Who are the users, what are the two or three core features, and roughly how many people use it per day?" },
        { h: 'Functional vs non-functional requirements' },
        "Functional requirements are the features: 'a user can post a short message and see messages from people they follow'. Non-functional requirements are the qualities, and they are what actually shape the architecture:",
        { table: { head: ['Quality', 'Meaning', 'Typical question to ask'], rows: [['Latency', 'Time one request takes', "How fast must the feed load? 200 ms?"], ['Throughput', 'Requests handled per second', 'What is the peak load?'], ['Availability', 'Fraction of time the system works', 'Is downtime acceptable? For how long?'], ['Durability', 'Stored data is not lost', 'Can we ever lose a message?'], ['Consistency', 'Everyone sees the same data', 'Is a slightly stale feed OK?'], ['Scalability', 'Handles growth by adding resources', 'How much will it grow in a year?']] } },
        { h: 'Why averages lie: percentiles' },
        "Latency is reported as percentiles. **p50** is the median, **p99** means 99% of requests are faster than this value. Averages hide the slow tail, and the tail is bigger than it looks. If a page makes 100 backend calls and each has a 1% chance of being slow, the chance that at least one is slow is 1 - 0.99^100, which is about 63%. At scale, the rare event is the normal experience.",
        { warn: "Reaching for Kafka, Redis or microservices in the first minute. Tools are answers; you do not yet know the question. Start with requirements and numbers, then add a component only when you can name the bottleneck it removes." },
        { tip: "Say your assumptions out loud and write them on the board: 'I will assume 10 million daily users, read-heavy.' If an assumption is wrong the interviewer will correct it, which gives you free information." }
      ]
    },
    {
      title: 'Estimating scale', short: 'Estimation', min: 25, body: [
        "**Why estimate at all?** A system serving 10 requests per second and one serving 100,000 are different machines. One database on a laptop is fine for the first; the second needs caching, sharding and many servers. Estimation tells you which world you are in before you commit to a design. Interviewers want the method and the order of magnitude, not exact figures.",
        { h: 'Numbers to memorize' },
        { table: { head: ['Quantity', 'Value', 'Use'], rows: [['1 day', '86,400 s, round to 100,000 (10^5)', 'Divide daily totals by 10^5 to get per-second'], ['1 month', 'about 2.5 million s', 'Monthly volume to per-second'], ['1 year', 'about 30 million s (3 x 10^7)', 'Yearly volume to per-second'], ['1 KB / MB / GB / TB / PB', '10^3 / 10^6 / 10^9 / 10^12 / 10^15 bytes', 'Storage sizing'], ['Text message', '100 B to 1 KB', ''], ['Photo / video minute', '200 KB to 2 MB / about 50 MB', '']] } },
        { h: 'The recipe' },
        { ol: ['**QPS** (queries per second) = daily active users x actions per user per day / 86,400.', '**Peak QPS** = average x 2 to 5. Real traffic is bursty; design for the peak.', '**Read:write ratio.** Most products read far more than they write (feeds 100:1, chat close to 1:1). Split QPS into read QPS and write QPS.', '**Storage** = writes per day x size per write x 365 x years kept. Multiply by 2 to 3 for replication.', '**Bandwidth** = QPS x average payload size.', '**Cache memory** = hot data only. A common rule: 20% of the data causes 80% of the reads, so cache 20% of a day\'s read data.'] },
        { h: 'Worked example: a URL shortener' },
        { table: { head: ['Step', 'Assumption', 'Result'], rows: [['New links', '100 million per month', '100M / 2.5M s = about 40 writes/s'], ['Reads', '100 reads per write', '4,000 reads/s average'], ['Peak', 'x3', 'about 12,000 reads/s'], ['Storage per link', '500 bytes (long URL + metadata)', '100M x 500 B = 50 GB per month'], ['Five years', '60 months', 'about 3 TB, before replication']] } },
        "Conclusion you can say out loud: 3 TB fits on one modern database server, 12,000 reads per second is one cache layer away from trivial. So this system does not need sharding on day one, and you can say so with evidence. That is the point of estimating.",
        { h: 'Rough capacity of single machines' },
        "These vary a lot with hardware and workload, but they are useful anchors: a simple application server handles on the order of 1,000 to 5,000 requests/s; a single relational database does roughly 5,000 to 10,000 simple queries/s before it hurts; Redis handles about 100,000 operations/s; a single machine holds tens of terabytes of disk. If your peak QPS divided by these is far above 1, you need many machines.",
        { tip: "Round hard. Use 100,000 for the seconds in a day, powers of ten everywhere. 'About 2,000 requests per second' is a perfect answer; '2,314.8' is a waste of time and invites arithmetic errors." }
      ]
    },
    {
      title: 'Availability, reliability and failure', short: 'Availability', min: 20, body: [
        "**The problem:** hardware fails, software has bugs, networks drop packets, people deploy bad code. Large systems do not avoid failure, they continue working through it. Availability is the measure of how well they do.",
        { h: 'The nines' },
        { table: { head: ['Availability', 'Downtime per year', 'Downtime per month'], rows: [['99%', '3.65 days', '7.3 hours'], ['99.9% (three nines)', '8.8 hours', '43 minutes'], ['99.99% (four nines)', '52.6 minutes', '4.3 minutes'], ['99.999% (five nines)', '5.3 minutes', '26 seconds']] } },
        "Each extra nine is roughly ten times harder and more expensive. Ask what the product needs: an internal report tool does not need five nines; a payments API might.",
        { h: 'Combining components' },
        { ul: ['**In series** (all must work): multiply. Two components at 99.9% give 0.999 x 0.999 = 99.8%. Every extra dependency in a request path lowers availability.', '**In parallel** (any one is enough): the system fails only if all fail. Two 99.9% replicas give 1 - (0.001)^2 = 99.9999%.'] },
        "This is the whole case for redundancy: put copies in parallel and keep the number of things in series small.",
        { warn: "Redundancy only helps if failures are independent. Two servers on the same rack, power supply, availability zone or deployment pipeline fail together. Spread replicas across zones, and remember that a bad config pushed to every replica at once is a failure no redundancy can fix." },
        { h: 'Kinds of failure' },
        { ul: ['**Crash:** the process dies. Easy to detect and recover from.', '**Slow:** responds, but in 30 seconds. Usually worse than a crash, because callers wait, threads pile up and the slowness spreads (cascading failure).', '**Partial:** some requests or some data fail.', '**Network partition:** both sides are alive but cannot talk to each other.', '**Correlated:** one cause, many victims (a zone outage, a bad deploy, an expired certificate).'] },
        { h: 'SLI, SLO, SLA' },
        "An **SLI** is a measurement (fraction of requests under 300 ms). An **SLO** is the internal target for it (99.9% over 30 days). An **SLA** is a contract with consequences if you miss it (refunds). The gap between 100% and the SLO is the **error budget**: you may spend it on risky releases, and when it is gone you slow down and fix reliability.",
        { h: 'Reliability vs availability vs durability' },
        "Availability: the system answers right now. Reliability: it answers correctly over time. Durability: data you stored is still there tomorrow. They are different promises: a system can be down (unavailable) and still never lose a byte (durable). Object stores advertise eleven nines of durability but lower availability.",
        { say: "The single points of failure here are the load balancer and the primary database. I would run the balancer redundantly and add a replica with automatic failover, accepting that async replication can lose a few seconds of writes." }
      ]
    },
    {
      title: 'A toolkit for reasoning about any system', short: 'Reasoning toolkit', deep: true, body: [
        "This lesson is the engine behind everything else. If you can reason from bottleneck to technique, you do not need to memorize designs.",
        { h: 'Little\'s Law' },
        "Average number of requests in the system = arrival rate x average time in system, or **L = lambda x W**. At 1,000 requests/s with 200 ms latency, about 200 requests are in flight at once. That tells you your thread pool, connection pool and memory needs. If latency doubles to 400 ms (a slow dependency), in-flight requests double to 400 and pools exhaust. This is the mechanism behind many outages.",
        { h: 'Why utilization near 100% is a cliff' },
        "Queueing theory for a simple queue says the waiting time grows like rho / (1 - rho), where rho is utilization. At 50% busy the wait is about 1x the service time, at 90% it is 9x, at 99% it is 99x. Systems that look fine at 70% fall over at 95% because latency does not rise linearly, it explodes. So: keep headroom (target 50 to 70% at peak) and shed load rather than queueing without limit.",
        { h: 'Amdahl\'s Law' },
        "If a fraction s of work is serial, the best possible speedup from infinite parallelism is 1/s. If 10% must happen in one place (a single database primary, a lock), adding servers beyond a point does nothing. Find the serial part and remove or split it.",
        { h: 'The map: symptom to technique' },
        { table: { head: ['Symptom', 'Technique', 'Costs you'], rows: [['Reads overload the database', 'Cache, read replicas, CDN', 'Stale data, invalidation'], ['Writes overload one database', 'Shard, queue and batch writes', 'Cross-shard queries, complexity'], ['One server is the limit', 'Stateless servers behind a load balancer', 'State must move elsewhere'], ['Users far away, slow', 'CDN, regional deployments', 'Replication, consistency'], ['Slow work blocks requests', 'Queue and background workers', 'Eventual results, retries, idempotency'], ['Single point of failure', 'Replicate, fail over', 'Consistency during failover'], ['One hot key or user', 'Split the key, replicate it, local caching', 'More moving parts'], ['Dependency failing', 'Timeouts, retries with backoff, circuit breaker, fallback', 'Degraded features']] } },
        "Every technique costs something. The design skill is naming that cost and judging it against the requirements. When the interviewer asks 'why?', your answer is always a bottleneck and a trade-off."
      ]
    }
  ],
  lab: { title: 'Size three systems', min: 15, body: ["Use the estimator to practise the recipe. Try each preset, then change one input and predict the effect before you look. Then scan the latency numbers to build a gut feel for what is cheap and expensive.", { widget: 'estimator' }, { ul: ['Pick **Photo sharing**. Which number dominates, QPS or storage? What does that tell you about where the money goes?', 'Pick **Chat app** and set reads per write to 1. How does the read:write ratio change the picture compared with the feed preset?', 'Set peak vs average to 1, then 5. Which outputs change?'] }, { widget: 'latency' }] },
  quiz: [
    { q: 'A product has 10 million daily active users, each making about 20 requests per day. Roughly what is the average QPS?', opts: ['About 230', 'About 2,300', 'About 23,000', 'About 230,000'], a: 1, why: '10M x 20 = 200M requests per day. Divide by about 100,000 seconds: roughly 2,000 to 2,300 requests per second.' },
    { q: 'A page makes 50 independent backend calls, and each is slow (above its p99) 1% of the time. About how often is at least one call slow?', opts: ['1%', 'About 10%', 'About 40%', 'About 99%'], a: 2, why: '1 - 0.99^50 is about 0.39. Tail latency compounds with fan-out, which is why p99 matters more than the average.' },
    { q: 'Two components, each 99.9% available, are both required for every request. What is the combined availability?', opts: ['99.9999%', 'About 99.8%', '99.9%', 'About 99%'], a: 1, why: 'In series you multiply: 0.999 x 0.999 is about 0.998. Adding dependencies in the request path lowers availability.' },
    { q: 'What is the best first move when asked to design a system?', opts: ['Draw the architecture with a load balancer and cache', 'Choose the database', 'Clarify requirements and scale with questions', 'Start with the data model'], a: 2, why: 'Requirements and numbers decide everything else. Tools picked before the problem is understood are guesses.' },
    { q: 'A service handles 500 requests/s and each takes 100 ms on average. By Little\'s Law, how many requests are in flight on average?', opts: ['5', '50', '500', '5,000'], a: 1, why: 'L = lambda x W = 500 x 0.1 = 50 concurrent requests. Size pools and memory accordingly, and watch what happens when W grows.' },
    { q: 'Why does latency rise sharply as server utilization approaches 100%?', opts: ['CPUs slow down when hot', 'Queueing delay grows like rho/(1-rho), so small load increases cause huge waits', 'Networks drop more packets', 'Garbage collection always runs'], a: 1, why: 'Waiting time explodes near full utilization. That is why you provision headroom and shed load instead of running hot.' }
  ],
  practice: {
    min: 30,
    prompt: ["**Size a messaging app.** You are asked to design a WhatsApp-like service with 500 million daily active users. Each user sends about 40 messages per day. Assume 5% of messages carry a photo or short video averaging 200 KB, and the rest are text of about 100 bytes. Messages are stored on the server for one year.", "First write five clarifying questions you would ask. Then estimate: average and peak message QPS, storage per day and per year (text and media separately), and average ingress bandwidth. State every assumption and show the arithmetic."],
    hints: ['Messages per day = 500M x 40. Divide by 100,000 for per-second.', 'Peak is about 3x average.', 'Do text and media separately. Media is 5% of messages but 2,000 times larger.', 'Remember replication multiplies storage (say 3x).'],
    outline: [
      { h: 'Questions' }, { ul: ['Is it 1:1 chat only or also groups? What is the largest group?', 'Do we store messages on the server forever, or only until delivered?', 'Do we need message history sync across devices?', 'Do we need delivery receipts and online presence?', 'Which regions, and what latency do users expect?'] },
      { h: 'Numbers' },
      { table: { head: ['Quantity', 'Calculation', 'Result'], rows: [['Messages/day', '500M x 40', '20 billion'], ['Average QPS', '20B / 100,000 s', 'about 200,000 (exact 231,000)'], ['Peak QPS', 'x3', 'about 600,000 to 700,000'], ['Text per day', '19B x 100 B', 'about 1.9 TB'], ['Media per day', '1B x 200 KB', 'about 200 TB'], ['Media per year', '200 TB x 365', 'about 73 PB (x3 with replication = 220 PB)'], ['Ingress bandwidth', '200 TB / 100,000 s', 'about 2 GB/s average, about 6 GB/s peak']] } },
      "Insights: media dominates storage by 100x, so it goes in object storage with a CDN, while text goes in a distributed key-value store. 600,000 QPS requires hundreds of servers and a partitioned message store. Long-lived connections (hundreds of millions) are the real challenge, not QPS."
    ],
    rubric: 'Strong answers ask scope questions (group size, retention, receipts), compute messages/day = 20B, average QPS around 200-230K, peak a few hundred thousand, separate text storage (about 2 TB/day) from media (about 200 TB/day), note that media dominates and belongs in object storage, include replication factor, state assumptions explicitly, and draw a conclusion about the design (partitioned storage, CDN, connection handling).'
  },
  cheat: ['Method: clarify, estimate, API and data model, high-level design, deep dive, bottlenecks.', 'QPS = DAU x actions / 86,400. Round a day to 100,000 seconds. Peak is 2 to 5x average.', 'Look at p99, not the average. Fan-out makes the tail the common case.', 'Series multiplies availability down; parallel multiplies failure probability down.', 'Little: in flight = rate x latency. Utilization near 100% makes latency explode, so keep headroom.', 'Every technique has a cost. Name the bottleneck, the technique and the cost.'],
  cards: [
    ['List the six steps of a design interview.', 'Clarify requirements, estimate scale, API and data model, high-level design, deep dive, bottlenecks and wrap-up.'],
    ['Formula for average QPS?', 'DAU x actions per user per day / 86,400 (round the day to 100,000 seconds).'],
    ['Why use p99 instead of the average latency?', 'Averages hide the slow tail. With fan-out (many calls per page), the chance that at least one is slow becomes large, so the tail is what users feel.'],
    ['Availability of two required 99.9% components in series? In parallel (either suffices)?', 'Series: about 99.8% (multiply). Parallel: 99.9999% (1 - 0.001^2).'],
    ['Downtime per year for 99.9% and 99.99%?', 'About 8.8 hours and about 53 minutes.'],
    ['State Little\'s Law and one use.', 'In flight = arrival rate x time in system. Use it to size thread and connection pools.'],
    ['Why must you keep headroom on servers?', 'Queueing delay grows like rho/(1-rho): 1x at 50% busy, 9x at 90%, 99x at 99%. Latency explodes near full utilization.'],
    ['Difference between SLI, SLO and SLA?', 'SLI is the measurement, SLO the internal target, SLA the contractual promise with penalties. Error budget = 100% minus SLO.'],
    ['Why do redundant replicas fail to help sometimes?', 'Failures can be correlated (same rack, zone, deploy or config). Redundancy needs independent failure.'],
    ['Order the latencies: RAM read, SSD random read, same-datacenter round trip, cross-ocean round trip.', 'RAM about 100 ns, SSD about 100 us, datacenter RTT about 0.5 ms, cross-ocean about 150 ms.']
  ]
},

{
  n: 2, title: 'How systems talk', tagline: 'From a URL to a response, then how to design APIs and push data in real time.',
  goals: ['Describe every step between typing a URL and seeing a page, with the cost of each', 'Design a REST API with sane pagination, errors and idempotency', 'Choose between REST, gRPC and GraphQL, and between polling, SSE and WebSockets', 'Make retries safe'],
  plan: [{ min: 25, what: 'Lesson 1: from URL to response', to: 'l0' }, { min: 30, what: 'Lesson 2: designing APIs', to: 'l1' }, { min: 20, what: 'Lesson 3: push vs pull', to: 'l2' }, { min: 10, what: 'Quiz', to: 'quiz' }, { min: 35, what: 'Practice: design a ride API', to: 'practice' }],
  lessons: [
    {
      title: 'From URL to response', short: 'URL to response', min: 25, body: [
        "Almost every system design starts with a client sending a request. If you know exactly what happens in that path, you know where time is spent and where you can intervene. Step through it:",
        { diagram: 'web-request' },
        { h: 'DNS: names to addresses' },
        "DNS is a distributed, hierarchical phone book. A resolver asks root servers, then the TLD servers (`.com`), then the domain's authoritative server, and gets an IP back. Answers are cached, with an expiry called the **TTL**. Why this matters for design: DNS is how you steer users to different data centers (GeoDNS) and how failover works, but cached records mean a change can take minutes to reach everyone, so very low TTLs buy faster failover at the cost of more lookups.",
        { h: 'TCP and TLS: the setup cost' },
        "Before any HTTP byte moves, the client opens a **TCP** connection (one round trip) and, for HTTPS, negotiates **TLS** encryption (one more round trip with TLS 1.3). If the server is 100 ms away, that is 200 ms before the request is even sent. Hence: **reuse connections** (keep-alive), terminate TLS near the user (CDN or edge), and avoid chatty request patterns.",
        { h: 'HTTP versions' },
        { table: { head: ['Version', 'Key idea', 'Limitation'], rows: [['HTTP/1.1', 'Keep-alive, text protocol', 'One request at a time per connection, so browsers open about 6 connections'], ['HTTP/2', 'Multiplexes many requests over one connection, compresses headers', 'One lost TCP packet stalls every stream (TCP head-of-line blocking)'], ['HTTP/3', 'Runs over QUIC on UDP, per-stream loss recovery, faster setup', 'Newer, some networks block UDP']] } },
        { h: 'Methods and status codes' },
        "Method semantics matter for retries. **GET** is safe (no side effects) and idempotent. **PUT** and **DELETE** are idempotent: doing them twice leaves the same state. **POST** is not idempotent by default, so a retried POST may create two orders.",
        { table: { head: ['Code', 'Meaning', 'Retry?'], rows: [['200 / 201 / 204', 'OK / Created / No content', 'n/a'], ['301 / 302 / 304', 'Moved permanently / found (temporary) / not modified (use your cache)', 'n/a'], ['400 / 422', 'Bad request / validation failed', 'No, fix the request'], ['401 / 403', 'Not authenticated / authenticated but not allowed', 'No'], ['404 / 409', 'Not found / conflict with current state', 'No'], ['429', 'Too many requests (rate limited)', 'Yes, after Retry-After'], ['500 / 502 / 503 / 504', 'Server error / bad gateway / unavailable / gateway timeout', 'Yes, with backoff']] } },
        { tip: "In an interview, walking through this path in 30 seconds ('DNS, then TCP and TLS, then the load balancer, an app server, a cache, the database') is a good way to produce a first high-level diagram that already shows where each optimization fits." }
      ]
    },
    {
      title: 'Designing APIs', short: 'API design', min: 30, body: [
        "An API is a contract between components. In an interview, define the 3 to 5 core calls before drawing boxes: it forces you to decide what the system actually does.",
        { h: 'REST in practice' },
        "REST models your domain as **resources** (nouns) manipulated by HTTP verbs, with each request independent (stateless). Example for a posting service:",
        { code: "POST   /v1/posts                 create a post\nGET    /v1/posts/{id}            read one post\nGET    /v1/users/{id}/posts?limit=20&cursor=...   a user's posts, paginated\nPUT    /v1/posts/{id}            replace a post\nDELETE /v1/posts/{id}\nPOST   /v1/users/{id}/follow     follow a user" },
        { h: 'REST vs gRPC vs GraphQL' },
        { table: { head: ['', 'REST', 'gRPC', 'GraphQL'], rows: [['Format', 'JSON over HTTP', 'Protobuf (binary) over HTTP/2', 'JSON, one endpoint, a query language'], ['Strength', 'Simple, cacheable, universal', 'Fast, strongly typed, streaming', 'Client asks for exactly the fields it needs'], ['Weakness', 'Over- and under-fetching', 'Not browser friendly, harder to debug', 'Caching and rate limiting are harder, N+1 queries'], ['Use for', 'Public APIs, CRUD', 'Internal service to service', 'Many client types with varied data needs (mobile, web)']] } },
        { h: 'Pagination: offset vs cursor' },
        "**Offset** (`?page=500&size=20`) is simple but the database must walk past 10,000 rows to answer, so it gets slower the deeper you go, and if new rows arrive while the user pages, items shift and the user sees duplicates or misses some. **Cursor (keyset)** pagination returns an opaque token pointing at the last item seen (`WHERE id < :last ORDER BY id DESC LIMIT 20`). It is fast at any depth and stable under inserts. The cost: no jumping to page 500. Default to cursors for feeds and anything large.",
        { h: 'Other things that make an API good' },
        { ul: ['**Idempotency keys** for creating things (see the deep dive).', '**Versioning**: `/v1/` in the path; evolve by adding fields, never by changing meanings.', '**Consistent errors**: a machine-readable code, a human message, a request id for support.', '**Rate limit headers** so clients can back off politely.', '**Return only what is needed**; large responses cost bandwidth and parse time. Compress.', '**Partial updates** via PATCH, bulk endpoints for efficiency, and async job APIs (return 202 and a status URL) for slow work.'] },
        { say: "I will keep the public API REST and JSON for simplicity and cacheability, and use gRPC between internal services for speed and strict schemas." },
        { warn: "Putting verbs in URLs (`/getUserPosts`) and returning 200 with an error inside the body. Use the verb and status code; clients, proxies and monitoring all rely on them." }
      ]
    },
    {
      title: 'Push vs pull: real-time communication', short: 'Real-time', min: 20, body: [
        "HTTP is request and response: the client must ask. Many products need the server to tell the client something (a new message, a driver moving, a price change). There are four common ways.",
        { table: { head: ['Technique', 'How it works', 'Cost', 'Use when'], rows: [['Short polling', 'Client asks every N seconds', 'Wasteful, delayed by up to N seconds', 'Rarely changing data, simplicity'], ['Long polling', 'Server holds the request open until there is news, then client asks again', 'Many open requests, reconnect overhead', 'Real-time without WebSocket support'], ['Server-Sent Events (SSE)', 'One long-lived HTTP response; server streams events to client', 'One-directional, auto-reconnect built in', 'Notifications, live scores, dashboards'], ['WebSocket', 'Upgrade to a persistent two-way channel', 'Stateful connection per client', 'Chat, collaborative editing, games']] } },
        { h: 'The hard part is scaling connections' },
        "A WebSocket is a long-lived connection held in the memory of one specific server. That breaks the stateless model: you cannot send a message to a user from any server, only from the one holding their socket. Typical solution: a fleet of **gateway** servers that only hold connections, plus a mapping of user to gateway (in Redis), and a pub/sub channel so any backend can say 'deliver this to user 42' and the right gateway forwards it. A tuned server can hold on the order of hundreds of thousands of idle connections, so ten million concurrent users need dozens of gateways.",
        { h: 'Details that interviewers like' },
        { ul: ['**Heartbeats** detect dead connections (mobile networks drop silently).', '**Reconnect with exponential backoff and jitter**, otherwise a server restart makes every client reconnect at once.', '**Resume with a last-seen id**, so a reconnecting client gets what it missed.', '**Fallback**: if a message cannot be delivered live, store it and send a push notification.'] }
      ]
    },
    {
      title: 'Idempotency and safe retries', short: 'Idempotency', deep: true, body: [
        "**The failure:** a client sends `POST /payments`. The server charges the card, then the response is lost in the network. The client sees a timeout and retries. The customer is charged twice. You cannot tell the difference between 'the server never got it' and 'the server did it but I never heard back'. So any request that might be retried must be safe to repeat.",
        { h: 'Idempotency keys' },
        "The client generates a unique key (a UUID) per logical operation and sends it in a header. The server records the key together with the result. If the same key arrives again it returns the stored result instead of repeating the work. The check and the effect must be atomic: a unique constraint on the key in the same database transaction as the payment is the usual way. Keys expire after a day or so.",
        { h: 'Retry rules' },
        { ul: ['Retry only things that are safe: network errors, timeouts, 5xx, 429. Never 4xx validation errors.', '**Exponential backoff** (wait 100 ms, 200, 400, ...) with a cap, plus **jitter** (randomize the wait) so thousands of clients do not retry in lockstep and overwhelm a recovering service.', 'Limit attempts. Retries multiply load: three layers each retrying three times turn one request into 27. Use retry budgets, and retry at one layer only.', 'Always set **timeouts**. A call without a timeout can hang forever and exhaust your threads.'] },
        "This idea returns in queues (at-least-once delivery means duplicates, so consumers must be idempotent) and in distributed transactions."
      ]
    },
    {
      title: 'Authentication and authorization', short: 'Authn and authz', deep: true, body: [
        "**Authentication** answers who you are. **Authorization** answers what you may do. Mixing them up is the classic mistake (401 means not authenticated, 403 means authenticated but forbidden).",
        { table: { head: ['Approach', 'How', 'Strength', 'Weakness'], rows: [['Server session', 'Server stores session, client holds a random id in a cookie', 'Easy to revoke', 'Needs shared session store (Redis)'], ['JWT (signed token)', 'Token carries claims, verified with a signature, no lookup needed', 'Stateless, great between services', 'Hard to revoke before expiry, so keep them short-lived with a refresh token'], ['API key', 'Long random secret per client', 'Simple for developers', 'Must be stored hashed, rotated, never put in client code']] } },
        { h: 'OAuth 2.0 and OpenID Connect' },
        "OAuth 2.0 lets a user grant an app limited access to their data without sharing their password ('Sign in and allow this app to read your calendar'). The common flow is the authorization code flow with PKCE: the app redirects to the provider, the user consents, the provider returns a short-lived code, and the app exchanges it for tokens. **OpenID Connect** adds identity (who the user is) on top of OAuth's delegated access.",
        { ul: ['Store passwords with a slow, salted hash (argon2, bcrypt). Never plain text, never a fast hash like SHA-256 alone.', 'Authorization models: **RBAC** (roles such as admin, editor) and **ABAC** (rules over attributes). Check authorization on the server for every request, never only in the UI.', 'Between services use mutual TLS or signed service tokens; zero trust means a request inside your network is not automatically trusted.'] }
      ]
    }
  ],
  quiz: [
    { q: 'Which HTTP method is NOT idempotent by default?', opts: ['GET', 'PUT', 'DELETE', 'POST'], a: 3, why: 'POST may create a new resource each time. PUT and DELETE leave the same final state when repeated, and GET has no side effects.' },
    { q: 'Why is cursor pagination better than offset pagination for a busy feed?', opts: ['It lets users jump to any page', 'It stays fast at any depth and does not skip or duplicate items when new posts arrive', 'It uses less JSON', 'It is required by REST'], a: 1, why: 'A cursor says "continue after this item", so the database seeks directly. Offset must scan past skipped rows and shifts when data changes.' },
    { q: 'A user is logged in but tries to open another user\'s private page. Which status fits best?', opts: ['400', '401', '403', '404 is the only valid choice'], a: 2, why: '401 means not authenticated; 403 means authenticated but not permitted. (Some systems return 404 to hide existence, but 403 is the standard answer.)' },
    { q: 'A stock price ticker needs the server to stream updates to browsers only. Which is the simplest good fit?', opts: ['Short polling every second', 'Server-Sent Events', 'WebSocket with custom protocol', 'Email'], a: 1, why: 'The flow is one-directional. SSE is plain HTTP with built-in reconnection. WebSocket works but is more machinery than needed.' },
    { q: 'Why add random jitter to exponential backoff?', opts: ['To make retries faster', 'To avoid all clients retrying at the same moment and overloading the recovering service', 'To satisfy HTTP/2', 'To hide errors'], a: 1, why: 'Without jitter, clients that failed together retry together, creating synchronized waves of load (a thundering herd).' },
    { q: 'A network timeout happens after a payment request was sent. What makes it safe to retry?', opts: ['Retrying only on weekdays', 'An idempotency key stored with the result', 'Using HTTP/3', 'Increasing the timeout'], a: 1, why: 'The server can detect the duplicate key and return the original result instead of charging again.' }
  ],
  practice: {
    min: 35,
    prompt: ["**Design the API for a ride-hailing app.** A rider requests a ride, sees the driver approaching on a map, and later views a history of past rides. A driver goes online, sends location updates every 4 seconds, and accepts ride offers.", "List the endpoints (method, path, key parameters, response). Decide how the rider app gets live driver location (polling, SSE or WebSocket) and justify it. Explain how you prevent a double-tap on 'Request ride' from creating two rides, and how you paginate ride history."],
    hints: ['Think about which calls are writes with side effects.', 'Driver location updates are high frequency from many clients. What protocol and what store?', 'Ride history is append-heavy and read newest first.'],
    outline: [
      { table: { head: ['Endpoint', 'Notes'], rows: [['POST /v1/rides  (Idempotency-Key header)', 'Body: pickup, dropoff. Returns 201/202 with ride id and status "searching". Key stops duplicates.'], ['GET /v1/rides/{id}', 'Status and driver info.'], ['GET /v1/rides?limit=20&cursor=...', 'History, newest first, cursor pagination (by ride id/time).'], ['POST /v1/rides/{id}/cancel', 'State transition, idempotent.'], ['PUT /v1/drivers/me/status', 'online/offline.'], ['PUT /v1/drivers/me/location', 'Lat/lng, high frequency; or send over the driver WebSocket.'], ['POST /v1/offers/{id}/accept', 'Driver accepts; must be atomic so two drivers cannot take one ride.']] } },
      "Live location: a WebSocket (or SSE for rider since it is server to client) via gateways; location pushed to riders from pub/sub on the ride channel. Polling every 4 s is acceptable for a first version but wastes bandwidth and adds delay.",
      "Double tap: client-generated idempotency key, stored with a unique constraint; second request returns the first ride. Also disable the button as a UX measure, but the server guarantee is what counts. Driver accept: conditional update `UPDATE rides SET driver=? WHERE id=? AND driver IS NULL`."
    ],
    rubric: 'Good answers list clear REST resources with correct verbs, use idempotency keys for ride creation, atomic conditional update for driver acceptance, cursor pagination for history, justify WebSocket/SSE for live location with gateway/pubsub scaling, mention high-frequency location writes going to a fast store (not the main DB), error handling and auth.'
  },
  cheat: ['Request path: DNS, TCP, TLS, HTTP, load balancer, app, cache, database. Setup costs round trips, so reuse connections.', 'GET, PUT, DELETE are idempotent; POST is not. 401 = not authenticated, 403 = not allowed, 429 = slow down.', 'Prefer cursor pagination to offset for large or changing data.', 'REST for public APIs, gRPC between services, GraphQL when clients need flexible shapes.', 'SSE for server to client, WebSocket for two-way. WebSockets are stateful, so use gateways and pub/sub.', 'Retries need idempotency keys, backoff with jitter, timeouts, and a limit.'],
  cards: [
    ['What costs round trips before the first HTTP byte on a new HTTPS connection?', 'DNS lookup, TCP handshake (1 RTT), TLS handshake (1 RTT with TLS 1.3). Reuse connections to avoid paying it again.'],
    ['Which HTTP methods are idempotent?', 'GET (also safe), PUT, DELETE. POST is not by default.'],
    ['401 vs 403?', '401: not authenticated (who are you?). 403: authenticated but not allowed.'],
    ['Why is offset pagination a problem?', 'Slow at deep pages (DB scans skipped rows) and unstable when data changes (duplicates or missed items). Use cursors.'],
    ['When choose gRPC over REST?', 'Internal service-to-service calls where speed, typed schemas and streaming matter. Not great for browsers.'],
    ['Polling vs long polling vs SSE vs WebSocket?', 'Polling asks repeatedly; long polling holds the request until there is news; SSE streams server-to-client over HTTP; WebSocket is a two-way persistent channel.'],
    ['Why are WebSockets harder to scale than HTTP?', 'Each connection lives on one server, so you need gateways, a user-to-gateway map and pub/sub to route messages.'],
    ['How do you make a retried POST safe?', 'Client sends an idempotency key; server stores key with result atomically and returns the stored result for duplicates.'],
    ['Why exponential backoff with jitter?', 'Backoff reduces load while a service recovers; jitter prevents synchronized retry waves (thundering herd).'],
    ['Session cookie vs JWT trade-off?', 'Sessions are easy to revoke but need a shared store; JWTs are stateless but hard to revoke, so keep them short-lived with refresh tokens.']
  ]
},

{
  n: 3, title: 'Scale out', tagline: 'Stateless servers, load balancers and CDNs: how traffic is spread and how failures are survived.',
  goals: ['Explain why stateless servers are the foundation of horizontal scaling', 'Choose a load balancing algorithm for a situation and say why', 'Design CDN caching with long TTLs and no stale-file bugs', 'Walk through what breaks when you go from one server to many'],
  plan: [{ min: 25, what: 'Lesson 1: vertical vs horizontal, stateless', to: 'l0' }, { min: 25, what: 'Lesson 2: load balancers', to: 'l1' }, { min: 20, what: 'Lesson 3: CDN and HTTP caching', to: 'l2' }, { min: 15, what: 'Lab: break a load balancer', to: 'lab' }, { min: 10, what: 'Quiz', to: 'quiz' }, { min: 25, what: 'Practice: scale a struggling app', to: 'practice' }],
  lessons: [
    {
      title: 'Vertical vs horizontal, and why stateless', short: 'Scale up vs out', min: 25, body: [
        "**The problem:** a server has finite CPU, memory, disk and network. When traffic outgrows it you have two options.",
        { table: { head: ['', 'Vertical (scale up)', 'Horizontal (scale out)'], rows: [['What', 'Bigger machine', 'More machines'], ['Pros', 'Simple, no code changes', 'No hard ceiling, tolerates machine failure, cheaper per unit at scale'], ['Cons', 'Hard ceiling, expensive at the top, one machine = single point of failure', 'Needs a load balancer, state handling, more operations'], ['Good for', 'Databases early on, quick fixes', 'Web and application tiers']] } },
        "Start vertical (it is fast and cheap to try), plan for horizontal. Interviewers expect you to say both.",
        { h: 'Statelessness is the unlock' },
        "A server is **stateless** if it keeps nothing about previous requests that the next request depends on. Then any server can handle any request, so a load balancer can send traffic anywhere, you can add or remove servers freely (autoscaling), deploy by replacing servers one by one, and a dead server loses nothing.",
        "State does not vanish; it moves to something built to hold it:",
        { table: { head: ['State on the app server', 'Move it to'], rows: [['User sessions in memory', 'Shared store (Redis) or a signed token (JWT)'], ['Uploaded files on local disk', 'Object storage (S3), served via CDN'], ['In-memory cache of shared data', 'Shared cache (Redis), accepting a network hop'], ['Scheduled jobs (cron)', 'A job scheduler or queue so each job runs once, not once per server'], ['Local counters, locks', 'Database, Redis or a coordination service']] } },
        { diagram: 'scale-journey' },
        { warn: "Sticky sessions (always routing a user to the same server) feel like an easy way out of statefulness, but they unbalance load, lose sessions when a server dies and complicate deploys. Treat them as a temporary patch." },
        { say: "I will keep the application servers stateless: sessions in Redis, files in object storage. That lets me scale them horizontally behind a load balancer and replace any instance at will." }
      ]
    },
    {
      title: 'Load balancers', short: 'Load balancers', min: 25, body: [
        "A load balancer (LB) is the front door: it accepts client connections and distributes them over a pool of servers, detects which are healthy, and hides the pool behind one address.",
        { h: 'Layer 4 vs Layer 7' },
        { table: { head: ['', 'L4 (transport)', 'L7 (application)'], rows: [['Looks at', 'IP address and port (TCP/UDP)', 'HTTP: path, headers, cookies'], ['Speed', 'Very fast, little processing', 'Slower, but can do much more'], ['Capabilities', 'Spread connections', 'Route /api to one pool and /images to another, terminate TLS, compress, add auth, retry'], ['Example', 'AWS NLB, HAProxy in TCP mode', 'AWS ALB, NGINX, Envoy']] } },
        { h: 'Algorithms' },
        { table: { head: ['Algorithm', 'How', 'Best when'], rows: [['Round robin', 'Next server in order', 'Similar servers, similar requests'], ['Weighted round robin', 'Bigger servers get more', 'Mixed hardware'], ['Least connections', 'Server with fewest active requests', 'Requests vary a lot in duration'], ['IP / key hash', 'Hash of client or key picks server', 'You want affinity (same client to same server, cache locality)'], ['Random of two choices', 'Pick 2 random servers, choose the less loaded', 'Large fleets, no global state needed']] } },
        { h: 'Health checks' },
        "**Active** checks poll `/health` every few seconds. **Passive** checks watch real traffic and eject servers that return errors. A good health endpoint reports whether the server can do useful work (can it reach its database?), but beware: if it checks a shared dependency, a database blip can mark every server unhealthy at once and take everything down.",
        { h: 'Who balances the balancer?' },
        "A single LB is a single point of failure. Run a redundant pair (active-passive with a shared virtual IP, or active-active), or use managed cloud LBs that are distributed internally. At global scale, **GeoDNS** or **anycast** routes users to the nearest region first, then a regional LB spreads over servers.",
        { ul: ['**Connection draining:** during deploys, stop sending new requests to a server but let in-flight ones finish.', '**TLS termination** at the LB offloads encryption work from app servers.', 'Use the lab below to see why least-connections beats round robin when one server is slow.'] }
      ]
    },
    {
      title: 'CDNs and HTTP caching', short: 'CDN', min: 20, body: [
        "**The problem:** physics. A user in Brazil fetching a file from a server in Virginia pays 120 ms or more per round trip, and your servers pay to serve the same logo ten million times. A **content delivery network** is a worldwide fleet of cache servers (edges) that hold copies close to users.",
        { diagram: 'cdn-flow' },
        { h: 'Pull vs push' },
        "**Pull CDN:** the edge fetches from your origin on the first miss and caches it (most common, zero effort). **Push CDN:** you upload content ahead of time (useful for large known files like game patches or video segments).",
        { h: 'Controlling the cache with HTTP headers' },
        { table: { head: ['Header', 'Meaning'], rows: [['Cache-Control: max-age=31536000, immutable', 'Cache for a year; never revalidate'], ['Cache-Control: s-maxage=60', 'Shared caches (CDN) may keep it 60 s; browsers follow max-age'], ['Cache-Control: no-store', 'Never cache (private data)'], ['Cache-Control: stale-while-revalidate=30', 'Serve stale for up to 30 s while refreshing in the background'], ['ETag + If-None-Match', 'Cheap revalidation: server replies 304 Not Modified with no body']] } },
        { h: 'The invalidation problem, solved by naming' },
        "Cache invalidation is famously hard, so avoid it for static assets: put a content hash in the filename (`app.3f9a1c.js`) and cache it for a year. When the file changes, the name changes, so every client fetches the new file immediately and the old one simply is not requested any more. The HTML that references it is cached briefly or not at all.",
        { ul: ['A CDN also absorbs traffic spikes and DDoS attacks, since the edge, not your origin, takes the load.', 'It can cache API responses too (public, short TTL, keyed by URL and selected headers), and run small functions at the edge (redirects, A/B tests, auth checks).', 'Do not cache personalized responses without a careful cache key; leaking one user\'s page to another is a serious bug.'] }
      ]
    },
    {
      title: 'Gateways, proxies and service discovery', short: 'Gateways and discovery', deep: true, body: [
        { h: 'Reverse proxy and API gateway' },
        "A **reverse proxy** (NGINX, Envoy) sits in front of servers and forwards requests; the LB is one of its roles. An **API gateway** adds cross-cutting concerns in one place: authentication, rate limiting, request routing, protocol translation, request logging, and response caching. This keeps individual services free of repeated boilerplate. Risk: the gateway becomes a bottleneck and a single point of failure, so scale it horizontally and keep it thin (no business logic).",
        { h: 'Service discovery' },
        "In a dynamic fleet, servers appear and vanish every minute. How does service A find service B? **Server-side discovery:** callers hit a stable LB address; the LB knows the pool. **Client-side discovery:** callers ask a registry (Consul, etcd, Eureka, or Kubernetes DNS) for the current list and balance themselves. A **service mesh** (Istio, Linkerd) moves this, plus retries, timeouts, mutual TLS and metrics, into a sidecar proxy next to each service.",
        { h: 'Multi-zone and multi-region' },
        { ul: ['**Multiple availability zones** in one region survive a data center failure with low latency between them. This is the default for production.', '**Multi-region active-passive:** a standby region takes over on disaster; simple but failover is slow and untested failover often fails.', '**Multi-region active-active:** all regions serve traffic; fastest for users and most resilient, but data replication across regions forces consistency trade-offs (see Day 5).'] }
      ]
    },
    {
      title: 'Autoscaling and capacity planning', short: 'Autoscaling', deep: true, body: [
        "Autoscaling adds or removes servers automatically based on a metric: CPU, requests per second, queue length, or custom signals. Practical rules:",
        { ul: ['Scale on the metric closest to the bottleneck. For queue workers, queue depth beats CPU.', 'Scale out fast, scale in slowly, with cooldowns, or the fleet oscillates.', 'New servers take time to boot and warm caches. Predictable peaks (a 9 pm show) call for scheduled scaling ahead of time.', 'Keep **N+1 or N+2 headroom** so one or two failures do not push the rest over the cliff.', 'Autoscaling cannot save you if a shared dependency, like the database connection limit, is the bottleneck; more app servers can make it worse.', '**Load shedding:** when overloaded, reject low-priority requests early (return 503 quickly) rather than slowing everything down. A fast failure is kinder than a slow timeout.'] },
        "Use Little's Law (Day 1) to turn a latency and request rate into concurrency, then divide by the per-server limit to get a server count, and add headroom."
      ]
    }
  ],
  lab: { title: 'Break a load balancer', min: 15, body: ["Server 1 is slow. Run each experiment, watching how many requests are in flight on Server 1 after each burst:", { widget: 'lb' }, { ul: ['**Round robin:** send 12 requests twice. Does the slow server pile up in-flight requests?', '**Least connections:** repeat. What changes, and why?', '**IP hash:** send several bursts. Why do the same clients land on the same servers? Now take a server down: what happens to the clients that were on it?', 'Take down three servers. What does the log say once none are healthy?'] }] },
  quiz: [
    { q: 'What makes horizontal scaling of the web tier easy?', opts: ['Using a bigger instance type', 'Keeping servers stateless so any server can handle any request', 'Using HTTP/2', 'Sticky sessions'], a: 1, why: 'If no server holds unique state, the load balancer can send any request anywhere and servers can be added, removed or replaced freely.' },
    { q: 'Requests vary hugely in duration (some take 50 ms, some 5 s). Which algorithm balances best?', opts: ['Round robin', 'Least connections', 'Random', 'Static weights'], a: 1, why: 'Least connections accounts for work already in progress. Round robin ignores it and can stack slow requests on one server.' },
    { q: 'You want to route /api/* and /static/* to different server pools. Which balancer is needed?', opts: ['Layer 4', 'Layer 7', 'DNS round robin', 'None, impossible'], a: 1, why: 'Routing by URL path requires inspecting HTTP, which L7 balancers do.' },
    { q: 'What is the best way to ship a changed JavaScript file through a CDN with a one-year TTL?', opts: ['Purge the CDN manually every time', 'Put a content hash in the filename so the new version has a new URL', 'Set TTL to 0', 'Ask users to hard refresh'], a: 1, why: 'Changing the URL sidesteps invalidation: clients request the new name, and old names are never requested again.' },
    { q: 'Your single load balancer is a single point of failure. What is a standard fix?', opts: ['Buy a bigger load balancer', 'Run redundant load balancers (active-passive or active-active, or managed distributed LBs)', 'Remove the load balancer', 'Use sticky sessions'], a: 1, why: 'Add redundancy at every tier on the critical path, including the balancer itself.' },
    { q: 'Why can autoscaling the app servers fail to fix an overloaded system?', opts: ['Autoscaling is too slow to be useful', 'A shared bottleneck like the database can be the real limit, and more servers add more load to it', 'Servers cannot be added at runtime', 'CDNs prevent it'], a: 1, why: 'Scaling one tier shifts the bottleneck; identify it first. More app servers can exhaust database connections.' }
  ],
  practice: {
    min: 25,
    prompt: ["**Scale a struggling app.** A startup runs a monolith on one big server: web app, MySQL, cron jobs and user-uploaded images on local disk. Traffic is about to grow 50x for a marketing campaign and the server already hits 100% CPU at peak.", "Describe, in order, what you would change and why. For each step, name the problem it solves and the new problem it creates. Which parts of this app would break the moment you add a second server?"],
    hints: ['List the state hiding on that one machine.', 'Do not forget the database: what do 20 app servers do to it?', 'Think about cron: what happens if every server runs the job?'],
    outline: [
      { ol: ['**Measure first.** Find the bottleneck (CPU in app code? slow queries?). Quick wins: add missing indexes, enable gzip, fix N+1 queries.', '**Move the database off the box** to its own server (or managed DB) with backups. Frees CPU and lets each scale independently.', '**Uploads to object storage** (S3) and serve images via CDN. Local disk would be invisible to the second server.', '**Sessions to Redis** (or JWT) so servers are stateless.', '**Cron to a single scheduler** (or a queue with workers) so jobs do not run N times.', '**Add a load balancer** and run 3+ app servers across zones, with health checks and connection draining.', '**Protect the database:** connection pooling (each server has a pool; total connections may exceed DB limit), a cache for hot reads, then read replicas.', '**CDN** for static assets; **autoscaling** with headroom for the campaign (scale up ahead of the launch); load test beforehand.'] },
      "Things that break on server 2: sessions, uploads, cron, local caches, local logs, file-based locks, hard-coded hostnames, database connection limits."
    ],
    rubric: 'Strong answers identify hidden state (sessions, uploads, cron, local cache), move DB separately, introduce LB with health checks, object storage + CDN, shared session store, single-run scheduling, DB connection pooling and caching/replicas, load testing, autoscaling and headroom, and say what each step costs or introduces.'
  },
  cheat: ['Scale up first because it is easy; design for scale out. Stateless servers make scale out and failover trivial.', 'State moves to: Redis (sessions, cache), object storage (files), database (truth), scheduler (cron).', 'L4 is fast and dumb; L7 routes by HTTP content. Least connections handles uneven requests.', 'Load balancers need redundancy and health checks, plus connection draining on deploys.', 'CDN: hash filenames, cache for a year. HTML short-lived. Never cache private pages publicly.', 'Autoscale on the metric near the bottleneck, keep N+1 headroom, shed load when overloaded.'],
  cards: [
    ['Why prefer stateless servers?', 'Any server can serve any request, so you can add, remove and replace servers freely, balance simply and survive failures without losing user state.'],
    ['Where does state go when you make servers stateless?', 'Sessions: Redis or JWT. Files: object storage. Shared cache: Redis. Jobs: scheduler/queue. Truth: database.'],
    ['L4 vs L7 load balancer?', 'L4 routes by IP and port (fast, simple). L7 inspects HTTP (path, headers) enabling routing, TLS termination, compression.'],
    ['Which LB algorithm for requests of very different duration?', 'Least connections.'],
    ['How do you avoid the load balancer being a SPOF?', 'Redundant LBs (active-passive with virtual IP or active-active), managed distributed LBs, GeoDNS or anycast across regions.'],
    ['How do you version static assets for a CDN?', 'Content hash in the filename plus a one-year immutable cache; HTML is cached briefly.'],
    ['Explain stale-while-revalidate.', 'Serve the cached (stale) response immediately while fetching a fresh copy in the background, so users never wait for revalidation.'],
    ['What does an API gateway do?', 'Central entry for cross-cutting concerns: auth, rate limiting, routing, TLS, logging. Keep it thin and scalable.'],
    ['Client-side vs server-side service discovery?', 'Client-side: caller asks a registry and balances itself. Server-side: caller uses a stable LB that knows the pool.'],
    ['What is load shedding?', 'Rejecting low-priority requests quickly when overloaded so the system stays responsive for the rest.']
  ]
},

{
  n: 4, title: 'Databases I: inside one node', tagline: 'Schemas, indexes, transactions and storage engines, so you understand why queries are fast or slow and data is safe or corrupt.',
  goals: ['Model data from access patterns and normalize or denormalize deliberately', 'Explain how a B-tree index works and pick the right composite index', 'Name the transaction anomalies and prevent them', 'Choose between relational and NoSQL families for a requirement'],
  plan: [{ min: 20, what: 'Lesson 1: relational modeling', to: 'l0' }, { min: 30, what: 'Lesson 2: indexes', to: 'l1' }, { min: 25, what: 'Lesson 3: transactions and isolation', to: 'l2' }, { min: 10, what: 'Lab: index cost and benefit', to: 'lab' }, { min: 10, what: 'Quiz', to: 'quiz' }, { min: 25, what: 'Practice: schema for orders', to: 'practice' }],
  lessons: [
    {
      title: 'Relational modeling', short: 'Modeling', min: 20, body: [
        "**Why relational databases exist:** to store structured data once, keep it consistent with rules the database enforces, and ask flexible questions later with SQL. They have been the default for fifty years for good reason.",
        { h: 'Core ideas' },
        { ul: ['**Table** of rows and typed columns. **Primary key** uniquely identifies a row. **Foreign key** points to a row in another table, and the database refuses dangling references.', '**Constraints** (not null, unique, check) move correctness out of your code and into the data layer, where it cannot be forgotten.', '**Joins** combine tables at query time.'] },
        { code: "users(id PK, email UNIQUE, name)\nposts(id PK, user_id FK -> users.id, body, created_at)\ncomments(id PK, post_id FK -> posts.id, user_id FK, body, created_at)\n\nSELECT p.id, p.body, u.name\nFROM posts p JOIN users u ON u.id = p.user_id\nWHERE p.created_at > now() - interval '1 day'\nORDER BY p.created_at DESC LIMIT 20;" },
        { h: 'Normalization in one idea' },
        "Store each fact in exactly one place. If a user's name is copied into every post row, renaming the user means updating millions of rows and any miss creates inconsistency. Normalizing (splitting into users and posts linked by id) removes that. The price is joins at read time.",
        { h: 'Denormalization, on purpose' },
        "At large scale, joins across big tables (or across machines, once sharded) get expensive. You then deliberately copy data to speed reads: store the author's display name in the post row, keep a `like_count` column instead of counting rows. You trade write complexity and potential staleness for read speed. Say so out loud: 'I will denormalize the like count because reads vastly outnumber writes, and update it asynchronously.'",
        { h: 'Modeling for an interview' },
        { ol: ['List entities and relationships (one-to-many, many-to-many via a join table).', 'List the **access patterns**: the queries the product needs, with frequency.', 'Choose keys and indexes to make those queries fast.', 'Decide where denormalization pays off.'] },
        { tip: "Access patterns come first. A schema is just the shape that makes your top 3 queries cheap. State the queries before you draw the tables." }
      ]
    },
    {
      title: 'Indexes: how queries actually run', short: 'Indexes', min: 30, body: [
        "**The problem:** `WHERE email = 'a@b.com'` on a table with 100 million rows forces the database to read every row (a **full table scan**) unless it has a better path. An **index** is that better path: a separate, sorted structure that maps column values to row locations.",
        { h: 'The B-tree' },
        "Most indexes are B-trees: a balanced tree where each node is a disk page holding hundreds of sorted keys. A lookup starts at the root and picks one child per level. Because each node has a huge fan-out (hundreds of children), the tree is only about 3 to 4 levels deep even for billions of rows, so a lookup reads 3 or 4 pages instead of millions of rows. Because keys are sorted, **range queries** (`BETWEEN`, `ORDER BY`) walk neighbouring leaves cheaply. Hash indexes only do equality.",
        { h: 'Composite indexes and the leftmost prefix rule' },
        { code: "CREATE INDEX idx_orders_user_created ON orders (user_id, created_at DESC);\n\n-- uses the index: equality on user_id, then ordered by created_at\nSELECT * FROM orders WHERE user_id = 42 ORDER BY created_at DESC LIMIT 20;\n-- uses the index (prefix user_id):\nSELECT * FROM orders WHERE user_id = 42;\n-- cannot use it efficiently (skips the first column):\nSELECT * FROM orders WHERE created_at > '2026-01-01';" },
        "An index on (a, b) is sorted by a, then by b within each a. It serves queries on `a`, or on `a` and `b`, but not on `b` alone. Put equality columns first, then the range or sort column.",
        { h: 'Other concepts' },
        { ul: ['**Covering index:** contains every column the query needs, so the table is never touched (an index-only scan).', '**Clustered index:** the table rows themselves are stored in key order (the primary key in MySQL InnoDB). Secondary indexes then point to the primary key.', '**Selectivity:** an index on a column with two values (gender, boolean) barely helps; the database may ignore it.', '**Things that defeat an index:** applying a function to the column (`WHERE lower(email) = ...` without a matching expression index), a leading wildcard (`LIKE \'%abc\'`), mismatched types.', '**Use `EXPLAIN`** to see whether the planner picked a scan or an index.'] },
        { h: 'The cost' },
        "Every index must be updated on each insert, update and delete, and takes disk and memory. So a table with ten indexes has roughly ten times the write work. Index for the queries you actually run, and drop the rest. The lab shows this trade-off.",
        { say: "I will add a composite index on (user_id, created_at desc) so that listing a user's orders newest first is a single index range scan, with no sort and no table scan." }
      ]
    },
    {
      title: 'Transactions and isolation', short: 'Transactions', min: 25, body: [
        "**The problem:** moving 100 from account A to B is two writes. If the machine crashes between them, money vanishes. If two transfers touch the same account at once, one may overwrite the other. A **transaction** groups operations so the database makes them behave as if they were one safe step.",
        { h: 'ACID' },
        { table: { head: ['Letter', 'Promise', 'Mechanism (roughly)'], rows: [['Atomicity', 'All of the transaction happens or none of it', 'Undo log and rollback'], ['Consistency', 'Rules (constraints) hold before and after', 'Constraints plus your logic'], ['Isolation', 'Concurrent transactions do not see each other\'s half-finished work', 'Locks or snapshots (MVCC)'], ['Durability', 'Once committed, it survives a crash', 'Write-ahead log flushed to disk']] } },
        { h: 'What goes wrong without isolation' },
        { table: { head: ['Anomaly', 'What happens'], rows: [['Dirty read', 'You read another transaction\'s uncommitted data, which then rolls back'], ['Non-repeatable read', 'You read a row twice and it changed in between'], ['Phantom read', 'You run the same query twice and new rows appear'], ['Lost update', 'Two transactions read 10, both add 1 and write 11. One increment is lost'], ['Write skew', 'Two on-call doctors each check "another doctor is on call" and both go off call; each saw a valid state but together they broke the rule']] } },
        { h: 'Isolation levels' },
        "Stronger isolation means fewer anomalies and less concurrency. **Read committed** (a common default) prevents dirty reads. **Repeatable read / snapshot isolation** gives each transaction a consistent snapshot, preventing most anomalies, but write skew can still slip through. **Serializable** gives the result as if transactions ran one at a time, and is the only level that prevents every anomaly, at a performance cost. Know which level your database defaults to and that it differs between products.",
        { h: 'How databases do it: locks vs MVCC' },
        "Lock-based systems make readers and writers wait for each other. **MVCC** (multi-version concurrency control, used by PostgreSQL, MySQL InnoDB, Oracle) keeps old versions of rows so readers see a snapshot and never block writers.",
        { h: 'Practical tools' },
        { code: "-- atomic update, no read-modify-write race\nUPDATE accounts SET balance = balance - 100 WHERE id = 1 AND balance >= 100;\n\n-- pessimistic lock\nBEGIN; SELECT * FROM seats WHERE id = 7 FOR UPDATE; UPDATE seats SET owner = 42 WHERE id = 7; COMMIT;\n\n-- optimistic concurrency with a version column\nUPDATE docs SET body = ?, version = version + 1 WHERE id = ? AND version = ?;  -- 0 rows updated means someone else won, retry" },
        { warn: "Doing the read in application code and the write later ('read balance, compute, write balance') without a lock or a conditional update. That is the lost-update bug, and it only appears under concurrency, so tests rarely catch it." }
      ]
    },
    {
      title: 'Storage engines: B-trees vs LSM-trees', short: 'Storage engines', deep: true, body: [
        "Underneath every database is a storage engine that decides how bytes are laid out on disk. Two designs dominate, and knowing the difference lets you predict behaviour.",
        { h: 'Write-ahead log (WAL)' },
        "Before changing any data page, the database appends the change to a sequential log and flushes it to disk. Sequential appends are fast. If the machine crashes, the log is replayed to restore committed changes. The WAL is also what replication ships to replicas. This is how durability is achieved without writing every page immediately.",
        { h: 'B-tree engines (PostgreSQL, MySQL InnoDB)' },
        "Data lives in fixed-size pages organized as a tree and is updated **in place**. Reads are predictable (a few page reads). Writes may require random disk I/O and rewriting pages, and pages can fragment.",
        { h: 'LSM-tree engines (Cassandra, RocksDB, LevelDB, HBase)' },
        "Writes go to an in-memory sorted table (the **memtable**, protected by a WAL). When full, it is flushed to disk as an immutable sorted file (an **SSTable**). Background **compaction** merges files and drops overwritten or deleted data. Writes are only sequential appends, so write throughput is excellent. Reads may have to check several files, which is softened by **Bloom filters** (a compact structure that says 'definitely not in this file').",
        { table: { head: ['', 'B-tree', 'LSM-tree'], rows: [['Write speed', 'Good', 'Excellent (sequential)'], ['Read speed', 'Excellent, predictable', 'Good, may touch several files'], ['Write amplification', 'Page rewrites', 'Compaction rewrites data repeatedly'], ['Space', 'Some fragmentation', 'Temporary duplication during compaction'], ['Best for', 'General OLTP, read-heavy mixed work', 'Write-heavy, ingest-heavy workloads (logs, time series, messaging)']] } }
      ]
    },
    {
      title: 'SQL or NoSQL: choose by access pattern', short: 'Choosing a database', deep: true, body: [
        "'NoSQL' is not one thing. It is a set of designs that each give up some relational features to gain something specific, usually horizontal scalability or a flexible shape.",
        { table: { head: ['Family', 'Examples', 'Model', 'Strong at', 'Watch out for'], rows: [['Key-value', 'Redis, DynamoDB, Memcached', 'key to opaque value', 'Fast lookup by key, caching, sessions', 'No ad hoc queries'], ['Document', 'MongoDB, Firestore', 'JSON documents', 'Flexible schema, data read as a unit', 'Joins are weak, consistency across documents'], ['Wide-column', 'Cassandra, Bigtable, HBase', 'rows with sparse columns, partitioned by key', 'Huge write volumes, time series', 'Must design tables per query'], ['Graph', 'Neo4j', 'nodes and edges', 'Relationship traversal (friends of friends)', 'Hard to shard'], ['Search', 'Elasticsearch, OpenSearch', 'inverted index', 'Full text, filtering, aggregations', 'Not a source of truth'], ['Object store', 'S3, GCS', 'blobs by key', 'Cheap, durable files', 'High latency, no queries']] } },
        { h: 'A sensible default' },
        "Start with a relational database (PostgreSQL or MySQL). It handles far more scale than people expect (a single node can hold terabytes and serve thousands of queries per second), gives transactions and flexible queries, and you can add specialized stores later for specific needs: Redis for caching, Elasticsearch for search, S3 for files. Pick a NoSQL store when you can name the requirement it satisfies: write volume beyond one node, a very simple access pattern at huge scale, or a data shape (graph, time series) a relational model handles badly.",
        { say: "The core data is relational with transactional needs, so I will use PostgreSQL as the source of truth, with Redis in front for hot reads and Elasticsearch fed asynchronously for search." }
      ]
    }
  ],
  lab: { title: 'Index cost and benefit', min: 10, body: ["Change the table size and the number of indexes. Notice how lookups barely get slower as the table grows 1000x, while a full scan grows linearly, and how every extra index multiplies write work.", { widget: 'index' }, { ul: ['At 10 million rows, how many pages does the index need? At 1 billion?', 'How many indexes would you accept on a write-heavy table, and why?'] }] },
  quiz: [
    { q: 'You have an index on (user_id, created_at). Which query can use it efficiently?', opts: ['WHERE created_at > X', 'WHERE user_id = 5 ORDER BY created_at DESC', 'WHERE lower(email) = Y', 'WHERE status = \'paid\' (no other filter)'], a: 1, why: 'The leftmost prefix rule: the index is sorted by user_id first, then created_at. A query starting at created_at alone cannot seek.' },
    { q: 'Why is a B-tree only about 3 to 4 levels deep even for billions of rows?', opts: ['Rows are compressed', 'Each node holds hundreds of keys, so the fan-out is huge', 'The tree is rebuilt often', 'Only primary keys are indexed'], a: 1, why: 'With a fan-out of several hundred, 300^4 is billions, so depth is tiny and a lookup is a handful of page reads.' },
    { q: 'Two requests read a counter of 10 and each write back 11. What anomaly is this, and what fixes it?', opts: ['Dirty read; use caching', 'Lost update; use an atomic UPDATE counter = counter + 1 or a lock', 'Phantom read; add an index', 'Deadlock; add servers'], a: 1, why: 'Read-modify-write races lose updates. Push the arithmetic into the database or lock the row.' },
    { q: 'What does MVCC let a database do?', opts: ['Skip the write-ahead log', 'Let readers see a consistent snapshot without blocking writers', 'Shard automatically', 'Avoid indexes'], a: 1, why: 'It keeps multiple row versions so reads and writes do not need to block each other.' },
    { q: 'Which workload is an LSM-tree engine best at?', opts: ['Read-heavy with tiny data', 'Very write-heavy ingestion such as logs and time series', 'Complex joins', 'Serializable transactions'], a: 1, why: 'LSM trees turn writes into sequential appends and merge later, giving excellent write throughput.' },
    { q: 'What is the main downside of adding many indexes?', opts: ['Reads become slower', 'Writes become slower and storage grows, because each index is updated on every write', 'Queries return wrong results', 'They disable transactions'], a: 1, why: 'Indexes speed reads at the cost of write amplification and space.' }
  ],
  practice: {
    min: 25,
    prompt: ["**Schema for an e-commerce orders system.** Entities: users, products, orders and order items. Required queries: (1) a user's order history, newest first, paginated; (2) total units sold per product per day for a report; (3) never sell more units than are in stock, even when 1,000 people buy the last item at once.", "Write the tables and the indexes. Explain how each index serves a query, how you paginate, and exactly how you prevent overselling. Say what you would denormalize and what that risks."],
    hints: ['Order items need the price at purchase time. Why can you not just join to products.price?', 'For overselling, think about an UPDATE with a condition and checking how many rows it changed.', 'The daily report can scan a lot of data. Does it belong on the main database?'],
    outline: [
      { code: "users(id, email UNIQUE, ...)\nproducts(id, name, price, stock)\norders(id, user_id FK, status, total, created_at)\norder_items(order_id FK, product_id FK, qty, unit_price)  -- price copied at purchase time\n\nINDEX orders(user_id, created_at DESC)         -- history query\nINDEX order_items(product_id, ...)             -- or aggregate in a reporting table" },
      { ul: ['**History:** cursor pagination: `WHERE user_id=? AND (created_at,id) < (?,?) ORDER BY created_at DESC, id DESC LIMIT 20` using the composite index.', '**Report:** compute from a read replica or a warehouse, or maintain a `daily_product_sales` table updated asynchronously (denormalization; risk: lag and drift, so reconcile periodically).', '**Overselling:** in one transaction run `UPDATE products SET stock = stock - :qty WHERE id = :id AND stock >= :qty` and check that one row was updated; if zero, reject. The row lock serializes buyers of the same product. For extreme hot items, reserve stock in Redis with an atomic decrement and reconcile, or queue purchase requests.', '**Price at purchase:** copy `unit_price` into order_items so later price changes do not rewrite history.'] }
    ],
    rubric: 'Good answers: correct normalized tables with FK; unit_price copied into order_items; composite index (user_id, created_at DESC) with keyset pagination; conditional atomic UPDATE (stock >= qty) inside a transaction or SELECT FOR UPDATE to prevent overselling; report from replica/warehouse or async aggregate table with noted staleness; mention hot-row contention for flash sales.'
  },
  cheat: ['Model from access patterns. Normalize to avoid inconsistency, denormalize deliberately for read speed.', 'B-tree index: shallow because of huge fan-out. Composite index: equality columns first, leftmost prefix rule. Indexes cost writes and space.', 'ACID: atomic, consistent, isolated, durable. Isolation anomalies: dirty, non-repeatable, phantom, lost update, write skew.', 'Prevent lost updates with atomic UPDATEs, SELECT FOR UPDATE or version checks.', 'WAL gives durability; MVCC lets readers not block writers; LSM trees favour writes, B-trees favour reads.', 'Default to PostgreSQL. Add Redis, search or object storage for specific needs.'],
  cards: [
    ['Why denormalize?', 'To speed reads by copying data (counts, names) at the cost of more complex writes and risk of inconsistency. Worth it when reads far outnumber writes.'],
    ['Why is a B-tree index lookup fast?', 'High fan-out makes the tree only 3-4 levels deep, so a lookup is a few page reads instead of scanning all rows.'],
    ['Leftmost prefix rule?', 'An index on (a,b,c) can serve queries on a, (a,b), (a,b,c), but not b or c alone.'],
    ['Name three things that stop an index being used.', 'A function on the column, a leading wildcard LIKE, type mismatch, or very low selectivity.'],
    ['What does each index cost?', 'Extra work on every write, extra disk and memory.'],
    ['Define ACID.', 'Atomicity (all or nothing), Consistency (invariants hold), Isolation (concurrent transactions do not interfere), Durability (committed data survives crashes).'],
    ['What is a lost update and how do you prevent it?', 'Two read-modify-write cycles overwrite each other. Use atomic updates, SELECT FOR UPDATE, or optimistic version checks.'],
    ['What is write skew?', 'Two transactions read overlapping data, make decisions that are each valid, but together violate an invariant. Needs serializable isolation or explicit locking.'],
    ['What is MVCC?', 'Keeping multiple versions of rows so readers see a snapshot and do not block writers.'],
    ['B-tree vs LSM-tree?', 'B-tree: in-place updates, predictable reads. LSM: sequential writes via memtable and SSTables with compaction, great write throughput, reads check multiple files (Bloom filters help).'],
    ['What is the WAL for?', 'Durability and crash recovery: log changes sequentially before applying them; also used for replication.']
  ]
}
);
