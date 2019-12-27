import { DynamoDBRecord } from 'aws-lambda';
import { DynamoDB } from 'aws-sdk';
import { parse } from 'graphql';
import { $$asyncIterator, createAsyncIterator } from 'iterall';
import { formatMessage } from '../formatMessage';
import { createSchema } from '../fixtures/schema';
import { DynamoDBEventProcessor } from '../DynamoDBEventProcessor';
import { SERVER_EVENT_TYPES } from '../protocol';
import { ISubscriber } from '../types';
import { Server } from '../Server';
import { PubSub } from '../PubSub';

const query = parse(/* GraphQL */ `
  subscription Test($authorId: ID) {
    textFeed(authorId: $authorId)
  }
`);

describe('DynamoDBEventProcessor', () => {
  it('works correctly', async () => {
    const connectionManager = {
      sendToConnection: jest.fn(),
    };
    const subscriptionManager = {
      subscribersByEventName: jest.fn(() => ({
        [$$asyncIterator]: () =>
          createAsyncIterator([
            [
              {
                connection: { id: '1', data: {} } as any,
                event: 'test',
                operationId: '1',
                operation: { query, variables: { authorId: '1' } },
              },
              {
                connection: { id: '2', data: {} } as any,
                event: 'test',
                operationId: '1',
                operation: { query, variables: { authorId: '2' } },
              },
              {
                connection: { id: '3', data: {} } as any,
                event: 'test',
                operationId: '1',
                operation: { query, variables: { authorId: '2' } },
              },
              {
                connection: { id: '4', data: {} } as any,
                event: 'test',
                operationId: '1',
                operation: { query, variables: { authorId: '1' } },
              },
              {
                connection: {
                  id: '5',
                  data: { context: { authorId: '2' } },
                } as any,
                event: 'test',
                operationId: '1',
                operation: { query, variables: {} },
              },
            ] as ISubscriber[],
          ]),
      })),
    };

    const server = new Server({
      context: {
        // becuase our test schema relies on this context
        pubSub: new PubSub({ eventStore: {} as any }),
      },
      connectionManager: connectionManager as any,
      eventProcessor: new DynamoDBEventProcessor(),
      schema: createSchema(),
      subscriptionManager: subscriptionManager as any,
    });
    const eventProcessor = server.createEventHandler();

    const Records: DynamoDBRecord[] = [
      {
        dynamodb: {
          NewImage: DynamoDB.Converter.marshall({
            event: 'test',
            payload: JSON.stringify({ authorId: '1', text: 'test 1' }),
          }) as any,
        },
        eventName: 'INSERT',
      },
      {
        dynamodb: {
          NewImage: DynamoDB.Converter.marshall({
            event: 'test',
            payload: JSON.stringify({ authorId: '2', text: 'test 2' }),
          }) as any,
        },
        eventName: 'INSERT',
      },
    ];

    // now process events
    await eventProcessor({ Records }, {} as any, {} as any);

    expect(connectionManager.sendToConnection).toHaveBeenCalledTimes(5);
    expect(connectionManager.sendToConnection).toHaveBeenCalledWith(
      { id: '1', data: {} },
      formatMessage({
        id: '1',
        payload: { data: { textFeed: 'test 1' } },
        type: SERVER_EVENT_TYPES.GQL_DATA,
      }),
    );
    expect(connectionManager.sendToConnection).toHaveBeenCalledWith(
      { id: '4', data: {} },
      formatMessage({
        id: '1',
        payload: { data: { textFeed: 'test 1' } },
        type: SERVER_EVENT_TYPES.GQL_DATA,
      }),
    );
    expect(connectionManager.sendToConnection).toHaveBeenCalledWith(
      { id: '2', data: {} },
      formatMessage({
        id: '1',
        payload: { data: { textFeed: 'test 2' } },
        type: SERVER_EVENT_TYPES.GQL_DATA,
      }),
    );
    expect(connectionManager.sendToConnection).toHaveBeenCalledWith(
      { id: '3', data: {} },
      formatMessage({
        id: '1',
        payload: { data: { textFeed: 'test 2' } },
        type: SERVER_EVENT_TYPES.GQL_DATA,
      }),
    );
    expect(connectionManager.sendToConnection).toHaveBeenCalledWith(
      { id: '5', data: { context: { authorId: '2' } } },
      formatMessage({
        id: '1',
        payload: { data: { textFeed: 'test 2' } },
        type: SERVER_EVENT_TYPES.GQL_DATA,
      }),
    );
  });
});
