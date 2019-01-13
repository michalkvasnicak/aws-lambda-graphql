import { DesignSystem } from '@napred/browser';
import { ApolloClient } from 'apollo-client';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { Client, WebSocketLink } from 'aws-lambda-ws-link';
import React from 'react';
import { render } from 'react-dom';
import { ApolloProvider } from 'react-apollo';
import { Box, MessageInput, Messages } from './components';

const wsClient = new Client({
  uri: `wss://iz6r1n6jn8.execute-api.eu-central-1.amazonaws.com/development`,
});
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
