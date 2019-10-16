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
  IConnection,
  OperationRequest,
} from './types';
import { getProtocol } from './protocol/getProtocol';
import { isLegacyOperation } from './helpers/isLegacyOperation';

export type APIGatewayV2Handler = (
  event: APIGatewayWebSocketEvent,
  context: LambdaContext,
) => Promise<APIGatewayProxyResult | void>;

interface WSHandlerOptions {
  connectionManager: IConnectionManager;
  context?: ExecuteOptions['context'];
  schema: GraphQLSchema;
  subscriptionManager: ISubscriptionManager;
  onOperation?: (
    message: OperationRequest,
    params: Object,
    connection: IConnection,
  ) => Promise<Object> | Object;
  onOperationComplete?: (connection: IConnection, opId: string) => void;
  onConnect?: (
    messagePayload: { [key: string]: any },
    connection: IConnection,
  ) =>
    | Promise<boolean | { [key: string]: any }>
    | boolean
    | { [key: string]: any };
  onDisconnect?: (connection: IConnection) => void;
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
  onOperation,
  onOperationComplete,
  onConnect,
  onDisconnect,
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

          if (onDisconnect) {
            onDisconnect(connection);
          }

          await connectionManager.unregisterConnection(connection);

          // eslint-disable-next-line consistent-return
          return;
        }
        case '$default': {
          // here we are processing messages received from a client
          // if we respond here and the route has integration response assigned
          // it will send the body back to client, so it is easy to respond with operation results
          // determine if client has sent legacy protocol message
          const useLegacyProtocol = isLegacyOperation(event);
          // hydrate connection and set this connection to legacy if received legacy request
          const connection = await connectionManager.hydrateConnection(
            event.requestContext.connectionId,
            useLegacyProtocol,
          );
          // parse operation from body
          const operation = parseOperationFromEvent(event, useLegacyProtocol);
          // get appropriate protocol
          const { CLIENT_EVENT_TYPES, SERVER_EVENT_TYPES } = getProtocol(
            useLegacyProtocol,
          );

          if (operation.type === CLIENT_EVENT_TYPES.GQL_CONNECTION_INIT) {
            let newConnectionContext = operation.payload;

            if (onConnect) {
              try {
                const result = await onConnect(operation.payload, connection);
                if (result === false) {
                  throw new Error('Prohibited connection!');
                } else if (result !== null && typeof result === 'object') {
                  newConnectionContext = result;
                }
              } catch (err) {
                const errorResponse = formatMessage({
                  type: SERVER_EVENT_TYPES.GQL_ERROR,
                  payload: { message: err.message },
                });
                await connectionManager.sendToConnection(
                  connection,
                  errorResponse,
                );
                await connectionManager.closeConnection(connection);
                return {
                  body: errorResponse,
                  statusCode: 401,
                };
              }
            }

            // set connection context which will be available during graphql execution
            const connectionData = {
              ...connection.data,
              context: newConnectionContext,
              isInitialized: true,
            };
            await connectionManager.setConnectionData(
              connectionData,
              connection,
            );

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

          if (!useLegacyProtocol && !connection.data.isInitialized) {
            // refuse connection which did not send GQL_CONNECTION_INIT operation
            const errorResponse = formatMessage({
              type: SERVER_EVENT_TYPES.GQL_ERROR,
              payload: { message: 'Connection is not initialized!' },
            });
            await connectionManager.sendToConnection(connection, errorResponse);
            return {
              body: errorResponse,
              statusCode: 401,
            };
          }

          if (operation.type === CLIENT_EVENT_TYPES.GQL_STOP) {
            // unsubscribe client
            if (onOperationComplete) {
              onOperationComplete(connection, operation.id);
            }
            const response = formatMessage({
              id: operation.id,
              type: SERVER_EVENT_TYPES.GQL_COMPLETE,
            });

            await connectionManager.sendToConnection(connection, response);

            await subscriptionManager.unsubscribeOperation(
              connection.id,
              operation.id,
            );

            return {
              body: response,
              statusCode: 200,
            };
          }
          const executeContext =
            connection.data && connection.data.context
              ? {
                  ...connection.data.context,
                  context,
                }
              : context;
          const result = await execute({
            connection,
            connectionManager,
            context: executeContext,
            event,
            lambdaContext,
            operation: operation as IdentifiedOperationRequest,
            schema,
            subscriptionManager,
            pubSub: new PubSub(),
            useSubscriptions: true,
            validationRules,
            onOperation,
          });

          if (isAsyncIterable(result) && useLegacyProtocol) {
            // if result is async iterator, then it means that subscriptions was registered
            // legacy protocol requires that GQL_SUBSCRIBED should be sent back
            const response = formatMessage({
              id: (operation as IdentifiedOperationRequest).operationId,
              payload: {},
              type: SERVER_EVENT_TYPES.GQL_SUBSCRIBED,
            });
            await connectionManager.sendToConnection(connection, response);
            return {
              body: response,
              statusCode: 200,
            };
          }
          if (!isAsyncIterable(result)) {
            // send response to client so it can finish operation in case of query or mutation
            if (onOperationComplete) {
              onOperationComplete(
                connection,
                (operation as IdentifiedOperationRequest).operationId,
              );
            }
            const response = formatMessage({
              id: (operation as IdentifiedOperationRequest).operationId,
              payload: result as ExecutionResult,
              type: SERVER_EVENT_TYPES.GQL_DATA,
            });
            await connectionManager.sendToConnection(connection, response);
            return {
              body: response,
              statusCode: 200,
            };
          }
          // this is just to make sure
          // when you deploy this using serverless cli
          // then integration response is not assigned to $default route
          // so this won't make any difference
          // but the sendToConnection above will send the response to client
          // so client'll receive the response for his operation
          return {
            body: '',
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
