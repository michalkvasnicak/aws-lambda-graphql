import { APIGatewayProxyResult, Context as AWSLambdaContext } from 'aws-lambda';
import { ExecutionResult, GraphQLSchema } from 'graphql';
import { PubSub } from 'graphql-subscriptions';
import { isAsyncIterable } from 'iterall';
import { ulid } from 'ulid';
import { execute } from './execute';
import { formatMessage } from './formatMessage';
import { extractEndpointFromEvent, parseOperationFromEvent } from './helpers';
import {
  APIGatewayWebSocketEvent,
  IConnectionManager,
  ISubscriptionManager,
} from './types';

export type APIGatewayV2Handler = (
  event: APIGatewayWebSocketEvent,
  context: AWSLambdaContext,
) => Promise<APIGatewayProxyResult | void>;

type Options = {
  connectionManager: IConnectionManager;
  schema: GraphQLSchema;
  subscriptionManager: ISubscriptionManager;
};

function createWsHandler({
  connectionManager,
  schema,
  subscriptionManager,
}: Options): APIGatewayV2Handler {
  return async function serveWebSocket(event) {
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

          // return will send the body to the client so we don't need to do that using
          // connectionManager.postToConnection()
          // you must map integration response in AWS API Gateway V2 console for this route
          return {
            body: formatMessage({
              id: ulid(),
              payload: {},
              type: 'GQL_CONNECTED',
            }),
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

          const result = await execute({
            connection,
            connectionManager,
            operation,
            schema,
            subscriptionManager,
            pubSub: new PubSub(),
            useSubscriptions: true,
          });

          // if result is async iterator, then it means that subscriptions was registered
          if (isAsyncIterable(result)) {
            return {
              body: formatMessage({
                id: operation.operationId,
                payload: {},
                type: 'GQL_SUBSCRIBED',
              }),
              statusCode: 200,
            };
          }

          return {
            body: formatMessage({
              id: operation.operationId,
              payload: result as ExecutionResult,
              type: 'GQL_OP_RESULT',
            }),
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
