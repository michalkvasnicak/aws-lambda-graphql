---
title: Event store
description: How to set up an event store so we can process events published by connected clients.
---

# Event store

Each client can publish messages that can be processed and sent to subscribed clients.

[Event store](../../packages/aws-lambda-graphql/src/types/events.md) is responsible for storing those events to storage that can be used as an event source for our event processing handler.

## Put together

We'll use [`DynamoDBEventStore`](../api/DynamoDBEventStore.md) that stores the events in DynamoDB table which will be used as an event source for our event processing lambda by leveraging DynamoDB streams.

```js
import {
  DynamoDBConnectionManager,
  DynamoDBEventStore,
  DynamoDBSubscriptionManager,
} from 'aws-lambda-graphql';

const eventStore = new DynamoDBEventStore();
const subscriptionManager = new DynamoDBSubscriptionManager();
const connectionManager = new DynamoDBConnectionManager({
  subscriptionManager,
});
```

That's it for now. Our `eventStore` will be used to publish messages to all subscribed clients. In next section we'll create a simple GraphQL schema for our service.
