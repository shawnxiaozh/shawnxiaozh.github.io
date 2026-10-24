Kafka Interview: Order Sequencing
23 Oct 2026 · @shawn
Main question
Say you own the order service for Binance Spot. When a user places an order, it gets sent
to the matching engine through Kafka.
Right now the best ask on BTCUSDT is 60,000, and there's only 1 BTC sitting at that price.
Two users, A and B, both send a buy order for 1 BTC at 60,000. A's order comes in a few
milliseconds before B's. So only A should get filled, and B's order should just rest on
the bid side.
How do you make sure the matching engine always processes A first, then B?
What a good answer covers:
• Kafka only guarantees ordering within a partition, not across a topic.
• All orders for the same symbol need to use symbol as the message key, so they land on
  the same partition.
• If they key by orderId or userId, A and B can end up on different partitions. Then
  there's no guarantee which one gets consumed first. That's a red flag.
• Bonus: turn on the idempotent producer (enable.idempotence=true, acks=all). Without it,
  retries with max.in.flight.requests.per.connection > 1 can reorder messages inside the
  same partition.
Follow-up
Now the market's going crazy, and the matching engine can't keep up with the BTCUSDT
partition. Someone on the team suggests consuming that partition with multiple threads to
get more throughput.
What do you think about that? And if it's a bad idea, how would you get more throughput
instead?
What a good answer covers:
• It breaks ordering. Even if A and B arrive in order on the partition, two threads can
  process them at the same time, and B might get matched before A. So B could get filled
  when only A should.
• The order book is shared state. Matching for one symbol has to stay single-threaded.
• Better ways to scale:
    ◦ Make the single thread faster: in-memory matching, lock-free data structures,
      batching
    ◦ Scale across symbols, not within one: different symbols go to different partitions
      and different matching instances, which run in parallel
    ◦ Give hot symbols like BTCUSDT their own partition and their own engine instance, so
      smaller symbols don't compete with them for resources
• Red flag: suggesting a lock around the order book with a thread pool. It technically
  works, but it's basically single-threaded with extra overhead.
