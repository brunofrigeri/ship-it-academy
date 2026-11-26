/* AI system design exercises with rubrics and prerequisite maps. */
(function () {
  var E = (window.EXERCISES = window.EXERCISES || []);
  E.push(
    { id: "ai-chat-service", company: "OpenAI / Anthropic", more: ["Google", "Microsoft"], title: "Design a ChatGPT-style chat service", level: "Staff", min: 50, ai: true,
      prompt: "Design a chat assistant product: users have multi-turn conversations with an LLM, answers stream in, history is saved, and it serves 100M weekly users with free and paid tiers.",
      scene: "llm-serving", lessons: [],
      walk: [
        { h: "1. Requirements" },
        { ul: ["Streaming chat, saved history, multiple models, file uploads, free and paid limits, safety, 99.9% availability.", "Latency: first token under 1-2 s; answers stream at reading speed.", "Cost is dominated by **GPU inference**, so utilization and routing are core, not an afterthought."] },
        { h: "2. Estimates" },
        { ul: ["100M weekly users, 10M daily, 10 messages each = 100M requests/day = **1,200/s** average, 5k/s peak.", "Average 2k input and 500 output tokens: peak = 10M input tokens/s and 2.5M output tokens/s. At ~50 tokens/s per request, you need about **50,000 concurrent generations**, so thousands of GPUs. State that cost is the main constraint."] },
        { h: "3. Architecture" },
        { ol: ["**Edge / API gateway**: auth, rate limits per plan, abuse detection; streams responses over SSE.", "**Conversation service**: stores messages (sharded by conversation id) and builds the prompt: system prompt + history (trimmed or summarized to fit context) + user message.", "**Safety layer**: input moderation, output moderation (streaming-aware), PII handling.", "**Model router**: chooses model by plan, task and load; handles fallback to a smaller model.", "**Inference fleet**: GPU replicas with continuous batching and paged KV cache; routing by queue length and prefix cache locality.", "**Async persistence**: write the assistant message when generation finishes (and checkpoint partial text) via a queue; analytics and feedback to Kafka."] },
        { h: "4. Deep dives" },
        { ul: ["**Streaming and failure**: if a GPU dies mid-answer, retry on another replica using the saved partial output; the client resumes with the last event id. Support **Stop** by cancelling the generation to free GPU time.", "**Context management**: history grows; keep a rolling window plus a running summary; use **prefix caching** so the unchanged history does not need reprocessing each turn.", "**Rate limiting by tokens**, not requests; paid tiers get higher quotas and priority queues; free traffic is shed first under load.", "**Capacity and autoscaling**: GPU nodes are slow to start; scale on queue depth and tokens in flight, keep warm headroom; batch non-interactive work separately.", "**Multi-region**: place inference near users and keep conversation data in the user's region for residency."] },
        { h: "5. Trade-offs" },
        { ul: ["Quality versus cost: bigger models cost more; route simple requests to small models.", "Latency versus utilization: bigger batches raise throughput but delay individual requests.", "Safety checks add latency; run them in parallel and stream-moderate."] }
      ],
      follow: ["How do you handle a user pasting a 200-page document?", "How do you roll out a new model safely?", "How would you add tools like web browsing or code execution?", "How do you prevent one tenant from starving others?"],
      rubric: "Streaming over SSE, conversation store, prompt building with context trimming, safety layers, model routing, GPU inference with continuous batching and KV cache, token-based rate limits, autoscaling for slow GPU startup, failure recovery mid-stream, cost awareness."},

    { id: "ai-enterprise-rag", company: "Glean / Notion / Microsoft", more: ["Atlassian", "Slack"], title: "Design enterprise search and Q&A over company data (RAG)", level: "Staff", min: 50, ai: true,
      prompt: "Design an assistant that answers employees' questions using company data from Google Drive, Slack, Jira, Confluence and email. Respect each person's permissions. 10,000 companies, 50M documents each at the largest.",
      scene: "rag-flow", lessons: ["ai-rag"],
      walk: [
        { h: "1. Requirements" },
        { ul: ["Connect many sources, keep the index fresh (minutes), answer with citations, **never reveal what the user cannot access**, multi-tenant at scale.", "Quality (relevance and faithfulness) is the product; latency under 5 s for a full answer, search results under 500 ms."] },
        { h: "2. Ingestion" },
        { ol: ["**Connectors** per source use webhooks plus periodic full syncs (webhooks miss events). They run as queued jobs with rate limiting against the source APIs.", "Fetch content **and permissions** (who can read: users, groups, public). Permission changes are as important as content changes.", "Parse (PDF, slides, tables), split into chunks with metadata (source, title, timestamps, ACL), embed, and write to the index.", "Incremental: track content hashes and re-embed only changed chunks; deletions propagate quickly."] },
        { h: "3. Index and permissions (the hard part)" },
        { ul: ["Store per chunk an **ACL**: allowed user ids and group ids. At query time, filter by the user's identity and expanded group memberships *inside the retrieval query*.", "Group membership changes constantly; resolve groups at query time from a cached membership service rather than baking users into every chunk, or you must re-index on each membership change.", "**Tenant isolation**: separate indexes or namespaces per customer; encryption keys per tenant."] },
        { h: "4. Query path" },
        { ol: ["Authenticate, rewrite the question using chat history.", "**Hybrid retrieval**: BM25 plus vector search, ACL filtered, plus recency and source boosts.", "**Rerank** top 50 to top 8; build a prompt with source labels.", "Generate with citations; verify each cited source exists and was in the context; stream the answer.", "Log queries, retrieved ids and feedback for evaluation."] },
        { h: "5. Deep dives" },
        { ul: ["**Freshness vs cost**: hot sources (Slack) indexed in near real time; cold archives in batch.", "**Scale**: shard the vector index by tenant and hash; ANN with HNSW for latency; quantization to cut memory; separate tiers for hot and cold data.", "**Evaluation**: golden questions per tenant type; measure recall@k separately from answer faithfulness; LLM judge calibrated by humans.", "**Prompt injection**: documents are untrusted; do not give tools that exfiltrate; strip hidden instructions.", "**Failure**: connector outage shows stale data with a banner; the index is derived, so it can be rebuilt from sources."] }
      ],
      follow: ["How do you handle a document whose permissions just changed?", "How do you answer 'summarize everything about project X' that spans 500 documents?", "How do you measure answer quality without labeled data?", "How would you support citations that link to the exact passage?"],
      rubric: "Connector ingestion with webhooks and syncs, parsing and chunking with metadata, ACLs enforced inside retrieval, group membership handling, tenant isolation, hybrid retrieval plus reranker, citations and verification, freshness tiers, evaluation separating retrieval from generation, injection awareness."},

    { id: "ai-code-assistant", company: "GitHub / Cursor / JetBrains", more: ["Google", "Anthropic"], title: "Design an AI coding assistant (autocomplete and chat)", level: "Staff", min: 50, ai: true,
      prompt: "Design an IDE assistant: inline code completion as you type (must feel instant), a chat that answers questions about the whole repository, and the ability to apply multi-file edits.",
      scene: "ai-gateway", lessons: [],
      walk: [
        { h: "1. Requirements" },
        { ul: ["**Completion**: suggestion appears within about 200-300 ms of a pause in typing; high acceptance rate; low cost per keystroke.", "**Chat and edits**: understands the repo, can propose multi-file changes the user reviews and applies.", "Privacy: code is sensitive; enterprise customers need zero retention and sometimes private deployment."] },
        { h: "2. Two products with different constraints" },
        { table: { head: ["", "Autocomplete", "Chat / agent"], rows: [["Latency", "Under 300 ms", "Seconds, streamed"], ["Model", "Small, fast, specialized (fill-in-the-middle)", "Large, strong reasoning"], ["Context", "Current file, nearby files, recent edits", "Whole repo via retrieval"], ["Volume", "Huge: a request per pause", "Modest"]] } },
        { h: "3. Autocomplete path" },
        { ol: ["Client **debounces** (about 100 ms), **cancels** in-flight requests when the user keeps typing, and only triggers on sensible points.", "Build a prompt: code before and after the cursor, plus snippets from related open files, recent edits and imports (ranked by similarity).", "Send to a nearby, small model endpoint over a persistent connection; stream or return a short completion.", "Client post-filters (syntax check, duplicate of existing code), shows ghost text, records accept/reject for metrics.", "**Cache** by prefix hash; reuse the prompt prefix on the server (prefix cache)."] },
        { h: "4. Repository understanding (chat)" },
        { ul: ["**Index** the repo locally or server side: split code into chunks along syntax boundaries (functions, classes), embed, and build a symbol/dependency graph; update incrementally on file save using content hashes (Merkle tree) so only changed files re-embed.", "Retrieve with hybrid search (identifiers need keywords) plus the symbol graph (definitions, references), then rerank.", "**Agentic edits**: the model plans, calls tools (read file, search, run tests, apply patch) in a loop with step limits; shows a **diff** for the user to accept; run tests or linters for self-checking."] },
        { h: "5. Privacy, scale and evaluation" },
        { ul: ["Zero-retention modes, encryption in transit, secrets filtering (do not send `.env` or keys), per-tenant isolation, optional self-hosted models.", "Gateway: auth, per-user rate limits, routing between small and large models, provider failover, budgets.", "Evaluate with acceptance rate, characters retained after acceptance, latency percentiles, and offline benchmarks on real repos; A/B test models.", "**Edge cases**: huge files, minified code, stale index after branch switch, suggestions that copy licensed code (add filters), flaky network (degrade to no suggestion, never block typing)."] }
      ],
      follow: ["How do you keep the index fresh across branches?", "How do you decide what context to include within a limited prompt?", "How would you make completions work offline?", "How do you detect and reduce bad suggestions?"],
      rubric: "Separates autocomplete (small fast model, debounce, cancel, prefix cache, 300 ms) from chat/agent, context assembly, repo indexing with chunking, embeddings and incremental updates, tool-using edit loop with diff review, privacy controls, gateway routing and budgets, metrics like acceptance rate."},

    { id: "ai-recommendations", company: "Netflix / TikTok / Spotify", more: ["YouTube", "Pinterest", "Meta"], title: "Design a recommendation system", level: "Staff", min: 50, ai: true,
      prompt: "Design the recommendation system for a streaming or short-video app: 200M users, 10M items, personalized home feed under 200 ms, new items and new users must work too.",
      scene: "", lessons: ["ai-recsys"],
      walk: [
        { h: "1. Clarify the objective" },
        { ul: ["What are we optimizing: watch time, retention, satisfaction? Clicks alone promote clickbait. Define a primary metric and **guardrails** (diversity, user complaints, long-term retention).", "Constraints: latency, freshness of new items, fairness to creators, safety."] },
        { h: "2. The funnel" },
        { ol: ["**Candidate generation** (10M to ~2,000): multiple sources in parallel: two-tower embedding retrieval via ANN, collaborative filtering, 'because you watched', trending, followed creators, and fresh-content pools.", "**Ranking** (2,000 to ~200): a deep model scoring probability of watch, like, finish, share, and negative actions, with rich user, item and context features, calibrated and combined into one score.", "**Re-ranking** (200 to 20): diversity, freshness quotas, de-duplication, creator fairness, integrity filters, business rules and exploration slots."] },
        { h: "3. Data and features" },
        { ul: ["Event stream (impressions, plays, dwell, skips) into Kafka and a data lake; **feature store** with offline and online views to avoid training/serving skew.", "Real-time features (what the user did in the last 10 minutes) from streaming aggregation; slow features (long-term taste embeddings) computed in batch.", "**Point-in-time correct** training data; log what was shown (impressions) to correct for **position bias**."] },
        { h: "4. Serving architecture" },
        { ul: ["Home request fan-out: fetch user features, run candidate sources in parallel, merge, rank in one batched model call, re-rank, return ids; hydrate metadata from cache.", "Latency budget: features 20 ms, candidates 40 ms, ranking 60 ms, re-rank 20 ms, hydrate 30 ms. Timeouts per stage with fallback to cached or popular lists.", "Precompute candidates for active users offline and cache; refresh on demand."] },
        { h: "5. Hard problems" },
        { ul: ["**Cold start**: new items use content embeddings and exploration traffic (bandit); new users get contextual and popular defaults plus fast learning from first interactions.", "**Exploration vs exploitation**: reserve a slice for uncertain items to avoid feedback loops.", "**Retraining and drift**: daily retraining plus online updates for embeddings; monitor drift; shadow and canary new models; A/B test with long-term metrics.", "**Evaluation**: offline NDCG and recall on time-split data, online experiments, interleaving for quick comparisons."] }
      ],
      follow: ["How do you handle a new video with no views?", "How do you avoid filter bubbles and clickbait?", "How do you serve the ranker within 60 ms for 2,000 candidates?", "How would you incorporate user-controlled feedback such as 'not interested'?"],
      rubric: "Defines objective and guardrails, funnel of candidates, ranking and re-ranking, two-tower ANN retrieval, feature store with point-in-time correctness, real-time and batch features, latency budget with fallbacks, cold start and exploration, position bias, drift monitoring and A/B testing."},

    { id: "ai-fraud-detection", company: "Stripe / PayPal", more: ["Meta", "Uber", "Airbnb"], title: "Design real-time fraud detection", level: "Staff", min: 45, ai: true,
      prompt: "Design a system that scores every payment for fraud in under 100 ms before approving it. 5,000 payments per second, fraudsters adapt, and labels arrive weeks later.",
      scene: "", lessons: ["ai-mlsystems"],
      walk: [
        { h: "1. Requirements" },
        { ul: ["Decision per transaction: approve, decline, or step-up (3-D Secure/manual review) within **100 ms** (p99), inline with the payment.", "High recall on fraud but very low false positives: each wrongly declined customer costs revenue and trust.", "Fraud is **adversarial** and labels are **delayed** (chargebacks arrive 30-90 days later) and rare (about 0.1%)."] },
        { h: "2. Decision pipeline" },
        { ol: ["**Rules engine** for obvious cases (blocklists, velocity limits, impossible geography) in microseconds.", "**Feature assembly**: online lookups from a feature store: user history, device and IP reputation, card/merchant stats, counts in the last minute/hour/day (computed by streaming aggregation).", "**Model scoring**: gradient-boosted trees or a neural net returns a risk score in a few ms; a graph signal (shared devices/cards across accounts) catches rings.", "**Decision policy**: thresholds per merchant and risk appetite choose approve/step-up/decline; log everything.", "**Fallbacks**: if features or the model time out, apply a conservative rules-only decision."] },
        { h: "3. Data and training" },
        { ul: ["Streaming pipeline (Kafka, Flink) maintains rolling counters used both offline and online, one definition for both (no skew).", "**Label handling**: fraud labels mature slowly; train on matured windows, use partial labels and proxies (disputes, manual reviews), and weight recent data.", "**Class imbalance**: sample negatives, use cost-sensitive loss; evaluate with precision-recall, not accuracy; choose thresholds by business cost.", "**Point-in-time features** to avoid leakage."] },
        { h: "4. Adversaries and operations" },
        { ul: ["**Drift and adaptation**: monitor feature and score distributions, approval/decline rates by segment; retrain frequently; keep rule hotfixes for new attack patterns.", "**Shadow mode** and champion/challenger: new models score silently alongside production before taking decisions; canary rollout.", "**Feedback loop bias**: declined transactions never produce labels; keep a small randomized approval sample (with limits) to measure true fraud.", "**Human review queue** with tooling, prioritized by risk and value; reviewers' labels feed training.", "**Explainability** for disputes and regulators: reason codes per decision."] }
      ],
      follow: ["How do you detect a coordinated fraud ring?", "How do you evaluate a model when labels are delayed 60 days?", "What happens if the feature store is down?", "How do you choose the decision threshold?"],
      rubric: "100 ms inline decision pipeline with rules, features, model, policy; online feature store with streaming aggregates and no training/serving skew; delayed and imbalanced labels; precision-recall and cost-based thresholds; shadow/canary; drift monitoring; selection bias and exploration; fallbacks; human review; graph signals."},

    { id: "ai-support-agent", company: "Intercom / Salesforce / Zendesk", more: ["Shopify", "Stripe", "Airbnb"], title: "Design an AI customer support agent with tools", level: "Staff", min: 50, ai: true,
      prompt: "Design an AI agent that resolves customer support chats: it answers from the help center, looks up orders, issues refunds within limits, and hands over to a human when needed. 1M conversations a day.",
      scene: "agent-loop", lessons: ["ai-agents", "ai-safety"],
      walk: [
        { h: "1. Requirements" },
        { ul: ["Resolve a high share of tickets automatically (**resolution rate**) without harming satisfaction; hand off smoothly; never take unauthorized actions.", "Multi-channel (chat, email), multi-language, per-customer data isolation, audit trail."] },
        { h: "2. Architecture" },
        { ol: ["**Conversation orchestrator** (durable workflow per conversation) holds state, calls the model, tools and moderation.", "**Knowledge**: RAG over the help center and past resolved tickets (permission scoped per customer account).", "**Tools** with schemas: `get_order`, `get_customer`, `check_refund_eligibility`, `issue_refund`, `update_address`, `escalate_to_human`. Each tool is implemented by backend services with **the end customer's identity and limits**, not admin rights.", "**Policy layer** in code (not prompt): refund caps, eligibility rules, fraud checks, and **human approval** above thresholds.", "**Handoff**: pass the transcript, summary and attempted actions to a human agent; keep the AI available as a draft assistant."] },
        { h: "3. Reliability and safety" },
        { ul: ["**Idempotency keys** on every write tool, so retries never double-refund.", "Bounded loops: max steps, tokens and time per turn; fall back to handoff on repeated failure or low confidence.", "**Prompt injection**: customer messages and order notes are untrusted; tool authorization never depends on model output alone.", "**PII handling**: redact before logging; short retention; encryption.", "Input and output **guardrails** for abuse, harmful content and brand tone; refuse out-of-scope requests politely."] },
        { h: "4. Quality and evaluation" },
        { ul: ["Golden conversations by intent (refund, shipping, account); replay against new prompts or models; LLM judge plus human spot checks.", "Online: resolution rate, CSAT, escalation rate, **wrong-action rate** (critical), cost per resolution, average handle time.", "Review traces of failures weekly and add them to the eval set; staged rollout by intent and by customer segment.", "Confidence and **escalation triggers**: angry sentiment, repeated misunderstanding, VIP customers, legal keywords."] },
        { h: "5. Scale and cost" },
        { ul: ["Route simple intents to small models; cache help-center answers; stream replies.", "Queue-based processing for email; real-time path for chat with priority.", "Per-tenant rate limits and token budgets; failover across model providers."] }
      ],
      follow: ["How do you prevent the agent from refunding fraudulently?", "How do you test changes to the agent safely before launch?", "How do you measure whether the agent made a wrong decision?", "How do you handle a customer who writes in several languages?"],
      rubric: "Durable orchestrator, RAG with scoping, tools with least privilege using customer identity, policy enforcement in code and human approval, idempotency, bounded loops and handoff, injection and PII handling, evaluation with golden sets and online metrics including wrong-action rate, cost routing, tracing."},

    { id: "ai-content-moderation", company: "Meta / YouTube / TikTok", more: ["X", "Reddit", "Discord"], title: "Design a content moderation pipeline", level: "Staff", min: 45, ai: true,
      prompt: "Design a system that detects and removes policy-violating content (text, images, video, live streams) at 10M posts a day, with appeals, human review and very low tolerance for the worst categories.",
      scene: "", lessons: ["ai-mlsystems", "ai-evals"],
      walk: [
        { h: "1. Requirements" },
        { ul: ["Categories with different severities: child safety and terrorism (zero tolerance, act in seconds), hate and harassment (context-heavy), spam, misinformation.", "Balance **precision** (do not remove legitimate speech) and **recall** (catch violations); decisions must be explainable and appealable.", "Regulatory reporting, regional laws, and moderator wellbeing."] },
        { h: "2. Multi-stage pipeline" },
        { ol: ["**Pre-publish checks (synchronous, fast)**: hash matching against known illegal content (perceptual hashes like PhotoDNA), blocklists and cheap classifiers. Block immediately.", "**Async ML classification (seconds)**: text, image, video and audio models produce per-category scores; multimodal context (caption plus image). Post is visible or limited depending on risk and user history.", "**Risk-based routing**: high-confidence violations are auto-actioned; medium-confidence items go to **human review queues** prioritized by severity, reach and virality; low risk passes.", "**Actions**: remove, limit distribution, age-gate, label, strike the account; notify the user with the reason.", "**Appeals** re-review by different reviewers; outcomes feed training.", "**Post-publish signals**: user reports, virality triggers (a rapidly spreading post is re-scanned with heavier models), and re-evaluation when policies change."] },
        { h: "3. Scale and latency" },
        { ul: ["Event-driven: uploads emit events to Kafka; classifiers run as scalable workers consuming queues, by priority class.", "Video: sample frames and audio segments; run heavy models only on uncertain or high-reach content to control cost.", "**Live streams**: low-latency sampling every few seconds with fast models; escalate to human monitors; ability to cut the stream.", "Cost: cascade of cheap model first, expensive model second; cache by content hash (reuploads of known bad content are instant)."] },
        { h: "4. Quality and adversaries" },
        { ul: ["Evaluate per category and per language/region with precision/recall on labeled sets; track reviewer agreement and appeal overturn rate as quality signals.", "**Adversarial adaptation**: bad actors alter images or use coded language; retrain frequently, use perceptual hashing, behavior and network signals (accounts, devices).", "**Policy changes**: store raw scores and rules versions so you can re-evaluate historical content.", "**Fairness**: audit error rates across languages and dialects; use native-language reviewers.", "**Human review operations**: queue prioritization, blur/grayscale tools, rotation and wellness limits, calibration sessions."] }
      ],
      follow: ["How do you act within seconds on viral harmful content?", "How would you reduce false positives for satire and news?", "How do you handle a policy that changes tomorrow?", "How do you moderate end-to-end encrypted messages?"],
      rubric: "Layered pipeline: hash matching, fast classifiers, async ML, human review with prioritization, appeals; severity-based thresholds and routing; event-driven scalable processing with cascades; live-stream handling; per-category evaluation and appeal metrics; adversarial adaptation; policy versioning; fairness and reviewer wellbeing."}
  );

  /* rubrics */
  var R = (window.RUBRICS = window.RUBRICS || {});
  R["ai-chat-service"] = [
    ["Estimates tokens per second and concurrent generations, concluding GPU capacity and cost dominate", ["t:1:1", "x:ai-llm"]],
    ["Streams tokens over SSE with stop/cancel and resumable delivery", ["x:ai-frontend", "t:2:2"]],
    ["Builds prompts from history with trimming or summaries and uses prefix caching", ["x:ai-llm", "s:llm-serving"]],
    ["Serves with GPU replicas using continuous batching and KV cache management", ["s:llm-serving", "x:ai-serving"]],
    ["Routes requests by load and prefix locality and across model tiers by plan", ["s:ai-gateway", "x:ai-cost"]],
    ["Rate limits by tokens per plan and prioritizes interactive traffic", ["s:rate-limit", "x:ai-cost"]],
    ["Adds input and output safety layers compatible with streaming", ["x:ai-safety"]],
    ["Handles failures mid-stream, slow GPU autoscaling and persistence of conversations", ["s:circuit-breaker", "t:8:1", "t:5:1"]]
  ];
  R["ai-enterprise-rag"] = [
    ["Designs connector ingestion with webhooks plus periodic syncs and incremental re-embedding", ["s:rag-flow", "t:7:0"]],
    ["Parses and chunks documents with metadata and preserves headings", ["x:ai-rag"]],
    ["Enforces ACLs inside retrieval, handling group membership changes", ["s:rag-flow", "x:ai-safety", "x:privacy"]],
    ["Isolates tenants (indexes, namespaces, keys)", ["x:privacy"]],
    ["Uses hybrid retrieval and a reranker", ["x:ai-embeddings", "x:search"]],
    ["Generates grounded answers with verified citations and streams them", ["x:ai-rag"]],
    ["Evaluates retrieval separately from generation with a golden set", ["x:ai-evals"]],
    ["Addresses prompt injection, freshness tiers and index scale", ["x:ai-safety", "s:sharding"]]
  ];
  R["ai-code-assistant"] = [
    ["Separates low-latency autocomplete from chat/agent flows with different models", ["x:ai-llm", "s:ai-gateway"]],
    ["Debounces and cancels requests client side and meets a ~300 ms budget", ["s:typeahead", "x:ai-frontend"]],
    ["Assembles context from the current file, related files and recent edits within a token limit", ["x:ai-rag"]],
    ["Indexes the repo with syntax-aware chunks and incremental updates", ["x:ai-embeddings", "x:ai-rag"]],
    ["Runs an agentic edit loop with tools, tests and diff review", ["s:agent-loop", "x:ai-agents"]],
    ["Protects privacy (zero retention, secret filtering, tenant isolation)", ["x:ai-safety", "x:privacy"]],
    ["Uses a gateway for routing, budgets and failover, and prefix caching", ["s:ai-gateway", "x:ai-cost"]],
    ["Measures acceptance rate and latency and A/B tests models", ["x:ai-evals"]]
  ];
  R["ai-recommendations"] = [
    ["Defines objective, metrics and guardrails before designing", ["x:ai-recsys"]],
    ["Uses a candidate, ranking, re-ranking funnel with multiple candidate sources", ["x:ai-recsys", "s:feed-fanout"]],
    ["Uses embeddings and ANN retrieval for candidates", ["x:ai-embeddings"]],
    ["Describes event pipeline and a feature store with offline/online consistency", ["x:ai-mlsystems", "x:analytics"]],
    ["Provides a latency budget with fallbacks and caching", ["t:8:1", "t:6:1"]],
    ["Addresses cold start and exploration", ["x:ai-recsys"]],
    ["Handles position bias and feedback loops", ["x:ai-recsys", "x:ai-evals"]],
    ["Retrains, monitors drift and evaluates offline and with A/B tests", ["x:ai-mlsystems", "x:ai-evals"]]
  ];
  R["ai-fraud-detection"] = [
    ["States the latency budget and the inline decision flow (rules, features, model, policy)", ["x:ai-mlsystems", "t:8:1"]],
    ["Uses an online feature store with streaming aggregates consistent with training", ["x:ai-mlsystems", "t:7:4"]],
    ["Handles delayed and imbalanced labels and uses precision-recall and cost-based thresholds", ["x:ai-mlsystems", "x:ai-evals"]],
    ["Includes fallbacks when features or models are slow or down", ["s:circuit-breaker", "t:1:2"]],
    ["Uses shadow mode, champion/challenger and canary rollout", ["x:release", "x:ai-mlsystems"]],
    ["Monitors drift and adapts to adversaries with rules hotfixes", ["x:ai-mlsystems", "t:8:3"]],
    ["Addresses selection bias from declined transactions with exploration", ["x:ai-recsys"]],
    ["Adds human review, explainability and graph signals", ["t:4:4", "x:privacy"]]
  ];
  R["ai-support-agent"] = [
    ["Orchestrates conversations with a durable workflow and a bounded agent loop", ["s:agent-loop", "x:ai-agents"]],
    ["Uses RAG over the help center scoped to the customer's data", ["s:rag-flow", "x:ai-rag"]],
    ["Defines tools with schemas that act with the customer's identity and least privilege", ["x:ai-agents", "x:ai-safety"]],
    ["Enforces refund policy and approvals in code, not prompts", ["x:ai-safety", "x:payments"]],
    ["Makes write tools idempotent and handles retries", ["s:idempotency"]],
    ["Handles prompt injection and PII", ["x:ai-safety", "x:privacy"]],
    ["Plans handoff to humans with escalation triggers", ["x:ai-agents"]],
    ["Evaluates with golden conversations and online metrics including wrong-action rate", ["x:ai-evals"]]
  ];
  R["ai-content-moderation"] = [
    ["Separates severity classes with different latency and tolerance", ["x:ai-mlsystems", "t:1:0"]],
    ["Uses fast pre-publish checks such as hash matching and blocklists", ["x:ai-mlsystems", "t:8:5"]],
    ["Runs asynchronous ML classification with scalable event-driven workers", ["s:queue-flow", "s:pubsub"]],
    ["Routes by confidence to automatic action or prioritized human review", ["x:ai-evals", "s:queue-flow"]],
    ["Supports appeals and feeds outcomes back to training", ["x:ai-mlsystems"]],
    ["Controls cost with cascades and caching by content hash", ["x:ai-cost", "s:cache-aside"]],
    ["Handles live streams and viral content re-scanning", ["s:stampede", "t:10:4"]],
    ["Evaluates by category and language, handles policy changes and adversaries", ["x:ai-evals", "x:release"]]
  ];

  /* needs */
  var Nd = (window.NEEDS = window.NEEDS || {}), C = ["t:1:0", "t:1:1", "t:14:0"];
  var A = {
    "ai-chat-service": ["t:2:2", "s:rate-limit", "t:8:0", "s:circuit-breaker", "t:8:1", "t:5:1", "x:ai-llm", "x:ai-serving", "s:llm-serving", "x:ai-cost", "s:ai-gateway", "x:ai-safety", "x:ai-frontend"],
    "ai-enterprise-rag": ["t:7:0", "x:search", "x:privacy", "x:ai-llm", "x:ai-embeddings", "x:ai-rag", "s:rag-flow", "x:ai-evals", "x:ai-safety", "s:sharding"],
    "ai-code-assistant": ["s:typeahead", "t:13:1", "x:ai-llm", "x:ai-embeddings", "x:ai-rag", "x:ai-agents", "s:agent-loop", "x:ai-cost", "s:ai-gateway", "x:ai-safety", "x:ai-evals"],
    "ai-recommendations": ["t:6:1", "t:7:1", "x:analytics", "s:feed-fanout", "x:ai-embeddings", "x:ai-mlsystems", "x:ai-recsys", "x:ai-evals"],
    "ai-fraud-detection": ["t:7:4", "t:8:1", "s:circuit-breaker", "t:8:3", "x:release", "x:ai-mlsystems", "x:ai-evals", "x:ai-recsys", "x:payments"],
    "ai-support-agent": ["s:idempotency", "x:payments", "x:privacy", "x:ai-llm", "x:ai-rag", "s:rag-flow", "x:ai-agents", "s:agent-loop", "x:ai-safety", "x:ai-evals", "x:ai-cost"],
    "ai-content-moderation": ["t:7:0", "s:queue-flow", "s:pubsub", "t:8:5", "x:release", "x:ai-mlsystems", "x:ai-evals", "x:ai-cost", "t:10:4"]
  };
  Object.keys(A).forEach(function (k) { Nd[k] = C.concat(A[k]); });
})();
