/* Scoring criteria per exercise. Each: [what a strong answer does, [lessons that teach it]].
   Lesson refs: 's:scene-id' animated, 'x:id' deep dive, 't:day:index' reading lesson. */
window.RUBRICS = {
  "airbnb-booking": [
    ["Clarifies functional and non-functional requirements, and states assumptions and scale", ["t:1:0"]],
    ["Estimates search QPS versus booking QPS and concludes the paths need different designs", ["t:1:1", "s:capacity-math"]],
    ["Separates search (index, eventually consistent) from booking (relational, strongly consistent)", ["x:search", "t:5:2"]],
    ["Prevents double booking atomically (unique constraint, transaction or conditional update)", ["x:booking", "t:4:2"]],
    ["Uses expiring holds during checkout and releases them on timeout or failed payment", ["x:booking"]],
    ["Feeds the search index asynchronously (CDC or events) and accepts staleness, verifying at booking time", ["x:analytics", "t:7:2"]],
    ["Handles date-range availability efficiently (bitmap, per-night rows) and geo or map search", ["x:search", "t:10:3"]],
    ["Makes payments idempotent and mentions photos on object storage with a CDN", ["s:idempotency", "x:payments", "s:cdn-flow"]]
  ],
  "twitter-timeline": [
    ["States requirements and read/write ratio with QPS estimates", ["t:1:1", "s:capacity-math"]],
    ["Chooses fan-out on write for most users with precomputed timelines in a cache", ["s:feed-fanout", "t:10:0"]],
    ["Handles celebrities with fan-out on read or a hybrid threshold", ["s:feed-fanout"]],
    ["Uses time-sortable unique ids (Snowflake style) and cursor pagination", ["t:8:6", "t:2:1"]],
    ["Decouples fan-out through a queue and scales workers on lag", ["s:queue-flow", "t:7:0"]],
    ["Avoids hot rows for like and retweet counters (batching, approximate counts)", ["t:9:4", "s:sharding"]],
    ["Addresses deletes, blocks, inactive users and cache loss recovery", ["t:6:2", "s:cache-aside"]],
    ["Serves media through object storage and CDN, and mentions ranking as an extension", ["s:cdn-flow", "t:3:2"]]
  ],
  "twitter-trending": [
    ["Defines trending as growth versus baseline, not raw volume", ["t:9:4"]],
    ["Uses a stream pipeline (Kafka plus a stream processor) with windowed counts", ["s:pubsub", "t:7:1", "t:7:4"]],
    ["Uses approximate structures (count-min sketch or heavy hitters) with a top-K heap", ["t:8:5", "t:9:4"]],
    ["Partitions by key and handles skewed hot keys with two-level aggregation", ["s:sharding", "t:5:1"]],
    ["Handles late and out-of-order events with event time and watermarks", ["x:analytics", "t:8:4"]],
    ["Resists spam and manipulation (distinct users, weighting, filters)", ["t:8:0", "s:rate-limit"]],
    ["Precomputes results per region and serves them from cache or CDN", ["s:cache-aside", "t:6:0"]],
    ["States the exact-versus-approximate and freshness trade-offs explicitly", ["t:1:0"]]
  ],
  "meta-newsfeed": [
    ["Frames feed as a funnel: candidate generation, ranking, re-ranking", ["s:feed-fanout", "t:10:0"]],
    ["Explains how candidates are gathered (push, pull or hybrid) for friends, pages and groups", ["s:feed-fanout"]],
    ["Describes a feature store and low-latency model serving for ranking", ["x:analytics"]],
    ["Gives a latency budget per stage with timeouts and fallbacks", ["t:8:1", "s:circuit-breaker"]],
    ["Degrades gracefully (chronological or cached feed) when ranking fails", ["s:circuit-breaker", "t:1:2"]],
    ["Uses event logging for training data and A/B tests new models", ["x:analytics", "t:8:3"]],
    ["Addresses cold start, diversity and integrity or feedback-loop concerns", ["t:10:0"]],
    ["Describes graph storage and sharding for posts and friendships", ["s:sharding", "t:5:1"]]
  ],
  "whatsapp": [
    ["Uses persistent connections (WebSocket) through gateways and sizes the fleet", ["s:chat-system", "t:2:2"]],
    ["Routes messages across gateways with a presence or routing table", ["s:chat-system"]],
    ["Guarantees ordering per conversation (sequence numbers) and dedupes with client ids", ["s:chat-system", "s:idempotency"]],
    ["Handles offline delivery with a per-device queue, push notification and sync cursor", ["s:chat-system", "t:10:2"]],
    ["Designs group messaging (single stored copy, per-member delivery state)", ["t:10:1"]],
    ["Explains end-to-end encryption and its consequences (key exchange, no server search)", ["t:2:4"]],
    ["Throttles presence and receipts, and handles reconnect storms with jittered backoff", ["s:stampede", "t:8:1"]],
    ["Chooses storage with partitioning by conversation, and discusses media storage", ["s:sharding", "t:9:1"]]
  ],
  "instagram": [
    ["Estimates storage and bandwidth and identifies media as the dominant cost", ["t:1:1", "s:capacity-math"]],
    ["Uploads directly to object storage with pre-signed URLs and resumable chunks", ["t:9:1"]],
    ["Processes media asynchronously (transcode, thumbnails, moderation) via a queue", ["s:queue-flow", "t:7:0"]],
    ["Serves via CDN with immutable versioned URLs and responsive image sizes", ["s:cdn-flow", "t:3:2"]],
    ["Builds the feed with hybrid fan-out", ["s:feed-fanout"]],
    ["Designs stories with expiry (TTL plus read-time check) and cheap view tracking", ["s:cache-aside", "t:6:0"]],
    ["Handles hot posts and counters without hot rows", ["s:sharding"]],
    ["Discusses cost controls: storage tiering, dedup, deleting content from caches and CDN", ["x:privacy", "s:cdn-flow"]]
  ],
  "uber": [
    ["Identifies location ingest as the dominant write load and keeps current state in memory", ["t:1:1", "t:6:0"]],
    ["Uses a spatial index (geohash, quadtree or H3) to find nearby drivers", ["t:10:3"]],
    ["Ranks candidates by routing ETA, not straight-line distance", ["t:10:3"]],
    ["Prevents double dispatch with an offer lease and atomic state change", ["x:locks", "x:booking"]],
    ["Models the trip as a state machine in a strongly consistent store", ["t:4:2", "s:saga"]],
    ["Shards by geography and handles boundary queries", ["s:sharding", "t:5:1"]],
    ["Streams live location to riders with pub/sub or WebSockets", ["s:pubsub", "t:2:2"]],
    ["Covers surge pricing, payments with idempotency, and failure handling", ["x:payments", "s:idempotency"]]
  ],
  "youtube": [
    ["Estimates upload volume and streaming bandwidth, concluding CDN carries nearly all traffic", ["t:1:1", "s:cdn-flow"]],
    ["Uses chunked, resumable uploads to object storage", ["t:9:1"]],
    ["Transcodes in parallel into a bitrate ladder and packages as HLS or DASH segments", ["t:10:4"]],
    ["Explains adaptive bitrate playback driven by the client", ["t:10:4"]],
    ["Designs CDN strategy (edge caches, pre-positioning, origin shield, request coalescing)", ["s:cdn-flow", "s:stampede"]],
    ["Separates metadata, search and recommendations from the video path", ["x:search", "t:10:5"]],
    ["Handles viral videos and live streaming latency", ["s:stampede", "t:10:4"]],
    ["Considers cost (tiered storage, selective encoding)", ["t:1:0"]]
  ],
  "google-docs": [
    ["Explains why naive concurrent edits diverge", ["t:5:3"]],
    ["Describes OT or CRDT and how convergence is achieved", ["t:5:3"]],
    ["Assigns one session owner per document and shards by document id", ["s:sharding", "t:8:2"]],
    ["Applies edits optimistically on the client with acks and rebase", ["s:optimistic-ui", "t:12:1"]],
    ["Persists an operation log with snapshots and supports version history", ["t:7:3"]],
    ["Treats cursors and presence as ephemeral and throttled", ["s:chat-system", "x:gossip"]],
    ["Handles offline edits and reconnect merging", ["t:12:2", "t:5:3"]],
    ["Covers permissions, large documents and hot (very popular) documents", ["t:2:4", "x:privacy"]]
  ],
  "web-crawler": [
    ["Estimates pages per second, bandwidth and storage", ["t:1:1", "s:capacity-math"]],
    ["Designs a URL frontier with priority and per-host politeness queues", ["t:9:3", "t:7:0"]],
    ["Respects robots.txt and crawl delays and caches DNS", ["s:web-request", "t:9:3"]],
    ["Deduplicates URLs with normalization and a Bloom filter", ["t:8:5"]],
    ["Detects duplicate content with hashing or SimHash", ["t:8:5", "t:9:3"]],
    ["Avoids spider traps with depth and per-domain limits", ["t:9:3"]],
    ["Plans recrawl frequency using change history and conditional requests", ["t:6:0", "s:cdn-flow"]],
    ["Partitions work by host and feeds results to an index", ["s:sharding", "x:search"]]
  ],
  "amazon-flash-sale": [
    ["Recognizes the traffic spike is attempts, not orders, and sizes accordingly", ["t:1:1", "s:capacity-math"]],
    ["Serves static content from the CDN and defends the edge (rate limits, bot defense)", ["s:cdn-flow", "s:rate-limit"]],
    ["Uses a waiting room or queue to admit users at a controlled rate", ["s:queue-flow", "t:7:0"]],
    ["Uses an atomic inventory decrement as the single decision point", ["x:booking", "t:4:2"]],
    ["Uses reservations with TTL and returns stock on expiry", ["x:booking", "s:cache-aside"]],
    ["Keeps the database as source of truth and reconciles after cache loss", ["t:6:2", "x:payments"]],
    ["Makes orders and payments idempotent with async processing", ["s:idempotency", "x:payments"]],
    ["Sheds load and degrades non-essential features gracefully", ["s:circuit-breaker", "t:8:1"]]
  ],
  "stripe-payments": [
    ["Uses idempotency keys end to end and rejects key reuse with different parameters", ["s:idempotency", "t:2:3"]],
    ["Models the payment as an enforced state machine", ["x:payments", "s:saga"]],
    ["Uses an append-only double-entry ledger with integer minor units", ["x:payments"]],
    ["Handles unknown outcomes (timeouts) with polling and reconciliation, not blind retries", ["x:payments", "s:circuit-breaker"]],
    ["Delivers signed webhooks with retries and idempotent handlers", ["t:7:2", "s:queue-flow"]],
    ["Handles cross-shard transfers with sagas or explicit pending entries", ["s:saga", "t:5:4"]],
    ["Isolates card data (tokenization, PCI) and discusses fraud checks", ["t:2:4", "x:privacy"]],
    ["Plans multi-provider failover and disaster recovery for the ledger", ["x:multiregion", "t:8:1"]]
  ],
  "dropbox": [
    ["Chunks files into hashed blocks and stores them content-addressed", ["t:9:1"]],
    ["Syncs only changed blocks (delta sync) and deduplicates", ["t:9:1"]],
    ["Separates metadata service (strong consistency) from block storage", ["t:4:2", "t:4:4"]],
    ["Notifies devices of changes with a journal cursor and long poll or WebSocket", ["t:2:2", "s:pubsub"]],
    ["Commits with optimistic version checks and keeps conflicted copies", ["t:5:3", "s:optimistic-ui"]],
    ["Supports resumable uploads and offline use", ["t:9:1"]],
    ["Ensures durability with replication or erasure coding and background scrubbing", ["s:replication", "t:1:2"]],
    ["Garbage-collects blocks safely (reference counting, retention) and discusses sharing/ACLs", ["x:privacy"]]
  ],
  "rate-limiter": [
    ["Compares algorithms (fixed window, sliding window, token bucket) with trade-offs", ["s:rate-limit", "t:8:0"]],
    ["Makes the check-and-update atomic in a shared store like Redis", ["s:rate-limit", "x:locks"]],
    ["Places the limiter at the gateway or sidecar and returns 429 with Retry-After", ["s:rate-limit", "t:3:1"]],
    ["Shards counters and handles hot keys", ["s:sharding"]],
    ["Balances accuracy and latency with local allowances plus periodic sync", ["s:cache-aside", "t:6:1"]],
    ["Defines failure behavior (fail open or closed) deliberately", ["s:circuit-breaker", "t:1:2"]],
    ["Addresses multi-region limits", ["x:multiregion"]],
    ["Supports multiple dimensions, plans, and cost-based limits", ["t:8:0"]]
  ],
  "job-scheduler": [
    ["Designs the data model with an indexed next-run time and run rows with state", ["t:4:1", "t:4:0"]],
    ["Separates scheduling from execution with a queue", ["s:queue-flow", "t:7:0"]],
    ["Uses leases, heartbeats and a reaper to recover jobs from dead workers", ["x:locks", "s:queue-flow"]],
    ["Accepts at-least-once and makes jobs idempotent with a run id", ["s:idempotency", "t:7:2"]],
    ["Scales the scheduler by partitioning jobs and electing a leader per shard", ["s:raft-election", "t:8:2"]],
    ["Uses fencing tokens to prevent two owners firing the same job", ["x:locks"]],
    ["Handles retries with backoff, dead-letter queue, and poison jobs", ["s:queue-flow", "s:circuit-breaker"]],
    ["Covers jitter, missed-run policy, time zones and long-running jobs", ["s:stampede", "t:8:4"]]
  ],
  "metrics-monitoring": [
    ["Estimates ingest rate and storage and uses compression for time series", ["t:1:1", "s:capacity-math"]],
    ["Buffers writes with a queue and uses a time-series database with blocks and a WAL", ["s:pubsub", "t:4:3"]],
    ["Defines downsampling and retention tiers", ["x:analytics"]],
    ["Indexes labels and controls cardinality", ["t:4:1", "t:8:3"]],
    ["Designs alerting with grouping, deduplication and routing", ["t:8:3"]],
    ["Alerts on symptoms and SLO burn rate and adds a dead man's switch", ["t:8:3", "t:1:2"]],
    ["Uses mergeable histograms or sketches for percentiles", ["t:8:5", "t:8:3"]],
    ["Handles multi-region querying, overload protection and query priorities", ["x:multiregion", "s:rate-limit"]]
  ]
};
