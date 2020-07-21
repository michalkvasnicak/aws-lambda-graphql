import { createAsyncIterator } from 'iterall';
import {
  IConnection,
  ISubscriber,
  ISubscriptionManager,
  OperationRequest,
} from './types';

// polyfill Symbol.asyncIterator
if (Symbol.asyncIterator === undefined) {
  (Symbol as any).asyncIterator = Symbol.for('asyncIterator');
}

export class MemorySubscriptionManager implements ISubscriptionManager {
  private subscriptions: Map<string, ISubscriber[]>;

  constructor() {
    this.subscriptions = new Map();
  }

  subscribersByEventName = (
    name: string,
  ): AsyncIterable<ISubscriber[]> & AsyncIterator<ISubscriber[]> => {
    return {
      [Symbol.asyncIterator]: () => {
        const subscriptions = this.subscriptions.get(name) || [];

        const subscribers = subscriptions.filter(
          (subscriber) => subscriber.event === name,
        );

        return createAsyncIterator([subscribers]);
      },
    } as any;
  };

  subscribe = async (
    names: string[],
    connection: IConnection,
    operation: OperationRequest & { operationId: string },
  ): Promise<void> => {
    names.forEach((name) => {
      const subscriptions = this.subscriptions.get(name);
      const subscription = {
        connection,
        operation,
        event: name,
        operationId: operation.operationId,
      };

      if (subscriptions == null) {
        this.subscriptions.set(name, [subscription]);
      } else if (
        !subscriptions.find((s) => s.connection.id === connection.id)
      ) {
        subscriptions.push({
          connection,
          operation,
          event: name,
          operationId: operation.operationId,
        });
      }
    });
  };

  unsubscribe = async (subscriber: ISubscriber) => {
    const subscriptions = this.subscriptions.get(subscriber.event);

    if (subscriptions) {
      this.subscriptions.set(
        subscriber.event,
        subscriptions.filter(
          (s) => s.connection.id !== subscriber.connection.id,
        ),
      );
    }
  };

  unsubscribeOperation = async (connectionId: string, operationId: string) => {
    this.subscriptions.forEach((subscribers, event) => {
      this.subscriptions.set(
        event,
        subscribers.filter(
          (subscriber) =>
            subscriber.connection.id !== connectionId &&
            subscriber.operationId !== operationId,
        ),
      );
    });
  };

  unsubscribeAllByConnectionId = (connectionId: string) => {
    for (const key of this.subscriptions.keys()) {
      this.subscriptions.set(
        key,
        this.subscriptions
          .get(key)!
          .filter((s) => s.connection.id === connectionId),
      );
    }

    return Promise.resolve();
  };
}
