import { APIGatewayWebSocketEvent } from '../types';

export function extractEndpointFromEvent(
  event: APIGatewayWebSocketEvent,
): string {
  return `${event.requestContext.domainName}/${event.requestContext.stage}`;
}
