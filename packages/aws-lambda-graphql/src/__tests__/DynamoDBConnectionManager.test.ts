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
  putMock,
  // @ts-ignore
  putPromiseMock,
} from 'aws-sdk';
import DynamoDBConnectionManager, {
  ConnectionNotFoundError,
} from '../DynamoDBConnectionManager';

describe('DynamoDBConnectionManager', () => {
  beforeEach(() => {
    deleteMock.mockClear();
    getMock.mockClear();
    postToConnectionMock.mockClear();
    putMock.mockClear();
    deletePromiseMock.mockReset();
    getPromiseMock.mockReset();
    postToConnectionPromiseMock.mockReset();
    putPromiseMock.mockReset();
  });

  describe('registerConnection', () => {
    it('registers connection by its connectionId and returns a Connection', async () => {
      const manager = new DynamoDBConnectionManager();

      await expect(
        manager.registerConnection({ connectionId: 'id', endpoint: '' }),
      ).resolves.toEqual({
        id: 'id',
        data: {
          endpoint: '',
        },
      });

      expect(putMock as jest.Mock).toHaveBeenCalledTimes(1);
    });
  });

  describe('hydrateConnection', () => {
    const manager = new DynamoDBConnectionManager();

    it('throws ConnectionNotFoundError if connection is not registered', async () => {
      (getPromiseMock as jest.Mock).mockResolvedValueOnce({ Item: null });

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
  });

  describe('sendToConnection', () => {
    const manager = new DynamoDBConnectionManager();

    it('unregisters connection if it is stale', async () => {
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
    const manager = new DynamoDBConnectionManager();

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
});
