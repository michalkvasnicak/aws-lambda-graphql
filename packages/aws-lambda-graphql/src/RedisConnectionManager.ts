import assert from 'assert';
import { ApiGatewayManagementApi } from 'aws-sdk';
import { Redis } from 'ioredis';
import { ConnectionNotFoundError } from './errors';
import {
  IConnection,
  IConnectEvent,
  IConnectionManager,
  ISubscriptionManager,
  IConnectionData,
  HydrateConnectionOptions,
} from './types';
import { prefixRedisKey } from './helpers';

interface RedisConnectionManagerOptions {
  /**
   * Use this to override ApiGatewayManagementApi (for example in usage with serverless-offline)
   *
   * If not provided it will be created with endpoint from connections
   */
  apiGatewayManager?: ApiGatewayManagementApi;
  /**
   * IORedis client instance
   */
  redisClient: Redis;
  subscriptions: ISubscriptionManager;
}

/**
 * RedisConnectionManager
 *
 * Stores connections in Redis store
 */
export class RedisConnectionManager implements IConnectionManager {
  private apiGatewayManager: ApiGatewayManagementApi | undefined;

  private redisClient: Redis;

  private subscriptions: ISubscriptionManager;

  constructor({
    apiGatewayManager,
    redisClient,
    subscriptions,
  }: RedisConnectionManagerOptions) {
    assert.ok(
      typeof subscriptions === 'object',
      'Please provide subscriptions to manage subscriptions.',
    );
    assert.ok(
      redisClient == null || typeof redisClient === 'object',
      'Please provide redisClient as an instance of ioredis.Redis',
    );
    assert.ok(
      apiGatewayManager == null || typeof apiGatewayManager === 'object',
      'Please provide apiGatewayManager as an instance of ApiGatewayManagementApi',
    );

    this.apiGatewayManager = apiGatewayManager;
    this.redisClient = redisClient;
    this.subscriptions = subscriptions;
  }

  hydrateConnection = async (
    connectionId: string,
    options: HydrateConnectionOptions,
  ): Promise<IConnection> => {
    const { retryCount = 0, timeout = 50 } = options || {};
    // if connection is not found, throw so we can terminate connection
    let connection;

    for (let i = 0; i <= retryCount; i++) {
      const key = prefixRedisKey(`connection:${connectionId}`);
      const result = await this.redisClient.get(key);
      if (result) {
        // Jump out of loop
        connection = JSON.parse(result) as IConnection;
        break;
      }
      // wait for another round
      await new Promise((r) => setTimeout(r, timeout));
    }

    if (!connection) {
      throw new ConnectionNotFoundError(`Connection ${connectionId} not found`);
    }

    return connection as IConnection;
  };

  setConnectionData = async (
    data: IConnectionData,
    connection: IConnection,
  ): Promise<void> => {
    await this.redisClient.set(
      prefixRedisKey(`connection:${connection.id}`),
      JSON.stringify({
        ...connection,
        data,
      }),
      'EX',
      7200, // two hours maximal ttl for apigatrway websocket connections
    );
  };

  registerConnection = async ({
    connectionId,
    endpoint,
  }: IConnectEvent): Promise<IConnection> => {
    const connection: IConnection = {
      id: connectionId,
      data: { endpoint, context: {}, isInitialized: false },
    };

    await this.redisClient.set(
      prefixRedisKey(`connection:${connectionId}`),
      JSON.stringify({
        createdAt: new Date().toString(),
        id: connection.id,
        data: connection.data,
      }),
      'EX',
      7200, // two hours maximal ttl for apigatrway websocket connections
    );
    return connection;
  };

  sendToConnection = async (
    connection: IConnection,
    payload: string | Buffer,
  ): Promise<void> => {
    try {
      await this.createApiGatewayManager(connection.data.endpoint)
        .postToConnection({ ConnectionId: connection.id, Data: payload })
        .promise();
    } catch (e) {
      // this is stale connection
      // remove it from store
      if (e && e.statusCode === 410) {
        await this.unregisterConnection(connection);
      } else {
        throw e;
      }
    }
  };

  unregisterConnection = async ({ id }: IConnection): Promise<void> => {
    const key = prefixRedisKey(`connection:${id}`);
    await Promise.all([
      this.redisClient.del(key),
      this.subscriptions.unsubscribeAllByConnectionId(id),
    ]);
  };

  closeConnection = async ({ id, data }: IConnection): Promise<void> => {
    await this.createApiGatewayManager(data.endpoint)
      .deleteConnection({ ConnectionId: id })
      .promise();
  };

  /**
   * Creates api gateway manager
   *
   * If custom api gateway manager is provided, uses it instead
   */
  private createApiGatewayManager(endpoint: string): ApiGatewayManagementApi {
    if (this.apiGatewayManager) {
      return this.apiGatewayManager;
    }

    this.apiGatewayManager = new ApiGatewayManagementApi({ endpoint });

    return this.apiGatewayManager;
  }
}
