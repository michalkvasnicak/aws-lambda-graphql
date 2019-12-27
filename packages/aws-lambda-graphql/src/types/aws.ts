import {
  APIGatewayProxyEvent,
  APIGatewayEventRequestContext,
  APIGatewayProxyResult,
  Context as LambdaContext,
} from 'aws-lambda';

export type APIGatewayV2Handler = (
  event: APIGatewayWebSocketEvent,
  context: LambdaContext,
) => Promise<APIGatewayProxyResult>;

/**
 * Request context provided by AWS API Gateway V2 proxy event
 *
 * connectionId can be used to identify/terminate the connection to client
 * routeKey can be used to route event by specific parts of communication flow
 */
export interface WebSocketRequestContext<MessageRouteKey extends string>
  extends APIGatewayEventRequestContext {
  connectionId: string;
  domainName: string;
  routeKey: MessageRouteKey;
}

/**
 * The event invoked by AWS API Gateway V2 on WebSockect connection
 */
export interface WebSocketConnectEvent extends APIGatewayProxyEvent {
  body: string;
  requestContext: WebSocketRequestContext<'$connect'>;
}

/**
 * The event invoked by AWS API Gateway V2 on WebSockect disconnection
 */
export interface WebSocketDisconnectEvent extends APIGatewayProxyEvent {
  body: string;
  requestContext: WebSocketRequestContext<'$disconnect'>;
}

/**
 * The event invoked by AWS API Gateway V2 when message is received
 */
export interface WebSocketMessageEvent extends APIGatewayProxyEvent {
  body: string;
  requestContext: WebSocketRequestContext<'$default'>;
}

export type APIGatewayWebSocketEvent =
  | WebSocketConnectEvent
  | WebSocketDisconnectEvent
  | WebSocketMessageEvent;
