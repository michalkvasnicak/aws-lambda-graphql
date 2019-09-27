import Backoff from 'backo2';
import * as EventEmitter from 'eventemitter3';
import { interpret, Interpreter } from 'xstate/lib/interpreter';
import { w3cwebsocket } from 'websocket';
import {
  GQLServerAllEvents,
  GQLOperationResult,
  SERVER_EVENT_TYPES,
} from '../protocol';
import { OperationRequest } from '../types';
import { clientMachine } from './machine';
import { OperationProcessor } from './operationProcessor';
import { ClientContext, ClientEvents, ClientStateSchema } from './types';

declare let window: any;
const globalRef: any =
  typeof global !== 'undefined'
    ? global
    : typeof window !== 'undefined'
    ? window
    : {};
const NativeWebSocket = globalRef.WebSocket || globalRef.MozWebSocket;

type Options = {
  options?: {
    lazy?: boolean;
    /**
     * Number of ms to wait for operation result (in case of subscriptions this is ignored)
     * 0/Infinity is the same
     */
    operationTimeout?: number;
    reconnect?: boolean;
    /**
     * How many times we should try to reconnect after connection failed?
     * This property does not have an effect on timed out connections.
     * If Infinity is given, then it is inifinite
     */
    reconnectAttempts?: number;
  };
  /**
   * Web socket endpoint
   */
  uri: string;
  webSockImpl?: w3cwebsocket;
};

class Client {
  private machine: Interpreter<ClientContext, ClientStateSchema, ClientEvents>;

  private lazy: boolean;

  private ee: EventEmitter<any>;

  private operationProcessor: OperationProcessor;

  constructor({
    uri,
    options: {
      lazy = false,
      operationTimeout = Infinity,
      reconnect = false,
      reconnectAttempts = Infinity,
    } = {},
    webSockImpl = NativeWebSocket,
  }: Options) {
    const backoff = new Backoff({ jitter: 0.5 });

    if (webSockImpl == null) {
      throw new Error(
        'Not native WebSocket implementation detected, please provide an implementation',
      );
    }

    this.lazy = lazy;
    this.ee = new EventEmitter.EventEmitter() as any;
    this.operationProcessor = new OperationProcessor({ operationTimeout });
    this.machine = interpret(
      clientMachine.withContext({
        backoff,
        reconnect,
        reconnectAttempts,
        uri,
        handleMessage: this.handleMessage,
        operationProcessor: this.operationProcessor,
        webSockImpl: webSockImpl as any,
      }),
    ).start();

    this.machine.onTransition(state => {
      this.ee.emit(state.value as string, (state.event as any).data);
    });

    if (!this.lazy) {
      this.machine.send('CONNECT');
    }
  }

  public disconnect = () => {
    this.machine.send('DISCONNECT');
  };

  public request(operation: OperationRequest) {
    if (this.lazy) {
      this.machine.send('CONNECT'); // if client is already connected, this won't do anything
    }

    return this.operationProcessor.execute(operation);
  }

  public get status(): keyof ClientStateSchema['states'] {
    return this.machine.state.value as any;
  }

  public on = (
    event:
      | 'connecting'
      | 'connected'
      | 'disconnected'
      | 'error'
      | 'message'
      | 'reconnecting'
      | 'reconnected',
    listener: EventEmitter.ListenerFn,
  ): Function => {
    this.ee.on(event, listener);

    return () => this.ee.off(event, listener);
  };

  public onConnecting = (listener: EventEmitter.ListenerFn): Function =>
    this.on('connecting', listener);

  public onConnected = (listener: EventEmitter.ListenerFn): Function =>
    this.on('connected', listener);

  public onDisconnected = (listener: EventEmitter.ListenerFn): Function =>
    this.on('disconnected', listener);

  public onError = (listener: EventEmitter.ListenerFn): Function =>
    this.on('error', listener);

  public onMessage = (listener: EventEmitter.ListenerFn): Function =>
    this.on('message', listener);

  public onReconnecting = (listener: EventEmitter.ListenerFn): Function =>
    this.on('reconnecting', listener);

  public onReconnected = (listener: EventEmitter.ListenerFn): Function =>
    this.on('reconnected', listener);

  private handleMessage = (event: { data: string }) => {
    try {
      const message: GQLServerAllEvents = JSON.parse(event.data);

      switch (message.type) {
        case SERVER_EVENT_TYPES.GQL_DATA: {
          this.operationProcessor.processOperationResult(
            message as GQLOperationResult,
          );
          break;
        }
        case SERVER_EVENT_TYPES.GQL_CONNECTION_ACK:
        case SERVER_EVENT_TYPES.GQL_ERROR:
        case SERVER_EVENT_TYPES.GQL_SUBSCRIBED: {
          // subcribed
          break;
        }
        default: {
          throw new Error('Unknown message');
        }
      }

      this.ee.emit('message', message);
    } catch (e) {
      this.ee.emit('error', e);
      throw e;
    }
  };
}

export { Client };
export default Client;
