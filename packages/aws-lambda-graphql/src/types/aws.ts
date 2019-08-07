import { APIGatewayEventRequestContext } from 'aws-lambda';

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
export interface WebSocketConnectEvent {
  body: string;
  requestContext: WebSocketRequestContext<'$connect'>;
}

/**
 * The event invoked by AWS API Gateway V2 on WebSockect disconnection
 */
export interface WebSocketDisconnectEvent {
  body: string;
  requestContext: WebSocketRequestContext<'$disconnect'>;
}

/**
 * The event invoked by AWS API Gateway V2 when message is received
 */
export interface WebSocketMessageEvent {
  body: string;
  requestContext: WebSocketRequestContext<'$default'>;
}

export type APIGatewayWebSocketEvent =
  | WebSocketConnectEvent
  | WebSocketDisconnectEvent
  | WebSocketMessageEvent;
