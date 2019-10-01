import gql from 'graphql-tag';
import WebSocket from 'ws';
import { GQLServerAllEvents, LEGACY_SERVER_EVENT_TYPES, Client } from '..';
import {
  execute,
  subscribe,
  waitForClientToConnect,
} from '../fixtures/helpers';
import { TestLambdaServer } from '../fixtures/server';

describe('Client integration test', () => {
  let server: TestLambdaServer;

  beforeEach(async () => {
    server = new TestLambdaServer();

    await server.start();
  });

  afterEach(async () => {
    await server.close();
  });

  describe('connect', () => {
    it('connects to server, receives GQL_CONNECTION_ACK event', done => {
      const client = new Client({
        uri: 'ws://localhost:3001',
        webSockImpl: WebSocket as any,
      });

      client.onMessage((event: GQLServerAllEvents) => {
        if (event.type === LEGACY_SERVER_EVENT_TYPES.GQL_CONNECTION_ACK) {
          done();
        }
      });
    });
  });

  describe('subscriptions', () => {
    it('streams results from a subscription', async () => {
      const client1 = new Client({
        options: {
          operationTimeout: 1000,
        },
        uri: 'ws://localhost:3001',
        webSockImpl: WebSocket as any,
      });

      const client2 = new Client({
        options: {
          operationTimeout: 1000,
        },
        uri: 'ws://localhost:3001',
        webSockImpl: WebSocket as any,
      });

      const w1 = waitForClientToConnect(client1);
      const w2 = waitForClientToConnect(client2);

      await Promise.all([w1, w2]);

      const operation1Iterator = subscribe({
        client: client1,
        // we need to use variables because otherwise we won't be able to use withFilter to filter
        // events that should be sent back to client
        query: gql`
          subscription test($authorId: ID!) {
            textFeed(authorId: $authorId)
          }
        `,
        variables: {
          authorId: '1',
        },
      });
      const operation2Iterator = subscribe({
        client: client2,
        // we need to use variables because otherwise we won't be able to use withFilter to filter
        // events that should be sent back to client
        query: gql`
          subscription test($authorId: ID!) {
            textFeed(authorId: $authorId)
          }
        `,
        variables: {
          authorId: '2',
        },
      });

      // now publish all messages
      await Promise.all(
        [['1', 'Test1'], ['2', 'Test2'], ['1', 'Test3'], ['2', 'Test4']].map(
          ([authorId, text]) =>
            execute({
              client: client1,
              query: gql`
                mutation publish($authorId: ID!, $text: String!) {
                  testPublish(authorId: $authorId, text: $text)
                }
              `,
              variables: {
                authorId,
                text,
              },
            }),
        ),
      );

      // wait for event processor to process events
      await new Promise(r => setTimeout(r, 200));

      expect(operation1Iterator.next()).toEqual({
        done: false,
        value: { data: { textFeed: 'Test1' } },
      });
      expect(operation1Iterator.next()).toEqual({
        done: false,
        value: { data: { textFeed: 'Test3' } },
      });
      expect(operation1Iterator.next()).toEqual({
        done: true,
        value: undefined,
      });

      expect(operation2Iterator.next()).toEqual({
        done: false,
        value: { data: { textFeed: 'Test2' } },
      });
      expect(operation2Iterator.next()).toEqual({
        done: false,
        value: { data: { textFeed: 'Test4' } },
      });
      expect(operation2Iterator.next()).toEqual({
        done: true,
        value: undefined,
      });
    });
  });

  describe('operation', () => {
    it('sends an operation and receives a result (success)', async () => {
      const client = new Client({
        uri: 'ws://localhost:3001',
        webSockImpl: WebSocket as any,
      });

      await waitForClientToConnect(client);

      const result = await execute({
        client,
        query: gql`
          {
            testQuery
          }
        `,
      });

      expect(result).toEqual({ data: { testQuery: 'test' } });
    });

    it('sends an operation and receives a result (failure)', async () => {
      const client = new Client({
        uri: 'ws://localhost:3001',
        webSockImpl: WebSocket as any,
      });

      await waitForClientToConnect(client);

      const result = await execute({
        client,
        query: gql`
          {
            notExisting
          }
        `,
      });

      expect(result.errors).toBeDefined();
    });

    it('sends an operation and fails on timeout', async () => {
      const client = new Client({
        options: {
          operationTimeout: 50,
        },
        uri: 'ws://localhost:3001',
        webSockImpl: WebSocket as any,
      });

      await waitForClientToConnect(client);

      const result = execute({
        client,
        query: gql`
          {
            delayed
          }
        `,
      });

      await expect(result).rejects.toThrow('Timed out');
    });
  });
});
