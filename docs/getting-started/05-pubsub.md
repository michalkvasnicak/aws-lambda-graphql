---
title: PubSub
description: How to create PubSub instance in order to send and subscribe to messages.
---

# PubSub

Any GraphQL service that wants to offer GraphQL subscriptions needs to use [PubSub](../api/PubSub.md) in order to publish and subscribe to messages (events). PubSub uses [Event store](./03-event-store.md) to store published messages. They are later picked up from event source by [Event processor](./06-event-handlers.md).

## Put together

Let's import PubSub and connect it to [Event store](./03-event-store.md) we created before. Then we use the `pubSub` instance in our GraphQL schema resolvers.

```js
import {
  DynamoDBConnectionManager,
  DynamoDBEventStore,
  DynamoDBSubscriptionManager,
  PubSub,
} from 'aws-lambda-graphql';

const eventStore = new DynamoDBEventStore();
const subscriptionManager = new DynamoDBSubscriptionManager();
const connectionManager = new DynamoDBConnectionManager({
  subscriptionManager,
});
const pubSub = new PubSub({
  eventStore,
  // optional, if you don't want to store messages to your store as JSON
  // serializeEventPayload: false,
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

const resolvers: {
  Mutation: {
    broadcastMessage: async (
      root,
      { message },
    ) => {
      await pubSub.publish('NEW_MESSAGE', { message });

      return message;
    },
  },
  Query: {
    dummy: () => 'dummy',
  },
  Subscription: {
    messageBroadcast: {
      // rootValue is same as the event published above ({ message: string })
      // but our subscription should return just a string, so we're going to use resolve
      // to extract message from an event
      resolve: rootValue => rootValue.message,
      subscribe: pubSub.subscribe('NEW_MESSAGE'),
    },
  },
};
```

{% hint style="info" %}
⚠️ Be careful! By default `PubSub` serializes event payload to JSON. If you don't want this behaviour, set `serializeEventPayload` to `false` on your `PubSub` instance.
{% endhint %}

Now our schema is ready, so let's create a GraphQL server and expose it's handlers to AWS Lambda in the next section.
