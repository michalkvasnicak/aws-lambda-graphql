import {
  // @ts-ignore
  batchWriteMock,
  // @ts-ignore
  batchWritePromiseMock,
  // @ts-ignore
  deleteMock,
  // @ts-ignore
  deletePromiseMock,
  // @ts-ignore
  getPromiseMock,
  // @ts-ignore
  putPromiseMock,
  // @ts-ignore
  queryPromiseMock,
} from 'aws-sdk';
import DynamoDBSubscriptionManager from '../DynamoDBSubscriptionManager';

describe('DynamoDBSubscriptionManager', () => {
  beforeEach(() => {
    batchWriteMock.mockClear();
    batchWritePromiseMock.mockReset();
    deletePromiseMock.mockReset();
    getPromiseMock.mockReset();
    putPromiseMock.mockReset();
    queryPromiseMock.mockReset();
  });

  describe('subscribersByEventName', () => {
    it('works correctly for emty query result', async () => {
      const subscriptionManager = new DynamoDBSubscriptionManager();

      (queryPromiseMock as jest.Mock).mockResolvedValueOnce({ Items: [] });

      let pages = 0;

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
          ['name1', 'name2'],
          { id: '1' } as any,
          { operationId: '1' } as any,
        ),
      ).resolves.toBeUndefined();

      expect(batchWritePromiseMock).toHaveBeenCalledTimes(1);
      expect((batchWriteMock as jest.Mock).mock.calls[0][0])
        .toMatchInlineSnapshot(`
Object {
  "RequestItems": Object {
    "Subscriptions": Array [
      Object {
        "PutRequest": Object {
          "Item": Object {
            "connection": Object {
              "id": "1",
            },
            "event": "name1",
            "operation": Object {
              "operationId": "1",
            },
            "operationId": "1",
            "subscriptionId": "1:1",
          },
        },
      },
      Object {
        "PutRequest": Object {
          "Item": Object {
            "connection": Object {
              "id": "1",
            },
            "event": "name2",
            "operation": Object {
              "operationId": "1",
            },
            "operationId": "1",
            "subscriptionId": "1:1",
          },
        },
      },
    ],
  },
}
`);
    });
  });

  describe('unsubscribe', () => {
    it('unsubscribes correctly', async () => {
      const subscriptionManager = new DynamoDBSubscriptionManager();

      (deletePromiseMock as jest.Mock).mockResolvedValueOnce({});

      await expect(
        subscriptionManager.unsubscribe({
          connection: { id: '1' } as any,
          event: 'test',
          operation: {} as any,
          operationId: '1',
        }),
      ).resolves.toBeUndefined();

      expect(deletePromiseMock).toHaveBeenCalledTimes(1);
      expect((deleteMock as jest.Mock).mock.calls[0][0]).toEqual(
        expect.objectContaining({
          Key: {
            event: 'test',
            subscriptionId: '1:1',
          },
        }),
      );
    });
  });
});
