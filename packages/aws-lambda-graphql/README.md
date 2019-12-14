# aws-lambda-graphql

[![CircleCI](https://img.shields.io/circleci/project/github/michalkvasnicak/aws-lambda-graphql/master.svg?style=flat-square)](https://circleci.com/gh/michalkvasnicak/aws-lambda-graphql)
[![aws-lambda-graphql package version](https://img.shields.io/npm/v/aws-lambda-graphql?color=green&label=aws-lambda-graphql&style=flat-square)](https://www.npmjs.com/package/aws-lambda-graphql)

GraphQL server and client implementation for AWS Lambda with WebSocket (AWS API Gateway v2) and HTTP support (AWS API Gateway v1).

The server is fully compatible with Apollo's [`subscriptions-transport-ws`](https://github.com/apollographql/subscriptions-transport-ws).

## Table of contents

- [Installation](#installation)
- [Usage](#usage)
- [API](#api)
- [Examples](#examples)

## Installation

```console
yarn add aws-lambda-graphql apollo-link graphql graphql-subscriptions
# or
npm install aws-lamda-graphql apollo-link graphql graphql-subscriptions
```

## Usage

To implement WebSocket event handler and event stream handler please see the [example](https://github.com/michalkvasnicak/aws-lambda-graphql#1-websocket-server-handler).

To implement HTTP event handler please see the [example](https://github.com/michalkvasnicak/aws-lambda-graphql#11-http-server-handler).

## API

### `createDynamoDBEventProcessor(options: Options): event handler function`

Creates an AWS DynamoDB Stream handler.

#### Options

- **connectionManager** (`IConnectionManager`, `required`)
- **context** (`object` or [`Context creator function`](#context-creator-function), `optional`)
- **schema** (`GraphQLSchema`, `required`)
- **subscriptionManager** (`ISubscriptionManager`, `required`)

### `createHttpHandler(options: Options): API Gateway v1 HTTP event handler function`

Creates an AWS API Gateway v1 event handler.

#### Options

- **connectionManager** (`IConnectionManager`, `required`)
- **context** (`object` or [`Context creator function`](#context-creator-function), `optional`)
- **schema** (`GraphQLSchema`, `required`)
- **formatResponse** (`(body: any) => string`, `optional`) - formats response for `body` property of an AWS ApiGateway v1 response. Default is `JSON.stringify`
- **validationRules** (`array of GraphQL validation rules`, `optional`)

### `createWsHandler(options: Options): API Gateway v2 WebSocket event handler function`

Creates an AWS API Gateway v1 event handler.

#### Options

- **connectionManager** (`IConnectionManager`, `required`)
- **context** (`object` or [`Context creator function`](#context-creator-function), `optional`)
- **schema** (`GraphQLSchema`, `required`)
- **subscriptionManager** (`ISubscriptionManager`, `required`)
- **`onConnect(messagePayload: object, connection: IConnection): Promise<boolean|object> | object | boolean`**
- **`onOperation(message: OperationRequest, params: object, connection: IConnection): Promise<object>|object`** (`optional`)
- **`onOperationComplete(connection: IConnection, operationId: string): void`** (`optional`)
- **`onDisconnect(connection: IConnection): void`** (`optional`)
- **validationRules** (`array of GraphQL validation rules`, `optional`)
- **waitForInitialization** (`optional`) - if connection is not initialised on GraphQL operation, wait for connection to be initialised or throw prohibited connection error. If `onConnect` is specified then we wait for initialisation otherwise we don't wait. (this is usefull if you're performing authentication in `onConnect`).
  - **retryCount** (`number`, `optional`, `default 10`) - how many times should we try to check the connection state?
  - **timeout** (`number`, `optional`, `default 50ms`) - how long should we wait (in milliseconds) until we try to check the connection state again?

### `DynamoDBConnectionManager: IConnectionManager`

`IConnectionManager` implementation that stores information about connections to DynamoDB table, performs communication with them, etc.

Each connection is stored as [`IConnection` object](#iconnection).

#### Options

- **connectionsTable** (`string`, `optional`, `default: 'Connections'`) - name of DynamoDB table used to store connections
- **subscriptions** (`ISubscriptionManager`, `required`) - subscription manager used to register subscriptions for connections.

### `DynamoDBEventStore: IEventStore`

`IEventStore` implemenation that used AWS DynamoDB as storage for published events.

#### Options

- **eventsTable** (`string`, `optional`, `default: 'Events'`) - events DynamoDB table name
- **ttl** (`number`, `optional`, `default: 2 hours`)
  - optional TTL for events set in seconds
  - the value is stored as `ttl` field on the row (you are responsible for enabling TTL on given field)

### `DynamoDBSubscriptionManager: ISubscriptionManager`

`ISubscriptionManager` implementation that used AWS DynamoDB as storage for subscriptions.

Stores subscriptions to a subscriptions table as `event: string` and `subscriptionId: string`.Make sure to set up the key schema as `event: HASH` and `subscriptionId: RANGE`.

Stores subscription operations to a subscription operations table as `subscriptionId: string`. Make sure to set up the key schema as `subscriptionId: HASH`.

#### Options

- **subscriptionsTableName** (`string`, `optional`, `default: 'Subscriptions'`)
- **subscriptionOperationsTableName** - (`string`, `optional`, `default: 'SubscriptionOperations'`)

### `IConnection`

- **id: string** - connection id
- **connectionData** [`IConnectionData`](#iconnectiondata)

### `IConnectionData`

- **context** (`object`) - connection context data provided from `GQL_CONNECTION_INIT` or `onConnect`. This data is passed to graphql resolvers' context. All values should be JSON seriablizable.
- **isInitialized** (`boolean`) - is connection initialised? Basically if you use `onConnect` then this value is `false` until the `onConnect` successfully resolves with non `false` value.

### Context creator function

Context creator function accepts [`IContext`](#icontext) and returns an `object` or `Promise` that resolves to an `object`.

### `IContext`

Internal context passed to the [`Context creator function`](#context-creator-function).

**Structure:**

- **event** - AWS Lambda event that invoked the handler
- **lambdaContext** - AWS Lambda handler context
- **\$\$internal** - internal object passed by this library
  - **connection** (`IConnection`) - current connection that invoked the execution or is associated with an operation
  - **connectionManager** (`IConnectionManager`)
  - **operation** (`OperationRequest`) - operation associated with current invokation
  - **pubSub** (`PubSub`) - PubSub instance used by event store
  - **subscriptionManager** (`ISubscriptionManager`)

### `PubSub`

PubSub implementation that publishes events / subscribes to events using underlying event store.

#### Options

- **eventStore: IEventStore** - event store used to publish events / subscribe to events

## Examples

- [Chat App](https://github.com/michalkvasnicak/aws-lambda-graphql/tree/master/packages/chat-example-app) - React app
- [Chat Server](https://github.com/michalkvasnicak/aws-lambda-graphql/tree/master/packages/chat-example-server)
  - contains AWS Lambda that handles HTTP, WebSocket and DynamoDB streams
  - also includes serverless.yaml file for easy deployment
