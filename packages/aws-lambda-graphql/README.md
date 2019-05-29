# AWS Lambda GraphQL Server and Client with subscriptions support

GraphQL server and client implementation for AWS Lambda with WebSocket support (API Gateway v2).

## Installation

```console
npm install aws-lamda-graphql apollo-link graphql graphql-subscriptions
# or
yarn add aws-lambda-graphql apollo-link graphql graphql-subscriptions
```

## Usage

### Implement your simple server using DynamoDB stream as PubSub backend

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
});

// use these handlers from your lambda and map them to
// api gateway v2 and DynamoDB events table
module.exports.consumeWsEvent = wsHandler;
module.exports.consumeDynamoDBStream = eventProcessor;
```

## Examples

- [Chat App](https://github.com/michalkvasnicak/aws-lambda-graphql/tree/master/packages/chat-example-app) - React app
- [Chat Server](https://github.com/michalkvasnicak/aws-lambda-graphql/tree/master/packages/chat-example-server)
  - contains AWS Lambda that handles HTTP, WebSocket and DynamoDB streams
  - also includes serverless.yaml file for easy deployment
