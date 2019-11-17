import { ulid } from 'ulid';
import { formatMessage } from '../formatMessage';
import { createWsHandler } from '../createWsHandler';
import { createSchema } from '../fixtures/schema';
import {
  LEGACY_SERVER_EVENT_TYPES,
  LEGACY_CLIENT_EVENT_TYPES,
  SERVER_EVENT_TYPES,
  CLIENT_EVENT_TYPES,
} from '../protocol';

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

    it('calls onDisconnect', async () => {
      const onDisconnect = jest.fn();
      const handler = createWsHandler({
        connectionManager,
        schema: createSchema(),
        onDisconnect,
      } as any);

      connectionManager.hydrateConnection.mockResolvedValueOnce({});

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

      expect(onDisconnect).toHaveBeenCalledTimes(1);
      expect(onDisconnect).toHaveBeenCalledWith({});
    });
  });

  describe('message phase', () => {
    const connectionManager = {
      hydrateConnection: jest.fn(),
      sendToConnection: jest.fn(),
      setConnectionData: jest.fn(),
      closeConnection: jest.fn(),
    };
    const subscriptionManager = {
      subscribe: jest.fn(),
      unsubscribeOperation: jest.fn(),
    };

    beforeEach(() => {
      connectionManager.hydrateConnection.mockReset();
      connectionManager.sendToConnection.mockReset();
      connectionManager.setConnectionData.mockReset();
      connectionManager.closeConnection.mockReset();
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
            body: formatMessage({
              payload: {},
              type: CLIENT_EVENT_TYPES.GQL_CONNECTION_INIT,
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
      ).resolves.toEqual({
        body: 'Conection could not be hydrated',
        statusCode: 500,
      });

      expect(connectionManager.hydrateConnection).toHaveBeenCalledTimes(1);
      expect(connectionManager.hydrateConnection).toHaveBeenCalledWith(
        '1',
        false,
      );
    });

    it('returns http 200 with GQL_CONNECTION_ACK on connection_init operation and sets context', async () => {
      const handler = createWsHandler({
        connectionManager,
        subscriptionManager,
        schema: createSchema(),
      } as any);

      connectionManager.hydrateConnection.mockResolvedValueOnce({});

      await expect(
        handler(
          {
            body: formatMessage({
              payload: {
                contextAttribute: 'contextAttributeValue',
              },
              type: CLIENT_EVENT_TYPES.GQL_CONNECTION_INIT,
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
            type: SERVER_EVENT_TYPES.GQL_CONNECTION_ACK,
          }),
          statusCode: 200,
        }),
      );

      expect(connectionManager.hydrateConnection).toHaveBeenCalledTimes(1);
      expect(connectionManager.hydrateConnection).toHaveBeenCalledWith(
        '1',
        false,
      );
      expect(connectionManager.sendToConnection).toHaveBeenCalledTimes(1);
      expect(connectionManager.setConnectionData).toHaveBeenCalledTimes(1);
      expect(connectionManager.setConnectionData).toHaveBeenCalledWith(
        {
          context: { contextAttribute: 'contextAttributeValue' },
          isInitialized: true,
        },
        {},
      );
    });

    it('calls onConnect and sets return object as context', async () => {
      const onConnect = jest.fn();
      onConnect.mockResolvedValueOnce({ key: 'value1' });

      const handler = createWsHandler({
        connectionManager,
        schema: createSchema(),
        onConnect,
      } as any);

      connectionManager.hydrateConnection.mockResolvedValueOnce({});

      await handler(
        {
          body: formatMessage({
            payload: { key: 'value2' },
            type: CLIENT_EVENT_TYPES.GQL_CONNECTION_INIT,
          }),
          requestContext: {
            connectionId: '1',
            domainName: 'domain',
            routeKey: '$default',
            stage: 'stage',
          } as any,
        } as any,
        {} as any,
      );

      expect(onConnect).toHaveBeenCalledTimes(1);
      expect(onConnect).toHaveBeenCalledWith({ key: 'value2' }, {});

      expect(connectionManager.setConnectionData).toHaveBeenCalledTimes(1);
      expect(connectionManager.setConnectionData).toHaveBeenCalledWith(
        {
          context: { key: 'value1' },
          isInitialized: true,
        },
        {},
      );
    });

    it('refuses connection when onConnect returns false', async () => {
      const onConnect = jest.fn();
      onConnect.mockResolvedValueOnce(false);

      const handler = createWsHandler({
        connectionManager,
        schema: createSchema(),
        onConnect,
      } as any);

      connectionManager.hydrateConnection.mockResolvedValueOnce({});

      await expect(
        handler(
          {
            body: formatMessage({
              payload: {},
              type: CLIENT_EVENT_TYPES.GQL_CONNECTION_INIT,
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
            type: SERVER_EVENT_TYPES.GQL_ERROR,
            payload: { message: 'Prohibited connection!' },
          }),
          statusCode: 401,
        }),
      );

      expect(onConnect).toHaveBeenCalledTimes(1);
      expect(onConnect).toHaveBeenCalledWith({}, {});

      expect(connectionManager.setConnectionData).toHaveBeenCalledTimes(0);

      expect(connectionManager.sendToConnection).toHaveBeenCalledTimes(1);
      expect(connectionManager.sendToConnection).toHaveBeenCalledWith(
        {},
        formatMessage({
          type: SERVER_EVENT_TYPES.GQL_ERROR,
          payload: { message: 'Prohibited connection!' },
        }),
      );

      expect(connectionManager.closeConnection).toHaveBeenCalledTimes(1);
      expect(connectionManager.closeConnection).toHaveBeenCalledWith({});
    });

    it('returns http 401 on not initialized connection operation', async () => {
      const handler = createWsHandler({
        connectionManager,
        subscriptionManager,
        schema: createSchema(),
        waitForInitialization: {
          timeout: 4,
          retryCount: 2,
        },
      } as any);
      const id = ulid();

      // because of retry count of 2
      connectionManager.hydrateConnection.mockResolvedValue({
        data: { isInitialized: false },
      });

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
            type: SERVER_EVENT_TYPES.GQL_ERROR,
            payload: { message: 'Prohibited connection!' },
          }),
          statusCode: 401,
        }),
      );

      expect(connectionManager.hydrateConnection).toHaveBeenCalledTimes(3);
      expect(connectionManager.hydrateConnection).toHaveBeenCalledWith(
        '1',
        false,
      );
      expect(connectionManager.sendToConnection).toHaveBeenCalledTimes(1);
    });

    it('returns http 200 with GQL_DATA on query operation and calls onOperationComplete', async () => {
      const onOperationComplete = jest.fn();
      const handler = createWsHandler({
        connectionManager,
        subscriptionManager,
        schema: createSchema(),
        onOperationComplete,
      } as any);
      const id = ulid();

      connectionManager.hydrateConnection.mockResolvedValueOnce({
        data: { isInitialized: true },
      });

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
      expect(connectionManager.hydrateConnection).toHaveBeenCalledWith(
        '1',
        false,
      );
      expect(connectionManager.sendToConnection).toHaveBeenCalledTimes(1);
      expect(onOperationComplete).toHaveBeenCalledTimes(1);
      expect(onOperationComplete).toHaveBeenCalledWith(
        { data: { isInitialized: true } },
        id,
      );
    });

    it('returns http 200 with GQL_DATA on mutation operation', async () => {
      const handler = createWsHandler({
        connectionManager,
        subscriptionManager,
        schema: createSchema(),
      } as any);
      const id = ulid();

      connectionManager.hydrateConnection.mockResolvedValueOnce({
        data: { isInitialized: true },
      });

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
      expect(connectionManager.hydrateConnection).toHaveBeenCalledWith(
        '1',
        false,
      );
      expect(connectionManager.sendToConnection).toHaveBeenCalledTimes(1);
    });

    it('calls onOperation and changes execute parameters on mutation operation', async () => {
      const onOperation = jest.fn((message, params) => ({
        ...params,
        variables: {
          text: 'variable from server',
        },
      }));
      const handler = createWsHandler({
        connectionManager,
        subscriptionManager,
        schema: createSchema(),
        onOperation,
      } as any);
      const id = ulid();

      connectionManager.hydrateConnection.mockResolvedValueOnce({
        data: { isInitialized: true },
      });

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
                  text: 'variable from client',
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
            payload: { data: { testMutation: 'variable from server' } },
            type: SERVER_EVENT_TYPES.GQL_DATA,
          }),
          statusCode: 200,
        }),
      );

      expect(onOperation).toHaveBeenCalledTimes(1);
    });

    it('registers the subscription on non legacy protocol', async () => {
      const handler = createWsHandler({
        connectionManager,
        subscriptionManager,
        schema: createSchema(),
      } as any);
      const id = ulid();

      connectionManager.hydrateConnection.mockResolvedValueOnce({
        data: {
          isInitialized: true,
        },
      });

      expect(subscriptionManager.subscribe).not.toHaveBeenCalled();

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
      expect(connectionManager.hydrateConnection).toHaveBeenCalledWith(
        '1',
        false,
      );
      expect(subscriptionManager.subscribe).toHaveBeenCalledTimes(1);
    });

    it('returns http 200 with GQL_SUBSCRIBED on legacy subscription operation', async () => {
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
              type: LEGACY_CLIENT_EVENT_TYPES.GQL_START,
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
            payload: {},
            type: LEGACY_SERVER_EVENT_TYPES.GQL_SUBSCRIBED,
          }),
          statusCode: 200,
        }),
      );

      expect(connectionManager.hydrateConnection).toHaveBeenCalledTimes(1);
      expect(connectionManager.hydrateConnection).toHaveBeenCalledWith(
        '1',
        true,
      );
      expect(subscriptionManager.subscribe).toHaveBeenCalledTimes(1);
    });

    it('returns http 200 with GQL_COMPLETE on unsubscibe and calls onOperationComplete', async () => {
      const onOperationComplete = jest.fn();
      const handler = createWsHandler({
        connectionManager,
        subscriptionManager,
        schema: createSchema(),
        onOperationComplete,
      } as any);
      const id = ulid();

      connectionManager.hydrateConnection.mockResolvedValueOnce({
        data: { isInitialized: true },
      });

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
      expect(connectionManager.hydrateConnection).toHaveBeenCalledWith(
        '1',
        false,
      );
      expect(subscriptionManager.unsubscribeOperation).toHaveBeenCalledTimes(1);
      expect(connectionManager.sendToConnection).toHaveBeenCalledTimes(1);
      expect(onOperationComplete).toHaveBeenCalledTimes(1);
      expect(onOperationComplete).toHaveBeenCalledWith(
        { data: { isInitialized: true } },
        id,
      );
    });

    it('returns http 200 with GQL_DATA on invalid operation', async () => {
      const handler = createWsHandler({
        connectionManager,
        subscriptionManager,
        schema: createSchema(),
      } as any);
      const id = ulid();

      connectionManager.hydrateConnection.mockResolvedValueOnce({
        data: { isInitialized: true },
      });

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
      expect(connectionManager.hydrateConnection).toHaveBeenCalledWith(
        '1',
        false,
      );
      expect(connectionManager.sendToConnection).toHaveBeenCalledTimes(1);
    });
  });
});
