import { DocumentNode, ExecutionResult } from 'graphql';

export enum CLIENT_EVENT_TYPES {
  GQL_START = 'start',
  GQL_STOP = 'stop',
  GQL_CONNECTION_INIT = 'connection_init',
}

export enum SERVER_EVENT_TYPES {
  GQL_CONNECTION_ACK = 'connection_ack',
  GQL_ERROR = 'error',
  GQL_DATA = 'data',
  GQL_COMPLETE = 'complete',
}

export enum LEGACY_CLIENT_EVENT_TYPES {
  GQL_START = 'GQL_OP',
  GQL_STOP = 'GQL_UNSUBSCRIBE',
  GQL_CONNECTION_INIT = 'connection_init',
}

export enum LEGACY_SERVER_EVENT_TYPES {
  GQL_CONNECTION_ACK = 'GQL_CONNECTED',
  GQL_ERROR = 'GQL_ERROR',
  GQL_DATA = 'GQL_OP_RESULT',
  GQL_COMPLETE = 'GQL_UNSUNBSCRIBED',

  GQL_SUBSCRIBED = 'GQL_SUBSCRIBED',
}

export interface GQLOperation {
  id: string;
  payload: {
    [key: string]: any;
    extensions?: { [key: string]: any };
    operationName?: string;
    query: string | DocumentNode;
    variables?: { [key: string]: any };
  };
  type: CLIENT_EVENT_TYPES.GQL_START | LEGACY_CLIENT_EVENT_TYPES.GQL_START;
}

export interface GQLUnsubscribe {
  /** The ID of GQLOperation used to subscribe */
  id: string;
  payload?: {
    [key: string]: any;
  };
  type: CLIENT_EVENT_TYPES.GQL_STOP | LEGACY_CLIENT_EVENT_TYPES.GQL_STOP;
}

export interface GQLConnectionInit {
  id: string;
  payload: {
    [key: string]: any;
  };
  type: CLIENT_EVENT_TYPES.GQL_CONNECTION_INIT;
}

export interface GQLUnsubscribed {
  /** The ID of GQLOperation used to subscribe */
  id: string;
  type:
    | SERVER_EVENT_TYPES.GQL_COMPLETE
    | LEGACY_SERVER_EVENT_TYPES.GQL_COMPLETE;
}

export interface GQLConnectedEvent {
  id?: string;
  payload?: {
    [key: string]: any;
  };
  type:
    | SERVER_EVENT_TYPES.GQL_CONNECTION_ACK
    | LEGACY_SERVER_EVENT_TYPES.GQL_CONNECTION_ACK;
}

export interface GQLErrorEvent {
  id: string;
  payload: {
    message: string;
  };
  type: SERVER_EVENT_TYPES.GQL_ERROR | LEGACY_SERVER_EVENT_TYPES.GQL_ERROR;
}

export interface GQLOperationResult {
  /**
   * Same ID as the ID of an operation that we are returning a result for
   */
  id: string;
  payload: ExecutionResult;
  type: SERVER_EVENT_TYPES.GQL_DATA | LEGACY_SERVER_EVENT_TYPES.GQL_DATA;
}

export interface GQLSubscribed {
  /**
   * Same ID as the ID of an operation (subscription) that's been used to subscribe
   */
  id: string;
  payload: { [key: string]: any };
  type: LEGACY_SERVER_EVENT_TYPES.GQL_SUBSCRIBED;
}

export type GQLClientAllEvents =
  | GQLConnectionInit
  | GQLOperation
  | GQLUnsubscribe;

export type GQLServerAllEvents =
  | GQLConnectedEvent
  | GQLErrorEvent
  | GQLOperationResult
  | GQLSubscribed
  | GQLUnsubscribed;
