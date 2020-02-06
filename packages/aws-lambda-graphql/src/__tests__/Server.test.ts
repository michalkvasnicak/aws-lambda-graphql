import { APIGatewayProxyEvent } from 'aws-lambda';
import { ulid } from 'ulid';
import { createSchema } from '../fixtures/schema';
import { Server } from '../Server';
import {
  IConnection,
  IConnectionManager,
  ISubscriptionManager,
} from '../types';
import { formatMessage } from '../formatMessage';
import { SERVER_EVENT_TYPES, CLIENT_EVENT_TYPES } from '../protocol';
import { ConnectionNotFoundError } from '../DynamoDBConnectionManager';

describe('Server', () => {
  describe('createHttpHandler()', () => {
    const server = new Server({
      connectionManager: {} as any,
      schema: createSchema(),
      subscriptionManager: {} as any,
    });
    const handler = server.createHttpHandler();

    it('serves JSON POST requests', async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: /* GraphQL */ `
            query Test {
              testQuery
            }
          `,
        }),
      } as any;

      await expect(handler(event, {} as any)).resolves.toEqual({
        body: `${JSON.stringify({ data: { testQuery: 'test' } })}\n`,
        headers: {
          'Content-Length': '30',
          'Content-Type': 'application/json',
        },
        statusCode: 200,
      });
    });

    it('server GET requests', async () => {
      const event: any = {
        httpMethod: 'GET',
        headers: {},
        queryStringParameters: {
          query: /* GraphQL */ `
            query Test {
              testQuery
            }
          `,
        },
      } as Partial<APIGatewayProxyEvent>;

      await expect(handler(event, {} as any)).resolves.toEqual({
        body: `${JSON.stringify({ data: { testQuery: 'test' } })}\n`,
        headers: {
          'Content-Length': '30',
          'Content-Type': 'application/json',
        },
        statusCode: 200,
      });
    });
  });

  describe('createWebSocketHandler', () => {
    const connectionManager: IConnectionManager = {
      closeConnection: jest.fn(),
      registerConnection: jest.fn(),
      hydrateConnection: jest.fn(),
      sendToConnection: jest.fn(),
      setConnectionData: jest.fn(),
      unregisterConnection: jest.fn(),
    };
    const subscriptionManager: ISubscriptionManager = {
      subscribe: jest.fn(),
      subscribersByEventName: jest.fn(),
      unsubscribe: jest.fn(),
      unsubscribeAllByConnectionId: jest.fn(),
      unsubscribeOperation: jest.fn(),
    };

    beforeEach(() => {
      // eslint-disable-next-line guard-for-in
      for (const key in connectionManager) {
        (connectionManager[key] as jest.Mock).mockReset();
      }

      // eslint-disable-next-line guard-for-in
      for (const key in subscriptionManager) {
        (subscriptionManager[key] as jest.Mock).mockReset();
      }
    });

    describe('connect phase', () => {
      const server = new Server({
        connectionManager,
        schema: createSchema(),
        subscriptionManager,
      });
      const handler = server.createWebSocketHandler();

      it('returns http 500 if connection could not be registered', async () => {
        (connectionManager.registerConnection as jest.Mock).mockRejectedValueOnce(
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
        (connectionManager.registerConnection as jest.Mock).mockResolvedValueOnce(
          {},
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

      it('recover from missing connection on quick succession of $connect and GQL_CONNECTION_INIT message on offline server', async () => {
        // Mock the connection database flow
        let connection;
        (connectionManager.registerConnection as jest.Mock).mockImplementationOnce(
          c => {
            connection = c;
          },
        );
        (connectionManager.hydrateConnection as jest.Mock).mockImplementationOnce(
          async connectionId => {
            for (let i = 0; i <= 1; i++) {
              if (connection) {
                return connection as IConnection;
              }
              // wait for another round
              await new Promise(r => setTimeout(r, 50));
            }
            throw new ConnectionNotFoundError(
              `Connection ${connectionId} not found`,
            );
          },
        );
        // Call connection request before connect to over emphasize the case
        const gqlConnectionRequest = handler(
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
        );
        await handler(
          {
            requestContext: {
              connectionId: '1',
              domainName: 'domain',
              routeKey: '$connect',
              stage: 'stage',
            } as any,
          } as any,
          {} as any,
        );
        await expect(gqlConnectionRequest).resolves.toEqual(
          expect.objectContaining({
            body: formatMessage({
              type: SERVER_EVENT_TYPES.GQL_CONNECTION_ACK,
            }),
            statusCode: 200,
          }),
        );
      });
    });

    describe('disconnect phase', () => {
      const server = new Server({
        connectionManager,
        schema: createSchema(),
        subscriptionManager,
      });
      const handler = server.createWebSocketHandler();

      it('unregisters connection', async () => {
        (connectionManager.hydrateConnection as jest.Mock).mockResolvedValueOnce(
          {},
        );
        (connectionManager.unregisterConnection as jest.Mock).mockResolvedValueOnce(
          undefined,
        );

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
        ).resolves.toEqual({
          statusCode: 200,
          body: '',
        });

        expect(connectionManager.hydrateConnection).toHaveBeenCalledTimes(1);
        expect(connectionManager.hydrateConnection).toHaveBeenCalledWith('1');
        expect(connectionManager.unregisterConnection).toHaveBeenCalledTimes(1);
        expect(connectionManager.unregisterConnection).toHaveBeenCalledWith({});
      });

      it('calls onDisconnect', async () => {
        const onDisconnect = jest.fn();
        const handlerWithOnDisconnect = new Server({
          connectionManager,
          schema: createSchema(),
          subscriptionManager,
          subscriptions: {
            onDisconnect,
          },
        }).createWebSocketHandler();

        (connectionManager.hydrateConnection as jest.Mock).mockResolvedValueOnce(
          {},
        );

        await expect(
          handlerWithOnDisconnect(
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
        ).resolves.toEqual({
          statusCode: 200,
          body: '',
        });

        expect(onDisconnect).toHaveBeenCalledTimes(1);
        expect(onDisconnect).toHaveBeenCalledWith({});
      });
    });

    describe('message phase', () => {
      const server = new Server({
        connectionManager,
        schema: createSchema(),
        subscriptionManager,
      });
      const handler = server.createWebSocketHandler();

      it('returns http 500 if connection could not be hydrated', async () => {
        (connectionManager.hydrateConnection as jest.Mock).mockRejectedValueOnce(
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
        expect(connectionManager.hydrateConnection).toHaveBeenCalledWith('1', {
          retryCount: 10,
          timeout: 50,
        });
      });

      it('returns http 200 with GQL_CONNECTION_ACK on connection_init operation and sets context', async () => {
        (connectionManager.hydrateConnection as jest.Mock).mockResolvedValueOnce(
          {},
        );

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
        expect(connectionManager.hydrateConnection).toHaveBeenCalledWith('1', {
          retryCount: 10,
          timeout: 50,
        });
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
        const onConnect = jest.fn().mockResolvedValueOnce({ key: 'value1' });
        const handlerWithOnConnect = new Server({
          connectionManager,
          schema: createSchema(),
          subscriptionManager,
          subscriptions: {
            onConnect,
          },
        }).createWebSocketHandler();

        (connectionManager.hydrateConnection as jest.Mock).mockResolvedValueOnce(
          {},
        );

        await handlerWithOnConnect(
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

      it('calls context constructor function with event, lambdaContext, internal context and connection state context', async () => {
        const contextBuilder = jest.fn();
        const handlerWithContext = new Server({
          connectionManager,
          context: contextBuilder,
          schema: createSchema(),
          subscriptionManager,
        }).createWebSocketHandler();
        const id = ulid();

        (connectionManager.hydrateConnection as jest.Mock).mockResolvedValueOnce(
          {
            data: {
              context: { foo: 'connectionContextValue' },
              isInitialized: true,
            },
          },
        );

        const lambdaContext = {} as any;
        const event = {
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
        } as any;

        await handlerWithContext(event, lambdaContext);

        expect(contextBuilder).toHaveBeenCalledTimes(1);
        expect(contextBuilder).toHaveBeenCalledWith({
          foo: 'connectionContextValue',
          event,
          lambdaContext,
          $$internal: expect.any(Object),
        });
      });

      it('refuses connection when onConnect returns false', async () => {
        const onConnect = jest.fn().mockResolvedValueOnce(false);
        const handlerWithOnConnect = new Server({
          connectionManager,
          schema: createSchema(),
          subscriptionManager,
          subscriptions: {
            onConnect,
          },
        }).createWebSocketHandler();

        (connectionManager.hydrateConnection as jest.Mock).mockResolvedValueOnce(
          {},
        );

        await expect(
          handlerWithOnConnect(
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
        const handlerWithTimeout = new Server({
          connectionManager,
          schema: createSchema(),
          subscriptionManager,
          subscriptions: {
            waitForInitialization: {
              timeout: 4,
              retryCount: 2,
            },
          },
        }).createWebSocketHandler();
        const id = ulid();

        // because of retry count of 2
        (connectionManager.hydrateConnection as jest.Mock).mockResolvedValue({
          data: { isInitialized: false },
        });

        await expect(
          handlerWithTimeout(
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
        expect(connectionManager.hydrateConnection).toHaveBeenCalledWith('1');
        expect(connectionManager.sendToConnection).toHaveBeenCalledTimes(1);
      });

      it('returns http 200 with GQL_DATA on query operation and calls onOperationComplete', async () => {
        const onOperationComplete = jest.fn();
        const handlerWithOnOperationComplete = new Server({
          connectionManager,
          schema: createSchema(),
          subscriptionManager,
          subscriptions: {
            onOperationComplete,
          },
        }).createWebSocketHandler();
        const id = ulid();

        (connectionManager.hydrateConnection as jest.Mock).mockResolvedValueOnce(
          {
            data: { isInitialized: true },
          },
        );

        await expect(
          handlerWithOnOperationComplete(
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
        expect(connectionManager.hydrateConnection).toHaveBeenCalledWith('1', {
          retryCount: 0,
          timeout: 50,
        });
        expect(connectionManager.sendToConnection).toHaveBeenCalledTimes(1);
        expect(onOperationComplete).toHaveBeenCalledTimes(1);
        expect(onOperationComplete).toHaveBeenCalledWith(
          { data: { isInitialized: true } },
          id,
        );
      });

      it('returns http 200 with GQL_DATA on mutation operation', async () => {
        const id = ulid();

        (connectionManager.hydrateConnection as jest.Mock).mockResolvedValueOnce(
          {
            data: { isInitialized: true },
          },
        );

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
        expect(connectionManager.hydrateConnection).toHaveBeenCalledWith('1', {
          retryCount: 0,
          timeout: 50,
        });
        expect(connectionManager.sendToConnection).toHaveBeenCalledTimes(1);
      });

      it('calls onOperation and changes execute parameters on mutation operation', async () => {
        const onOperation = jest.fn((message, params) => ({
          ...params,
          variables: {
            text: 'variable from server',
          },
        }));
        const handlerWithOnOperation = new Server({
          connectionManager,
          schema: createSchema(),
          subscriptionManager,
          subscriptions: {
            onOperation,
          },
        }).createWebSocketHandler();
        const id = ulid();

        (connectionManager.hydrateConnection as jest.Mock).mockResolvedValueOnce(
          {
            data: { isInitialized: true },
          },
        );

        await expect(
          handlerWithOnOperation(
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

      it('returns http 200 with GQL_COMPLETE on unsubscibe and calls onOperationComplete', async () => {
        const onOperationComplete = jest.fn();
        const handlerWithOnOperation = new Server({
          connectionManager,
          schema: createSchema(),
          subscriptionManager,
          subscriptions: {
            onOperationComplete,
          },
        }).createWebSocketHandler();
        const id = ulid();

        (connectionManager.hydrateConnection as jest.Mock).mockResolvedValueOnce(
          {
            data: { isInitialized: true },
          },
        );

        await expect(
          handlerWithOnOperation(
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
        expect(connectionManager.hydrateConnection).toHaveBeenCalledWith('1', {
          retryCount: 0,
          timeout: 50,
        });
        expect(subscriptionManager.unsubscribeOperation).toHaveBeenCalledTimes(
          1,
        );
        expect(connectionManager.sendToConnection).toHaveBeenCalledTimes(1);
        expect(onOperationComplete).toHaveBeenCalledTimes(1);
        expect(onOperationComplete).toHaveBeenCalledWith(
          { data: { isInitialized: true } },
          id,
        );
      });

      it('returns http 200 with GQL_DATA on invalid operation', async () => {
        const id = ulid();

        (connectionManager.hydrateConnection as jest.Mock).mockResolvedValueOnce(
          {
            data: { isInitialized: true },
          },
        );

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
        expect(connectionManager.hydrateConnection).toHaveBeenCalledWith('1', {
          retryCount: 0,
          timeout: 50,
        });
        expect(connectionManager.sendToConnection).toHaveBeenCalledTimes(1);
      });
    });
  });
});
