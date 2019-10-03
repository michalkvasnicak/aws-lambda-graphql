import { DynamoDBRecord } from 'aws-lambda';
import { DynamoDB } from 'aws-sdk';
import { parse } from 'graphql';
import { $$asyncIterator, createAsyncIterator } from 'iterall';
import { formatMessage } from '../formatMessage';
import { createDynamoDBEventProcessor } from '../createDynamoDBEventProcessor';
import { createSchema } from '../fixtures/schema';
import { ISubscriber } from '../types';

const query = parse(/* GraphQL */ `
  subscription Test($authorId: ID!) {
    textFeed(authorId: $authorId)
  }
`);

describe('createDynamoDBEventProcessor', () => {
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
                connection: {
                  id: '4',
                  data: { useLegacyProtocol: true },
                } as any,
                event: 'test',
                operationId: '1',
                operation: { query, variables: { authorId: '1' } },
              },
            ] as ISubscriber[],
          ]),
      })),
    };

    const eventProcessor = createDynamoDBEventProcessor({
      connectionManager: connectionManager as any,
      schema: createSchema(),
      subscriptionManager: subscriptionManager as any,
    });

    const Records: DynamoDBRecord[] = [
      {
        dynamodb: {
          NewImage: DynamoDB.Converter.marshall({
            event: 'test',
            payload: { authorId: '1', text: 'test 1' },
          }) as any,
        },
        eventName: 'INSERT',
      },
      {
        dynamodb: {
          NewImage: DynamoDB.Converter.marshall({
            event: 'test',
            payload: { authorId: '2', text: 'test 2' },
          }) as any,
        },
        eventName: 'INSERT',
      },
    ];

    // now process events
    await eventProcessor({ Records }, {} as any, {} as any);

    expect(connectionManager.sendToConnection).toHaveBeenCalledTimes(4);
    expect(connectionManager.sendToConnection).toHaveBeenCalledWith(
      { id: '1', data: {} },
      formatMessage({
        id: '1',
        payload: { data: { textFeed: 'test 1' } },
        type: 'data',
      }),
    );
    expect(connectionManager.sendToConnection).toHaveBeenCalledWith(
      { id: '4', data: { useLegacyProtocol: true } },
      formatMessage({
        id: '1',
        payload: { data: { textFeed: 'test 1' } },
        type: 'GQL_OP_RESULT',
      }),
    );
    expect(connectionManager.sendToConnection).toHaveBeenCalledWith(
      { id: '1', data: {} },
      formatMessage({
        id: '1',
        payload: { data: { textFeed: 'test 1' } },
        type: 'data',
      }),
    );
    expect(connectionManager.sendToConnection).toHaveBeenCalledWith(
      { id: '2', data: {} },
      formatMessage({
        id: '1',
        payload: { data: { textFeed: 'test 2' } },
        type: 'data',
      }),
    );
    expect(connectionManager.sendToConnection).toHaveBeenCalledWith(
      { id: '3', data: {} },
      formatMessage({
        id: '1',
        payload: { data: { textFeed: 'test 2' } },
        type: 'data',
      }),
    );
  });
});
