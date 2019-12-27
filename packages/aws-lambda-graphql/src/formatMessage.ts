import {
  GQLOperation,
  GQLConnectionACK,
  GQLErrorEvent,
  GQLData,
  GQLComplete,
  GQLStopOperation,
} from './protocol';

type AllowedProtocolEvents =
  | GQLOperation
  | GQLConnectionACK
  | GQLErrorEvent
  | GQLData
  | GQLComplete
  | GQLStopOperation;

export function formatMessage(event: AllowedProtocolEvents): string {
  return JSON.stringify(event);
}
