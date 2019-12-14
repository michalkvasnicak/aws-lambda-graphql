# AWS Lambda with GraphQL subscriptions

<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
[![CircleCI](https://img.shields.io/circleci/project/github/michalkvasnicak/aws-lambda-graphql/master.svg?style=flat-square)](https://circleci.com/gh/michalkvasnicak/aws-lambda-graphql)
[![aws-lambda-graphql package version](https://img.shields.io/npm/v/aws-lambda-graphql?color=green&label=aws-lambda-graphql&style=flat-square)](https://www.npmjs.com/package/aws-lambda-graphql)
[![aws-lambda-ws-link package version](https://img.shields.io/npm/v/aws-lambda-ws-link?color=green&label=aws-lambda-ws-link&style=flat-square)](https://www.npmjs.com/package/aws-lambda-ws-link)<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-5-orange.svg?style=flat-square)](#contributors-)
<!-- ALL-CONTRIBUTORS-BADGE:END -->
<!-- markdownlint-enable -->
<!-- prettier-ignore-end -->

Use AWS Lambda + AWS API Gateway v2 for GraphQL subscriptions over WebSocket and AWS API Gateway v1 for HTTP.

**`aws-lambda-graphql` is fully compatible with Apollo's [subscriptions-transport-ws](https://github.com/apollographql/subscriptions-transport-ws) client.**
**`aws-lambda-graphql` also supports GraphQL operations over HTTP events using AWS API Gateway v1**

![](./docs/awsgql.gif)

## Table of contents

- [Quick start](#quick-start)
  - [1. WebSocket server handler](#1-websocket-server-handler)
  - [1.1. HTTP server handler](#11-http-server-handler)
  - [2a Connect to the server using Apollo Client and `subscriptions-transport-ts`](#2a-connect-to-the-server-using-apollo-client-and-subscriptions-transport-ts)
  - [2b Connect to the server using Apollo Client and `aws-lambda-ws-link`](#2b-connect-to-the-server-using-apollo-client-and-aws-lambda-ws-link)
- [Packages](#packages)
  - [aws-lambda-graphql package](./packages/aws-lambda-graphql)
  - [aws-lambda-ws-link package](./packages/aws-lambda-ws-link)
- [Infrastructure](#Infrastructure)
- [Examples](#examples)

## Quick start

In this quick example we're going to use AWS DynamoDB as an event source for our PubSub.

### 1. WebSocket Server Handler

Install dependencies:

```console
yarn add aws-lambda-graphql apollo-link graphql graphql-subscriptions aws-sdk graphql-tools
# or
npm install aws-lambda-graphql apollo-link graphql graphql-subscriptions aws-sdk graphql-tools
```

Implement simple broadcasting server that broadcasts messages received using `broadcastMessage` mutation to all subscribed connections.

**⚠️ This server supports only AWS ApiGateway v2 events (WebSocket), if you want to support HTTP events too, see [example for adding HTTP support](#11-http-server-handler)**

```js
import {
  createDynamoDBEventProcessor,
  createWsHandler,
  DynamoDBConnectionManager,
  DynamoDDBEventStore,
  DynamoDBSubscriptionManager,
  PubSub,
} from 'aws-lambda-graphql';
import { makeExecutableSchema } from 'graphql-tools';
```

Next step is to instantiate an event store. Event store is responsible for publishing events to underlying event store. Event stores could be anything that supports invoking AWS Lambda (for example AWS DynamoDB or AWS Kinesis, etc).

```js
const eventStore = new DynamoDBEventStore();
```

In order to publish events to all subscribed connection and register connections to different events we need to instantiate PubSub with event store passed in. PubSub is used later in your schema to publish events. PubSub is fully compatible with [`graphql-subscriptions`](https://github.com/apollographql/graphql-subscriptions).

```js
const pubSub = new PubSub({ eventStore });
```

Now we have event store and PubSub instantiated. But we don't have a way to register subscriptions to some datastore so the information about subscriptions are shared amongst different instances of our lambda function. To fix that we'll instantiate a subscription manager (DynamoDB subscription manager for the sake of this example).

```js
const subscriptionManager = new DynamoDBSubscriptionManager();
```

The same problem as with subscriptions needs to be fixed for connections as well. For the sake of this example we're going to use DynamoDB Connection manager. Connection manager stores information about all connections and their respective subscriptions.

```js
const connectionManager = new DynamoDBConnectionManager({
  subscriptionManager,
});
```

Now define our simple broadcasting schema.

```js
const schema = makeExecutableSchema({
  typeDefs: /* GraphQL */ `
    type Mutation {
      broadcastMessage(message: String!): String!
    }

    type Query {
      dummy: String!
    }

    type Subscription {
      messageBroadcast: String!
    }
  `,
  resolvers: {
    Mutation: {
      broadcastMessage: async (
        root,
        { message },
        // $$internal is provided automatically
        // please see the documentation to `aws-lambda-graphql` package
        { $$internal: { pubSub } },
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
  },
});
```

Our schema is finished. There are 2 things missing. We need to provide a way to communicate with the schema and we need a way to process events so we can broadcast messages to all connections that subscribed to `messageBroadcast` subscription.

In order to support GraphQL operations sent to our schema we need to instantiate WebSocket handler for AWS ApiGateway v2 events. WebSocket handler needs a way to remember all connections, subscriptions and a GraphQL schema so it know what to do.

```js
const wsHandler = createWsHandler({
  connectionManager,
  schema,
  subscriptionManager,
});

module.exports.consumeWsEvent = wsHandler;
```

Now we are able to respond to mutations, queries and subscribe to subscriptions but when we send some message using `broadcastMessage` mutation subscribed connections won't receive anything because the event processor handler is missing. So now we will fix that with DynamoDB event processor.

```js
const eventProcessor = createDynamoDBEventProcessor({
  connectionManager,
  schema,
  subscriptionManager,
});

module.exports.consumeDynamoDBStream = eventProcessor;
```

Now our server is finished. You just need to map the ApiGateway v2 events to `consumeWsEvent` handler and DynamoDB stream from events table to `consumeDynamoDBStream`.

In order to do that you can use [Serverless framework](https://serverless.com), see [`serverless.yml` file](./docs/serverless.yml).

To connect to this server you can use:

- [`aws-lambda-ws-link`](./packages/aws-lambda-ws-link) - see example
- [`Apollo Client + subscriptions-transport-ts`](https://github.com/apollographql/subscriptions-transport-ws) - see example

### 1.1. HTTP Server Handler

Our server supports only AWS API Gateway v2 events. But we can make it compatible with AWS API Gateway v1 events (without subscriptions support).

```js
import { createHttpHandler } from 'aws-lambda-graphql';

const httpHandler = createHttpHandler({
  connectionManager,
  schema,
});

module.exports.consumeHttpEvent = httpHandler;
```

Make sure to map AWS API Gateway v1 events to Lambda's `consumeHttpEvent` handler.

### 2a Connect to the server using Apollo Client and `subscriptions-transport-ts`

First install dependencies

```console
yarn add apollo-link-ws apollo-cache-inmemory apollo-client subscriptions-transport-ws
# or
npm install apollo-link-ws apollo-cache-inmemory apollo-client subscriptions-transport-ws
```

```js
import { WebSocketLink } from 'apollo-link-ws';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { ApolloClient } from 'apollo-client';
import { SubscriptionClient } from 'subscriptions-transport-ws';

const wsClient = new SubscriptionClient(
  'ws://localhost:8000', // please provide the uri of the api gateway v2 endpoint
  { lazy: true, reconnect: true },
  null,
  [],
);
const link = new WebSocketLink(wsClient);
const client = new ApolloClient({
  cache: new InMemoryCache(),
  link,
});
```

### 2b Connect to the server using Apollo Client and `aws-lambda-ws-link`

**⚠️ `aws-lambda-ws-link` package is basically deprecated as of version `0.8.0`. There is no need to support 2 different protocols. Use [`subscriptions-transport-ws`](https://github.com/apollographql/subscriptions-transport-ws) please.**

```console
yarn add aws-lambda-ws-link apollo-cache-inmemory apollo-client graphql graphql-subscriptions
# or
npm install aws-lambda-ws-link apollo-cache-inmemory apollo-client graphql graphql-subscriptions
```

```js
import { Client, WebSocketLink } from 'aws-lambda-ws-link';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { ApolloClient } from 'apollo-client';

const wsClient = new Client({
  uri: 'ws://localhost:8000', // please provide the uri of the api gateway v2 endpoint
});
const link = new WebSocketLink(wsClient);
const client = new ApolloClient({
  cache: new InMemoryCache(),
  link,
});
```

## Packages

### aws-lambda-graphql package

GraphQL client and server implementation for AWS Lambda.

See [package](./packages/aws-lambda-graphql)

### aws-lambda-ws-link package

GraphQL WebSocket link implementation for [Apollo](https://www.apollographql.com/docs/) GraphQL Client.

## Infrastructure

Current infrastructure is implemented using [AWS Lambda](https://aws.amazon.com/lambda/) + AWS API Gateway v2 + [AWS DynamoDB](https://aws.amazon.com/dynamodb/) (with [DynamoDB streams](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.html)). But it can be implemented using various solutions (Kinesis, etc) because it's written to be modular.

![](./docs/How%20it%20works.svg)

## Examples

- [Chat App](./packages/chat-example-app) - React app
- [Chat Server](./packages/chat-example-server)
  - contains AWS Lambda that handles HTTP, WebSocket and DynamoDB streams
  - also includes `serverless.yml` file for easy deployment

## Contributing

- This project uses TypeScript for static typing.
- This project uses Yarn and Yarn workspaces so only `yarn.lock` is commited.

### Testing

```console
yarn test
```

### Typecheck

```console
yarn build
```

Running tests locally:

```console
yarn test
```

## Contributors

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://github.com/michalkvasnicak"><img src="https://avatars1.githubusercontent.com/u/174716?v=4" width="100px;" alt=""/><br /><sub><b>Michal Kvasničák</b></sub></a><br /><a href="#question-michalkvasnicak" title="Answering Questions">💬</a> <a href="https://github.com/michalkvasnicak/aws-lambda-graphql/commits?author=michalkvasnicak" title="Code">💻</a> <a href="#design-michalkvasnicak" title="Design">🎨</a> <a href="https://github.com/michalkvasnicak/aws-lambda-graphql/commits?author=michalkvasnicak" title="Documentation">📖</a> <a href="#example-michalkvasnicak" title="Examples">💡</a> <a href="#ideas-michalkvasnicak" title="Ideas, Planning, & Feedback">🤔</a> <a href="https://github.com/michalkvasnicak/aws-lambda-graphql/pulls?q=is%3Apr+reviewed-by%3Amichalkvasnicak" title="Reviewed Pull Requests">👀</a> <a href="https://github.com/michalkvasnicak/aws-lambda-graphql/commits?author=michalkvasnicak" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://github.com/AlpacaGoesCrazy"><img src="https://avatars1.githubusercontent.com/u/17003704?v=4" width="100px;" alt=""/><br /><sub><b>AlpacaGoesCrazy</b></sub></a><br /><a href="https://github.com/michalkvasnicak/aws-lambda-graphql/commits?author=AlpacaGoesCrazy" title="Code">💻</a> <a href="https://github.com/michalkvasnicak/aws-lambda-graphql/issues?q=author%3AAlpacaGoesCrazy" title="Bug reports">🐛</a> <a href="https://github.com/michalkvasnicak/aws-lambda-graphql/commits?author=AlpacaGoesCrazy" title="Documentation">📖</a> <a href="https://github.com/michalkvasnicak/aws-lambda-graphql/commits?author=AlpacaGoesCrazy" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://carlosguerrero.com/"><img src="https://avatars2.githubusercontent.com/u/82532?v=4" width="100px;" alt=""/><br /><sub><b>Carlos Guerrero</b></sub></a><br /><a href="https://github.com/michalkvasnicak/aws-lambda-graphql/commits?author=guerrerocarlos" title="Code">💻</a> <a href="https://github.com/michalkvasnicak/aws-lambda-graphql/issues?q=author%3Aguerrerocarlos" title="Bug reports">🐛</a></td>
    <td align="center"><a href="http://sammarks.me/"><img src="https://avatars1.githubusercontent.com/u/424093?v=4" width="100px;" alt=""/><br /><sub><b>Samuel Marks</b></sub></a><br /><a href="https://github.com/michalkvasnicak/aws-lambda-graphql/commits?author=sammarks" title="Code">💻</a> <a href="https://github.com/michalkvasnicak/aws-lambda-graphql/issues?q=author%3Asammarks" title="Bug reports">🐛</a></td>
    <td align="center"><a href="https://github.com/seanchambo"><img src="https://avatars2.githubusercontent.com/u/13476523?v=4" width="100px;" alt=""/><br /><sub><b>Sean Chamberlain</b></sub></a><br /><a href="https://github.com/michalkvasnicak/aws-lambda-graphql/issues?q=author%3Aseanchambo" title="Bug reports">🐛</a> <a href="https://github.com/michalkvasnicak/aws-lambda-graphql/commits?author=seanchambo" title="Code">💻</a></td>
  </tr>
</table>

<!-- markdownlint-enable -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://allcontributors.org/docs/en/overview) specification. Contributions of any kind welcome!

## License

MIT
