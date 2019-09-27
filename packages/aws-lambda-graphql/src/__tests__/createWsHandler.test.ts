import { ulid } from 'ulid';
import { formatMessage } from '../formatMessage';
import { createWsHandler } from '../createWsHandler';
import { createSchema } from '../fixtures/schema';
import { SERVER_EVENT_TYPES, CLIENT_EVENT_TYPES } from '../protocol';

describe('createWsHandler', () => {
  it('returns http 500 on invalid routeKey in event', async () => {
    const handler = createWsHandler({} as any);

    await expect(
      handler(
        { body: '', requestContext: { routeKey: 'unknown' as any } as any },
        {} as any,
      ),
    ).resolves.toEqual({
      body: 'Invalid event unknown received',
      statusCode: 500,
    });
  });

  describe('connect phase', () => {
    const connectionManager = {
      registerConnection: jest.fn(),
    };

    beforeEach(() => {
      connectionManager.registerConnection.mockReset();
    });

    it('returns http 500 if connection could not be registered', async () => {
      const handler = createWsHandler({
        connectionManager,
        schema: createSchema(),
      } as any);

      connectionManager.registerConnection.mockRejectedValueOnce(
        new Error('Could not register a connection'),
      );

      await expect(
        handler(
          {
            requestContext: {
              connectionId: '1',
              domainName: 'domain',
              routeKey: '$connect',
              stage: 'stage',
            } as any,
          } as any,
          {} as any,
        ),
      ).resolves.toEqual({
        body: 'Could not register a connection',
        statusCode: 500,
      });

      expect(connectionManager.registerConnection).toHaveBeenCalledTimes(1);
      expect(connectionManager.registerConnection).toHaveBeenCalledWith({
        endpoint: 'domain/stage',
        connectionId: '1',
      });
    });

    it('returns http 200 with the body of GQL_CONNECTED message', async () => {
      const handler = createWsHandler({
        connectionManager,
        schema: createSchema(),
      } as any);

      connectionManager.registerConnection.mockResolvedValueOnce({});

      await expect(
        handler(
          {
            requestContext: {
              connectionId: '1',
              domainName: 'domain',
              routeKey: '$connect',
              stage: 'stage',
            } as any,
          } as any,
          {} as any,
        ),
      ).resolves.toEqual(
        expect.objectContaining({
          body: '',
          statusCode: 200,
        }),
      );

      expect(connectionManager.registerConnection).toHaveBeenCalledTimes(1);
      expect(connectionManager.registerConnection).toHaveBeenCalledWith({
        endpoint: 'domain/stage',
        connectionId: '1',
      });
    });
  });

  describe('disconnect phase', () => {
    const connectionManager = {
      hydrateConnection: jest.fn(),
      unregisterConnection: jest.fn(),
    };

    beforeEach(() => {
      connectionManager.hydrateConnection.mockReset();
      connectionManager.unregisterConnection.mockReset();
    });

    it('unregisters connection', async () => {
      const handler = createWsHandler({
        connectionManager,
        schema: createSchema(),
      } as any);

      connectionManager.hydrateConnection.mockResolvedValueOnce({});
      connectionManager.unregisterConnection.mockResolvedValueOnce(undefined);

      await expect(
        handler(
          {
            requestContext: {
              connectionId: '1',
              domainName: 'domain',
              routeKey: '$disconnect',
              stage: 'stage',
            } as any,
          } as any,
          {} as any,
        ),
      ).resolves.toBeUndefined();

      expect(connectionManager.hydrateConnection).toHaveBeenCalledTimes(1);
      expect(connectionManager.hydrateConnection).toHaveBeenCalledWith('1');
      expect(connectionManager.unregisterConnection).toHaveBeenCalledTimes(1);
      expect(connectionManager.unregisterConnection).toHaveBeenCalledWith({});
    });
  });

  describe('message phase', () => {
    const connectionManager = {
      hydrateConnection: jest.fn(),
      sendToConnection: jest.fn(),
    };
    const subscriptionManager = {
      subscribe: jest.fn(),
      unsubscribeOperation: jest.fn(),
    };

    beforeEach(() => {
      connectionManager.hydrateConnection.mockReset();
      connectionManager.sendToConnection.mockReset();
      subscriptionManager.subscribe.mockReset();
      subscriptionManager.unsubscribeOperation.mockReset();
    });

    it('returns http 500 if connection could not be hydrated', async () => {
      const handler = createWsHandler({
        connectionManager,
        subscriptionManager,
        schema: createSchema(),
      } as any);

      connectionManager.hydrateConnection.mockRejectedValueOnce(
        new Error('Conection could not be hydrated'),
      );

      await expect(
        handler(
          {
            requestContext: {
              connectionId: '1',
              domainName: 'domain',
              routeKey: '$default',
              stage: 'stage',
            } as any,
          } as any,
          {} as any,
        ),
      ).resolves.toEqual({
        body: 'Conection could not be hydrated',
        statusCode: 500,
      });

      expect(connectionManager.hydrateConnection).toHaveBeenCalledTimes(1);
      expect(connectionManager.hydrateConnection).toHaveBeenCalledWith('1');
    });

    it('returns http 200 with GQL_DATA on query operation', async () => {
      const handler = createWsHandler({
        connectionManager,
        subscriptionManager,
        schema: createSchema(),
      } as any);
      const id = ulid();

      connectionManager.hydrateConnection.mockResolvedValueOnce({});

      await expect(
        handler(
          {
            body: formatMessage({
              id,
              payload: {
                query: /* GraphQL */ `
                  query Test {
                    testQuery
                  }
                `,
              },
              type: CLIENT_EVENT_TYPES.GQL_START,
            }),
            requestContext: {
              connectionId: '1',
              domainName: 'domain',
              routeKey: '$default',
              stage: 'stage',
            } as any,
          } as any,
          {} as any,
        ),
      ).resolves.toEqual(
        expect.objectContaining({
          body: formatMessage({
            id,
            payload: { data: { testQuery: 'test' } },
            type: SERVER_EVENT_TYPES.GQL_DATA,
          }),
          statusCode: 200,
        }),
      );

      expect(connectionManager.hydrateConnection).toHaveBeenCalledTimes(1);
      expect(connectionManager.hydrateConnection).toHaveBeenCalledWith('1');
      expect(connectionManager.sendToConnection).toHaveBeenCalledTimes(1);
    });

    it('returns http 200 with GQL_DATA on mutation operation', async () => {
      const handler = createWsHandler({
        connectionManager,
        subscriptionManager,
        schema: createSchema(),
      } as any);
      const id = ulid();

      connectionManager.hydrateConnection.mockResolvedValueOnce({});

      await expect(
        handler(
          {
            body: formatMessage({
              id,
              payload: {
                query: /* GraphQL */ `
                  mutation Test($text: String!) {
                    testMutation(text: $text)
                  }
                `,
                variables: {
                  text: 'Test this',
                },
              },
              type: CLIENT_EVENT_TYPES.GQL_START,
            }),
            requestContext: {
              connectionId: '1',
              domainName: 'domain',
              routeKey: '$default',
              stage: 'stage',
            } as any,
          } as any,
          {} as any,
        ),
      ).resolves.toEqual(
        expect.objectContaining({
          body: formatMessage({
            id,
            payload: { data: { testMutation: 'Test this' } },
            type: SERVER_EVENT_TYPES.GQL_DATA,
          }),
          statusCode: 200,
        }),
      );

      expect(connectionManager.hydrateConnection).toHaveBeenCalledTimes(1);
      expect(connectionManager.hydrateConnection).toHaveBeenCalledWith('1');
      expect(connectionManager.sendToConnection).toHaveBeenCalledTimes(1);
    });

    it('returns http 200 on subscription operation', async () => {
      const handler = createWsHandler({
        connectionManager,
        subscriptionManager,
        schema: createSchema(),
      } as any);
      const id = ulid();

      connectionManager.hydrateConnection.mockResolvedValueOnce({});

      await expect(
        handler(
          {
            body: formatMessage({
              id,
              payload: {
                query: /* GraphQL */ `
                  subscription Test($authorId: ID!) {
                    textFeed(authorId: $authorId)
                  }
                `,
                variables: {
                  authorId: 1,
                },
              },
              type: CLIENT_EVENT_TYPES.GQL_START,
            }),
            requestContext: {
              connectionId: '1',
              domainName: 'domain',
              routeKey: '$default',
              stage: 'stage',
            } as any,
          } as any,
          {} as any,
        ),
      ).resolves.toEqual(
        expect.objectContaining({
          body: '',
          statusCode: 200,
        }),
      );

      expect(connectionManager.hydrateConnection).toHaveBeenCalledTimes(1);
      expect(connectionManager.hydrateConnection).toHaveBeenCalledWith('1');
      expect(subscriptionManager.subscribe).toHaveBeenCalledTimes(1);
    });

    it('returns http 200 with GQL_COMPLETE on unsubscibe', async () => {
      const handler = createWsHandler({
        connectionManager,
        subscriptionManager,
        schema: createSchema(),
      } as any);
      const id = ulid();

      connectionManager.hydrateConnection.mockResolvedValueOnce({});

      await expect(
        handler(
          {
            body: formatMessage({
              id,
              type: CLIENT_EVENT_TYPES.GQL_STOP,
            }),
            requestContext: {
              connectionId: '1',
              domainName: 'domain',
              routeKey: '$default',
              stage: 'stage',
            } as any,
          } as any,
          {} as any,
        ),
      ).resolves.toEqual(
        expect.objectContaining({
          body: formatMessage({
            id,
            type: SERVER_EVENT_TYPES.GQL_COMPLETE,
          }),
          statusCode: 200,
        }),
      );

      expect(connectionManager.hydrateConnection).toHaveBeenCalledTimes(1);
      expect(connectionManager.hydrateConnection).toHaveBeenCalledWith('1');
      expect(subscriptionManager.unsubscribeOperation).toHaveBeenCalledTimes(1);
      expect(connectionManager.sendToConnection).toHaveBeenCalledTimes(0);
    });

    it('returns http 200 with GQL_DATA on invalid operation', async () => {
      const handler = createWsHandler({
        connectionManager,
        subscriptionManager,
        schema: createSchema(),
      } as any);
      const id = ulid();

      connectionManager.hydrateConnection.mockResolvedValueOnce({});

      await expect(
        handler(
          {
            body: formatMessage({
              id,
              payload: {
                query: /* GraphQL */ `
                  subscription Test($authorId: ID!) {
                    notExistingSubscription(authorId: $authorId)
                  }
                `,
                variables: {
                  authorId: 1,
                },
              },
              type: CLIENT_EVENT_TYPES.GQL_START,
            }),
            requestContext: {
              connectionId: '1',
              domainName: 'domain',
              routeKey: '$default',
              stage: 'stage',
            } as any,
          } as any,
          {} as any,
        ),
      ).resolves.toEqual(
        expect.objectContaining({
          body: expect.stringMatching(
            /^\{"id":"[A-Z0-9]{26}","payload":\{.+Cannot query field.+\},"type":"data"\}$/,
          ),
          statusCode: 200,
        }),
      );

      expect(connectionManager.hydrateConnection).toHaveBeenCalledTimes(1);
      expect(connectionManager.hydrateConnection).toHaveBeenCalledWith('1');
      expect(connectionManager.sendToConnection).toHaveBeenCalledTimes(1);
    });
  });
});
