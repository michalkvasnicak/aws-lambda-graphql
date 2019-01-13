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

      function onOpen() {
        // reset backoff
        backoff.reset();

        socket.onopen = null;
        socket.onerror = null;
        resolve(socket);
      }

      function onError(err: Error) {
        socket.onopen = null;
        socket.onerror = null;
        reject(err);
      }

      socket.onerror = onError;
      socket.onopen = onOpen;
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
  return assign((ctx, event) => ({ ...ctx, socket: event.data }));
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
        return resolve();
      }

      function onClose() {
        socket.onerror = null;
        socket.onclose = null;
        resolve();
      }

      function onError(err: Error) {
        socket.onerror = null;
        socket.onclose = null;
        reject(err);
      }

      socket.onclose = onClose;
      socket.onerror = onError;

      // disconnect socket
      socket.close();
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
    operationProcessor.start(socket);

    function onClose() {
      socket.onclose = null;
      operationProcessor.stop();
      callback('DISCONNECTED'); // this will trigger reconnect or error
    }

    // register to connection close
    socket.onclose = onClose;

    return () => {
      operationProcessor.stop();
      socket.onclose = null;
    };
  };
}
