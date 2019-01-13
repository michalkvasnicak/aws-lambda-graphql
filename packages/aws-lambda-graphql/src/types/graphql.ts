import { DocumentNode, GraphQLSchema, GraphQLResolveInfo } from 'graphql';
import { PubSub } from 'graphql-subscriptions';
import { IConnection, IConnectionManager } from './connections';
import { ISubscriptionManager } from './subscriptions';

/**
 * Superset of context passed to every operation invoked by websocket
 */
export interface IContext {
  $$internal: {
    /**
     * Current connection that invoked execution
     */
    connection: IConnection;

    connectionManager: IConnectionManager;

    /**
     * Current executed operation
     */
    operation: OperationRequest;

    pubSub: PubSub;

    /**
     * Should we register subscriptions?
     * Basically this means that PubSub will call subscriptionManager
     * Otherwise it will create an async iterator right away
     *
     * For internal use only
     */
    registerSubscriptions?: boolean;
    subscriptionManager: ISubscriptionManager;
  };
}

export interface OperationRequest {
  [key: string]: any;
  extensions?: { [key: string]: any };
  operationName?: string;
  query: string | DocumentNode;
  variables?: { [key: string]: any };
}

export type SubcribeResolveFn = (
  rootValue?: any,
  args?: any,
  context?: IContext,
  info?: GraphQLResolveInfo,
) => Promise<AsyncIterator<any> & AsyncIterable<any>>;

export type SchemaCreatorFn = (options: {}) => GraphQLSchema;
