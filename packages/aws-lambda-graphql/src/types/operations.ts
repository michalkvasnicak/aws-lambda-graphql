import { DocumentNode } from 'graphql';

/**
 * This are data from graphql operation request
 */
export interface OperationRequest {
  // allows for any extra params for example in GQL_CONNECTION_INIT
  [key: string]: any;
  extensions?: { [key: string]: any };
  operationName?: string;
  query: string | DocumentNode;
  variables?: { [key: string]: any };
}

/**
 * This is operation request that contains operationId
 *
 * For example GQL_START contains id of an operation that is then assigned to operationId
 */
export interface IdentifiedOperationRequest extends OperationRequest {
  operationId: string;
}
