# AWS Lambda GraphQL with subscriptions

![CircleCI](https://img.shields.io/circleci/project/github/michalkvasnicak/aws-lambda-graphql/master.svg?style=flat-square)
![Version](https://img.shields.io/npm/v/aws-lambda-graphql.svg?style=flat-square)

_This library is not ready for production and is not really as robust as [subscriptions-transport-ws](https://github.com/apollographql/subscriptions-transport-ws)_

_This library uses typescript so for now use types as documentation_

_This library uses yarn and yarn workspaces so only `yarn.lock` is commited._

![](./docs/awsgql.gif)

## Motivation

This library is created because I wanted to try if it's possible to implement GraphQL server with subscriptions in AWS Lambda. And yes it is possible with AWS API Gateway v2.

## Table of contents

- [Infrastructure](#Infrastructure)
- [Usage (server)](#usage-server)
- [Usage (client)](#usage-client)
- [Examples](#examples)

## Infrastructure

Current infrastructure is implemented using [AWS Lambda](https://aws.amazon.com/lambda/) + AWS API Gateway v2 + [AWS DynamoDB](https://aws.amazon.com/dynamodb/) (with [DynamoDB streams](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.html)). But it can be implemented using various solutions (Kinesis, etc) because it's written to be modular.

![](./docs/How%20it%20works.svg)

## Usage (server)

```console
npm install aws-lamda-graphql apollo-link graphql graphql-subscriptions
# or
yarn add aws-lambda-graphql apollo-link graphql graphql-subscriptions
```

### Implement your simple server

```js
const {
  createDynamoDBEventProcessor,
  createWsHandler,
  DynamoDBConnectionManager,
  DynamoDBEventStore,
  DynamoDBSubscriptionManager,
  PubSub,
} = require('aws-lambda-graphql');
import { makeExecutableSchema } from 'graphql-tools';

// this only processes AWS Api Gateway v2 events
// if you want to process HTTP too, use createHttpHandler
// or you can use both, see chat-example-server

// instantiate event store
// by default uses Events table (can be changed)
const eventStore = new DynamoDBEventStore();
const pubSub = new PubSub({ eventStore });
const connectionManager = new DynamoDBConnectionManager();
const subscriptionManager = new DynamoDBSubscriptionManager();

const schema = makeExecutableSchema({
  typeDefs: /* GraphQL */ `
    type Mutation {
      publish(message: String!): String!
    }

    type Query {
      dummy: String!
    }

    type Subscription {
      messageFeed: String!
    }
  `,
  resolvers: {
    Query: {
      dummy: () => 'dummy',
    },
    Mutation: {
      publish: async (rootValue, { message }) => {
        await pubSub.publish('NEW_MESSAGE)', { message });

        return message;
      },
    },
    Subscription: {
      messageFeed: {
        // rootValue is same as object published using pubSub.publish
        resolve: rootValue => rootValue.message,
        subscribe: pubSub.subscribe('NEW_MESSAGE'),
      },
    },
  },
});

const eventProcessor = createDynamoDBEventProcessor({
  connectionManager,
  schema,
  subscriptionManager,
});
const wsHandler = createWsHandler({
  connectionManager,
  schema,
  subscriptionManager,
});

// use these handlers from your lambda and map them to
// api gateway v2 and DynamoDB events table
module.exports.consumeWsEvent = wsHandler;
module.exports.consumeDynamoDBStream = eventProcessor;
```

## Usage (client)

```console
yarn add aws-lambda-ws-link graphql
# or
npm install aws-lambda-ws-link graphql
```

### Implement your simple client

```js
import { Client, WebSocketLink } from 'aws-lambda-ws-link';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { ApolloClient } from 'apollo-client';

const wsClient = new Client({
  uri: 'ws://localhost:8000',
});
const link = new WebSocketLink(client);
const client = new ApolloClient({
  cache: new InMemoryCache(),
  link,
});

// ...
```

## Examples

- [Chat App](./packages/chat-example-app) - React app
- [Chat Server](./packages/chat-example-server)
  - contains AWS Lambda that handles HTTP, WebSocket and DynamoDB streams
  - also contains example cloudformation template you can use to deploy your solution

## Contributing

Running tests locally:

```console
yarn install
yarn test
```

This project uses TypeScript for static typing and TSLint for linting. You can get both of these built into your editor with no configuration by opening this project in Visual Studio Code, an open source IDE which is available for free on all platforms.

## License

MIT
