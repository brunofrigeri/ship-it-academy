/* Prerequisite lessons for each exercise, from every course section. Refs: s:scene, x:deep dive, t:day:index. */
(function () {
  var C = ["t:1:0", "t:1:1", "t:14:0"];
  var N = {
    "airbnb-booking": ["t:1:2", "t:2:1", "s:web-request", "t:3:1", "t:3:2", "s:cdn-flow", "t:4:0", "t:4:1", "t:4:2", "t:4:4", "s:replication", "t:5:0", "s:sharding", "t:5:1", "t:5:2", "x:search", "x:booking", "t:6:0", "t:6:1", "t:7:2", "x:analytics", "s:idempotency", "x:payments", "t:10:3"],
    "twitter-timeline": ["t:2:1", "t:2:2", "t:3:1", "t:4:4", "s:sharding", "t:5:1", "t:6:0", "t:6:1", "s:cache-aside", "t:7:0", "s:queue-flow", "t:7:1", "t:8:6", "t:9:4", "t:10:0", "s:feed-fanout", "s:cdn-flow"],
    "twitter-trending": ["t:6:1", "t:7:1", "s:pubsub", "t:7:4", "t:5:1", "s:sharding", "t:8:0", "t:8:4", "t:8:5", "t:9:4", "x:analytics"],
    "meta-newsfeed": ["t:3:1", "t:4:4", "t:5:1", "t:6:1", "t:7:1", "t:8:1", "s:circuit-breaker", "t:8:3", "t:10:0", "s:feed-fanout", "x:analytics"],
    "whatsapp": ["t:2:2", "t:2:4", "t:5:1", "t:6:0", "t:7:0", "t:7:2", "s:idempotency", "t:8:1", "t:8:4", "t:9:1", "t:10:1", "s:chat-system", "t:10:2", "s:stampede"],
    "instagram": ["t:3:2", "s:cdn-flow", "t:4:4", "t:5:1", "t:6:1", "t:7:0", "s:queue-flow", "t:9:1", "t:10:0", "s:feed-fanout", "x:privacy"],
    "uber": ["t:2:2", "t:4:2", "t:5:1", "s:sharding", "t:6:0", "s:pubsub", "x:booking", "x:locks", "s:saga", "x:payments", "t:10:3"],
    "youtube": ["t:3:2", "s:cdn-flow", "t:4:4", "t:7:0", "s:stampede", "t:9:1", "x:search", "t:10:4", "t:10:5"],
    "google-docs": ["t:2:2", "t:2:4", "t:5:1", "t:5:3", "t:7:3", "t:8:2", "t:12:1", "s:optimistic-ui", "t:12:2"],
    "web-crawler": ["t:2:0", "s:web-request", "t:6:0", "t:7:0", "t:5:1", "t:8:5", "t:9:3", "x:search"],
    "amazon-flash-sale": ["t:3:2", "s:cdn-flow", "t:4:2", "t:6:0", "t:6:2", "s:stampede", "t:7:0", "s:queue-flow", "t:8:0", "s:rate-limit", "t:8:1", "s:circuit-breaker", "s:idempotency", "x:booking", "x:payments"],
    "stripe-payments": ["t:2:1", "t:2:3", "s:idempotency", "t:2:4", "t:4:2", "t:5:4", "s:saga", "t:7:2", "t:8:1", "s:circuit-breaker", "x:payments", "x:privacy", "x:multiregion"],
    "dropbox": ["t:2:2", "t:4:2", "t:4:4", "s:replication", "t:5:3", "s:pubsub", "s:optimistic-ui", "t:9:1", "x:privacy"],
    "rate-limiter": ["t:3:1", "t:6:0", "s:sharding", "t:8:0", "s:rate-limit", "s:circuit-breaker", "x:locks", "x:multiregion"],
    "job-scheduler": ["t:4:0", "t:4:1", "t:7:0", "s:queue-flow", "t:7:2", "s:idempotency", "t:8:2", "s:raft-election", "x:locks", "x:gossip", "t:8:4", "s:stampede"],
    "metrics-monitoring": ["t:4:1", "t:4:3", "t:7:1", "s:pubsub", "t:8:3", "t:8:5", "x:analytics", "x:multiregion"]
  };
  window.NEEDS = {};
  Object.keys(N).forEach(function (k) { window.NEEDS[k] = C.concat(N[k]); });
})();
