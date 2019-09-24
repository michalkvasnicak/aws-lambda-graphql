import { DocumentNode, ExecutionResult } from 'graphql';

export enum CLIENT_EVENT_TYPES {
  GQL_OP = 'start',
  GQL_UNSUBSCRIBE = 'stop',
}

export enum SERVER_EVENT_TYPES {
  GQL_CONNECTED = 'connection_ack',
  GQL_ERROR = 'error',
  GQL_OP_RESULT = 'data',
  GQL_SUBSCRIBED = 'data',
  GQL_UNSUBSCRIBED = 'complete',
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
  type: CLIENT_EVENT_TYPES.GQL_OP;
}

export interface GQLUnsubscribe {
  /** The ID of GQLOperation used to subscribe */
  id: string;
  type: CLIENT_EVENT_TYPES.GQL_UNSUBSCRIBE;
}

export interface GQLUnsubscribed {
  /** The ID of GQLOperation used to subscribe */
  id: string;
  type: SERVER_EVENT_TYPES.GQL_UNSUBSCRIBED;
}

export interface GQLConnectedEvent {
  id: string;
  payload: {
    [key: string]: any;
  };
  type: SERVER_EVENT_TYPES.GQL_CONNECTED;
}

export interface GQLErrorEvent {
  id: string;
  payload: {
    message: string;
  };
  type: SERVER_EVENT_TYPES.GQL_ERROR;
}

export interface GQLOperationResult {
  /**
   * Same ID as the ID of an operation that we are returning a result for
   */
  id: string;
  payload: ExecutionResult;
  type: SERVER_EVENT_TYPES.GQL_OP_RESULT;
}

export interface GQLSubscribed {
  /**
   * Same ID as the ID of an operation (subscription) that's been used to subscribe
   */
  id: string;
  payload: { [key: string]: any };
  type: SERVER_EVENT_TYPES.GQL_SUBSCRIBED;
}

export type GQLClientAllEvents = GQLOperation | GQLUnsubscribe;

export type GQLServerAllEvents =
  | GQLConnectedEvent
  | GQLErrorEvent
  | GQLOperationResult
  | GQLSubscribed
  | GQLUnsubscribed;
