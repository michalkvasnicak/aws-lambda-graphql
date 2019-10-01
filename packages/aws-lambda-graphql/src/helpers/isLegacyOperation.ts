import { GQLClientAllEvents, LEGACY_CLIENT_EVENT_TYPES } from '../protocol';
import { MalformedOperationError } from './parseOperationFromEvent';
import { APIGatewayWebSocketEvent } from '../types';

export function isLegacyOperation(event: APIGatewayWebSocketEvent): boolean {
  const operation: GQLClientAllEvents = JSON.parse(event.body);

  if (typeof operation !== 'object' && operation !== null) {
    throw new MalformedOperationError();
  }

  if (operation.type == null) {
    throw new MalformedOperationError('Type is missing');
  }

  if (
    (operation as GQLClientAllEvents).type ===
      LEGACY_CLIENT_EVENT_TYPES.GQL_START ||
    (operation as GQLClientAllEvents).type ===
      LEGACY_CLIENT_EVENT_TYPES.GQL_STOP
  ) {
    return true;
  }
  return false;
}
