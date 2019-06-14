import {
  GQLClientAllEvents,
  CLIENT_EVENT_TYPES,
  GQLOperation,
  GQLUnsubscribe,
} from '../protocol';
import { ExtendableError } from '../errors';
import { APIGatewayWebSocketEvent, IdentifiedOperationRequest } from '../types';

export class MalformedOperationError extends ExtendableError {
  constructor(reason?: string) {
    super(reason ? `Malformed operation: ${reason}` : 'Malformed operation');
  }
}
export class InvalidOperationError extends ExtendableError {
  constructor(reason?: string) {
    super(reason ? `Invalid operation: ${reason}` : 'Invalid operation');
  }
}

export function parseOperationFromEvent(
  event: APIGatewayWebSocketEvent,
): GQLUnsubscribe | IdentifiedOperationRequest {
  const operation: GQLClientAllEvents = JSON.parse(event.body);

  if (typeof operation !== 'object' && operation !== null) {
    throw new MalformedOperationError();
  }

  if (operation.type == null) {
    throw new MalformedOperationError('Type is missing');
  }

  if (
    (operation as GQLClientAllEvents).type !== CLIENT_EVENT_TYPES.GQL_OP &&
    (operation as GQLClientAllEvents).type !==
      CLIENT_EVENT_TYPES.GQL_UNSUBSCRIBE
  ) {
    throw new InvalidOperationError(
      'Only GQL_OP or GQL_UNSUBSCRIBE operations are accepted',
    );
  }

  if ((operation as GQLOperation).id == null) {
    throw new MalformedOperationError('Property id is missing');
  }

  if (
    (operation as GQLClientAllEvents).type ===
    CLIENT_EVENT_TYPES.GQL_UNSUBSCRIBE
  ) {
    return operation as GQLUnsubscribe;
  }

  if ((operation as GQLOperation).payload == null) {
    throw new MalformedOperationError('Property payload is missing');
  }

  const payloadType = typeof (operation as GQLOperation).payload;

  if (payloadType !== 'object') {
    throw new MalformedOperationError(
      'Invalid paylaod property, object expected',
    );
  }

  return {
    ...(operation as GQLOperation).payload,
    operationId: operation.id,
  };
}
