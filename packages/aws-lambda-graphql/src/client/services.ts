import { actions, Sender } from 'xstate';
import { w3cwebsocket } from 'websocket';
import { ClientContext, ClientEvents } from './types';

const { assign } = actions;

export function connect({
  backoff,
  handleMessage,
  uri,
  webSockImpl,
}: ClientContext): Promise<w3cwebsocket> {
  return new Promise((resolve, reject) => {
    try {
      const socket = new webSockImpl(uri);

      socket.onerror = err => {
        socket!.onopen = undefined as any;
        socket!.onerror = undefined as any;
        reject(err);
      };
      socket.onopen = () => {
        // reset backoff
        backoff.reset();

        socket!.onopen = undefined as any;
        socket!.onerror = undefined as any;
        resolve(socket);
      };
      socket.onmessage = handleMessage;
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * After connection is successful assign returned socket to context
 */
export function onConnectSuccess() {
  return assign<any>((ctx, event) => ({ ...ctx, socket: event.data }));
}

export async function reconnect(context: ClientContext): Promise<w3cwebsocket> {
  // wait for backoff
  const duration = context.backoff.duration();

  await new Promise(r => setTimeout(r, duration));

  return connect(context);
}

export const onReconnectSuccess = onConnectSuccess;

export function disconnect({ socket }: ClientContext): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      if (socket == null) {
        resolve();
      } else {
        /* eslint-disable no-param-reassign */
        socket.onclose = () => {
          socket!.onerror = undefined as any;
          socket!.onclose = undefined as any;
          resolve();
        };
        socket.onerror = err => {
          socket!.onerror = undefined as any;
          socket!.onclose = undefined as any;
          reject(err);
        };
        /* eslint-enable no-param-reassign */

        // disconnect socket
        socket.close();
      }
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Removes socket on successful disconnect
 */
export function onDisconnectSuccess() {
  return assign<ClientContext>(ctx => ({ ...ctx, socket: null }));
}

/**
 * Processes operations (basically this runs only if client is connected)
 */
export function processOperations({
  operationProcessor,
  socket,
}: ClientContext) {
  return (callback: Sender<ClientEvents>) => {
    // start operation processor
    operationProcessor.start(socket!);

    // register to connection close
    // eslint-disable-next-line no-param-reassign
    socket!.onclose = () => {
      // eslint-disable-next-line no-param-reassign
      socket!.onclose = undefined as any;
      operationProcessor.stop();
      callback('DISCONNECTED'); // this will trigger reconnect or error
    };

    return () => {
      operationProcessor.stop();
      // eslint-disable-next-line no-param-reassign
      socket!.onclose = undefined as any;
    };
  };
}
