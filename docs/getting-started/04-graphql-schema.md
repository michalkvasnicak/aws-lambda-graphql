---
title: GraphQL schema
description: Define GraphQL schema for your first service.
---

# GraphQL schema

Our service needs a GraphQL schema, so we'll create one. Each client can subscribe to broadcast by `messageBroadcast` GraphQL subscription and is able to broadcast any message to all clients event itself by `broadcastMessage` GraphQL mutation.

## Put together

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

const typeDefs = /* GraphQL */ `
  type Mutation {
    broadcastMessage(message: String!): String!
  }

  type Query {
    """
    Dummy query so out server won't fail during instantiation
    """
    dummy: String!
  }

  type Subscription {
    messageBroadcast: String!
  }
`;
```

In next section we'll create a PubSub instance and give the schema a logic so client can subscribe to messages or broadcast them.
