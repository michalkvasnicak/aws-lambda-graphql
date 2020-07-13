import { ApiGatewayManagementApi, DynamoDB } from 'aws-sdk';
import { ConnectionNotFoundError } from './errors';
import {
  IConnection,
  IConnectEvent,
  IConnectionManager,
  ISubscriptionManager,
  IConnectionData,
  HydrateConnectionOptions,
} from './types';
import { computeTTL } from './helpers';
import { isTTLExpired } from './helpers/isTTLExpired';

const DEFAULT_TTL = 7200;

interface DynamoDBConnection extends IConnection {
  /**
   * TTL in UNIX seconds
   */
  ttl?: number;
}

interface DynamoDBConnectionManagerOptions {
  /**
   * Use this to override ApiGatewayManagementApi (for example in usage with serverless-offline)
   *
   * If not provided it will be created with endpoint from connections
   */
  apiGatewayManager?: ApiGatewayManagementApi;
  /**
   * Connections table name (default is Connections)
   */
  connectionsTable?: string;
  /**
   * Use this to override default document client (for example if you want to use local dynamodb)
   */
  dynamoDbClient?: DynamoDB.DocumentClient;
  subscriptions: ISubscriptionManager;
  /**
   * Optional TTL for connections (stored in ttl field) in seconds
   *
   * Default value is 2 hours
   *
   * Set to false to turn off TTL
   */
  ttl?: number | false;
}

/**
 * DynamoDBConnectionManager
 *
 * Stores connections in DynamoDB table (default table name is Connections, you can override that)
 */
export class DynamoDBConnectionManager implements IConnectionManager {
  private apiGatewayManager: ApiGatewayManagementApi | undefined;

  private connectionsTable: string;

  private db: DynamoDB.DocumentClient;

  private subscriptions: ISubscriptionManager;

  private ttl: number | false;

  constructor({
    apiGatewayManager,
    connectionsTable = 'Connections',
    dynamoDbClient,
    subscriptions,
    ttl = DEFAULT_TTL,
  }: DynamoDBConnectionManagerOptions) {
    this.apiGatewayManager = apiGatewayManager;
    this.connectionsTable = connectionsTable;
    this.db = dynamoDbClient || new DynamoDB.DocumentClient();
    this.subscriptions = subscriptions;
    this.ttl = ttl;
  }

  hydrateConnection = async (
    connectionId: string,
    options?: HydrateConnectionOptions,
  ): Promise<DynamoDBConnection> => {
    const { retryCount = 0, timeout = 50 } = options || {};
    // if connection is not found, throw so we can terminate connection
    let connection;

    for (let i = 0; i <= retryCount; i++) {
      const result = await this.db
        .get({
          TableName: this.connectionsTable,
          Key: {
            id: connectionId,
          },
        })
        .promise();

      if (result.Item) {
        // Jump out of loop
        connection = result.Item as DynamoDBConnection;
        break;
      }

      // wait for another round
      await new Promise(r => setTimeout(r, timeout));
    }

    if (!connection || isTTLExpired(connection.ttl)) {
      throw new ConnectionNotFoundError(`Connection ${connectionId} not found`);
    }

    return connection as IConnection;
  };

  setConnectionData = async (
    data: IConnectionData,
    { id }: DynamoDBConnection,
  ): Promise<void> => {
    await this.db
      .update({
        TableName: this.connectionsTable,
        Key: {
          id,
        },
        UpdateExpression: 'set #data = :data',
        ExpressionAttributeValues: {
          ':data': data,
        },
        ExpressionAttributeNames: {
          '#data': 'data',
        },
      })
      .promise();
  };

  registerConnection = async ({
    connectionId,
    endpoint,
  }: IConnectEvent): Promise<DynamoDBConnection> => {
    const connection: IConnection = {
      id: connectionId,
      data: { endpoint, context: {}, isInitialized: false },
    };

    await this.db
      .put({
        TableName: this.connectionsTable,
        Item: {
          createdAt: new Date().toString(),
          id: connection.id,
          data: connection.data,
          ...(this.ttl === false || this.ttl == null
            ? {}
            : {
                ttl: computeTTL(this.ttl),
              }),
        },
      })
      .promise();

    return connection;
  };

  sendToConnection = async (
    connection: DynamoDBConnection,
    payload: string | Buffer,
  ): Promise<void> => {
    try {
      await this.createApiGatewayManager(connection.data.endpoint)
        .postToConnection({ ConnectionId: connection.id, Data: payload })
        .promise();
    } catch (e) {
      // this is stale connection
      // remove it from DB
      if (e && e.statusCode === 410) {
        await this.unregisterConnection(connection);
      } else {
        throw e;
      }
    }
  };

  unregisterConnection = async ({ id }: DynamoDBConnection): Promise<void> => {
    await Promise.all([
      this.db
        .delete({
          Key: {
            id,
          },
          TableName: this.connectionsTable,
        })
        .promise(),
      this.subscriptions.unsubscribeAllByConnectionId(id),
    ]);
  };

  closeConnection = async ({ id, data }: DynamoDBConnection): Promise<void> => {
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
