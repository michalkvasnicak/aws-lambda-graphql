import { isAsyncIterable } from 'iterall';
import { PubSub as BasePubSub } from 'graphql-subscriptions';
import { PubSub } from '../PubSub';

describe('PubSub', () => {
  const eventStore = {
    publish: jest.fn(),
  };

  beforeEach(() => {
    eventStore.publish.mockReset();
  });

  describe('subscribe', () => {
    it('registers subscription and returns iterator', async () => {
      const subscriptionManager = {
        subscribe: jest.fn(),
      };
      const ps = new PubSub({ eventStore: eventStore as any });

      const subscriber = ps.subscribe('test');

      const connection = {};
      const operation = {};
      const iterator = await subscriber(null, null, {
        $$internal: {
          connection,
          operation,
          subscriptionManager,
          pubSub: new BasePubSub(),
          registerSubscriptions: true,
        } as any,
      });

      expect(isAsyncIterable(iterator)).toBe(true);
      expect(subscriptionManager.subscribe).toHaveBeenCalledWith(
        ['test'],
        connection,
        operation,
      );
    });

    it('skips subscription registration and returns iterator', async () => {
      const subscriptionManager = {
        subscribe: jest.fn(),
      };
      const ps = new PubSub({ eventStore: eventStore as any });

      const subscriber = ps.subscribe('test');

      const connection = {};
      const operation = {};
      const iterator = await subscriber(null, null, {
        $$internal: {
          connection,
          operation,
          subscriptionManager,
          pubSub: new BasePubSub(),
        } as any,
      });

      expect(isAsyncIterable(iterator)).toBe(true);
      expect(subscriptionManager.subscribe).not.toHaveBeenCalled();
    });
  });

  describe('publish', () => {
    it('does not allow to publish event with empty name', async () => {
      const ps = new PubSub({ eventStore: eventStore as any });

      await expect(ps.publish(undefined, {})).rejects.toThrowError(
        'Event name cannot be empty',
      );
      await expect(ps.publish(null, {})).rejects.toThrowError(
        'Event name cannot be empty',
      );
      await expect(ps.publish('', {})).rejects.toThrowError(
        'Event name cannot be empty',
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
