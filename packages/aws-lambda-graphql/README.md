# aws-lambda-graphql

[![CircleCI](https://img.shields.io/circleci/project/github/michalkvasnicak/aws-lambda-graphql/master.svg?style=flat-square)](https://circleci.com/gh/michalkvasnicak/aws-lambda-graphql)
[![aws-lambda-graphql package version](https://img.shields.io/npm/v/aws-lambda-graphql?color=green&label=aws-lambda-graphql&style=flat-square)](https://www.npmjs.com/package/aws-lambda-graphql)

**⚠️ This documentation is currently for 1.0.0-alpha.X package which supports only [subscriptions-transport-ws](https://github.com/apollographql/subscriptions-transport-ws) and drops the legacy protocol and client support! To use old version that supports legacy protocol and client see the link 0.13.0 below.**

[**📖Documentation for `aws-lambda-graphql0.13.0`**](https://github.com/michalkvasnicak/aws-lambda-graphql/tree/aws-lambda-graphql%400.13.0)

Use [Apollo Server Lambda](https://github.com/apollographql/apollo-server/tree/master/packages/apollo-server-lambda) with GraphQL subscriptions over WebSocket (AWS API Gateway v2).

With this library you can do:

- same things as with [apollo-server-lambda](https://github.com/apollographql/apollo-server/tree/master/packages/apollo-server-lambda) by utiizing AWS API Gateway v1
- GraphQL subscriptions over WebSocket by utilizing AWS API Gateway v2 and [subscriptions-transport-ws](https://github.com/apollographql/subscriptions-transport-ws)

## Table of contents

- [Installation](#installation)
- [Usage](#usage)
- [API](#api)
- [Examples](#examples)

## Installation

```console
yarn add aws-lambda-graphql graphql graphql-subscriptions
# or
npm install aws-lamda-graphql graphql graphql-subscriptions
```

## Usage

There is a [quick start guide](https://github.com/michalkvasnicak/aws-lambda-graphql#quick-start).

## API

### `Server`

Creates an [Apollo Lambda server](https://www.npmjs.com/package/apollo-server-lambda).

#### Options

All options from Apollo Lambda Server and

- **connectionManager** (`IConnectionManager`, `required`)
- **eventProcessor** (`IEventProcessor`, `required`)
- **onError** (`(err: any) => void`, `optional`) - use to log errors from websocket handler on unknown error
- **subscriptionManager** (`ISubscriptionManager`, `required`)
- **subscriptions** (`optional`)
  - **`onConnect(messagePayload: object, connection: IConnection, event: APIGatewayWebSocketEvent, context: LambdaContext): Promise<boolean|object> | object | boolean`** (`optional`) - Return an object to set a context to your connection object saved in the database e.g. for saving authentication details
  - **`onOperation(message: OperationRequest, params: ExecutionParams, connection: IConnection): Promise<ExecutionParams>|ExecutionParams`** (`optional`)
  - **`onOperationComplete(connection: IConnection, operationId: string): void`** (`optional`)
  - **`onDisconnect(connection: IConnection): void`** (`optional`)
  - **waitForInitialization** (`optional`) - if connection is not initialised on GraphQL operation, wait for connection to be initialised or throw prohibited connection error. If `onConnect` is specified then we wait for initialisation otherwise we don't wait. (this is usefull if you're performing authentication in `onConnect`).
    - **retryCount** (`number`, `optional`, `default 10`) - how many times should we try to check the connection state?
    - **timeout** (`number`, `optional`, `default 50ms`) - how long should we wait (in milliseconds) until we try to check the connection state again?

#### `createHttpHandler()`

Creates an AWS Lambda API Gateway v1 handler. Events are handled by [apollo-server-lambda](https://github.com/apollographql/apollo-server/tree/master/packages/apollo-server-lambda)

#### `createWebSocketHandler()`

Creates an AWS Lambda API Gateway v2 handler that supports GraphQL subscriptions over WebSocket.

#### `createEventHandler()`

Creates an AWS Lambda handler for events from events source (for example DynamoDBEventStore). This method internally work with `IEventProcessor`.

### `DynamoDBEventProcessor: IEventProcessor`

AWS Lambda DynamoDB stream handler. DynamoDBEventProcessor is used internally by Server.

#### Options (`optional`)

- **onError** (`(err: any) => void`, `optional`)

### `DynamoDBConnectionManager: IConnectionManager`

`IConnectionManager` implementation that stores information about connections to DynamoDB table, performs communication with them, etc.

Each connection is stored as [`IConnection` object](#iconnection).

#### Options

- **connectionsTable** (`string`, `optional`, `default: 'Connections'`) - name of DynamoDB table used to store connections
- **subscriptions** (`ISubscriptionManager`, `required`) - subscription manager used to register subscriptions for connections.
- **ttl** (`number`, `optional`, `default: 2 hours`)
  - optional TTL for connections set in seconds
  - the value is stored as `ttl` field on the row (you are responsible for enabling TTL on given field)

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
- **ttl** (`number`, `optional`, `default: 2 hours`)
  - optional TTL for subscriptions and subscriptionOperations set in seconds
  - the value is stored as `ttl` field on the row (you are responsible for enabling TTL on given field)

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
