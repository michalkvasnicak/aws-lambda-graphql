import { RedisSubscriptionManager } from '../RedisSubscriptionManager';

describe('RedisSubscriptionManager', () => {
  const redisClient = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    lrange: jest.fn(),
    lpush: jest.fn(),
    lrem: jest.fn(),
    mget: jest.fn(),
  };
  beforeEach(() => {
    // eslint-disable-next-line guard-for-in
    for (const key in redisClient) {
      (redisClient[key] as jest.Mock).mockReset();
    }
  });

  describe('subscribersByEventName', () => {
    it('works correctly for emty query result', async () => {
      const subscriptionManager = new RedisSubscriptionManager({ redisClient });

      (redisClient.lrange as jest.Mock).mockResolvedValueOnce([]);

      let pages = 0;

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const page of subscriptionManager.subscribersByEvent({
        event: 'test',
        payload: '',
      })) {
        pages++;
      }

      expect(pages).toBe(0);
      expect(redisClient.lrange).toHaveBeenCalledTimes(1);
    });

    it('works correctly for non emty query result', async () => {
      const subscriptionManager = new RedisSubscriptionManager({ redisClient });

      (redisClient.lrange as jest.Mock).mockResolvedValueOnce([{}]);
      (redisClient.lrange as jest.Mock).mockResolvedValueOnce([{}]);
      (redisClient.lrange as jest.Mock).mockResolvedValueOnce([{}]);
      (redisClient.lrange as jest.Mock).mockResolvedValueOnce([]);
      (redisClient.mget as jest.Mock).mockResolvedValueOnce([]);
      (redisClient.mget as jest.Mock).mockResolvedValueOnce([]);
      (redisClient.mget as jest.Mock).mockResolvedValueOnce([]);

      let pages = 0;

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const page of subscriptionManager.subscribersByEvent({
        event: 'test',
        payload: '',
      })) {
        pages++;
      }

      expect(pages).toBe(3);
      expect(redisClient.lrange).toHaveBeenCalledTimes(4);
      expect(redisClient.mget).toHaveBeenCalledTimes(3);
    });
  });

  describe('subscribe', () => {
    it('subscribes correctly', async () => {
      const subscriptionManager = new RedisSubscriptionManager({ redisClient });

      await expect(
        subscriptionManager.subscribe(
          ['name1'],
          { id: '1' } as any,
          { operationId: '1' } as any,
        ),
      ).resolves.toBeUndefined();

      expect(redisClient.set).toHaveBeenCalledTimes(2);
      expect(redisClient.lpush).toHaveBeenCalledTimes(2);

      expect((redisClient.set as jest.Mock).mock.calls[0]).toEqual([
        'aws-lambda-graphql:subscription:1:1:{name1}',
        JSON.stringify({
          connection: {
            id: '1',
          },
          operation: {
            operationId: '1',
          },
          event: 'name1',
          subscriptionId: '1:1',
          operationId: '1',
        }),
      ]);
      expect((redisClient.set as jest.Mock).mock.calls[1]).toEqual([
        'aws-lambda-graphql:subscriptionOperation:1:1',
        'name1',
      ]);
      expect((redisClient.lpush as jest.Mock).mock.calls[0]).toEqual([
        'aws-lambda-graphql:eventSubscriptionsList:name1',
        'aws-lambda-graphql:subscription:1:1:{name1}',
      ]);
      expect((redisClient.lpush as jest.Mock).mock.calls[1]).toEqual([
        'aws-lambda-graphql:connectionSubscriptionsList:1',
        'aws-lambda-graphql:subscription:1:1:{name1}',
      ]);
    });
  });

  describe('unsubscribeOperation', () => {
    it('unsubscribes correctly', async () => {
      const subscriptionManager = new RedisSubscriptionManager({ redisClient });

      (redisClient.get as jest.Mock).mockResolvedValueOnce('test');
      (redisClient.get as jest.Mock).mockResolvedValueOnce(
        JSON.stringify({
          event: 'test',
          connection: {
            id: '1',
          },
        }),
      );

      await expect(
        subscriptionManager.unsubscribeOperation('1', '1'),
      ).resolves.toBeUndefined();

      expect(redisClient.del).toHaveBeenCalledTimes(2);
      expect(redisClient.lrem).toHaveBeenCalledTimes(2);

      expect((redisClient.del as jest.Mock).mock.calls[0]).toEqual([
        'aws-lambda-graphql:subscriptionOperation:1:1',
      ]);
      expect((redisClient.del as jest.Mock).mock.calls[1]).toEqual([
        'aws-lambda-graphql:subscription:1:1:{test}',
      ]);
      expect((redisClient.lrem as jest.Mock).mock.calls[0]).toEqual([
        'aws-lambda-graphql:eventSubscriptionsList:test',
        0,
        'aws-lambda-graphql:subscription:1:1:{test}',
      ]);
      expect((redisClient.lrem as jest.Mock).mock.calls[1]).toEqual([
        'aws-lambda-graphql:connectionSubscriptionsList:1',
        0,
        'aws-lambda-graphql:subscription:1:1:{test}',
      ]);
    });
  });
});
