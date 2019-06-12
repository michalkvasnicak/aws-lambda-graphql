import { ApolloLink, Operation } from 'apollo-link';
import { Client } from 'aws-lambda-graphql/dist/client';

class WebSocketLink extends ApolloLink {
  client: Client;

  constructor(client: Client) {
    super();

    this.client = client;
  }

  request(operation: Operation) {
    return this.client.request(operation);
  }
}

export { Client, WebSocketLink };

export default WebSocketLink;
