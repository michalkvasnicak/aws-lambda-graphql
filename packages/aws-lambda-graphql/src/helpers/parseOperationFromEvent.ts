import {
  GQLClientAllEvents,
  GQLStopOperation,
  GQLConnectionInit,
  isGQLConnectionInit,
  isGQLOperation,
  isGQLStopOperation,
  isGQLConnectionTerminate,
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
): GQLConnectionInit | GQLStopOperation | IdentifiedOperationRequest {
  const operation: GQLClientAllEvents = JSON.parse(event.body);

  if (typeof operation !== 'object' && operation !== null) {
    throw new MalformedOperationError();
  }

  if (operation.type == null) {
    throw new MalformedOperationError('Type is missing');
  }

  if (isGQLConnectionInit(operation)) {
    return operation;
  }

  if (isGQLStopOperation(operation)) {
    return operation;
  }

  if (isGQLConnectionTerminate(operation)) {
    return operation;
  }

  if (isGQLOperation(operation)) {
    if (operation.id == null) {
      throw new MalformedOperationError('Property id is missing');
    }

    if (typeof operation.payload !== 'object' || operation.payload == null) {
      throw new MalformedOperationError(
        'Property payload is missing or is not an object',
      );
    }

    return {
      ...operation.payload,
      operationId: operation.id,
    };
  }

  throw new InvalidOperationError(
    'Only GQL_CONNECTION_INIT, GQL_CONNECTION_TERMINATE, GQL_START or GQL_STOP operations are accepted',
  );
}
