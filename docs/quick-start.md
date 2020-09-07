---
title: Quick start
description: How to quickly start using Serverless GraphQL subscriptions in your project.
---

# Quick start

## Installation

```console
yarn add aws-lambda-graphql graphql graphql-subscriptions aws-sdk
# or
npm install aws-lambda-graphql graphql graphql-subscriptions aws-sdk
```

{% hint style="info" %}
Note that `aws-sdk` is required only for local development, it's available in AWS Lambda environment by default when you deploy the app.
{% endhint %}

## First application (broadcasting server)

In this quick example we're going to build simple message broadcasting server that broadcasts messages received by `broadcastMessage` mutation to all subscribed clients.

### Complete code

First see the complete code. If you're interested in explanation continue reading below.

```ts
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
    """
    Sends a message to all subscribed clients
    """
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

{% hint style="info" %}
Exported handlers need to be mapped to their event sources. `handleWebSocket` needs to be mapped to `API Gateway v2` event source, `handleHTTP` to `API Gateway v1` event source and `handleEvents` to `DynamoDB Stream` event source.

See [serverless.yml](./serverless.yml) template to see how to setup event sources.
{% endhint %}
