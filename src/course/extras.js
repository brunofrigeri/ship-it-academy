/* Lessons that fill concept gaps found in the audit. section = course section id. */
window.EXTRA = [
  { id: "search", section: "data", title: "Search: inverted indexes and ranking", short: "Search and inverted indexes", min: 20, body: [
    "Databases answer \"give me the row with this key\". Search answers \"give me the best documents that mention these words\". A B-tree index cannot do that efficiently, so search engines (Elasticsearch, OpenSearch, Solr, Lucene) use a different structure.",
    { h: "The inverted index" },
    "Split every document into **tokens** (lowercase, strip punctuation, stem: *running* becomes *run*). Then store, for each token, the sorted list of document ids that contain it (a **posting list**). Looking up a word is one dictionary read, and a multi-word query is an **intersection** of sorted lists, which is fast.",
    { code: "\"red\"    -> [3, 8, 21, 40]\n\"shoes\"  -> [8, 9, 40, 77]\nred AND shoes -> [8, 40]" },
    { h: "Ranking" },
    "Matching is not enough, order matters. **TF-IDF / BM25** scores a document higher when the term appears often in it (term frequency) but rarely across all documents (inverse document frequency). Real systems then blend business signals: popularity, recency, personalization, price, availability. A learned ranker (a second stage) reorders the top few hundred candidates.",
    { h: "How it scales" },
    { ul: ["**Shard** the index by document id; every query is sent to all shards (scatter-gather) and the top results are merged.", "**Replicate** each shard for read throughput and failure tolerance.", "**Near real-time**: new documents sit in a small in-memory segment, searchable within about a second, merged into bigger immutable segments in the background.", "The index is **derived data**. The source of truth stays in your database, and a pipeline (CDC or queue) feeds the index."] },
    { h: "Typical interview moves" },
    { ul: ["Say search is a separate system fed asynchronously, so it is eventually consistent with the database.", "Mention analyzers per language, typo tolerance (edit distance), prefix search (edge n-grams) and filters (facets).", "For geo search, combine a text query with a geo filter (geohash, or S2 cells)."] },
    { warn: "Never use `LIKE '%word%'` on a big table and call it search. It scans everything and cannot rank." },
    { say: "I would keep Postgres as the source of truth, stream changes into Elasticsearch through a queue, and accept a second or two of lag for search results." }
  ] },
  { id: "release", section: "reliability", title: "Safe releases: canary, blue-green, flags and migrations", short: "Safe releases and migrations", min: 18, body: [
    "Most outages are caused by **changes**, not hardware. A system design answer that never mentions how code ships is incomplete.",
    { table: { head: ["Strategy", "How it works", "Rollback", "Cost"], rows: [["Rolling", "Replace servers a few at a time", "Roll forward or re-roll", "Cheap, mixes versions during rollout"], ["Blue-green", "Run full new copy, switch traffic at the load balancer", "Switch back instantly", "Double capacity during release"], ["Canary", "Send 1%, then 5%, then 25% of traffic to the new version while watching error rate and latency", "Stop and revert the small slice", "Needs good metrics and automation"], ["Feature flag", "Code ships dark, behavior turned on per user or percentage at runtime", "Flip the flag", "Flag debt, more code paths"]] } },
    { h: "Database migrations without downtime" },
    "Code and schema change at different moments, so every step must work with both old and new code. Use **expand and contract**:",
    { ol: ["**Expand**: add the new column or table (nullable, no default lock).", "Deploy code that **writes to both** old and new, still reads old.", "**Backfill** old rows in small batches.", "Deploy code that **reads the new**, then stop writing the old.", "**Contract**: drop the old column after a safe waiting period."] },
    { warn: "Renaming a column or changing its type in one deploy breaks every server still running the old code. Large `ALTER TABLE` can also lock a hot table for minutes." },
    { h: "Edge cases" },
    { ul: ["**Poison deploy**: bad version raises error rate. Automate rollback on SLO breach, do not rely on a human noticing.", "**Version skew**: during rollout, clients and servers of different versions talk to each other. APIs and message formats must be backward and forward compatible (add fields, never repurpose them).", "**Config changes** are deploys too. Roll them out gradually.", "**Kill switch**: every risky feature has a flag you can turn off in seconds."] },
    { say: "I would release with a canary at 1%, watch error rate and p99 for ten minutes, and have automatic rollback. Schema changes follow expand and contract." }
  ] },
  { id: "multiregion", section: "reliability", title: "Multi-region design and disaster recovery", short: "Multi-region and DR", min: 22, body: [
    "One data center is a single point of failure (power, network, fire, bad deploy). **Multi-region** protects against that and also puts data near users. It is also one of the hardest things to do correctly.",
    { h: "The two numbers to ask for" },
    { ul: ["**RPO** (recovery point objective): how much data you may lose. RPO of 0 means no acknowledged write may be lost.", "**RTO** (recovery time objective): how long you may be down."] },
    { table: { head: ["Pattern", "RPO", "RTO", "Notes"], rows: [["Backup and restore", "hours", "hours", "Cheapest. Test the restore, an untested backup is a hope."], ["Pilot light / warm standby", "seconds to minutes", "minutes", "Async replica in another region, scaled-down stack ready to grow."], ["Active-passive", "seconds", "minutes", "All writes in one region. Failover is a controlled event."], ["Active-active", "near 0", "near 0", "Every region takes writes. Needs conflict handling."]] } },
    { h: "Active-active: the hard part" },
    "Two regions accepting writes to the same record will conflict. Options: **partition ownership** (each user has a home region, the common choice), **last-write-wins** (simple, loses updates), **CRDTs** (merge automatically, limited data types), or a **globally consistent database** such as Spanner or CockroachDB (pays cross-region latency on commit, 50-150 ms).",
    { h: "Routing and failover" },
    { ul: ["Global DNS or anycast routes users to the nearest healthy region. Remember DNS TTL delays failover.", "Health checks must be from outside the region, otherwise a partitioned region thinks it is healthy.", "Fail over **traffic first, data second**: promote a replica only when you are sure the old primary is truly gone (avoid split brain)."] },
    { warn: "Cross-region latency is physics: US to Europe is roughly 80-100 ms. A request that makes ten sequential cross-region calls takes a second." },
    { h: "Edge cases" },
    { ul: ["**Data residency**: some users' data must stay in a region (GDPR). Home-region design supports it naturally.", "**Cascading failover**: region A fails, region B receives double load and fails. Keep headroom or shed load.", "**Failback** is as risky as failover. Rehearse both with game days."] },
    { say: "I would start active-passive with async replication and an RPO of a few seconds, and only go active-active for data that can be partitioned by user home region." }
  ] },
  { id: "locks", section: "reliability", title: "Distributed locks, leases and fencing tokens", short: "Distributed locks and fencing", min: 18, body: [
    "Sometimes exactly one worker must do something: run the nightly job, process a payment, own a shard. A **lock** across machines is harder than it looks because machines pause, clocks drift and networks drop.",
    { h: "Leases, not locks" },
    "A lock held by a crashed process would block forever, so distributed locks are **leases**: valid for a limited time (TTL) and renewed with heartbeats. With Redis: `SET lock:job42 <random-token> NX PX 30000` acquires, and release must check the token before deleting.",
    { h: "The failure that breaks naive locks" },
    "Worker A takes the lock, then freezes for 40 seconds (garbage collection, VM pause). The lease expires. Worker B takes the lock and starts writing. Worker A wakes up, still believes it holds the lock, and writes too: **two writers**.",
    { h: "Fencing tokens" },
    "Each time the lock is granted it carries an increasing number (33, then 34). The protected resource, such as the database, **remembers the highest token seen and rejects older ones**. A's late write with token 33 is refused because 34 was already seen.",
    { code: "acquire() -> token 34\nUPDATE accounts SET ... WHERE id = 7 AND last_token < 34;\n-- a stale writer with token 33 updates 0 rows" },
    { ul: ["Needs a coordination service with linearizable ordering: ZooKeeper, etcd or a database row. A single Redis instance does not give you that guarantee.", "Prefer to **avoid locks** altogether: use idempotent operations, optimistic concurrency (version column), or a queue with one consumer per partition."] },
    { warn: "Never say \"I will use Redis SETNX so only one runs\" without mentioning lease expiry and fencing. That is the standard follow-up question." },
    { say: "A lock is only an optimization to avoid duplicate work. Correctness comes from fencing tokens or idempotent writes at the resource." }
  ] },
  { id: "payments", section: "reliability", title: "Money: ledgers, double-entry and payment flows", short: "Payments and ledgers", min: 22, body: [
    "Money systems have one rule: **never lose or invent a cent, and always be able to prove why**. That changes the design.",
    { h: "Store events, not balances" },
    "Do not keep a single `balance` column that you overwrite. Keep an **append-only ledger** of entries; the balance is the sum. History is auditable and nothing is lost by a bug in an update.",
    { h: "Double-entry bookkeeping" },
    "Every transaction records equal and opposite entries so the whole system always sums to zero. A $50 purchase: debit the customer account $50, credit the merchant account $50 (minus a fee entry). If the totals ever differ, you have a bug and you can find it.",
    { code: "txn 9001: customer  -50.00\n          merchant  +48.50\n          fees      + 1.50      (sum = 0)" },
    { h: "Payment flow with an external provider" },
    { ol: ["Client sends **one idempotency key** per purchase attempt.", "Server stores a `payment` row in state `PENDING` (inside a DB transaction with the order).", "Call the provider (card network) with the same key. This is the slow, failure-prone part.", "Provider answers or sends a **webhook**. Update state to `SUCCEEDED` or `FAILED`.", "A **reconciliation job** compares your records with the provider's daily report and fixes mismatches (timeouts mean you often do not know the outcome)."] },
    { h: "State machine" },
    "`CREATED -> PENDING -> SUCCEEDED | FAILED`, then `REFUNDED`. Only allow legal transitions, enforced in the database. Webhooks can arrive twice or out of order, so handle both.",
    { h: "Edge cases" },
    { ul: ["**Timeout after charge**: you do not know whether it charged. Query the provider by idempotency key before retrying.", "**Float rounding**: store amounts as integers in minor units (cents) with a currency code. Never floats.", "**Exactly-once** does not exist across systems. Use at-least-once delivery plus idempotent handlers.", "**Refunds and chargebacks** are new ledger entries, never edits of old ones."] },
    { say: "I would model payments as an append-only double-entry ledger, drive them with a state machine, and reconcile nightly against the provider." }
  ] },
  { id: "booking", section: "data", title: "Booking and inventory without double-selling", short: "Booking and double-booking", min: 20, body: [
    "Airbnb nights, concert seats, flash-sale stock, doctor appointments: many users compete for a **limited unit**. The bug to prevent is **double booking**.",
    { h: "Why the naive version fails" },
    "`read availability` then `write booking` is two steps. Two users both read \"available\", both write, and both think they booked it. This is a classic **race condition** (lost update).",
    { h: "Four solutions" },
    { table: { head: ["Approach", "Idea", "Good for", "Watch out"], rows: [["Unique constraint", "Table `booking(listing_id, night)` with a unique key. Second insert fails.", "Calendar nights, seats", "Best first answer. Atomic and simple."], ["Pessimistic lock", "`SELECT ... FOR UPDATE` on the row, then update", "Short, high-contention transactions", "Holds locks; deadlocks; hurts throughput."], ["Optimistic concurrency", "Row has a `version`. `UPDATE ... WHERE version = 7`. 0 rows updated means someone beat you; retry.", "Low contention", "Many retries when contention is high."], ["Atomic counter", "`UPDATE stock SET n = n - 1 WHERE id = 5 AND n > 0`", "Fungible stock (items)", "Needs the `AND n > 0` guard."]] } },
    { h: "Holds with a timeout" },
    "Checkout takes minutes. Create a **temporary hold** (a row or a Redis key with a TTL of 10-15 minutes) so nobody else takes the seat while the user pays. If payment does not arrive, the hold expires and the seat returns to the pool. Convert the hold to a booking only after payment succeeds.",
    { h: "Scaling hot inventory" },
    { ul: ["Shard by listing or event id so a single item's contention lives in one place.", "Flash sale: put a **queue** in front, admit users at the rate stock can be sold, and show a waiting room. Do not let 1M users hammer the same row.", "Pre-split stock into buckets (100 counters of 10) to spread write contention, then sum."] },
    { warn: "Do the availability check and the booking write in **one atomic statement or transaction**. A cache of availability is allowed for display, never for the final decision." },
    { say: "Search can read from a cache, but the booking itself goes through the database with a unique constraint, and checkout uses an expiring hold." }
  ] },
  { id: "analytics", section: "data", title: "Analytics pipelines: OLTP vs OLAP, CDC, warehouses", short: "Analytics and data pipelines", min: 20, body: [
    "Your production database is built for many small reads and writes (**OLTP**). Questions like \"revenue by country by week\" scan millions of rows (**OLAP**) and would hurt it. Analytics lives in a separate system.",
    { table: { head: ["", "OLTP (Postgres, MySQL)", "OLAP (BigQuery, Snowflake, ClickHouse)"], rows: [["Workload", "Many small transactions", "Few huge scans and aggregates"], ["Storage", "Row oriented", "**Column** oriented, heavily compressed"], ["Latency", "Milliseconds", "Seconds to minutes"], ["Used by", "The product", "Analysts, dashboards, ML"]] } },
    { h: "Getting data there" },
    { ul: ["**Batch ETL**: copy tables nightly. Simple, stale by hours.", "**CDC (change data capture)**: read the database's write-ahead log and stream every change into Kafka and onward. Near real-time, no extra load on queries. Tools: Debezium, DMS.", "**Event tracking**: clients and services emit events (page view, purchase) to a log."] },
    { h: "Architecture patterns" },
    { ul: ["**Lambda**: a batch layer (accurate, slow) plus a streaming layer (approximate, fast), merged at query time. Two code paths to maintain.", "**Kappa**: only a streaming layer; reprocess by replaying the log. Simpler if your log keeps history.", "**Lakehouse**: raw files in object storage (Parquet) with a table format (Iceberg, Delta) queried by many engines."] },
    { h: "Edge cases" },
    { ul: ["**Late and out-of-order events**: use event time with **watermarks**, and decide how late is too late.", "**Schema evolution**: producers change fields. Use a schema registry and compatible changes.", "**Exactly-once counts**: dedupe on event id, or make aggregation idempotent.", "**PII**: tag sensitive columns, restrict access, support deletion requests."] },
    { say: "I would keep analytics off the primary: CDC into Kafka, land in object storage, and query from a columnar warehouse." }
  ] },
  { id: "privacy", section: "reliability", title: "Multi-tenancy, privacy and data deletion", short: "Multi-tenancy and privacy", min: 16, body: [
    "Senior interviews often add: \"it is a B2B product with many customers\" or \"a user asks to delete their data\".",
    { h: "Multi-tenancy models" },
    { table: { head: ["Model", "Isolation", "Cost", "Use when"], rows: [["Shared tables with `tenant_id`", "Weak (a missing WHERE leaks data)", "Lowest", "Many small tenants"], ["Schema or database per tenant", "Strong", "Medium, more operations", "Mid-size customers"], ["Dedicated stack", "Strongest", "Highest", "Enterprise, regulated"]] } },
    { ul: ["Put `tenant_id` in every key and enforce it centrally (row-level security), never rely on each query remembering.", "**Noisy neighbor**: one tenant's heavy usage slows others. Use per-tenant rate limits, quotas and separate queues for large tenants.", "Shard by `tenant_id` so a tenant's data stays together, and move whales to their own shard."] },
    { h: "Privacy and deletion (GDPR style)" },
    { ul: ["**Right to erasure** means the user's data must disappear from databases, caches, search indexes, analytics, logs and **backups**.", "Keep a map of where personal data lives (a data inventory) so deletion is a pipeline, not a hunt.", "For immutable stores, use **crypto-shredding**: encrypt each user's data with their own key, and delete the key.", "Minimize what you store, set retention periods, and encrypt in transit and at rest."] },
    { warn: "Soft delete (a flag) is not erasure. Say how deletion reaches search, caches and backups." },
    { say: "I would isolate tenants by tenant_id with row-level security, rate limit per tenant, and handle erasure with a deletion pipeline plus per-user encryption keys." }
  ] },
  { id: "gossip", section: "reliability", title: "Gossip, membership and failure detection", short: "Gossip and failure detection", min: 14, body: [
    "In a cluster of 1,000 nodes, how does everyone learn that node 417 died, without a central brain? **Gossip protocols**.",
    { h: "How gossip works" },
    "Every second each node picks a few random peers and exchanges what it knows (membership list, heartbeat counters). Information spreads like a rumor: with N nodes it reaches everyone in about **log N rounds**, with no single point of failure. Cassandra, Consul and Dynamo-style stores use it.",
    { h: "Failure detection" },
    "A node is suspected when its heartbeat counter has not increased for a while. A **phi-accrual** detector outputs a suspicion level that adapts to normal network jitter rather than using a fixed timeout, and **indirect probes** (ask other nodes to ping it) reduce false alarms from one broken link (SWIM protocol).",
    { h: "Trade-offs" },
    { ul: ["Eventually consistent view of the cluster. Two nodes can disagree for a moment.", "Tuning: too aggressive means false positives (healthy node marked dead, causing data movement); too lax means slow recovery.", "Use gossip for **membership and metadata**, not for strongly consistent decisions like leader election (use Raft for that)."] },
    { say: "Gossip gives scalable, decentralized membership and failure detection, but anything needing agreement goes through consensus." }
  ] }
];
