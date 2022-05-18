---
title: Test
description: Create a simple GraphQL client to test our service.
---

# Test

🎉 Congratulations you arrived to final section in our getting started guide. Your service is deployed and you received a AWS API Gateway v2 URI in the output of deployment from previous section. You'll need that URI so your first GraphQL client is able to connect to your service.

But firstly, we need few dependencies.

```console
yarn add apollo-link-ws apollo-cache-inmemory apollo-client subscriptions-transport-ws
# or
npm install apollo-link-ws apollo-cache-inmemory apollo-client subscriptions-transport-ws
```

Now with these dependencies in place, we can implement an easy client that connects to our service. Rest is app to you 🙂

```js
import { WebSocketLink } from 'apollo-link-ws';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { ApolloClient } from 'apollo-client';
import { SubscriptionClient } from 'subscriptions-transport-ws';

const wsClient = new SubscriptionClient(
  'ws://localhost:8000', // please provide the uri of the api gateway v2 endpoint
  { lazy: true, reconnect: true },
  null,
  [], // this one is necessary so AWS API Gateway v2 won't error with Sec-WebSocket-Protocol
);
const link = new WebSocketLink(wsClient);
const client = new ApolloClient({
  cache: new InMemoryCache(),
  link,
});
```
