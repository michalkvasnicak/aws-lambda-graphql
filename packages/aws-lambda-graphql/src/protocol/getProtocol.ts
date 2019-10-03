import {
  CLIENT_EVENT_TYPES,
  SERVER_EVENT_TYPES,
  LEGACY_CLIENT_EVENT_TYPES,
  LEGACY_SERVER_EVENT_TYPES,
} from '.';

interface Protocol {
  CLIENT_EVENT_TYPES: any;
  SERVER_EVENT_TYPES: any;
}

export function getProtocol(useLegacyProtocol?: boolean): Protocol {
  return useLegacyProtocol
    ? {
        CLIENT_EVENT_TYPES: LEGACY_CLIENT_EVENT_TYPES,
        SERVER_EVENT_TYPES: LEGACY_SERVER_EVENT_TYPES,
      }
    : {
        CLIENT_EVENT_TYPES,
        SERVER_EVENT_TYPES,
      };
}
