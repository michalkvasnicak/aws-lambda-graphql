import {
  // @ts-ignore
  deleteMock,
  // @ts-ignore
  deletePromiseMock,
  // @ts-ignore
  getMock,
  // @ts-ignore
  getPromiseMock,
  // @ts-ignore
  postToConnectionMock,
  // @ts-ignore
  postToConnectionPromiseMock,
  // @ts-ignore
  deleteConnectionMock,
  // @ts-ignore
  deleteConnectionPromiseMock,
  // @ts-ignore
  putMock,
  // @ts-ignore
  putPromiseMock,
  // @ts-ignore
  updateMock,
  // @ts-ignore
  updatePromiseMock,
} from 'aws-sdk';
import { DynamoDBConnectionManager } from '../DynamoDBConnectionManager';
import { ConnectionNotFoundError } from '../errors';
import { computeTTL } from '../helpers';

const subscriptionManager: any = {
  unsubscribeAllByConnectionId: jest.fn(),
};

describe('DynamoDBConnectionManager', () => {
  beforeEach(() => {
    deleteMock.mockClear();
    getMock.mockClear();
    postToConnectionMock.mockClear();
    deleteConnectionMock.mockClear();
    putMock.mockClear();
    deletePromiseMock.mockReset();
    getPromiseMock.mockReset();
    postToConnectionPromiseMock.mockReset();
    deleteConnectionPromiseMock.mockReset();
    putPromiseMock.mockReset();
    subscriptionManager.unsubscribeAllByConnectionId.mockReset();
    updatePromiseMock.mockReset();
  });

  describe('registerConnection', () => {
    it('registers connection by its connectionId and returns a Connection', async () => {
      const manager = new DynamoDBConnectionManager({
        subscriptions: subscriptionManager,
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

      expect(putMock as jest.Mock).toHaveBeenCalledTimes(1);
      expect(putMock).toHaveBeenCalledWith(
        expect.objectContaining({
          Item: {
            createdAt: expect.any(String),
            data: {
              context: {},
              endpoint: '',
              isInitialized: false,
            },
            id: 'id',
            ttl: expect.any(Number),
          },
          TableName: 'Connections',
        }),
      );
    });

    it('supports turning off ttl', async () => {
      const manager = new DynamoDBConnectionManager({
        subscriptions: subscriptionManager,
        ttl: false,
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

      expect(putMock as jest.Mock).toHaveBeenCalledTimes(1);
      expect(putMock).not.toHaveBeenCalledWith(
        expect.objectContaining({
          Item: {
            ttl: expect.any(Number),
          },
          TableName: 'Connections',
        }),
      );
    });
  });

  describe('hydrateConnection', () => {
    const manager = new DynamoDBConnectionManager({
      subscriptions: subscriptionManager,
    });

    it('throws ConnectionNotFoundError if connection is not registered', async () => {
      (getPromiseMock as jest.Mock).mockResolvedValueOnce({ Item: null });

      await expect(manager.hydrateConnection('id')).rejects.toThrowError(
        ConnectionNotFoundError,
      );

      expect(getMock as jest.Mock).toHaveBeenCalledTimes(1);
    });

    it('throws ConnectionNotFoundError if connection is expired', async () => {
      (getPromiseMock as jest.Mock).mockResolvedValueOnce({
        Item: { ttl: computeTTL(-10) },
      });

      await expect(manager.hydrateConnection('id')).rejects.toThrowError(
        ConnectionNotFoundError,
      );

      expect(getMock as jest.Mock).toHaveBeenCalledTimes(1);
    });

    it('hydrates connection', async () => {
      (getPromiseMock as jest.Mock).mockResolvedValueOnce({
        Item: { id: 'id', data: { endpoint: '' } },
      });

      await expect(manager.hydrateConnection('id')).resolves.toEqual({
        id: 'id',
        data: {
          endpoint: '',
        },
      });

      expect(getMock as jest.Mock).toHaveBeenCalledTimes(1);
    });

    it('hydrates connection with retry', async () => {
      (getPromiseMock as jest.Mock)
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({
          Item: { id: 'id', data: { endpoint: '' } },
        });

      await expect(
        manager.hydrateConnection('id', { retryCount: 1 }),
      ).resolves.toEqual({
        id: 'id',
        data: {
          endpoint: '',
        },
      });

      expect(getMock as jest.Mock).toHaveBeenCalledTimes(2);
    });
  });

  describe('setConnectionData', () => {
    const manager = new DynamoDBConnectionManager({
      subscriptions: subscriptionManager,
    });

    it('updates connection data', async () => {
      await expect(
        manager.setConnectionData({}, { id: 'id', data: {} }),
      ).resolves.toBeUndefined();
      expect(updateMock as jest.Mock).toHaveBeenCalledTimes(1);
    });
  });

  describe('sendToConnection', () => {
    const manager = new DynamoDBConnectionManager({
      subscriptions: subscriptionManager,
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
      expect(deletePromiseMock as jest.Mock).toHaveBeenCalledTimes(1);
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
      expect(deletePromiseMock as jest.Mock).not.toHaveBeenCalled();
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
      expect(deletePromiseMock as jest.Mock).not.toHaveBeenCalled();
    });
  });

  describe('unregisterConnection', () => {
    const manager = new DynamoDBConnectionManager({
      subscriptions: subscriptionManager,
    });

    it('deletes connection', async () => {
      (deletePromiseMock as jest.Mock).mockResolvedValueOnce({
        Item: { id: 'id', data: {} },
      });

      await expect(
        manager.unregisterConnection({ id: 'id', data: {} }),
      ).resolves.toBeUndefined();

      expect(deletePromiseMock as jest.Mock).toHaveBeenCalledTimes(1);
    });
  });

  describe('closeConnection', () => {
    const manager = new DynamoDBConnectionManager({
      subscriptions: subscriptionManager,
    });
    it('closes connection', async () => {
      await expect(
        manager.closeConnection({ id: 'id', data: {} }),
      ).resolves.toBeUndefined();
      expect(deleteConnectionPromiseMock).toHaveBeenCalledTimes(1);
    });
  });
});
