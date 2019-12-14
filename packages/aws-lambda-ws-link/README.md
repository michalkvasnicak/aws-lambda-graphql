# Apollo WebSocket link for AWS Lambda subscriptions

Apollo WebSocket link supporting AWS Lambda for GraphQL subscriptions (utilizing AWS API Gateway v2) for `aws-lambda-graphql` package.

**⚠️ This client is not compatible with [subscription-transport-ws](https://github.com/apollographql/subscriptions-transport-ws)**

## Installation

```console
yarn add aws-lambda-ws-link graphql
# or
npm install aws-lambda-ws-link graphql
```

## Usage

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

- [Chat App](https://github.com/michalkvasnicak/aws-lambda-graphql/tree/master/packages/chat-example-app) - React app
- [Chat Server](https://github.com/michalkvasnicak/aws-lambda-graphql/tree/master/packages/chat-example-server)
  - contains AWS Lambda that handles HTTP, WebSocket and DynamoDB streams
  - also includes serverless.yaml file for easy deployment
