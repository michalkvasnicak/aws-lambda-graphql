# AWS Lambda GraphQL with subscriptions

![CircleCI](https://img.shields.io/circleci/project/github/michalkvasnicak/aws-lambda-graphql/master.svg?style=flat-square)
![Version](https://img.shields.io/npm/v/aws-lambda-graphql.svg?style=flat-square)

_As of version 0.8.0 you can use [subscriptions-transport-ws](https://github.com/apollographql/subscriptions-transport-ws) client._

_This library uses typescript so for now use types as documentation_

_This library uses yarn and yarn workspaces so only `yarn.lock` is commited._

![](./docs/awsgql.gif)

## Motivation

This library is created because I wanted to try if it's possible to implement GraphQL server with subscriptions in AWS Lambda. And yes it is possible with AWS API Gateway v2.

## Table of contents

- [Infrastructure](#Infrastructure)
- [Usage (server)](#usage-server)
- [Usage (Apollo client + subscriptions-transport-ws)](#usage-client-apollo)
- [Usage (Apollo client + aws-lambda-ws-link)](#usage-client)
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
const subscriptionManager = new DynamoDBSubscriptionManager();
const connectionManager = new DynamoDBConnectionManager({
  subscriptions: subscriptionManager,
});

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
  // validationRules

  /* Lifecycle methods available from 0.9.0 */
  /* allows to provide custom parameters for operation execution */
  // onOperation?: (message: OperationRequest, params: { query, variables, operationName, context, schema }, connection: IConnection) => Promise<Object> | Object,

  /* executes on subscription stop operations, receives connection object and operation ID as arguments */
  // onOperationComplete?: (connection: IConnection, opId: string) => void,

  /* 
    executes on GQL_CONNECTION_INIT message, receives payload of said message and allows to reject connection when onConnect thorws error or returns false,
    write method return value to connection context which will be available during graphql resolver execution.
    If onConnect is not defined or returns true, we put everything in GQL_CONNECTION_INIT messagePayload to connection context.
  */
  // onConnect?: (messagePayload: { [key: string]: any }, connection: IConnection) => Promise<boolean | { [key: string]: any }> | boolean | { [key: string]: any },

  /* executes on $disconnect, receives connection object as argument */
  // onDisconnect?: (connection: IConnection) => void,

  // waitForInitialization (available from 0.11.0)
  // waitForInitialization: { retryCount?: number, timeout?: number },
});

// use these handlers from your lambda and map them to
// api gateway v2 and DynamoDB events table
module.exports.consumeWsEvent = wsHandler;
module.exports.consumeDynamoDBStream = eventProcessor;
```

## Usage (Apollo client + subscriptions-transport-ws)

This library can be used with Apollo client without any problems thanks to [AlpacaGoesCrazy's](https://github.com/AlpacaGoesCrazy) [pull request #27](https://github.com/michalkvasnicak/aws-lambda-graphql/pull/27).

```console
yarn add apollo-client subscriptions-transport-ws
# or
npm install apollo-client subscriptions-transport-ws
```

### Implement your simple client

```js
import { WebSocketLink } from 'apollo-link-ws';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { ApolloClient } from 'apollo-client';
import { SubscriptionClient } from 'subscriptions-transport-ws';

const wsClient = new SubscriptionClient(
  'ws://localhost:8000',
  { lazy: true, reconnect: true },
  null,
  [],
);
const link = new WebSocketLink(wsClient);
const client = new ApolloClient({
  cache: new InMemoryCache(),
  link,
});

// ...
```

## Usage (Apollo client + aws-lambda-ws-link)

This library also have it's own client which is using a little bit different protocol than Apollo's.

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
const link = new WebSocketLink(wsClient);
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
  - also includes serverless.yaml file for easy deployment

## Contributing

Running tests locally:

```console
yarn install
yarn test
```

This project uses TypeScript for static typing. Please add yourself to contributors according to [all-contributors](https://allcontributors.org/docs/en/cli/usage#all-contributors-add) specification. You can use `yarn all-contributors add {your-github-username} code,bug,...`.

## Contributors

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://github.com/michalkvasnicak"><img src="https://avatars1.githubusercontent.com/u/174716?v=4" width="100px;" alt="Michal Kvasničák"/><br /><sub><b>Michal Kvasničák</b></sub></a><br /><a href="#question-michalkvasnicak" title="Answering Questions">💬</a> <a href="https://github.com/michalkvasnicak/aws-lambda-graphql/commits?author=michalkvasnicak" title="Code">💻</a> <a href="#design-michalkvasnicak" title="Design">🎨</a> <a href="https://github.com/michalkvasnicak/aws-lambda-graphql/commits?author=michalkvasnicak" title="Documentation">📖</a> <a href="#example-michalkvasnicak" title="Examples">💡</a> <a href="#ideas-michalkvasnicak" title="Ideas, Planning, & Feedback">🤔</a> <a href="https://github.com/michalkvasnicak/aws-lambda-graphql/pulls?q=is%3Apr+reviewed-by%3Amichalkvasnicak" title="Reviewed Pull Requests">👀</a> <a href="https://github.com/michalkvasnicak/aws-lambda-graphql/commits?author=michalkvasnicak" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://github.com/AlpacaGoesCrazy"><img src="https://avatars1.githubusercontent.com/u/17003704?v=4" width="100px;" alt="AlpacaGoesCrazy"/><br /><sub><b>AlpacaGoesCrazy</b></sub></a><br /><a href="https://github.com/michalkvasnicak/aws-lambda-graphql/commits?author=AlpacaGoesCrazy" title="Code">💻</a> <a href="https://github.com/michalkvasnicak/aws-lambda-graphql/issues?q=author%3AAlpacaGoesCrazy" title="Bug reports">🐛</a> <a href="https://github.com/michalkvasnicak/aws-lambda-graphql/commits?author=AlpacaGoesCrazy" title="Documentation">📖</a> <a href="https://github.com/michalkvasnicak/aws-lambda-graphql/commits?author=AlpacaGoesCrazy" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://carlosguerrero.com/"><img src="https://avatars2.githubusercontent.com/u/82532?v=4" width="100px;" alt="Carlos Guerrero"/><br /><sub><b>Carlos Guerrero</b></sub></a><br /><a href="https://github.com/michalkvasnicak/aws-lambda-graphql/commits?author=guerrerocarlos" title="Code">💻</a> <a href="https://github.com/michalkvasnicak/aws-lambda-graphql/issues?q=author%3Aguerrerocarlos" title="Bug reports">🐛</a></td>
    <td align="center"><a href="http://sammarks.me/"><img src="https://avatars1.githubusercontent.com/u/424093?v=4" width="100px;" alt="Samuel Marks"/><br /><sub><b>Samuel Marks</b></sub></a><br /><a href="https://github.com/michalkvasnicak/aws-lambda-graphql/commits?author=sammarks" title="Code">💻</a> <a href="https://github.com/michalkvasnicak/aws-lambda-graphql/issues?q=author%3Asammarks" title="Bug reports">🐛</a></td>
  </tr>
</table>

<!-- markdownlint-enable -->
<!-- prettier-ignore-end -->
<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://allcontributors.org/docs/en/overview) specification. Contributions of any kind welcome!

## License

MIT
