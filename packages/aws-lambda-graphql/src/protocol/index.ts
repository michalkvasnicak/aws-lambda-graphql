import { DocumentNode, ExecutionResult } from 'graphql';

const CLIENT_EVENT_TYPES = {
  GQL_OP: 'GQL_OP',
};

const SERVER_EVENT_TYPES = {
  GQL_CONNECTED: 'GQL_CONNECTED',
  GQL_ERROR: 'GQL_ERROR',
  GQL_OP_RESULT: 'GQL_OP_RESULT',
  GQL_SUBSCRIBED: 'GQL_SUBSCRIBED',
};

export { CLIENT_EVENT_TYPES, SERVER_EVENT_TYPES };

export interface GQLOperation {
  id: string;
  payload: {
    [key: string]: any;
    extensions?: { [key: string]: any };
    operationName?: string;
    query: string | DocumentNode;
    variables?: { [key: string]: any };
  };
  type: typeof CLIENT_EVENT_TYPES['GQL_OP'];
}

export interface GQLConnectedEvent {
  id: string;
  payload: {
    [key: string]: any;
  };
  type: typeof SERVER_EVENT_TYPES['GQL_CONNECTED'];
}

export interface GQLErrorEvent {
  id: string;
  payload: {
    message: string;
  };
  type: typeof SERVER_EVENT_TYPES['GQL_ERROR'];
}

export interface GQLOperationResult {
  /**
   * Same ID as the ID of an operation that we are returning a result for
   */
  id: string;
  payload: ExecutionResult;
  type: typeof SERVER_EVENT_TYPES['GQL_OP_RESULT'];
}

export interface GQLSubscribed {
  /**
   * Same ID as the ID of an operation (subscription) that's been used to subscribe
   */
  id: string;
  payload: { [key: string]: any };
  type: typeof SERVER_EVENT_TYPES['GQL_SUBSCRIBED'];
}

export type GQLClientAllEvents = GQLOperation;

export type GQLServerAllEvents =
  | GQLConnectedEvent
  | GQLErrorEvent
  | GQLOperationResult
  | GQLSubscribed;
