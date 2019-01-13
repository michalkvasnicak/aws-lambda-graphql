import { GQLClientAllEvents } from '../protocol';
import { ExtendableError } from '../errors';
import { APIGatewayWebSocketEvent, OperationRequest } from '../types';

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
): OperationRequest & { operationId: string } {
  const operation: GQLClientAllEvents = JSON.parse(event.body);

  if (typeof operation !== 'object' && operation !== null) {
    throw new MalformedOperationError();
  }

  if (operation.type == null) {
    throw new MalformedOperationError('Type is missing');
  }

  if ((operation as GQLClientAllEvents).type !== 'GQL_OP') {
    throw new InvalidOperationError('Only GQL_OP operations are accepted');
  }

  if ((operation as GQLClientAllEvents).id == null) {
    throw new MalformedOperationError('Property id is missing');
  }

  if ((operation as GQLClientAllEvents).payload == null) {
    throw new MalformedOperationError('Property payload is missing');
  }

  const payloadType = typeof (operation as GQLClientAllEvents).payload;

  if (payloadType !== 'object') {
    throw new MalformedOperationError(
      'Invalid paylaod property, object expected',
    );
  }

  return {
    ...operation.payload,
    operationId: operation.id,
  };
}
