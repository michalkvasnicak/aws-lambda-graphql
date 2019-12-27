import { isAsyncIterable } from 'iterall';
import { PubSub as BasePubSub } from 'graphql-subscriptions';
import { PubSub } from '../PubSub';
import { ISubscriptionManager, IConnectionManager } from '../types';

describe('PubSub', () => {
  const eventStore = {
    publish: jest.fn(),
  };

  beforeEach(() => {
    eventStore.publish.mockReset();
  });

  describe('subscribe', () => {
    it('registers subscription and returns iterator', async () => {
      const connectionManager: IConnectionManager = {} as any;
      const subscriptionManager: ISubscriptionManager = {
        subscribe: jest.fn(),
      } as any;
      const ps = new PubSub({ eventStore: eventStore as any });

      const subscriber = ps.subscribe('test');

      const connection: any = {};
      const operation: any = {};
      const iterator = await subscriber(null, null, {
        event: {} as any,
        lambdaContext: {} as any,
        $$internal: {
          connection,
          connectionManager,
          operation,
          subscriptionManager,
          pubSub: new BasePubSub(),
          registerSubscriptions: true,
        },
      });

      expect(isAsyncIterable(iterator)).toBe(true);
      expect(subscriptionManager.subscribe).toHaveBeenCalledWith(
        ['test'],
        connection,
        operation,
      );
    });

    it('skips subscription registration and returns iterator', async () => {
      const connectionManager: IConnectionManager = {} as any;
      const subscriptionManager: ISubscriptionManager = {
        subscribe: jest.fn(),
      } as any;
      const ps = new PubSub({ eventStore: eventStore as any });

      const subscriber = ps.subscribe('test');

      const connection: any = {};
      const operation: any = {};
      const iterator = await subscriber(null, null, {
        event: {} as any,
        lambdaContext: {} as any,
        $$internal: {
          connection,
          connectionManager,
          operation,
          subscriptionManager,
          pubSub: new BasePubSub(),
        },
      });

      expect(isAsyncIterable(iterator)).toBe(true);
      expect(subscriptionManager.subscribe).not.toHaveBeenCalled();
    });
  });

  describe('publish', () => {
    it('does not allow to publish event with empty name', async () => {
      const ps = new PubSub({ eventStore: eventStore as any });

      await expect(ps.publish(undefined, {})).rejects.toThrowError(
        'Event name must be nonempty string',
      );
      await expect(ps.publish(null, {})).rejects.toThrowError(
        'Event name must be nonempty string',
      );
      await expect(ps.publish('', {})).rejects.toThrowError(
        'Event name must be nonempty string',
      );
    });

    it('works correctly', async () => {
      const ps = new PubSub({ eventStore: eventStore as any });

      await expect(ps.publish('test', {})).resolves.toBeUndefined();

      expect(eventStore.publish).toBeCalledTimes(1);
      expect(eventStore.publish).toBeCalledWith({
        event: 'test',
        payload: JSON.stringify({}),
      });
    });
  });
});
