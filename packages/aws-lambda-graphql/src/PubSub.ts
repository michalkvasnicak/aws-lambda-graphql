import { IEventStore, OperationRequest, SubcribeResolveFn } from './types';

type Options = {
  eventStore: IEventStore;
  topic: string;
};

class PubSub {
  private eventStore: IEventStore;
  private topic: string;

  constructor({ eventStore, topic }: Options) {
    this.eventStore = eventStore;
    this.topic = topic;
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

      // register subscriptions only if it set to do so
      // basically this means that client sent subscription operation over websocket
      // and we wan't to respond with GQL_SUBSCRIBED message
      if (registerSubscriptions) {
        await subscriptionManager.subscribe(
          names,
          connection,
          // this is called only on subscription so operationId should be filled
          operation as OperationRequest & { operationId: string },
        );
      }

      return (pubSub.asyncIterator(names) as any) as AsyncIterable<any> &
        AsyncIterator<any>;
    };
  };

  /**
   * Notice that this propagates event through storage
   * So you should not expect to fire in same process
   */
  publish = async (eventName: string, payload: any) => {
    await this.eventStore.publish(
      {
        payload,
        event: eventName,
      },
      this.topic,
    );
  };
}

export { PubSub };
export default PubSub;
