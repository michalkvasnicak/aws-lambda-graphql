import {
  // @ts-ignore
  batchWriteMock,
  // @ts-ignore
  batchWritePromiseMock,
  // @ts-ignore
  deletePromiseMock,
  // @ts-ignore
  getPromiseMock,
  // @ts-ignore
  putPromiseMock,
  // @ts-ignore
  queryPromiseMock,
  // @ts-ignore
  transactWriteMock,
  // @ts-ignore
  transactWritePromiseMock,
} from 'aws-sdk';
import { DynamoDBSubscriptionManager } from '../DynamoDBSubscriptionManager';

describe('DynamoDBSubscriptionManager', () => {
  beforeEach(() => {
    batchWriteMock.mockClear();
    batchWritePromiseMock.mockReset();
    deletePromiseMock.mockReset();
    getPromiseMock.mockReset();
    putPromiseMock.mockReset();
    queryPromiseMock.mockReset();
    transactWritePromiseMock.mockReset();
  });

  describe('subscribersByEventName', () => {
    it('works correctly for emty query result', async () => {
      const subscriptionManager = new DynamoDBSubscriptionManager();

      (queryPromiseMock as jest.Mock).mockResolvedValueOnce({ Items: [] });

      let pages = 0;

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const page of subscriptionManager.subscribersByEventName(
        'test',
      )) {
        pages++;
      }

      expect(pages).toBe(0);
      expect(queryPromiseMock).toHaveBeenCalledTimes(1);
    });

    it('works correctly for non emty query result', async () => {
      const subscriptionManager = new DynamoDBSubscriptionManager();

      (queryPromiseMock as jest.Mock).mockResolvedValueOnce({
        Items: [{}],
        LastEvaluatedKey: {},
      });
      (queryPromiseMock as jest.Mock).mockResolvedValueOnce({
        Items: [{}],
        LastEvaluatedKey: {},
      });
      (queryPromiseMock as jest.Mock).mockResolvedValueOnce({
        Items: [{}],
        LastEvaluatedKey: {},
      });
      (queryPromiseMock as jest.Mock).mockResolvedValueOnce({ Items: [] });

      let pages = 0;

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const page of subscriptionManager.subscribersByEventName(
        'test',
      )) {
        pages++;
      }

      expect(pages).toBe(3);
      expect(queryPromiseMock).toHaveBeenCalledTimes(4);
    });
  });

  describe('subscribe', () => {
    it('subscribes correctly', async () => {
      const subscriptionManager = new DynamoDBSubscriptionManager();

      (batchWritePromiseMock as jest.Mock).mockResolvedValueOnce({});

      await expect(
        subscriptionManager.subscribe(
          ['name1'],
          { id: '1' } as any,
          { operationId: '1' } as any,
        ),
      ).resolves.toBeUndefined();

      expect(batchWritePromiseMock).toHaveBeenCalledTimes(1);
      expect(batchWriteMock).toHaveBeenCalledWith(
        expect.objectContaining({
          RequestItems: {
            SubscriptionOperations: [
              {
                PutRequest: {
                  Item: {
                    event: 'name1',
                    subscriptionId: '1:1',
                    ttl: expect.any(Number),
                  },
                },
              },
            ],
            Subscriptions: [
              {
                PutRequest: {
                  Item: {
                    connection: { id: '1' },
                    event: 'name1',
                    operation: { operationId: '1' },
                    operationId: '1',
                    subscriptionId: '1:1',
                    ttl: expect.any(Number),
                  },
                },
              },
            ],
          },
        }),
      );
    });

    it('supports turning off ttl', async () => {
      const subscriptionManager = new DynamoDBSubscriptionManager({
        ttl: false,
      });

      (batchWritePromiseMock as jest.Mock).mockResolvedValueOnce({});

      await expect(
        subscriptionManager.subscribe(
          ['name1'],
          { id: '1' } as any,
          { operationId: '1' } as any,
        ),
      ).resolves.toBeUndefined();

      expect(batchWritePromiseMock).toHaveBeenCalledTimes(1);
      expect(batchWriteMock).not.toHaveBeenCalledWith(
        expect.objectContaining({
          RequestItems: {
            SubscriptionOperations: [
              {
                PutRequest: {
                  Item: {
                    ttl: expect.any(Number),
                  },
                },
              },
            ],
            Subscriptions: [
              {
                PutRequest: {
                  Item: {
                    ttl: expect.any(Number),
                  },
                },
              },
            ],
          },
        }),
      );
    });
  });

  describe('unsubscribe', () => {
    it('unsubscribes correctly', async () => {
      const subscriptionManager = new DynamoDBSubscriptionManager();

      (transactWritePromiseMock as jest.Mock).mockResolvedValueOnce({});

      await expect(
        subscriptionManager.unsubscribe({
          connection: { id: '1' } as any,
          event: 'test',
          operation: {} as any,
          operationId: '1',
        }),
      ).resolves.toBeUndefined();

      expect(transactWritePromiseMock).toHaveBeenCalledTimes(1);
      expect((transactWriteMock as jest.Mock).mock.calls[0][0])
        .toMatchInlineSnapshot(`
        Object {
          "TransactItems": Array [
            Object {
              "Delete": Object {
                "Key": Object {
                  "event": "test",
                  "subscriptionId": "1:1",
                },
                "TableName": "Subscriptions",
              },
            },
            Object {
              "Delete": Object {
                "Key": Object {
                  "subscriptionId": "1:1",
                },
                "TableName": "SubscriptionOperations",
              },
            },
          ],
        }
      `);
    });
  });
});
