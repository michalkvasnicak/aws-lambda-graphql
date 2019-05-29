import { WebSocket, Server } from 'mock-socket';
import * as services from '../services';

const backoff = {
  duration: jest.fn(),
  reset: jest.fn(),
};
const operationProcessor = {
  start: jest.fn(),
  stop: jest.fn(),
};
const webSockImpl: any = WebSocket;
const uri = 'ws://localhost:8080';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const server = new Server(uri);

describe('services', () => {
  beforeEach(() => {
    backoff.duration.mockReset();
    backoff.reset.mockReset();
    operationProcessor.start.mockReset();
    operationProcessor.stop.mockReset();
  });

  describe('connect service', () => {
    // todo listen to onclose to and throw
    it('resolves on successful connection', async () => {
      const handleMessage = () => {};
      const socket = await services.connect({
        backoff,
        handleMessage,
        webSockImpl,
        uri,
      } as any);

      expect(socket).toBeInstanceOf(WebSocket);
      expect(socket.onerror).toBeFalsy();
      expect(socket.onopen).toBeFalsy();
      expect(socket.onmessage).toEqual([handleMessage]);
      expect(backoff.reset).toHaveBeenCalledTimes(1);
    });

    it('rejects on connection error', async () => {
      await expect(
        services.connect({
          backoff,
          webSockImpl,
          uri: 'ws://localhost:8081',
        } as any),
      ).rejects.toBeDefined();
    });
  });

  describe('onConnectSuccess', () => {
    it('cleans up context', () => {
      const event = { data: {} } as any; // data is socket returned from connect service
      const context = { test: true } as any;
      const action = services.onConnectSuccess();

      expect((action.assignment as any)(context, event)).toEqual({
        test: true,
        socket: {},
      });
    });
  });

  describe('disconnect service', () => {
    it('resolves immediately if there is no socket', async () => {
      await expect(services.disconnect({} as any)).resolves.toBeUndefined();
    });

    it('disconnects socket if there is any', async () => {
      const socket = await services.connect({
        backoff,
        webSockImpl,
        uri,
      } as any);

      await expect(
        services.disconnect({ socket } as any),
      ).resolves.toBeUndefined();

      expect(socket.onerror).toBeFalsy();
      expect(socket.onclose).toBeFalsy();
    });
  });

  describe('onDisconnectSuccess', () => {
    it('cleans up context', () => {
      const context = { test: true, socket: 1 } as any;
      const action = services.onDisconnectSuccess();

      expect((action.assignment as any)(context)).toEqual({
        test: true,
        socket: null,
      });
    });
  });

  describe('reconnect service', () => {
    it('calls connect service after a timeout from backoff', async () => {
      backoff.duration.mockReturnValueOnce(0);

      await expect(
        services.reconnect({
          backoff,
          webSockImpl,
          uri,
        } as any),
      ).resolves.toBeInstanceOf(WebSocket);

      expect(backoff.duration).toHaveBeenCalledTimes(1);
      expect(backoff.reset).toHaveBeenCalledTimes(1);
    });
  });

  describe('processOperations service', () => {
    it('starts operation processor and stops it on clean up', () => {
      const socket = { onclose: null };
      const cbMock = jest.fn();

      const cbService = services.processOperations({
        operationProcessor,
        socket,
      } as any);

      expect(typeof cbService).toBe('function');

      const cleanup = cbService(cbMock);

      expect(typeof cleanup).toBe('function');
      expect(operationProcessor.start).toHaveBeenCalledTimes(1);
      expect(operationProcessor.start).toHaveBeenCalledWith(socket);
      expect(typeof socket.onclose).toBe('function');

      cleanup();

      expect(socket.onclose).toBeUndefined();
      expect(operationProcessor.stop).toHaveBeenCalledTimes(1);
    });

    it('emits DISCONNECTED event if socket is disconnected', () => {
      const socket = { onclose: null };
      const cbMock = jest.fn();

      const cbService = services.processOperations({
        operationProcessor,
        socket,
      } as any);
      cbService(cbMock);

      expect(typeof socket.onclose).toBe('function');

      (socket.onclose as any)({});

      expect(socket.onclose).toBeUndefined();
      expect(cbMock).toHaveBeenCalledTimes(1);
      expect(cbMock).toHaveBeenCalledWith('DISCONNECTED');
    });
  });
});
