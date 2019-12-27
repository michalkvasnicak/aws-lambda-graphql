import { DesignSystem } from '@napred/browser';
import { ApolloClient } from 'apollo-client';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { WebSocketLink } from 'apollo-link-ws';
import { SubscriptionClient } from 'subscriptions-transport-ws';
import React from 'react';
import { render } from 'react-dom';
import { ApolloProvider } from 'react-apollo';
import { Box, MessageInput, Messages } from './components';

const LAMBDA_WEBSOCKET = process.env.REACT_APP_LAMBA_WEBSOCKET_URI as string;

const wsClient = new SubscriptionClient(
  LAMBDA_WEBSOCKET,
  { lazy: true, reconnect: true },
  null,
  [],
);

const link = new WebSocketLink(wsClient);

const client = new ApolloClient({
  cache: new InMemoryCache(),
  link,
});

function App() {
  return (
    <ApolloProvider client={client}>
      <DesignSystem>
        <Box
          display="flex"
          flexDirection="column"
          height="100vh"
          p={2}
          width="100vw"
        >
          <Messages />
          <MessageInput placeholder="Write a message, press Enter to send" />
        </Box>
      </DesignSystem>
    </ApolloProvider>
  );
}

render(<App />, document.getElementById('root'));
