# aws-lambda-ws-link [DEPRECATED]

[![CircleCI](https://img.shields.io/circleci/project/github/michalkvasnicak/aws-lambda-graphql/master.svg?style=flat-square)](https://circleci.com/gh/michalkvasnicak/aws-lambda-graphql)
[![aws-lambda-ws-link package version](https://img.shields.io/npm/v/aws-lambda-ws-link?color=green&label=aws-lambda-ws-link&style=flat-square)](https://www.npmjs.com/package/aws-lambda-ws-link)

**⚠️ This package is deprecated, please use Apollo's [subscriptions-transport-ws](https://github.com/apollographql/subscriptions-transport-ws) client.**

Apollo WebSocket link supporting AWS Lambda for GraphQL subscriptions (utilizing AWS API Gateway v2) for `aws-lambda-graphql` package. The difference between this package and [subscriptions-transport-ws](https://github.com/apollographql/subscriptions-transport-ws) is that this package uses different protocol to communicate with the server. Also it support waiting for connection acknowledgment.

**⚠️ This client is not compatible with Apollo's [subscriptions-transport-ws](https://github.com/apollographql/subscriptions-transport-ws)**

## Table of contents

- [Installation](#installation)
- [Usage](#usage)
- [API](#api)
  - [Client](#client)
  - [WebSocketLink](#websocketlink)
- [Examples](#examples)

## Installation

```console
yarn add aws-lambda-ws-link graphql
# or
npm install aws-lambda-ws-link graphql
```

## Usage

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
```

## API

### Client

`aws-lambda-graphql` client implementation. This client uses different protocol than [subscriptions-transport-ws](https://github.com/apollographql/subscriptions-transport-ws).

#### Options

- `uri: string (required)` - websocket endpoint
- `webSockImpl: w3cwebsocket (optional)` - custom websocket implementation, if you want to use this client server side pass compatible WebSocket implementation (for example [`ws`](https://www.npmjs.com/package/ws))
- `options: object (optional)`
  - `lazy: boolean (optional, default false)` - connect to the endpoint only if an operation is sent
  - `operationTimeout: number (optional, default Infinity)` - number of ms to wait for operation result, in case of subscriptions this timeout is ignored. After the timeout is reached the operation fails with an error. If `Infinity` is passed, then operation won't timeout.
  - `reconnect: boolean (optional, default false)` - reconnect automatically if connection is lost.
  - `reconnectAttempts: number (optional, default Infinity)` - how many times should we try to reconnect after connection failed? This property does not have an effect on timed out connections. If `Infinity` is given, then it will try indefinitely. Uses [`exponential backoff`](https://en.wikipedia.org/wiki/Exponential_backoff) for reconnection attempts.

### WebSocketLink

Apollo link implementation. In order to instantiate a link, pass an instance of a `Client` to the `constructor`.

```js
const link = new WebSocketLink(client);
```

## Examples

- [Chat App](https://github.com/michalkvasnicak/aws-lambda-graphql/tree/master/packages/chat-example-app) - React app
- [Chat Server](https://github.com/michalkvasnicak/aws-lambda-graphql/tree/master/packages/chat-example-server)
  - contains AWS Lambda that handles HTTP, WebSocket and DynamoDB streams
  - also includes serverless.yaml file for easy deployment

## License

MIT
