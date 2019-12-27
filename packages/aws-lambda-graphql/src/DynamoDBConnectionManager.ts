import { ApiGatewayManagementApi, DynamoDB } from 'aws-sdk';
import { ExtendableError } from './errors';
import {
  IConnection,
  IConnectEvent,
  IConnectionManager,
  ISubscriptionManager,
  IConnectionData,
} from './types';

export class ConnectionNotFoundError extends ExtendableError {}

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

  constructor({
    apiGatewayManager,
    connectionsTable = 'Connections',
    dynamoDbClient,
    subscriptions,
  }: DynamoDBConnectionManagerOptions) {
    this.apiGatewayManager = apiGatewayManager;
    this.connectionsTable = connectionsTable;
    this.db = dynamoDbClient || new DynamoDB.DocumentClient();
    this.subscriptions = subscriptions;
  }

  hydrateConnection = async (connectionId: string): Promise<IConnection> => {
    // if connection is not found, throw so we can terminate connection
    const result = await this.db
      .get({
        TableName: this.connectionsTable,
        Key: {
          id: connectionId,
        },
      })
      .promise();

    if (result.Item == null) {
      throw new ConnectionNotFoundError(`Connection ${connectionId} not found`);
    }

    return result.Item as IConnection;
  };

  setConnectionData = async (
    data: IConnectionData,
    { id }: IConnection,
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
  }: IConnectEvent): Promise<IConnection> => {
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
        },
      })
      .promise();

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
      // remove it from DB
      if (e && e.statusCode === 410) {
        await this.unregisterConnection(connection);
      } else {
        throw e;
      }
    }
  };

  unregisterConnection = async ({ id }: IConnection): Promise<void> => {
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
