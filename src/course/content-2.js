/* Days 5 to 8 */
(window.DAYS = window.DAYS || []).push(
{
  n: 5, title: 'Databases II: many nodes', tagline: 'Replication, sharding and the consistency trade-offs that appear the moment data lives on more than one machine.',
  goals: ['Choose between leader-follower, multi-leader and leaderless replication', 'Pick a shard key and predict hot spots', 'Explain consistent hashing and why it beats modulo', 'Use CAP, PACELC and the consistency ladder to decide what each piece of data needs'],
  plan: [{ min: 25, what: 'Lesson 1: replication', to: 'l0' }, { min: 30, what: 'Lesson 2: partitioning (sharding)', to: 'l1' }, { min: 25, what: 'Lesson 3: CAP and consistency models', to: 'l2' }, { min: 15, what: 'Labs: hash ring and CAP', to: 'lab' }, { min: 10, what: 'Quiz', to: 'quiz' }, { min: 15, what: 'Practice: data layer for a social network', to: 'practice' }],
  lessons: [
    {
      title: 'Replication', short: 'Replication', min: 25, body: [
        "**Why replicate?** Three reasons: survive machine failure (availability), serve more reads (throughput), and put data near users (latency). The cost is that copies can disagree, and everything hard in this day comes from that.",
        { diagram: 'replication' },
        { h: 'Leader-follower (primary-replica)' },
        "Writes go to one leader, which streams changes (usually its write-ahead log) to followers. Reads can go to followers. It is simple and has no write conflicts, because there is one place where writes are ordered. Used by PostgreSQL, MySQL, MongoDB and most managed databases.",
        { table: { head: ['Mode', 'Leader waits for follower?', 'Trade-off'], rows: [['Asynchronous', 'No', 'Fast writes; if the leader dies, recent writes may be lost; followers lag'], ['Synchronous', 'Yes, for all', 'No loss on failover, but one slow follower blocks every write'], ['Semi-synchronous', 'Yes, for one follower', 'Common compromise: at least one up-to-date copy']] } },
        { h: 'Problems caused by replication lag' },
        { ul: ['**Read-your-writes:** you post a comment, refresh, and it is gone because the replica has not caught up. Fix: read your own recent writes from the leader, or track the last write position and only read from replicas that have reached it.', '**Monotonic reads:** refresh twice and see newer data then older data because the two reads hit different replicas. Fix: pin a user to one replica.', '**Consistent prefix:** seeing an answer before the question. Fix: keep causally related writes in one partition.'] },
        { h: 'Failover' },
        "When the leader dies, a follower is promoted. Dangers: the new leader may be missing recent writes; the old leader may come back and still believe it is the leader (**split brain**, two leaders accepting writes). Mitigations: use a consensus-based coordinator to elect exactly one leader, and **fencing** so a stale leader's writes are rejected.",
        { h: 'Multi-leader and leaderless' },
        "**Multi-leader** (a leader per region) gives low-latency local writes and survives a region outage, but two regions can edit the same record concurrently, so you need conflict resolution. **Leaderless** (Dynamo, Cassandra, Riak) sends each write to several replicas directly. With n replicas, a write needs w acknowledgements and a read asks r replicas. If **w + r > n**, read and write sets overlap, so a read sees the latest successful write. Example: n = 3, w = 2, r = 2.",
        { say: "I will use one leader with two replicas in different zones, semi-synchronous to one, and send a user's reads to the leader for a few seconds after they write." }
      ]
    },
    {
      title: 'Partitioning (sharding)', short: 'Sharding', min: 30, body: [
        "**Why shard?** Replication copies the same data everywhere, so it does not help when the data does not fit on one machine or a single leader cannot absorb the writes. **Partitioning** splits the dataset so each node holds a different slice and handles that slice's reads and writes.",
        { diagram: 'sharding' },
        { h: 'How to split' },
        { table: { head: ['Strategy', 'How', 'Good', 'Bad'], rows: [['Range', 'Key ranges per shard (A-F, G-M, ...)', 'Range scans are efficient', 'Hot spots: a timestamp key sends all new writes to the last shard'], ['Hash', 'hash(key) decides the shard', 'Even spread', 'Range queries must hit every shard'], ['Directory / lookup', 'A table says which shard owns what', 'Maximum flexibility', 'The lookup service is a new dependency and bottleneck']] } },
        { h: 'Choosing the shard key' },
        "This is the most important decision. A good key has **high cardinality** (many distinct values), **spreads load evenly**, and **matches your main query** so that most requests hit one shard. For a chat app, sharding messages by conversation id keeps a conversation's messages together. Sharding by user id for a social graph makes 'my posts' fast but 'all posts about a topic' a query to every shard (scatter-gather).",
        { warn: "Hot keys. Even with a hash, one celebrity account or one viral product can overload the single shard that owns it. Mitigate by caching, splitting the key (append a random suffix and merge on read), or giving hot keys dedicated capacity." },
        { h: 'Consistent hashing' },
        "With `hash(key) mod N`, adding a server changes N and remaps almost every key, forcing a massive data move. **Consistent hashing** places servers and keys on a ring; a key belongs to the next server clockwise. Adding or removing a server only moves the keys between it and its neighbour, about 1/N of the data. **Virtual nodes** (each server appears at many ring positions) smooth out imbalance and let strong machines take more. Dynamo, Cassandra and many caches use this idea. Try it in the lab.",
        { h: 'Everything that gets harder' },
        { ul: ['**Cross-shard queries and joins** are slow or impossible; denormalize or precompute.', '**Cross-shard transactions** need distributed protocols (2PC, sagas). Design so common operations stay in one shard.', '**Secondary indexes:** local (each shard indexes its own data, queries hit all shards) vs global (one index partitioned by the indexed value, writes touch several shards).', '**Rebalancing:** use many more partitions than nodes (for example 1,024 partitions on 10 nodes) and move whole partitions, instead of splitting data on the fly.', '**Resharding is painful.** Plan the key and partition count generously.'] },
        { tip: "Delay sharding as long as honestly possible. Cache, add replicas and optimize queries first. When you do shard, say what the key is, why, and how a cross-shard query will be handled." }
      ]
    },
    {
      title: 'CAP, PACELC and consistency models', short: 'Consistency', min: 25, body: [
        "**The setup:** a distributed database keeps copies on several nodes connected by a network. Networks fail: messages are delayed or lost, and nodes are cut off from each other (a **partition**). You cannot design partitions away, so the real question is what the system does while one is happening.",
        { h: 'CAP, stated carefully' },
        "During a partition you must choose between **consistency** (every read sees the latest write, otherwise the system errors) and **availability** (every request gets an answer, possibly stale). Partition tolerance is not optional in a distributed system, so the choice is CP or AP, and it only exists *while* the partition lasts. Try the CAP lab to feel it.",
        { h: 'PACELC: the part people forget' },
        "Even when there is no partition, there is a trade-off between **latency** and **consistency**: waiting for replicas to confirm makes writes slower. PACELC says: if Partition, choose A or C; Else, choose Latency or Consistency. This explains why 'eventually consistent' stores are fast.",
        { h: 'The consistency ladder' },
        { table: { head: ['Model', 'Guarantee', 'Example use'], rows: [['Linearizable (strong)', 'Behaves like a single copy; reads see the latest completed write, in real-time order', 'Bank balance, unique username, leader lock'], ['Sequential / causal', 'Everyone sees related operations in the same order (a reply after its question)', 'Comments, chat ordering'], ['Read-your-writes', 'You always see your own updates', 'Profile edits'], ['Eventual', 'If writes stop, replicas converge, but reads may be stale', 'Like counts, view counts, feeds, DNS']] } },
        "Stronger models are easier to reason about and slower and less available. Weaker models are fast and always on, but the application must tolerate surprises.",
        { h: 'Practical decisions' },
        { ul: ['Decide per piece of data. Money, inventory, uniqueness and permissions need strong consistency. Likes, views, recommendations and feeds do not.', 'Many stores let you tune per request: Cassandra with `QUORUM` reads and writes (w + r > n) is strongly consistent; with `ONE` it is fast and eventual. DynamoDB offers eventually consistent reads by default and strongly consistent reads on request.', 'Systems like Google Spanner give strong consistency across the globe using synchronized clocks (TrueTime), paying with write latency. CP systems such as ZooKeeper, etcd and a primary-based SQL database refuse writes on the minority side of a partition.'] },
        { say: "Payments and inventory need strong consistency, so a single leader per account shard. The feed and like counts can be eventually consistent: a few seconds of staleness is invisible to users and buys us availability and lower latency." },
        { warn: "Saying 'CAP: pick two'. Partitions are not optional, so it is about the choice under a partition. Also, 'consistency' in CAP means linearizability, which is not the same as the C in ACID." }
      ]
    },
    {
      title: 'Conflict resolution, clocks and CRDTs', short: 'Conflicts', deep: true, body: [
        "When replicas accept writes independently (multi-leader, leaderless, offline-first apps), two replicas will eventually record different values for the same key. Something must decide what the truth is.",
        { ul: ['**Last-write-wins (LWW):** the write with the latest timestamp survives. Simple, but physical clocks drift between machines, so a write that really happened later may carry an earlier timestamp and be silently lost. It is fine for data where losing a write is acceptable, dangerous otherwise.', '**Version vectors (vector clocks):** each replica counts its own updates; comparing vectors tells whether one write happened-before another or they were truly concurrent. Concurrent writes are kept as **siblings** and returned to the application to merge (Dynamo\'s shopping cart merges by union).', '**CRDTs** (conflict-free replicated data types) are structures designed so that any order of merging gives the same result: counters, sets, registers, and sequences for collaborative text. They give eventual consistency without coordination at the cost of metadata and restricted operations.', '**Operational transformation (OT)** is the older technique behind Google Docs: transform concurrent edits against each other. Needs a central server; CRDTs work peer to peer.'] },
        "Choosing: if you can make data merge-friendly (append-only logs, sets, counters), do. If not, route all writes for an item to one leader."
      ]
    },
    {
      title: 'Distributed transactions: 2PC and sagas', short: 'Distributed transactions', deep: true, body: [
        "**The problem:** an order touches the orders database, the payment service and inventory, which live in different systems. How do you make 'all or nothing' work across them?",
        { h: 'Two-phase commit (2PC)' },
        "A coordinator asks every participant to **prepare** (do the work, lock resources, promise it can commit). If all say yes, it tells everyone to **commit**; any no means everyone aborts. It gives atomicity, but it blocks: if the coordinator dies after prepare, participants hold locks until it recovers. It also couples availability (all participants must be up) and is slow. It is used inside some databases and in XA transactions, rarely across microservices.",
        { h: 'Sagas' },
        "A **saga** is a sequence of local transactions, each with a **compensating action** that undoes it. Create order, reserve stock, charge card; if charging fails, release stock and cancel the order. No global locks, so it scales and stays available, but intermediate states are visible (an order that is pending for a moment) and compensations must themselves be reliable and idempotent. **Orchestration** has a central coordinator driving the steps; **choreography** has services reacting to each other's events, which is looser but harder to follow.",
        { h: 'Making each step reliable' },
        "Each step must update its database and publish an event atomically. Writing to the database then to a queue as two separate steps can fail in between (the dual-write problem). The **outbox pattern** (Day 7) solves it. The best distributed transaction is the one you avoid: choose shard keys and service boundaries so that one operation touches one shard."
      ]
    }
  ],
  lab: { title: 'Hash ring and the CAP dilemma', min: 15, body: ["**Consistent hashing.** Add a server and compare how many of the 240 keys move under modulo hashing versus the ring. Then switch virtual nodes from 1 to 100 and see how evenly keys spread.", { widget: 'hashring' }, "**CAP.** Write and read with the network healthy. Then cut it and try again in both modes, then heal and read the result.", { widget: 'cap' }, { ul: ['Why does one virtual node per server give uneven spread?', 'In CP mode, who is unavailable during the partition? In AP mode, what had to be sacrificed instead?'] }] },
  quiz: [
    { q: 'A database has n = 3 replicas. Writes wait for 2 acknowledgements (w = 2) and reads query 2 replicas (r = 2). What does this guarantee?', opts: ['Nothing, replicas are eventually consistent', 'Every read set overlaps the latest successful write set, so reads see the latest write', 'Writes never fail', 'Reads are always fastest'], a: 1, why: 'w + r = 4 > n = 3, so any read quorum includes at least one replica that has the latest acknowledged write.' },
    { q: 'You shard a log table by timestamp (range partitioning). What problem is most likely?', opts: ['Reads become impossible', 'All new writes hit the latest shard, creating a hot spot', 'Too many shards', 'Replication fails'], a: 1, why: 'Monotonically increasing keys concentrate current writes on one range. Hash the key or combine it with another dimension.' },
    { q: 'Why does consistent hashing beat hash(key) mod N when adding a server?', opts: ['It is faster to compute', 'Only about 1/N of keys move instead of nearly all of them', 'It removes replicas', 'It supports range queries'], a: 1, why: 'Changing N reshuffles almost every key with modulo; the ring only reassigns keys adjacent to the new node.' },
    { q: 'During a network partition, a CP system will:', opts: ['Keep accepting writes everywhere', 'Reject or delay some requests to avoid returning inconsistent data', 'Lose the partition', 'Automatically merge data'], a: 1, why: 'CP chooses consistency over availability: the side that cannot reach a quorum stops serving.' },
    { q: 'A user updates their profile, refreshes, and sees the old value. The page was served from an async replica. Best fix?', opts: ['Remove replicas', 'Read the user\'s own recent writes from the leader (read-your-writes)', 'Use sticky load balancing for everything', 'Make writes synchronous to every replica'], a: 1, why: 'Route a user\'s reads to the leader for a short period after they write, or only use replicas that have caught up to their write.' },
    { q: 'Which data most needs strong consistency?', opts: ['Number of likes on a post', 'Account balance and the uniqueness of usernames', 'View counts', 'Search suggestions'], a: 1, why: 'Money and uniqueness constraints break visibly under stale reads. Counters and recommendations tolerate staleness.' }
  ],
  practice: {
    min: 15,
    prompt: ["**Data layer for a social network with 500 million users.** Entities: user profiles, posts, the follow graph, and like counts. Reads outnumber writes about 100 to 1, users are global.", "For each entity decide: the store type, how you replicate it, how you shard it (and the key), and the consistency you need. Name one hot-spot risk and how you handle it."],
    hints: ['Different entities can use different stores and different consistency.', 'Think about the celebrity with 50 million followers.', 'What query dominates for each entity?'],
    outline: [
      { table: { head: ['Entity', 'Store and key', 'Replication and consistency'], rows: [['Profiles', 'Relational or key-value, shard by user_id', 'Leader per shard, replicas for reads; read-your-writes for own edits; cache heavily'], ['Posts', 'Wide-column or sharded SQL, shard by author_id (or post_id with time-ordered ids); store by (author, time) for fast profile pages', 'Eventual is fine for readers; durable writes (sync or semi-sync) so a post is never lost'], ['Follow graph', 'Two tables: following(user, followee) and followers(followee, user), each sharded by its first column, so both directions are single-shard lookups', 'Eventual consistency acceptable; the double write is made reliable through a queue or outbox'], ['Like counts', 'Redis or a counter table; aggregated asynchronously from a like event stream', 'Eventual; approximate numbers are fine']] } },
      "Hot-spot: a celebrity's posts and like counter. Cache their profile and recent posts at the edge, shard the like counter into N sub-counters summed on read, and avoid per-follower fan-out writes for celebrities."
    ],
    rubric: 'Good answers pick stores per entity, shard keys aligned with main queries, mention both directions of the follow graph, distinguish strong vs eventual consistency per data type, replication topology with failover, caching, and a concrete hot key mitigation for celebrity accounts (split counters, caching, hybrid fan-out).'
  },
  cheat: ['Replication gives availability and read scale; async lag causes stale reads, so use read-your-writes. Failover risks lost writes and split brain; fence the old leader.', 'Quorum: w + r > n guarantees overlap.', 'Shard key: high cardinality, even load, aligned with the main query. Beware hot keys and monotonic keys.', 'Consistent hashing with virtual nodes moves about 1/N of keys on change; modulo moves almost all.', 'CAP: during a partition choose consistency or availability. PACELC: otherwise latency vs consistency.', 'Decide consistency per data type. Strong for money and uniqueness; eventual for counts and feeds.', 'Avoid distributed transactions; use sagas with compensation when you must.'],
  cards: [
    ['Why replicate data?', 'Availability (survive failures), read throughput, lower latency by placing copies near users.'],
    ['What is replication lag and what bug does it cause?', 'Followers apply changes later than the leader. Users may not see their own writes (read-your-writes) or see time go backwards (monotonic reads).'],
    ['What is split brain and how do you prevent it?', 'Two nodes both think they are leader. Use consensus-based election and fencing tokens so a stale leader\'s writes are rejected.'],
    ['What does w + r > n give you?', 'Read and write quorums overlap, so a read sees the latest acknowledged write.'],
    ['Range vs hash partitioning?', 'Range supports range scans but risks hot spots; hash spreads evenly but loses range queries.'],
    ['What makes a good shard key?', 'High cardinality, even load distribution, and alignment with the primary query so most requests hit one shard.'],
    ['Explain consistent hashing and virtual nodes.', 'Servers and keys on a ring; a key belongs to the next server clockwise. Adding a node moves about 1/N of keys. Virtual nodes give many ring positions per server for balance and weighting.'],
    ['State CAP precisely.', 'During a network partition a distributed system must choose between consistency (error out) and availability (answer, possibly stale).'],
    ['What does PACELC add?', 'Without a partition there is still a trade-off between latency and consistency.'],
    ['Order the consistency models from strongest to weakest.', 'Linearizable, sequential/causal, read-your-writes, eventual.'],
    ['2PC vs saga?', '2PC is atomic and blocking with locks held; sagas are a chain of local transactions with compensating actions, available but with visible intermediate states.'],
    ['Why is last-write-wins risky?', 'Clock skew can make a later write look earlier and be silently dropped.']
  ]
},

{
  n: 6, title: 'Caching', tagline: 'The highest-leverage tool in system design, and the source of its most subtle bugs.',
  goals: ['Compute how hit ratio changes average latency and database load', 'Pick a cache pattern (aside, through, back) and defend it', 'Prevent stampedes, penetration, avalanche and hot keys', 'Use Redis data structures for more than plain caching'],
  plan: [{ min: 25, what: 'Lesson 1: why caches work', to: 'l0' }, { min: 25, what: 'Lesson 2: cache patterns', to: 'l1' }, { min: 25, what: 'Lesson 3: failure modes and invalidation', to: 'l2' }, { min: 15, what: 'Lab: eviction simulator', to: 'lab' }, { min: 10, what: 'Quiz', to: 'quiz' }, { min: 20, what: 'Practice: cache a product page', to: 'practice' }],
  lessons: [
    {
      title: 'Why caches work', short: 'Why caches work', min: 25, body: [
        "**The idea:** keep a copy of expensive-to-get data in something cheaper and faster to reach. It works because access patterns have **locality**: a small fraction of the data gets most of the requests (a few viral posts, today's orders, popular products). Cache that fraction and most requests never touch the slow thing.",
        { h: 'The arithmetic of hit ratio' },
        "Average latency = hit ratio x cache time + (1 - hit ratio) x database time. With cache 1 ms and database 50 ms:",
        { table: { head: ['Hit ratio', 'Average latency', 'Database load (per 10,000 requests)'], rows: [['0%', '50 ms', '10,000'], ['80%', '10.8 ms', '2,000'], ['95%', '3.5 ms', '500'], ['99%', '1.5 ms', '100']] } },
        "The last few points of hit ratio matter enormously: going from 95% to 99% cuts database load fivefold. That is why caches protect databases, not just speed requests up.",
        { h: 'Where caches live (closest to the user first)' },
        { ol: ['**Browser** cache (HTTP headers), free and instant.', '**CDN / edge** cache for static and public content.', '**API gateway or reverse proxy** cache.', '**Application in-process** cache (a map in memory): fastest, but each server has its own copy, so they diverge and total memory multiplies.', '**Distributed cache** (Redis, Memcached): shared by all servers, one network hop away.', '**Database** internal caches (buffer pool, query cache).'] },
        { h: 'What is worth caching' },
        "Data that is read often, expensive to compute or fetch, and tolerates some staleness: product pages, user profiles, rendered fragments, computed aggregates, feed pages, permissions. Poor candidates: data that changes on every request, personalized data with low reuse, and anything where a stale answer causes harm (account balance during a transfer).",
        { tip: "Always attach a number: 'About 95% of reads hit a handful of hot keys, so a 20 GB Redis cluster should give ~95% hit ratio and cut database reads from 20,000/s to 1,000/s.'" }
      ]
    },
    {
      title: 'Cache patterns', short: 'Patterns', min: 25, body: [
        "The patterns differ in **who talks to the database** and **when writes reach it**.",
        { h: 'Cache-aside (lazy loading), the default' },
        "The application checks the cache; on a miss it reads the database and fills the cache. Only requested data is cached, and a cache outage degrades performance rather than breaking correctness. Step through it:",
        { diagram: 'cache-aside' },
        { table: { head: ['Pattern', 'Read path', 'Write path', 'Use when'], rows: [['Cache-aside', 'App checks cache, loads DB on miss, fills cache', 'App writes DB, then deletes the key', 'General purpose. The default answer'], ['Read-through', 'Cache itself loads from DB on miss', 'Separate', 'You want the cache library to own loading logic'], ['Write-through', 'Always fresh', 'Write cache and DB synchronously, return when both done', 'Reads must never be stale; accept slower writes'], ['Write-around', 'Reads fill cache lazily', 'Write only to DB', 'Written data is rarely read soon (logs, uploads)'], ['Write-back (write-behind)', 'Reads served from cache', 'Write to cache, flush to DB later in batches', 'Very high write rate, can tolerate losing a little (counters, metrics)']] } },
        { diagram: 'write-back' },
        { h: 'Eviction: what leaves when memory is full' },
        { ul: ['**LRU** (least recently used) evicts what has not been touched longest. The common default; good when recent access predicts future access.', '**LFU** (least frequently used) evicts the least popular. Better for stable popularity, but old popular items linger.', '**FIFO** evicts the oldest inserted; simple and usually worse.', '**TTL** expires entries after a time regardless; it bounds staleness. Use TTL together with an eviction policy.'] },
        "Open the lab to see how capacity and policy change the hit ratio on skewed traffic."
      ]
    },
    {
      title: 'Failure modes and invalidation', short: 'Failure modes', min: 25, body: [
        "'There are only two hard things in computer science: cache invalidation and naming things.' Caches create a second copy of the truth, and copies drift. These are the standard problems and fixes.",
        { table: { head: ['Problem', 'What happens', 'Fix'], rows: [['Cache stampede (thundering herd)', 'A hot key expires; thousands of requests miss at once and all hit the database', 'Lock so one request rebuilds while others wait or get stale data (single-flight); refresh before expiry; stale-while-revalidate'], ['Cache penetration', 'Requests for keys that do not exist always miss and reach the database (often an attack)', 'Cache the "not found" result briefly; a Bloom filter in front of the cache; validate input'], ['Cache avalanche', 'Many keys expire at the same moment, or the cache node dies, and the database drowns', 'Add random jitter to TTLs; replicate the cache; protect the database with rate limits and circuit breakers; warm up before cutover'], ['Hot key', 'One key gets so much traffic that one cache node saturates', 'Replicate it across nodes, add a small in-process cache, or split the key with a suffix']] } },
        { h: 'Invalidation strategies' },
        { ul: ['**TTL only:** simple, bounded staleness. Choose TTL by how wrong you can afford to be.', '**Delete on write:** after updating the database, delete the cache key. Prefer delete over update: two concurrent writers updating the cache can leave the older value last.', '**Event-driven:** publish change events (via change data capture from the database log) and have consumers invalidate keys. Decouples writers from knowing every cache key.', '**Versioned keys:** `user:42:v17`. Bump the version instead of deleting; old entries age out.'] },
        { h: 'The classic race' },
        "Even cache-aside has a rare race: reader A misses and reads old value from the DB; writer B updates the DB and deletes the key; reader A then writes the old value into the cache. Now the cache is stale until TTL expires. It is rare because it needs a slow reader, which is why you always keep a TTL as a safety net.",
        { say: "I will use cache-aside with a 5 minute TTL plus random jitter, delete the key on update, and add single-flight locking on rebuilds for hot keys to prevent stampedes." },
        { warn: "Forgetting what happens when the cache is empty or down. If your database cannot survive the full load without the cache, then the cache is not an optimization, it is a critical dependency. Test that failure." }
      ]
    },
    {
      title: 'Redis in depth', short: 'Redis', deep: true, body: [
        "Redis is an in-memory data structure server. It is single-threaded for command execution (one command at a time), so every command is atomic, which makes counters and locks easy. That is also why one slow command (`KEYS *` on a big keyspace) blocks everyone.",
        { table: { head: ['Structure', 'Typical use', 'Example commands'], rows: [['String', 'Cache values, counters, locks', 'GET, SET key val EX 60, INCR'], ['Hash', 'Object fields (user profile)', 'HSET, HGETALL'], ['List', 'Queues, recent items', 'LPUSH, RPOP, LRANGE'], ['Set', 'Unique members, tags, mutual friends', 'SADD, SINTER'], ['Sorted set', 'Leaderboards, delayed jobs, sliding-window rate limits', 'ZADD, ZRANGE, ZRANK'], ['HyperLogLog', 'Approximate unique counts in 12 KB', 'PFADD, PFCOUNT'], ['Bitmap', 'Daily active flags per user id', 'SETBIT, BITCOUNT'], ['Stream / Pub-Sub', 'Event log, fan-out messages', 'XADD, PUBLISH']] } },
        { h: 'Durability and scale' },
        { ul: ['**Persistence:** RDB (periodic snapshots) and AOF (append-only log of writes). Without them a restart loses everything. Even with them, treat Redis as a cache unless you chose the trade-offs deliberately.', '**Replication and failover:** leader-follower with Sentinel for automatic failover. Replication is asynchronous, so a failover can lose recent writes.', '**Cluster:** keys are hashed into 16,384 slots spread across nodes; clients route by slot. Multi-key operations must stay within one slot (hash tags).', '**Memory policy:** `maxmemory` with `allkeys-lru` makes it behave like a cache.'] },
        { h: 'Patterns' },
        { code: "# rate limit: 100 requests per minute per user (fixed window)\nINCR rl:user42:2026-11-25T13:42\nEXPIRE rl:user42:2026-11-25T13:42 60\n\n# leaderboard\nZADD board 1520 alice ; ZREVRANGE board 0 9 WITHSCORES\n\n# simple lock (holder-unique value, expiry avoids deadlock)\nSET lock:order:9 <random-token> NX PX 30000" },
        "A lock with a timeout can expire while its holder is paused (a long GC), and then two holders believe they have the lock. For correctness-critical mutual exclusion use a consensus system and **fencing tokens** (Day 8)."
      ]
    }
  ],
  lab: { title: 'Cache eviction simulator', min: 15, body: ["Click keys to request them, or send 40 realistic requests where a few keys dominate. Change capacity, then policy, and watch the hit ratio.", { widget: 'cache' }, { ul: ['With capacity 3, 4, 6 and 8, how does hit ratio change on the realistic traffic? Where are the diminishing returns?', 'Click a scan of keys A to L in order, then request A again. Which policy suffers most from a scan?'] }] },
  quiz: [
    { q: 'Cache 1 ms, database 50 ms. Raising the hit ratio from 95% to 99% changes database load by about:', opts: ['No change', 'Reduces it 5x (from 5% to 1% of requests)', 'Reduces it by 4%', 'Doubles it'], a: 1, why: 'Misses go from 5% to 1% of requests. Small hit ratio gains near the top have large effects on the database.' },
    { q: 'A very popular key expires and 5,000 requests rebuild it simultaneously. This is a:', opts: ['Cache penetration', 'Cache stampede', 'Cache avalanche', 'Write-back failure'], a: 1, why: 'A stampede is many concurrent misses on one hot key. Fix with single-flight locking, early refresh, or stale-while-revalidate.' },
    { q: 'Attackers request random IDs that do not exist, bypassing the cache and hammering the database. Best defense?', opts: ['Longer TTL', 'Cache negative results and/or put a Bloom filter in front', 'Bigger database', 'Write-through caching'], a: 1, why: 'This is cache penetration. Remember "not found" for a short time and cheaply reject keys that cannot exist.' },
    { q: 'Which pattern risks losing acknowledged writes if the cache crashes?', opts: ['Cache-aside', 'Write-through', 'Write-back', 'Read-through'], a: 2, why: 'Write-back acknowledges after writing the cache only; unflushed data is lost on a crash.' },
    { q: 'After updating a row, why is it usually better to DELETE the cache key than to SET the new value?', opts: ['Deleting is faster', 'Concurrent writers can leave an older value last when both set the cache; deleting forces a fresh read', 'Redis forbids SET after updates', 'It saves memory'], a: 1, why: 'Updating the cache in write order is racy across concurrent writers; deletion makes the next read load the current database state.' },
    { q: 'Why add random jitter to TTLs?', opts: ['To increase memory use', 'To avoid many keys expiring at the same instant (avalanche)', 'To improve LRU', 'To encrypt keys'], a: 1, why: 'Staggering expirations keeps the miss traffic spread out instead of arriving as one wave.' }
  ],
  practice: {
    min: 20,
    prompt: ["**Cache a product detail page.** An e-commerce site serves 100,000 product page reads per second at peak. Sellers update prices and stock a few times a day. During a flash sale, one product receives 30% of all traffic, and its stock must be accurate when the user clicks Buy.", "Design the caching layers, TTLs and invalidation. Say what you cache and what you refuse to cache. How do you survive the flash-sale hot key and a cache outage?"],
    hints: ['Not all fields need the same freshness. Price shown on the page vs stock at checkout.', 'Count how many layers sit between the user and the database.', 'What happens to the database if the whole cache disappears?'],
    outline: [
      { ol: ['**CDN** caches the static parts and, with a short TTL (30 to 60 s) plus stale-while-revalidate, the public product JSON/HTML. This alone absorbs most of the 100K reads/s.', '**Redis** (cache-aside) holds product details with TTL plus jitter. Updates by sellers delete the key (or publish an invalidation event).', '**Stock** is not trusted from cache at checkout: the Buy path checks the database with an atomic conditional update. The page can show "low stock" from a slightly stale cache.', '**Hot key:** flash-sale product replicated across several cache keys (`product:9#1..#8`, picked randomly) and a short in-process cache on app servers; pre-warm before the sale. Use single-flight so only one request rebuilds on expiry.', '**Cache outage:** replicas and clustering for the cache; circuit breaker and rate limiting in front of the database; request coalescing; warm-up on restart.'] }
    ],
    rubric: 'Strong answers layer CDN + distributed cache (+ optional local), separate fields by freshness need, use TTL with jitter, delete-on-update or event invalidation, atomic DB check for stock at purchase, hot key mitigation (key splitting, local cache, pre-warm), stampede protection, and a plan for cache failure (DB protection).'
  },
  cheat: ['Average latency = h x cache + (1-h) x DB. Hit ratio gains near the top slash database load.', 'Cache-aside is the default. Write-through for freshness, write-back for speed with risk.', 'Delete the key on update, keep a TTL as a safety net, add jitter.', 'Stampede: single-flight or early refresh. Penetration: cache not-found, Bloom filter. Avalanche: jitter and replication. Hot key: split or replicate.', 'Redis is single-threaded and atomic per command; sorted sets, HyperLogLog and bitmaps solve many problems.', 'If the database cannot survive without the cache, the cache is a critical dependency. Plan for its failure.'],
  cards: [
    ['Formula for average latency with a cache?', 'h x cache time + (1 - h) x backend time.'],
    ['Describe cache-aside.', 'App checks cache; on miss reads DB and fills the cache. On write: update DB, delete the key.'],
    ['Write-through vs write-back?', 'Write-through writes cache and DB synchronously (safe, slower). Write-back writes the cache and flushes to DB later (fast, can lose data on crash).'],
    ['Cache stampede: cause and fixes?', 'Many concurrent misses when a hot key expires. Single-flight lock, refresh ahead, stale-while-revalidate.'],
    ['Cache penetration: cause and fixes?', 'Requests for nonexistent keys always reach DB. Cache negative results, Bloom filter, input validation.'],
    ['Cache avalanche: cause and fixes?', 'Many keys expire together or the cache fails. TTL jitter, replication, DB protection.'],
    ['Why delete instead of update the cache on writes?', 'Concurrent writers updating the cache can leave a stale value last; deleting forces the next read to load fresh state.'],
    ['LRU vs LFU?', 'LRU evicts least recently used; LFU evicts least frequently used. LRU adapts to recency; LFU suits stable popularity.'],
    ['Name five Redis structures and a use for each.', 'String (counter), hash (object), list (queue), set (unique tags), sorted set (leaderboard, sliding-window limiter), HyperLogLog (approximate unique count).'],
    ['Why is Redis atomic per command?', 'Command execution is single-threaded, so one command completes before the next begins.'],
    ['How do you handle a hot key?', 'Replicate across nodes, add a local in-process cache, split into sub-keys with suffixes, pre-warm.']
  ]
},

{
  n: 7, title: 'Async and messaging', tagline: 'Queues, logs and event streams: how to decouple work, absorb spikes and still be correct.',
  goals: ['Explain what a queue buys you and what it costs', 'Describe Kafka\'s log, partitions, consumer groups and offsets', 'Reason about at-most-once, at-least-once and exactly-once', 'Use the outbox pattern and idempotent consumers'],
  plan: [{ min: 25, what: 'Lesson 1: message queues', to: 'l0' }, { min: 30, what: 'Lesson 2: logs, pub/sub and Kafka', to: 'l1' }, { min: 25, what: 'Lesson 3: delivery guarantees and the outbox', to: 'l2' }, { min: 10, what: 'Lab: queue depth', to: 'lab' }, { min: 10, what: 'Quiz', to: 'quiz' }, { min: 20, what: 'Practice: media pipeline', to: 'practice' }],
  lessons: [
    {
      title: 'Message queues', short: 'Queues', min: 25, body: [
        "**The problem:** doing work inside the request makes users wait and ties your uptime to every slow step (sending email, encoding video, calling a flaky partner). Traffic spikes hit the slowest component directly.",
        "**The idea:** the caller writes a small message describing the work to a durable **queue** and returns immediately. Separate **worker** processes pull messages and do the work at their own pace.",
        { diagram: 'queue-flow' },
        { h: 'What a queue gives you' },
        { ul: ['**Decoupling:** the producer does not know or wait for the consumer. Either can be deployed, scaled or fail independently.', '**Buffering:** spikes become backlog instead of outages.', '**Elastic scaling:** add workers when the backlog grows.', '**Retries:** failed work returns to the queue instead of vanishing.'] },
        { h: 'What it costs' },
        { ul: ['**Eventual results.** The user must be told "processing", with a status endpoint, a webhook or a push notification.', '**Duplicates and reordering** are possible, so consumers must be idempotent and not rely on strict order.', '**New failure modes:** a growing backlog, poison messages, a full queue.', '**More to operate and monitor.**'] },
        { h: 'Mechanics to know' },
        { ul: ['**Acknowledgement and visibility timeout:** a worker takes a message, which becomes invisible. If the worker acks, it is deleted. If it crashes or is too slow, the timeout expires and the message reappears for another worker.', '**Dead-letter queue (DLQ):** after N failed attempts a message is moved aside for inspection instead of retrying forever (a **poison message**).', '**Competing consumers:** many workers on one queue share the work; each message goes to exactly one worker.', '**Priority:** use separate queues for urgent vs bulk work so a flood of low-priority messages cannot delay important ones.', '**Backpressure:** bound the queue and decide what happens when full (block producers, reject, drop low priority). An unbounded queue just hides overload until memory runs out.'] },
        { tip: "Queue depth and the age of the oldest message are the two metrics to alert on. Rising depth with steady throughput means workers are too slow." }
      ]
    },
    {
      title: 'Logs, pub/sub and Kafka', short: 'Kafka', min: 30, body: [
        "A queue deletes messages once handled and delivers each to one consumer. Many systems instead need **many independent consumers**, **replay**, and **huge throughput**. The answer is the distributed commit log, with Kafka the standard example.",
        { diagram: 'pubsub' },
        { h: 'The model' },
        { ul: ['A **topic** is a named stream, split into **partitions**. Each partition is an append-only, ordered log on disk, replicated to other brokers.', 'Producers append to a partition. The partition is chosen by hashing a **key** (all events for one user or order land in the same partition) or round-robin if no key.', 'Each message has an **offset**, its position in the partition. Consumers track the offset they have reached; the broker does not delete messages when read.', 'Messages are kept for a configured **retention** (days, or forever). A new consumer can start from the beginning and **replay** history.'] },
        { h: 'Consumer groups: scaling reads' },
        "Consumers join a **group**. The partitions of a topic are divided among the consumers in the group, each partition read by exactly one member. Add consumers to scale, up to the number of partitions (which is therefore your maximum parallelism). A different group reads the same topic independently, so email, analytics and search can each consume all events at their own pace.",
        { h: 'Ordering' },
        "Order is guaranteed **only within a partition**. Use the entity id as the key so that everything about one order is sequential, and accept no global order across partitions.",
        { table: { head: ['', 'Queue (RabbitMQ, SQS)', 'Log (Kafka, Kinesis, Pulsar)'], rows: [['After consumption', 'Message deleted', 'Message retained, consumer moves its offset'], ['Consumers', 'Competing; each message to one', 'Many groups, each sees everything'], ['Replay', 'Not possible', 'Yes'], ['Throughput', 'Thousands to tens of thousands/s per queue', 'Hundreds of thousands to millions/s'], ['Routing / priorities', 'Rich', 'Basic; partition by key'], ['Best for', 'Task distribution, job processing', 'Event streams, data pipelines, audit logs, many consumers']] } },
        { h: 'Why Kafka is fast' },
        "It only appends to files sequentially (fast on any disk), relies on the OS page cache, batches and compresses messages, and uses zero-copy transfer from disk to network. Durability comes from replication: each partition has a leader and followers, and a producer setting (`acks=all` with in-sync replicas) controls how many copies must confirm a write.",
        { warn: "Too few partitions caps your parallelism; too many increases overhead and recovery time. A hot key creates a hot partition. Choose partition count from target throughput divided by per-consumer throughput, with headroom." }
      ]
    },
    {
      title: 'Delivery guarantees and the outbox', short: 'Delivery and outbox', min: 25, body: [
        "Networks lose acknowledgements, so a sender can never be certain whether a message arrived. It must choose what to do when unsure.",
        { table: { head: ['Guarantee', 'Sender behaviour', 'Result', 'Use for'], rows: [['At-most-once', 'Send once, never retry', 'May lose messages, never duplicates', 'Metrics, logs where loss is tolerable'], ['At-least-once', 'Retry until acknowledged', 'No loss, but duplicates possible', 'The default for most systems'], ['Exactly-once', 'Not achievable on the wire alone', 'Achieved by at-least-once + idempotent processing, or transactional writes (Kafka transactions within Kafka)', 'Payments, inventory']] } },
        { h: 'Idempotent consumers' },
        "Because at-least-once delivers duplicates, make the handler safe to repeat. Techniques: use a natural idempotency key and record processed ids in a table with a unique constraint (inserted in the same transaction as the effect); make the operation naturally idempotent (`SET status = 'shipped'` instead of `INCREMENT`); or version the data and ignore stale updates.",
        { h: 'The dual-write problem and the outbox pattern' },
        "A service must update its database *and* publish an event ('order created'). Doing both separately can fail in between: the database commits but the publish fails, so the event is lost; or the reverse. The **transactional outbox** fixes this: in one database transaction, write the order *and* a row in an `outbox` table. A separate relay process (or change data capture reading the database log, for example Debezium) reads the outbox and publishes to the broker, retrying until it succeeds. The event is published at least once, and consumers dedupe.",
        { code: "BEGIN;\n  INSERT INTO orders(id, user_id, total) VALUES (9, 42, 30);\n  INSERT INTO outbox(id, topic, payload) VALUES (uuid(), 'order.created', '{\"order_id\":9}');\nCOMMIT;\n-- relay: SELECT unsent rows -> publish -> mark sent (at-least-once)" },
        { h: 'Handling trouble' },
        { ul: ['**Poison messages:** cap retries, then dead-letter, with alerting and a replay tool.', '**Ordering and retries:** a retried message can overtake later ones. Use per-key ordering, or carry a version number so stale messages are ignored.', '**Consumer lag** (messages behind the head) is the key health metric. Alert on it and scale consumers or shed work.', '**Backpressure** end to end: bounded buffers, rate limits on producers, and a plan to drop or defer low-priority work.'] },
        { say: "The API writes the order and an outbox row in one transaction. A relay publishes to Kafka at least once, and every consumer is idempotent using the event id, so duplicates are harmless." }
      ]
    },
    {
      title: 'Event sourcing and CQRS', short: 'Event sourcing', deep: true, body: [
        "Normally you store the **current state** (a row with the balance). In **event sourcing** you store the sequence of **events** that happened (Deposited 50, Withdrew 20) as the source of truth, and derive current state by replaying them (plus periodic snapshots for speed).",
        { ul: ['**Gains:** a perfect audit trail, ability to rebuild any view or fix bugs by replaying history, natural integration (other services subscribe to events), time-travel debugging.', '**Costs:** you need to evolve event schemas forever, eventual consistency between events and views, harder ad hoc queries, and the mental shift.'] },
        "**CQRS** (command query responsibility segregation) separates the model that handles writes (commands, validated against current state) from the models that serve reads (denormalized views built from the events, perhaps in different stores: a search index, a cache, a SQL reporting table). It lets reads and writes scale and be shaped independently. It pairs naturally with event sourcing but works alone.",
        "Use it where history matters (finance, ledgers, collaboration) or where read shapes are very different from write shapes. Do not use it for a simple CRUD app."
      ]
    },
    {
      title: 'Batch and stream processing', short: 'Batch and stream', deep: true, body: [
        "**Batch processing** runs a job over a large, bounded dataset periodically (nightly reports, training data, search index builds). **MapReduce** is the founding idea: *map* each record to key-value pairs in parallel across many machines, shuffle by key, then *reduce* each key's values. Spark generalizes it, keeping data in memory for speed and chaining many steps.",
        "**Stream processing** handles unbounded data continuously as it arrives (fraud detection, live dashboards, trending topics). Engines such as Flink and Kafka Streams keep state, and support **windows**: tumbling (fixed, non-overlapping), sliding, and session windows. Key concerns: **event time vs processing time** (events arrive late and out of order, so use watermarks to decide when a window is complete), exactly-once state updates via checkpoints, and backpressure.",
        "**Lambda architecture** runs a batch layer (accurate, slow) and a speed layer (approximate, fast) and merges them; **Kappa** simplifies to one streaming pipeline with replay from the log. Typical use in an interview: top-K trending items, counting unique users, aggregating clicks per minute: stream the events into Kafka, aggregate in windows, store results in a fast store for queries."
      ]
    }
  ],
  lab: { title: 'Watch a queue fill and drain', min: 10, body: ["Set producers to 20/s and consumers to 3 (capacity 30/s). Then press the spike button and watch what happens to the backlog and the wait time.", { widget: 'queue' }, { ul: ['How many consumers do you need so that a 4-second 5x spike drains in under 10 seconds?', 'Set consumers to 1 with producers at 20/s. What does the graph do over time and what does it tell you about average rate vs capacity?'] }] },
  quiz: [
    { q: 'In Kafka, what guarantees ordering of events for one order id?', opts: ['Topic-wide global ordering', 'Using the order id as the partition key so all its events go to one partition', 'Having a single consumer group', 'Setting retention to forever'], a: 1, why: 'Ordering exists only within a partition. Keying by entity id puts that entity\'s events in one partition.' },
    { q: 'A topic has 6 partitions and one consumer group. What is the maximum useful number of consumers in the group?', opts: ['1', '6', '12', 'Unlimited'], a: 1, why: 'Each partition is read by one consumer per group, so extra consumers beyond 6 sit idle.' },
    { q: 'With at-least-once delivery, what must consumers be?', opts: ['Faster than producers', 'Idempotent, because duplicates can arrive', 'Stateless only', 'Single-threaded'], a: 1, why: 'Retries after lost acknowledgements cause duplicates; handling them safely is the consumer\'s job.' },
    { q: 'What problem does the transactional outbox pattern solve?', opts: ['Slow queries', 'Updating the database and publishing an event atomically (the dual-write problem)', 'Message compression', 'Consumer scaling'], a: 1, why: 'The event is written in the same database transaction as the state change and published later by a relay, so neither can happen without the other.' },
    { q: 'Which is the best fit for several independent services each needing every order event, with the ability to replay?', opts: ['A single work queue', 'A log-based topic (Kafka) with one consumer group per service', 'Polling the database', 'Email'], a: 1, why: 'Separate consumer groups each get all events and track their own offsets; retention allows replay.' },
    { q: 'A message fails processing repeatedly and blocks progress. What is the standard handling?', opts: ['Retry forever', 'Retry a limited number of times, then move it to a dead-letter queue', 'Delete it silently', 'Restart the broker'], a: 1, why: 'A DLQ isolates poison messages for inspection and replay without stalling the rest of the queue.' }
  ],
  practice: {
    min: 20,
    prompt: ["**A media processing pipeline.** Users upload photos and videos. Each upload must produce 3 thumbnails and 3 video resolutions, run a safety scan, then notify followers. Uploads can be 2 GB. Workers sometimes crash mid-job. Peak is 5,000 uploads per minute with 10x spikes after events.", "Design the flow end to end. How do large files get to storage without passing through your API servers? How do you split the work, retry safely, report progress, and avoid doing the work twice?"],
    hints: ['Think about presigned URLs for the upload itself.', 'What event signals "upload complete"?', 'One job per output or one job for all outputs? Consider failure and parallelism.'],
    outline: [
      { ol: ['Client asks the API for a **presigned URL**; uploads straight to object storage (resumable, chunked for 2 GB). The API never carries the bytes.', 'Storage emits an "object created" event; an **upload service** records metadata (status = processing) and publishes `media.uploaded` to a queue/topic (via outbox if it also writes a DB row).', 'A **fan-out** stage creates independent tasks: thumbnail, each transcode resolution, safety scan, each on its own queue so they scale and fail independently (video encoding is slow and CPU-heavy: dedicated autoscaled worker pool).', 'Workers are **idempotent**: output file key is derived from (media id, variant), so a retry overwrites the same object; a status table with a unique (media id, variant) row tracks completion.', 'Visibility timeout longer than typical job; retries with backoff; **DLQ** after N attempts with alerts.', 'When all required variants are done (a join step, or a counter in the DB), publish `media.ready`; notification consumers fan out to followers. Progress shown from the status table via polling or SSE.', 'Spikes: the queue absorbs the 10x peak; autoscale workers on queue depth and oldest-message age; low-priority work (extra resolutions) can lag.'] }
    ],
    rubric: 'Look for: presigned direct-to-storage upload, event-driven pipeline with queues, separate queues per task type, idempotent deterministic outputs, retries with DLQ, status tracking and progress reporting, autoscaling on queue depth, safe completion join, spike handling, and mention of at-least-once semantics.'
  },
  cheat: ['Queue = decouple, buffer, retry; cost = eventual results, duplicates, ops. Use ack + visibility timeout + DLQ.', 'Kafka: partitioned append-only log; order per partition; consumer groups share partitions; offsets; retention allows replay.', 'Queues delete after use; logs keep data. Many independent consumers means a log.', 'At-least-once + idempotent consumers is how you get effectively exactly-once.', 'Outbox: write event in the same transaction as the state, relay publishes later.', 'Alert on queue depth, oldest message age and consumer lag.'],
  cards: [
    ['What does a queue decouple?', 'Producer and consumer in time, speed and failure; it buffers spikes and enables retries.'],
    ['What is a visibility timeout?', 'After a worker takes a message it is hidden; if not acknowledged before the timeout, it reappears for another worker.'],
    ['What is a DLQ for?', 'Holding messages that failed repeatedly (poison messages) for inspection, without blocking the queue.'],
    ['Kafka: what is a partition and what ordering exists?', 'An append-only ordered log; order is guaranteed only within a partition. Use an entity key to keep its events together.'],
    ['What limits consumer parallelism in a Kafka group?', 'The number of partitions; each partition goes to one consumer in the group.'],
    ['Queue vs Kafka-style log?', 'Queue deletes on consume and delivers each message to one consumer; log retains messages, multiple consumer groups, replay, higher throughput.'],
    ['At-most-once vs at-least-once vs exactly-once?', 'At-most-once may lose; at-least-once may duplicate; exactly-once effect = at-least-once delivery plus idempotent processing.'],
    ['How do you make a consumer idempotent?', 'Record processed message ids with a unique constraint in the same transaction as the effect, or make the operation naturally idempotent.'],
    ['Explain the outbox pattern.', 'Write the state change and an outbox row in one DB transaction; a relay/CDC publishes outbox rows at-least-once.'],
    ['Why does an unbounded queue not solve overload?', 'It hides it: latency grows and memory fills. Bound it, apply backpressure or shed load.'],
    ['What is event sourcing?', 'Storing the sequence of events as the source of truth and deriving state by replay.']
  ]
},

{
  n: 8, title: 'Reliability and coordination', tagline: 'Rate limiting, resilience patterns, consensus and observability: how large systems protect themselves and agree on things.',
  goals: ['Compare rate limiting algorithms and design a distributed limiter', 'Prevent cascading failures with timeouts, circuit breakers and bulkheads', 'Explain leader election, quorums and fencing in plain terms', 'Know what to measure and how to alert'],
  plan: [{ min: 25, what: 'Lesson 1: rate limiting', to: 'l0' }, { min: 25, what: 'Lesson 2: resilience patterns', to: 'l1' }, { min: 25, what: 'Lesson 3: consensus and coordination', to: 'l2' }, { min: 15, what: 'Lesson 4: observability', to: 'l3' }, { min: 10, what: 'Quiz', to: 'quiz' }, { min: 20, what: 'Practice: distributed rate limiter', to: 'practice' }],
  lessons: [
    {
      title: 'Rate limiting', short: 'Rate limiting', min: 25, body: [
        "**Why limit?** To stop abuse and bugs (a client stuck in a loop), keep shared systems fair, protect downstream services, and control cost. Without limits, one noisy client can take everyone down.",
        { h: 'Algorithms' },
        { table: { head: ['Algorithm', 'How it works', 'Pros', 'Cons'], rows: [['Fixed window', 'Count requests per calendar window (per minute); reject above the limit', 'Trivial, tiny memory', 'Burst at the boundary: 100 at 12:00:59 and 100 at 12:01:00 means 200 in two seconds'], ['Sliding window log', 'Keep a timestamp per request; count those in the last 60 s', 'Exact', 'Memory proportional to the limit'], ['Sliding window counter', 'Weight the previous and current windows', 'Cheap and smooth', 'Approximate'], ['Token bucket', 'Bucket of N tokens refilled at rate r; each request takes one', 'Allows bursts, tiny state (tokens + last refill time)', 'Two parameters to tune'], ['Leaky bucket', 'Requests enter a queue drained at a constant rate', 'Smooth, steady output', 'Bursts get delayed, queue can grow']] } },
        { widget: 'tokenbucket' },
        { h: 'Where and keyed by what' },
        "Enforce at the edge or API gateway so rejected traffic never reaches your services, and again close to expensive resources. Key by user id, API key, IP address (careful with shared NATs) or tenant, with different limits per plan. Respond with **429 Too Many Requests**, a `Retry-After` header and informative headers (`X-RateLimit-Remaining`).",
        { h: 'Distributed rate limiting' },
        "With many gateway nodes, per-node counters let a client send N x limit. Share the counter in Redis. A read-modify-write from many nodes races, so do it atomically with `INCR` or a Lua script (token bucket logic in one atomic call). Concerns: **latency** (one extra network hop, keep it in the same region), **Redis failure** (fail open and allow traffic, or fail closed? Usually fail open for general traffic, closed for sensitive operations), and **hot keys** (shard by key). For multi-region, accept approximate limits by keeping regional counters and syncing asynchronously.",
        { say: "I would use a token bucket per API key in Redis, executed atomically in a Lua script at the gateway, returning 429 with Retry-After. If Redis is unreachable I would fail open with a conservative local in-memory limit." }
      ]
    },
    {
      title: 'Resilience patterns', short: 'Resilience', min: 25, body: [
        "**The key insight:** in a system of many services, the slow failure is more dangerous than the fast one. If service B stops responding, callers of B hold threads and connections waiting, run out of them, and become unresponsive themselves. Their callers then wait on them. One sick service takes down everything: a **cascading failure**.",
        { h: 'The toolkit' },
        { ul: ['**Timeouts everywhere.** Every network call has one. Propagate a **deadline** through the call chain so downstream work stops when the caller has given up.', '**Retries with backoff and jitter**, only for idempotent calls, with a retry budget. Retries multiply load on a struggling service (a **retry storm**) and can keep it down.', '**Circuit breaker.** After enough failures, stop calling the dependency for a while and fail fast or use a fallback. See below.', '**Bulkheads.** Separate resource pools (threads, connections, queues) per dependency or per tenant so one slow dependency cannot consume everything, like watertight compartments in a ship.', '**Fallbacks and graceful degradation.** Serve cached or default data, hide the recommendation widget, show read-only mode. Decide in advance which features are essential.', '**Load shedding and rate limiting.** Reject excess work early to keep latency of accepted work bounded.', '**Health checks and automatic restart.**'] },
        { diagram: 'circuit-breaker' },
        { h: 'Design for failure' },
        { ul: ['Assume every dependency will fail. For each call ask: what is the timeout, what is the fallback, is it idempotent, what does the user see?', 'Make deployments safe: canary releases (send 1% of traffic to the new version and watch), feature flags (turn off a feature without redeploying), quick automated rollback.', 'Practice failure: game days and chaos testing prove that failover actually works.', 'Beware **metastable failures**: a system that stays broken after the trigger is gone because retries and cold caches keep it overloaded. Shedding load and backoff are how it recovers.'] }
      ]
    },
    {
      title: 'Consensus and coordination', short: 'Consensus', min: 25, body: [
        "**The problem:** several machines must agree on one fact despite crashes and message delays: who is the leader, who holds this lock, what is the next entry in the log. Without agreement you get split brain: two leaders, two owners of the same resource, corrupt data.",
        { h: 'The core idea: majority quorums' },
        "Require agreement from a **majority** (more than half) of nodes. Any two majorities overlap in at least one node, so two conflicting decisions cannot both be made. This is why clusters use 3 or 5 nodes (odd): 3 nodes tolerate 1 failure, 5 tolerate 2. A cluster of 4 tolerates the same 1 failure as 3, so the extra node buys nothing.",
        { diagram: 'raft-election' },
        { h: 'Raft in four sentences' },
        "Nodes are leader, follower or candidate. A leader sends heartbeats; if a follower stops hearing them it becomes a candidate in a new **term** and requests votes; a node wins with a majority and every node votes once per term. All writes go through the leader, which appends them to its log and replicates them to followers; an entry is **committed** once a majority has stored it. Paxos is the older, harder-to-explain alternative; Raft (etcd, Consul) and Zab (ZooKeeper) are the ones you meet.",
        { h: 'What you actually use it for' },
        "You rarely implement consensus. You use a coordination service (ZooKeeper, etcd, Consul) for **leader election**, **distributed locks**, **configuration**, **service discovery** and membership. It is a small, strongly consistent, comparatively slow store: keep data small and writes infrequent, and keep your high-volume traffic out of it.",
        { h: 'Fencing tokens: why locks need more' },
        "A client takes a lock with a lease, then pauses (a long garbage collection). The lease expires, another client takes the lock, and the first one wakes up still believing it holds it. Both write. The fix is a **fencing token**: the lock service issues an increasing number with each grant, and the protected resource rejects any write carrying a lower token than one it has seen. The same idea protects against a deposed leader.",
        { warn: "Implementing locks with a timeout in a plain cache and calling it safe. If correctness (not just efficiency) depends on mutual exclusion, you need a consensus-backed lock plus fencing, or better, a design that does not need the lock (a conditional database update)." }
      ]
    },
    {
      title: 'Observability', short: 'Observability', min: 15, body: [
        "You cannot fix or even detect what you cannot see. **Observability** is being able to ask new questions of a running system without deploying new code. Three signals:",
        { table: { head: ['Signal', 'What', 'Use'], rows: [['Metrics', 'Numbers over time (request rate, error rate, p99 latency, queue depth, CPU)', 'Dashboards, alerts, trends. Cheap and aggregated'], ['Logs', 'Discrete events with context; make them structured (JSON) with a request/correlation id', 'Debugging a specific failure'], ['Traces', 'A request followed across services as spans with timing', 'Finding which hop is slow']] } },
        { h: 'What to measure' },
        { ul: ['**Google\'s four golden signals:** latency, traffic, errors, saturation.', '**RED** for services: Rate, Errors, Duration. **USE** for resources: Utilization, Saturation, Errors.', 'Track **percentiles**, not averages, and measure from the user side as well as the server side.', 'Business metrics (orders per minute) catch problems technical metrics miss.'] },
        { h: 'Alerting' },
        "Alert on **symptoms users feel** (error rate above SLO, latency above target), not on every cause (CPU 80%). Alerts must be actionable and rare; noisy alerts get ignored. Use **SLO burn rate** alerts: page when the error budget is being consumed quickly. After incidents, write blameless postmortems and fix the system, not the person.",
        { tip: "Finish a design with a 20-second monitoring plan: 'I would alert on p99 latency and error rate at the API, queue age for the workers, replication lag for the database, and cache hit ratio.' It signals real production experience." }
      ]
    },
    {
      title: 'Time and ordering in distributed systems', short: 'Time and order', deep: true, body: [
        "There is no global clock. Each machine has its own, drifting by milliseconds or more, corrected periodically by NTP. So 'which event happened first?' cannot be answered by comparing wall-clock timestamps from different machines.",
        { ul: ['**Physical clocks** (time-of-day) can jump backwards when corrected. Use a **monotonic clock** to measure durations on one machine.', '**Happens-before:** event A happened before B if they are on the same machine in that order, or A is a message send whose receive is B, or by transitivity. Events with no such chain are **concurrent**, and neither came first.', '**Lamport timestamps:** a counter incremented on each event and sent with messages (receiver takes max + 1). It gives an ordering consistent with causality, but cannot tell if two events were concurrent.', '**Vector clocks:** one counter per node. Comparing vectors can detect concurrency, at the cost of size.', '**Hybrid logical clocks** combine physical time with a logical counter for timestamps that are close to wall time yet respect causality (used in CockroachDB and others).', '**TrueTime** (Google Spanner) exposes the clock\'s uncertainty interval using GPS and atomic clocks, and waits out the uncertainty before committing so timestamps give real-time ordering globally.'] },
        "Design consequence: never use `now()` from different machines to order writes for correctness, unless you accept clock skew errors. Use a single sequencer (a leader or log), logical clocks, or consensus."
      ]
    },
    {
      title: 'Probabilistic data structures', short: 'Bloom, HLL, sketches', deep: true, body: [
        "When data is huge, exact answers cost too much memory. These structures trade a small, controlled error for a vast saving.",
        { ul: ['**Bloom filter:** a bit array plus several hash functions answers "is x in the set?". It can say **"definitely not"** or **"probably yes"**: false positives are possible, false negatives never. About 10 bits per element gives roughly a 1% false positive rate. Uses: skip disk lookups in LSM databases, stop cache penetration, web crawlers avoiding revisits, "is this username possibly taken". Cannot delete (use a counting Bloom filter or cuckoo filter).', '**HyperLogLog:** estimates the number of *distinct* items (unique visitors) with about 1% error using only ~12 KB, regardless of how many billions are counted. Mergeable across machines. Redis offers `PFADD` and `PFCOUNT`.', '**Count-Min Sketch:** estimates how often each item appears using a small grid of counters; may overestimate, never underestimate. Combined with a small heap it finds **heavy hitters** (top-K trending items) in a stream.', '**Reservoir sampling:** keep a uniform random sample of a stream of unknown length.'] }
      ]
    },
    {
      title: 'Unique ID generation', short: 'ID generation', deep: true, body: [
        "Distributed systems need ids that are unique without asking a single database for each one. Requirements to state: unique, roughly time-sortable (good for index locality and 'newest first'), compact, hard to guess if exposed publicly.",
        { table: { head: ['Approach', 'Pros', 'Cons'], rows: [['Database auto-increment', 'Simple, ordered, small', 'Single bottleneck and point of failure; leaks volume; hard to shard'], ['UUID v4 (random 128-bit)', 'No coordination at all', 'Large; random values scatter inserts across a B-tree index, hurting write performance; not sortable'], ['UUID v7 / ULID', 'Time-ordered prefix plus randomness, no coordination', '128-bit; ordering only as good as clocks'], ['Snowflake-style', '64-bit: 41 bits millisecond timestamp, 10 bits machine id, 12 bits sequence, giving 4,096 ids per ms per machine, sorted by time', 'Needs unique machine ids and tolerance of clock skew or backward clock jumps'], ['Ticket servers / range allocation', 'Each app server leases a block of ids (say 1,000) from a central service and hands them out locally', 'Gaps on crash; central service must be reliable']] } },
        "Typical answer: Snowflake-style 64-bit ids generated in the service, because they are compact, roughly ordered and need no per-id network call."
      ]
    }
  ],
  lab: { title: 'Play with a token bucket', min: 0, body: ["The widget in Lesson 1 is your lab. Try these in it:", { ul: ['Bucket 5, refill 2/s: send a burst of 10. How many pass? Wait 3 seconds and burst again.', 'Raise the bucket to 12 with refill 1/s. How does that change the allowed burst compared with the sustained rate?', 'Which setting would you give a free-tier user versus a paid enterprise user?'] }] },
  quiz: [
    { q: 'What flaw does a fixed-window rate limiter have?', opts: ['It uses too much memory', 'A client can send up to 2x the limit around a window boundary', 'It cannot be distributed', 'It rejects all bursts'], a: 1, why: 'Requests at the end of one window and the start of the next both count against fresh windows, allowing a double burst.' },
    { q: 'Why do clusters use odd node counts such as 3 or 5?', opts: ['It is faster', 'A majority quorum tolerates the same number of failures with fewer nodes; 4 nodes tolerate no more than 3', 'Odd numbers hash better', 'Tradition'], a: 1, why: 'Majority of 3 is 2 (tolerates 1 failure); majority of 4 is 3 (still tolerates 1). The extra even node adds cost without resilience.' },
    { q: 'A circuit breaker is OPEN. What happens to calls?', opts: ['They go through and are counted', 'They fail fast or use a fallback without calling the dependency', 'They queue forever', 'They are retried 10 times'], a: 1, why: 'Open means the dependency is considered unhealthy; calls are short-circuited to protect your resources and give it time to recover.' },
    { q: 'What problem do fencing tokens solve?', opts: ['Slow locks', 'A paused or deposed lock holder writing after its lease expired', 'Network encryption', 'Replica lag'], a: 1, why: 'The resource rejects writes whose token is older than one it has already seen, so stale holders cannot corrupt data.' },
    { q: 'A Bloom filter says "not present" for a key. What can you conclude?', opts: ['Probably absent', 'Definitely absent', 'Present with 1% chance', 'Nothing'], a: 1, why: 'Bloom filters have no false negatives, so a "no" is certain. A "yes" may be a false positive.' },
    { q: 'What should usually trigger an alert?', opts: ['CPU above 70% on any host', 'User-facing symptoms such as error rate or latency exceeding the SLO', 'Every log warning', 'Memory use'], a: 1, why: 'Alert on what users feel; causes belong on dashboards. Otherwise alerts become noisy and are ignored.' }
  ],
  practice: {
    min: 20,
    prompt: ["**Design a distributed rate limiter for an API platform.** 20 gateway nodes across 3 regions, each customer has an API key with a plan (100 requests per minute free, 10,000 per minute paid). The limiter may add at most 2 ms per request. Customers expect bursts to be tolerated.", "Choose the algorithm, where state lives, how you keep it atomic, what happens when the state store fails, and how you handle multiple regions."],
    hints: ['Why is per-node counting not enough?', 'How would you do read-modify-write atomically in Redis?', 'Fail open or fail closed? Does it depend on the endpoint?'],
    outline: [
      { ul: ['**Algorithm:** token bucket per (api_key): capacity = burst, refill rate = plan limit/60. State is two numbers: tokens and last refill timestamp.', '**State:** Redis cluster in each region, key `rl:{api_key}`, sharded by key. An atomic **Lua script** refills, checks and decrements in one round trip (about 0.3 ms inside the region).', '**Latency budget:** gateway-to-Redis in the same zone; connection pooling; optional local pre-fetched token batches (take 10 tokens at once) to cut round trips for heavy keys.', '**Failure:** Redis down or slow: fail open with a conservative local in-memory limiter per node (limit/20 per node), alert; fail closed only for abuse-sensitive endpoints (login, SMS).', '**Multi-region:** option A, route each customer to a home region for limiting (simple, exact, adds cross-region latency for far users). Option B, independent regional buckets with each region granted a share of the limit, rebalanced asynchronously: approximate but fast. State the trade-off.', '**Response:** 429 with Retry-After and remaining-quota headers; metrics on rejections per key; config for plans stored separately and cached.'] }
    ],
    rubric: 'Strong answers: token bucket or sliding window counter, atomic Lua/INCR in Redis, per-key sharding, latency budget awareness, fail-open/closed policy with local fallback, multi-region trade-off (home region vs split quota), headers and 429 semantics, and monitoring.'
  },
  cheat: ['Rate limit: token bucket allows bursts; fixed window has a boundary burst. Use atomic Redis scripts; decide fail open or closed.', 'Slow failure kills: timeouts, deadlines, retry budgets, circuit breakers, bulkheads, fallbacks, load shedding.', 'Consensus = majority quorum. Use 3 or 5 nodes. Use etcd/ZooKeeper for election and locks; add fencing tokens.', 'Observe with metrics (RED/USE, golden signals), logs with correlation ids, and traces. Alert on user-facing symptoms.', 'No global clock: do not order writes by timestamps from different machines.', 'Bloom: no false negatives. HyperLogLog: distinct counts. Count-min: heavy hitters. Snowflake ids: 41 time + 10 machine + 12 sequence bits.'],
  cards: [
    ['Fixed window vs token bucket?', 'Fixed window counts per window (boundary double-burst). Token bucket refills steadily and allows controlled bursts with tiny state.'],
    ['How do you make a distributed limiter atomic?', 'A Redis Lua script (or INCR) that refills, checks and decrements in one call, keyed per client.'],
    ['What status and headers when rate limited?', '429 Too Many Requests with Retry-After and remaining-quota headers.'],
    ['What is a cascading failure?', 'A slow or failed dependency makes callers hold resources until they fail too, spreading upward.'],
    ['Describe the circuit breaker states.', 'Closed (normal, counting failures), open (fail fast/fallback), half-open (probe one call; success closes, failure reopens).'],
    ['What is a bulkhead?', 'Separate resource pools per dependency or tenant so one cannot exhaust shared resources.'],
    ['Why 3 or 5 nodes for consensus?', 'Majority quorum of 2/3 or 3/5 tolerates 1 or 2 failures; even sizes add no tolerance.'],
    ['What is a fencing token?', 'A monotonically increasing number issued with a lock; the resource rejects writes with older tokens, defeating stale lock holders.'],
    ['Three pillars of observability?', 'Metrics, logs, traces.'],
    ['Golden signals?', 'Latency, traffic, errors, saturation.'],
    ['Properties of a Bloom filter?', 'Space-efficient set membership; false positives possible, no false negatives; no deletions.'],
    ['Snowflake id layout?', '1 sign bit, 41 bits timestamp (ms), 10 bits machine id, 12 bits sequence: 4,096 ids/ms/machine, time-sortable.']
  ]
}
);
