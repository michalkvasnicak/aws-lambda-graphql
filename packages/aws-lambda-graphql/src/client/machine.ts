import { Machine } from 'xstate';
import * as services from './services';
import { ClientContext, ClientEvents, ClientStateSchema } from './types';

const clientMachine = Machine<ClientContext, ClientStateSchema, ClientEvents>({
  initial: 'idle',
  states: {
    idle: {
      on: {
        CONNECT: {
          target: 'connecting',
        },
      },
    },
    connecting: {
      invoke: {
        id: 'connect',
        src: services.connect,
        onDone: {
          target: 'connected',
          actions: [services.onConnectSuccess()],
        },
        onError: [
          {
            target: 'connecting',
            cond: context =>
              context.reconnect &&
              (context.backoff as any).attempts <= context.reconnectAttempts,
          },
          { target: 'error' },
        ],
      },
    },
    connected: {
      invoke: {
        id: 'processOperations',
        src: services.processOperations,
      },
      on: {
        // connections has been closed :(
        DISCONNECTED: [
          { target: 'reconnecting', cond: ctx => ctx.reconnect },
          { target: 'error' },
        ],
        DISCONNECT: {
          target: 'disconnecting',
        },
      },
    },
    disconnecting: {
      invoke: {
        id: 'disconnect',
        src: services.disconnect,
        onDone: {
          target: 'idle',
          actions: [services.onDisconnectSuccess()],
        },
        onError: {
          target: 'error',
        },
      },
    },
    reconnecting: {
      invoke: {
        id: 'reconnect',
        src: services.reconnect,
        onDone: {
          target: 'reconnected',
          actions: [services.onReconnectSuccess()],
        },
        onError: {
          target: 'error',
        },
      },
    },
    reconnected: {
      on: {
        // connections has been closed :(
        DISCONNECTED: [
          { target: 'reconnecting', cond: ctx => ctx.reconnect },
          { target: 'error' },
        ],
        DISCONNECT: {
          target: 'disconnecting',
        },
      },
    },
    // on error remove all pending operations and close are open operations
    error: {},
  },
});

export { clientMachine };
export default clientMachine;
