import {
  GQLOperation,
  GQLConnectedEvent,
  GQLErrorEvent,
  GQLOperationResult,
  GQLSubscribed,
  GQLUnsubscribe,
  GQLUnsubscribed,
} from './protocol';

type AllowedProtocolEvents =
  | GQLOperation
  | GQLConnectedEvent
  | GQLErrorEvent
  | GQLOperationResult
  | GQLSubscribed
  | GQLUnsubscribe
  | GQLUnsubscribed;

function formatMessage(event: AllowedProtocolEvents): string {
  return JSON.stringify(event);
}

export { formatMessage };

export default formatMessage;
