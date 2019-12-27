import { IEventStore, OperationRequest, SubcribeResolveFn } from './types';

interface PubSubOptions {
  eventStore: IEventStore;
}

export class PubSub {
  private eventStore: IEventStore;

  constructor({ eventStore }: PubSubOptions) {
    this.eventStore = eventStore;
  }

  subscribe = (eventNames: string | string[]): SubcribeResolveFn => {
    return async (rootValue, args, { $$internal }) => {
      const {
        connection,
        operation,
        pubSub,
        registerSubscriptions,
        subscriptionManager,
      } = $$internal;
      const names = Array.isArray(eventNames) ? eventNames : [eventNames];

      if (pubSub == null) {
        throw new Error('`pubSub` is not provided in context');
      }

      // register subscriptions only if it set to do so
      // basically this means that client sent subscription operation over websocket
      if (registerSubscriptions) {
        if (connection == null) {
          throw new Error('`connection` is not provided in context');
        }

        await subscriptionManager.subscribe(
          names,
          connection,
          // this is called only on subscription so operationId should be filled
          operation as OperationRequest & { operationId: string },
        );
      }

      return pubSub.asyncIterator(names) as AsyncIterable<any> &
        AsyncIterator<any>;
    };
  };

  /**
   * Notice that this propagates event through storage
   * So you should not expect to fire in same process
   */
  publish = async (eventName: string, payload: any) => {
    if (typeof eventName !== 'string' || eventName === '') {
      throw new Error('Event name must be nonempty string');
    }

    await this.eventStore.publish({
      payload: JSON.stringify(payload),
      event: eventName,
    });
  };
}
