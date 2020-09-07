---
title: Event handlers
description: How to expose AWS Lambda handlers for our real-time GraphQL service.
---

# Event handlers

AWS Lambda needs a handler, function that processes an event received by our lambda function. Event handlers are exposed from [Server](../api/Server.md) by calling the create methods for HTTP, WebSocket or event processing handlers.

## Put together

We have functioning GraphQL schema with resolvers for `broadcastMessage` GraphQL mutation and `messageBroadcast` GraphQL subscription. We need to create a server that glues together all the pieces we created along our journey and exposes handlers:

- `handleWebSocket` for `AWS API Gateway v2` events
- `handleHTTP` for `AWS API Gateway v1` events
- `handeEvents` for `DynamoDB Streams` events

```js
import {
  DynamoDBConnectionManager,
  DynamoDBEventProcessor,
  DynamoDBEventStore,
  DynamoDBSubscriptionManager,
  PubSub,
  Server,
} from 'aws-lambda-graphql';

const eventStore = new DynamoDBEventStore();
const eventProcessor = new DynamoDBEventProcessor();
const subscriptionManager = new DynamoDBSubscriptionManager();
const connectionManager = new DynamoDBConnectionManager({
  subscriptionManager,
});
const pubSub = new PubSub({ eventStore });

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

const server = new Server({
  // accepts all the apollo-server-lambda options and adds few extra options
  // provided by this package
  connectionManager,
  eventProcessor,
  resolvers,
  subscriptionManager,
  typeDefs,
});

export const handleWebSocket = server.createWebSocketHandler();
export const handleHTTP = server.createHttpHandler();
// this creates dynamodb event handler so we can send messages to subscribed clients
export const handleEvents = server.createEventHandler();
```

Our server is finished 🎉. In next section we'll deploy our service.
