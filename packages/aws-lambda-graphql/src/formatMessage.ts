import { GQLClientEvents, GQLServerEvents } from './protocol';

type AllowedProtocolEvents =
  | GQLClientEvents.GQLOperation
  | GQLServerEvents.GQLConnectedEvent
  | GQLServerEvents.GQLErrorEvent
  | GQLServerEvents.GQLOperationResult
  | GQLServerEvents.GQLSubscribed;

function formatMessage(event: AllowedProtocolEvents): string {
  return JSON.stringify(event);
}

export { formatMessage };

export default formatMessage;
