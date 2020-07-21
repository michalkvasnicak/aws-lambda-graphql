import { createAsyncIterator } from 'iterall';
import { ISubscriptionEvent } from './types';

/**
 * Array PubSub works as local PubSub that is already fed with all the events that were published
 *
 * Each time you call asyncIterator it will create an iterator that iterates over events
 *
 * This PubSub instance is used internally in event processor to simulate
 * source of events. Basically it acts as you were publishing events,
 * which were loaded from event store.
 *
 * If event payload is string, then it's parsed from JSON, otherwise it's used
 * as is and sent to your GraphQL schema.
 */
export class ArrayPubSub {
  private events: ISubscriptionEvent[];

  constructor(events: ISubscriptionEvent[]) {
    this.events = events;
  }

  async publish() {
    throw new Error('ArrayPubSub is read only');
  }

  async subscribe(): Promise<number> {
    throw new Error('Please do not use this PubSub implementation');
  }

  async unsubscribe() {
    throw new Error('Please do not use this PubSub implementation');
  }

  asyncIterator(eventNames: string | string[]) {
    const names = Array.isArray(eventNames) ? eventNames : [eventNames];

    return createAsyncIterator(
      this.events
        .filter((event) => names.includes(event.event))
        .map((event) =>
          typeof event.payload === 'string'
            ? JSON.parse(event.payload)
            : event.payload,
        ),
    );
  }
}
