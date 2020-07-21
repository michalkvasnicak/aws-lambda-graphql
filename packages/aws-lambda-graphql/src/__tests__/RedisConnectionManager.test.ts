import {
  // @ts-ignore
  postToConnectionPromiseMock,
  // @ts-ignore
  deleteConnectionPromiseMock,
} from 'aws-sdk';
import { RedisConnectionManager } from '../RedisConnectionManager';
import { ConnectionNotFoundError } from '../errors';

const subscriptionManager: any = {
  unsubscribeAllByConnectionId: jest.fn(),
};

describe('RedisConnectionManager', () => {
  const redisClient = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(() => {
    // eslint-disable-next-line guard-for-in
    for (const key in redisClient) {
      (redisClient[key] as jest.Mock).mockReset();
    }
    postToConnectionPromiseMock.mockReset();
    deleteConnectionPromiseMock.mockReset();
    subscriptionManager.unsubscribeAllByConnectionId.mockReset();
  });

  describe('registerConnection', () => {
    it('registers connection by its connectionId and returns a Connection', async () => {
      const manager = new RedisConnectionManager({
        subscriptions: subscriptionManager,
        redisClient,
      });

      await expect(
        manager.registerConnection({ connectionId: 'id', endpoint: '' }),
      ).resolves.toEqual({
        id: 'id',
        data: {
          endpoint: '',
          context: {},
          isInitialized: false,
        },
      });

      expect(redisClient.set as jest.Mock).toHaveBeenCalledTimes(1);
    });
  });

  describe('hydrateConnection', () => {
    const manager = new RedisConnectionManager({
      subscriptions: subscriptionManager,
      redisClient,
    });

    it('throws ConnectionNotFoundError if connection is not registered', async () => {
      (redisClient.get as jest.Mock).mockResolvedValueOnce(null);

      await expect(manager.hydrateConnection('id')).rejects.toThrowError(
        ConnectionNotFoundError,
      );

      expect(redisClient.get as jest.Mock).toHaveBeenCalledTimes(1);
    });

    it('hydrates connection', async () => {
      (redisClient.get as jest.Mock).mockResolvedValueOnce(
        JSON.stringify({
          id: 'id',
          data: { endpoint: '' },
        }),
      );

      await expect(manager.hydrateConnection('id')).resolves.toEqual({
        id: 'id',
        data: {
          endpoint: '',
        },
      });

      expect(redisClient.get as jest.Mock).toHaveBeenCalledTimes(1);
    });
  });

  describe('setConnectionData', () => {
    const manager = new RedisConnectionManager({
      subscriptions: subscriptionManager,
      redisClient,
    });

    it('updates connection data', async () => {
      await expect(
        manager.setConnectionData({}, { id: 'id', data: {} }),
      ).resolves.toBeUndefined();
      expect(redisClient.set as jest.Mock).toHaveBeenCalledTimes(1);
    });
  });

  describe('sendToConnection', () => {
    const manager = new RedisConnectionManager({
      subscriptions: subscriptionManager,
      redisClient,
    });

    it('unregisters connection and all subscriptions if it is stale', async () => {
      const err = new Error();
      (err as any).statusCode = 410;

      (postToConnectionPromiseMock as jest.Mock).mockRejectedValueOnce(err);

      await expect(
        manager.sendToConnection(
          { id: 'id', data: { endpoint: '' } },
          'stringified data',
        ),
      ).resolves.toBeUndefined();

      expect(postToConnectionPromiseMock).toHaveBeenCalledTimes(1);
      expect(redisClient.del as jest.Mock).toHaveBeenCalledTimes(1);
      expect(
        subscriptionManager.unsubscribeAllByConnectionId,
      ).toHaveBeenCalledTimes(1);
      expect(
        subscriptionManager.unsubscribeAllByConnectionId,
      ).toHaveBeenCalledWith('id');
    });

    it('throws error if unknown error happens', async () => {
      const err = new Error('Unknown error');

      (postToConnectionPromiseMock as jest.Mock).mockRejectedValueOnce(err);

      await expect(
        manager.sendToConnection(
          { id: 'id', data: { endpoint: '' } },
          'stringified data',
        ),
      ).rejects.toThrowError(err);

      expect(postToConnectionPromiseMock).toHaveBeenCalledTimes(1);
      expect(redisClient.del as jest.Mock).not.toHaveBeenCalled();
    });

    it('sends data to connection', async () => {
      (postToConnectionPromiseMock as jest.Mock).mockResolvedValueOnce({});

      await expect(
        manager.sendToConnection(
          { id: 'id', data: { endpoint: '' } },
          'stringified data',
        ),
      ).resolves.toBeUndefined();

      expect(postToConnectionPromiseMock).toHaveBeenCalledTimes(1);
      expect(redisClient.del as jest.Mock).not.toHaveBeenCalled();
    });
  });

  describe('unregisterConnection', () => {
    const manager = new RedisConnectionManager({
      subscriptions: subscriptionManager,
      redisClient,
    });

    it('deletes connection', async () => {
      (redisClient.del as jest.Mock).mockResolvedValueOnce({
        Item: { id: 'id', data: {} },
      });

      await expect(
        manager.unregisterConnection({ id: 'id', data: {} }),
      ).resolves.toBeUndefined();

      expect(redisClient.del as jest.Mock).toHaveBeenCalledTimes(1);
    });
  });

  describe('closeConnection', () => {
    const manager = new RedisConnectionManager({
      subscriptions: subscriptionManager,
      redisClient,
    });
    it('closes connection', async () => {
      await expect(
        manager.closeConnection({ id: 'id', data: {} }),
      ).resolves.toBeUndefined();
      expect(deleteConnectionPromiseMock).toHaveBeenCalledTimes(1);
    });
  });
});
