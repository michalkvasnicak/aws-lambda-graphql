import {
  GQLClientAllEvents,
  GQLOperation,
  GQLUnsubscribe,
  GQLConnectionInit,
} from '../protocol';
import { ExtendableError } from '../errors';
import { APIGatewayWebSocketEvent, IdentifiedOperationRequest } from '../types';
import { getProtocol } from '../protocol/getProtocol';

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
  useLegacyProtocol: boolean,
): GQLConnectionInit | GQLUnsubscribe | IdentifiedOperationRequest {
  const operation: GQLClientAllEvents = JSON.parse(event.body);

  if (typeof operation !== 'object' && operation !== null) {
    throw new MalformedOperationError();
  }

  if (operation.type == null) {
    throw new MalformedOperationError('Type is missing');
  }

  const { CLIENT_EVENT_TYPES } = getProtocol(useLegacyProtocol);

  if (
    (operation as GQLClientAllEvents).type !== CLIENT_EVENT_TYPES.GQL_START &&
    (operation as GQLClientAllEvents).type !== CLIENT_EVENT_TYPES.GQL_STOP &&
    (operation as GQLClientAllEvents).type !==
      CLIENT_EVENT_TYPES.GQL_CONNECTION_INIT
  ) {
    throw new InvalidOperationError(
      'Only GQL_CONNECTION_INIT, GQL_START or GQL_STOP operations are accepted',
    );
  }

  if (
    (operation as GQLClientAllEvents).type ===
    CLIENT_EVENT_TYPES.GQL_CONNECTION_INIT
  ) {
    return operation as GQLConnectionInit;
  }

  if ((operation as GQLOperation).id == null) {
    throw new MalformedOperationError('Property id is missing');
  }

  if ((operation as GQLClientAllEvents).type === CLIENT_EVENT_TYPES.GQL_STOP) {
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
