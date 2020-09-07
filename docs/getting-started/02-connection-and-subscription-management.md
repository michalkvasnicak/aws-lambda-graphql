---
title: 'Connection and subscription management'
description: How to set up connection and subscription management.
---

# Connection and subscription management

Our GraphQL server needs to know what subscriptions are clients subscribed to and how to communicate with those clients. In order to do that the server uses [Connection manager](../../packages/aws-lambda-graphql/src/types/connections.ts) and [Subscription manager](../../packages/aws-lambda-graphql/src/types/subscriptions.ts).

## Connection manager

The purpose of Connection manager is to register or unregister all the connections which have connected to your service over AWS API Gateway v2.

## Subscription manager

Each client that subscribes to some GraphQL subscription is managed by Suscription manager. Subscription manager stores the information about connection and GraphQL document used to subscribe to the operation by the given connection.

## Put together

We'll use [`DynamoDBConnectionManager`](../api/DynamoDBConnectionManager.md) and [`DynamoDBSubscriptionManager`](../api/DynamoDBSubscriptionManager.md) to manage connections and subscriptions.

```js
import {
  DynamoDBConnectionManager,
  DynamoDBSubscriptionManager,
} from 'aws-lambda-graphql';

const subscriptionManager = new DynamoDBSubscriptionManager();
const connectionManager = new DynamoDBConnectionManager({
  subscriptionManager,
});
```

In next section we're going to create an event store so we can store published messages and process them later.
