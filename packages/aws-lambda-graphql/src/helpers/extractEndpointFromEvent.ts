import { APIGatewayWebSocketEvent } from '../types';

export function extractEndpointFromEvent(
  event: APIGatewayWebSocketEvent,
): string {
  return `https://${event.requestContext.domainName}/${event.requestContext.stage}`;
}
