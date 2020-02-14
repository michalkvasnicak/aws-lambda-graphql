import {
  GQLOperation,
  GQLConnectionACK,
  GQLErrorEvent,
  GQLData,
  GQLComplete,
  GQLStopOperation,
  GQLConnectionInit,
} from './protocol';

type AllowedProtocolEvents =
  | GQLOperation
  | GQLConnectionACK
  | GQLErrorEvent
  | GQLData
  | GQLComplete
  | GQLConnectionInit
  | GQLStopOperation;

export function formatMessage(event: AllowedProtocolEvents): string {
  return JSON.stringify(event);
}
