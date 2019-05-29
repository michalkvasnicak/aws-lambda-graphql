import Backoff from 'backo2';
import { w3cwebsocket } from 'websocket';
import { StateSchema } from 'xstate';
import { OperationProcessor } from './operationProcessor';

export interface ClientContext {
  backoff: Backoff;
  /**
   * Function to parse messages from server (this will be assigned to socket)
   */
  handleMessage: (event: { data: string }) => any;
  operationProcessor: OperationProcessor;
  reconnect: boolean;
  reconnectAttempts: number;
  /**
   * Current connected socket (this will be assigned by connect service)
   */
  socket?: w3cwebsocket | null;
  /**
   * Socket endpoint
   */
  uri: string;
  /**
   * Web socket implementation to use
   */
  webSockImpl: typeof w3cwebsocket;
}

export interface ClientStateSchema extends StateSchema {
  states: {
    idle: any;
    connecting: any;
    disconnecting: any;
    connected: any;
    reconnecting: any;
    reconnected: any;
    error: any;
  };
}

export type ClientEvents =
  | { type: 'CONNECT' }
  | { type: 'DISCONNECT' }
  | { type: 'DISCONNECTED' };
