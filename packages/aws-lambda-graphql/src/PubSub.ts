import assert from 'assert';
import { IEventStore, OperationRequest, SubcribeResolveFn } from './types';

interface PubSubOptions {
  /**
   * Event store instance where events will be published
   */
  eventStore: IEventStore;
  /**
   * Serialize event payload to JSON, default is true.
   */
  serializeEventPayload?: boolean;
  /**
   * Enable console.log
   */
  debug?: boolean;
}

export class PubSub {
  private eventStore: IEventStore;

  private serializeEventPayload: boolean;

  private debug: boolean;

  constructor({
    eventStore,
    serializeEventPayload = true,
    debug = false,
  }: PubSubOptions) {
    assert.ok(
      eventStore && typeof eventStore === 'object',
      'Please provide eventStore as an instance implementing IEventStore',
    );
    assert.ok(
      typeof serializeEventPayload === 'boolean',
      'Please provide serializeEventPayload as a boolean',
    );
    assert.ok(typeof debug === 'boolean', 'Please provide debug as a boolean');
    this.eventStore = eventStore;
    this.serializeEventPayload = serializeEventPayload;
    this.debug = debug;
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
        if (this.debug)
          console.log('Create subscription', names, connection, operation);
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
      payload: this.serializeEventPayload ? JSON.stringify(payload) : payload,
      event: eventName,
    });
  };
}
