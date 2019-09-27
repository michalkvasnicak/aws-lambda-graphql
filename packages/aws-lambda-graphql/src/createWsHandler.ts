import { APIGatewayProxyResult, Context as LambdaContext } from 'aws-lambda';
import {
  ExecutionResult,
  GraphQLSchema,
  ValidationContext,
  ASTVisitor,
} from 'graphql';
import { PubSub } from 'graphql-subscriptions';
import { isAsyncIterable } from 'iterall';
import { execute, ExecuteOptions } from './execute';
import { formatMessage } from './formatMessage';
import { extractEndpointFromEvent, parseOperationFromEvent } from './helpers';
import {
  APIGatewayWebSocketEvent,
  IConnectionManager,
  ISubscriptionManager,
  IdentifiedOperationRequest,
} from './types';
import { SERVER_EVENT_TYPES, CLIENT_EVENT_TYPES } from './protocol';

export type APIGatewayV2Handler = (
  event: APIGatewayWebSocketEvent,
  context: LambdaContext,
) => Promise<APIGatewayProxyResult | void>;

interface WSHandlerOptions {
  connectionManager: IConnectionManager;
  context?: ExecuteOptions['context'];
  schema: GraphQLSchema;
  subscriptionManager: ISubscriptionManager;
  /**
   * An optional array of validation rules that will be applied on the document
   * in additional to those defined by the GraphQL spec.
   */
  validationRules?: ((context: ValidationContext) => ASTVisitor)[];
}

function createWsHandler({
  connectionManager,
  context,
  schema,
  subscriptionManager,
  validationRules,
}: WSHandlerOptions): APIGatewayV2Handler {
  return async function serveWebSocket(event, lambdaContext) {
    try {
      // based on routeKey, do actions
      switch (event.requestContext.routeKey) {
        case '$connect': {
          // register connection
          // if error is thrown during registration, connection is rejected
          // we can implement some sort of authorization here
          const endpoint = extractEndpointFromEvent(event);

          await connectionManager.registerConnection({
            endpoint,
            connectionId: event.requestContext.connectionId,
          });

          return {
            body: '',
            statusCode: 200,
          };
        }
        case '$disconnect': {
          // this event is called eventually by AWS APIGateway v2
          // we actualy don't care about a result of this operation because client is already
          // disconnected, it is meant only for clean up purposes
          // hydrate connection
          const connection = await connectionManager.hydrateConnection(
            event.requestContext.connectionId,
          );
          await connectionManager.unregisterConnection(connection);

          // eslint-disable-next-line consistent-return
          return;
        }
        case '$default': {
          // here we are processing messages received from a client
          // if we respond here and the route has integration response assigned
          // it will send the body back to client, so it is easy to respond with operation results
          // hydrate connection
          const connection = await connectionManager.hydrateConnection(
            event.requestContext.connectionId,
          );

          // parse operation from body
          const operation = parseOperationFromEvent(event);

          if (operation.type === CLIENT_EVENT_TYPES.GQL_CONNECTION_INIT) {
            // send GQL_CONNECTION_INIT message to client
            const response = formatMessage({
              type: SERVER_EVENT_TYPES.GQL_CONNECTION_ACK,
            });

            await connectionManager.sendToConnection(connection, response);

            return {
              body: response,
              statusCode: 200,
            };
          }

          if (operation.type === CLIENT_EVENT_TYPES.GQL_STOP) {
            // unsubscribe client
            const response = formatMessage({
              id: operation.id,
              type: SERVER_EVENT_TYPES.GQL_COMPLETE,
            });

            await subscriptionManager.unsubscribeOperation(
              connection.id,
              operation.id,
            );

            return {
              body: response,
              statusCode: 200,
            };
          }

          const result = await execute({
            connection,
            connectionManager,
            context,
            event,
            lambdaContext,
            operation: operation as IdentifiedOperationRequest,
            schema,
            subscriptionManager,
            pubSub: new PubSub(),
            useSubscriptions: true,
            validationRules,
          });

          // if result is async iterator, then it means that subscriptions was registered
          const response = isAsyncIterable(result)
            ? ''
            : formatMessage({
                id: (operation as IdentifiedOperationRequest).operationId,
                payload: result as ExecutionResult,
                type: SERVER_EVENT_TYPES.GQL_DATA,
              });

          // send response to client so it can finish operation in case of query or mutation
          if (!isAsyncIterable(result)) {
            await connectionManager.sendToConnection(connection, response);
          }

          // this is just to make sure
          // when you deploy this using serverless cli
          // then integration response is not assigned to $default route
          // so this won't make any difference
          // but the sendToConnection above will send the response to client
          // so client'll receive the response for his operation
          return {
            body: response,
            statusCode: 200,
          };
        }
        default: {
          throw new Error(
            `Invalid event ${(event.requestContext as any).routeKey} received`,
          );
        }
      }
    } catch (e) {
      return {
        body: e.message || 'Internal server error',
        statusCode: 500,
      };
    }
  };
}

export { createWsHandler };
export default createWsHandler;
