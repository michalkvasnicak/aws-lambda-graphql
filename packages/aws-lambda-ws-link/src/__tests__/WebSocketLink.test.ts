import ApolloClient from 'apollo-client';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { waitForClientToConnect } from 'aws-lambda-graphql/dist/fixtures/helpers';
import { TestLambdaServer } from 'aws-lambda-graphql/dist/fixtures/server';
import gql from 'graphql-tag';
import WebSocket from 'ws';
import { Client, WebSocketLink } from '../WebSocketLink';

describe('WebSocketLink', () => {
  let server: TestLambdaServer;

  beforeEach(async () => {
    server = new TestLambdaServer({ port: 3002 });

    await server.start();
  });

  afterEach(async () => {
    await server.close();
  });

  it('works correctly', async () => {
    const wsClient = new Client({
      uri: 'ws://localhost:3002',
      webSockImpl: WebSocket as any,
    });

    await waitForClientToConnect(wsClient as any);

    const link = new WebSocketLink(wsClient);

    const client = new ApolloClient({
      link,
      cache: new InMemoryCache(),
    });

    await expect(
      client.query({
        query: gql`
          query Test {
            testQuery
          }
        `,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        data: { testQuery: 'test' },
      }),
    );

    const events = [];

    client
      .subscribe({
        query: gql`
          subscription Test($authorId: ID!) {
            textFeed(authorId: $authorId)
          }
        `,
        variables: {
          authorId: '1',
        },
      })
      .subscribe({
        next(event) {
          events.push(event);
        },
        complete() {
          events.push(new Error('Subscription cannot be done'));
        },
        error(err) {
          events.push(err);
        },
      });

    // now publish some messages
    await Promise.all([
      client.mutate({
        mutation: gql`
          mutation Test($authorId: ID!, $text: String!) {
            testPublish(authorId: $authorId, text: $text)
          }
        `,
        variables: {
          authorId: 1,
          text: 'Test 1',
        },
      }),
      client.mutate({
        mutation: gql`
          mutation Test($authorId: ID!, $text: String!) {
            testPublish(authorId: $authorId, text: $text)
          }
        `,
        variables: {
          authorId: 2,
          text: 'Test 2',
        },
      }),
      client.mutate({
        mutation: gql`
          mutation Test($authorId: ID!, $text: String!) {
            testPublish(authorId: $authorId, text: $text)
          }
        `,
        variables: {
          authorId: 1,
          text: 'Test 3',
        },
      }),
    ]);

    await new Promise(r => setTimeout(r, 200));

    expect(events).toEqual([
      { data: { textFeed: 'Test 1' } },
      { data: { textFeed: 'Test 3' } },
    ]);
  });
});
