import {
  GQLOperation,
  GQLConnectedEvent,
  GQLErrorEvent,
  GQLOperationResult,
  GQLSubscribed,
} from './protocol';

type AllowedProtocolEvents =
  | GQLOperation
  | GQLConnectedEvent
  | GQLErrorEvent
  | GQLOperationResult
  | GQLSubscribed;

function formatMessage(event: AllowedProtocolEvents): string {
  return JSON.stringify(event);
}

export { formatMessage };

export default formatMessage;
