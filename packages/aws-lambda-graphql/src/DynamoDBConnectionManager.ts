import assert from 'assert';
import {
  DeleteItemCommand,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import {
  ApiGatewayManagementApiClient,
  DeleteConnectionCommand,
  PostToConnectionCommand,
} from '@aws-sdk/client-apigatewaymanagementapi';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
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
  apiGatewayManager?: ApiGatewayManagementApiClient;

  region: string;

  /**
   * Connections table name (default is Connections)
   */
  connectionsTable?: string;
  /**
   * Use this to override default document client (for example if you want to use local dynamodb)
   */
  dynamoDbClient?: DynamoDBClient;
  subscriptions: ISubscriptionManager;
  /**
   * Optional TTL for connections (stored in ttl field) in seconds
   *
   * Default value is 2 hours
   *
   * Set to false to turn off TTL
   */
  ttl?: number | false;

  /**
   * Enable console.log
   */
  debug?: boolean;
}

/**
 * DynamoDBConnectionManager
 *
 * Stores connections in DynamoDB table (default table name is Connections, you can override that)
 */
export class DynamoDBConnectionManager implements IConnectionManager {
  private apiGatewayManager: ApiGatewayManagementApiClient | undefined;

  private region: string;

  private connectionsTable: string;

  private db: DynamoDBClient;

  private subscriptions: ISubscriptionManager;

  private ttl: number | false;

  private debug: boolean;

  constructor({
    apiGatewayManager,
    region,
    connectionsTable = 'Connections',
    dynamoDbClient,
    subscriptions,
    ttl = DEFAULT_TTL,
    debug = false,
  }: DynamoDBConnectionManagerOptions) {
    assert.ok(typeof region === 'string', 'Please provide region as a string');
    assert.ok(
      typeof connectionsTable === 'string',
      'Please provide connectionsTable as a string',
    );
    assert.ok(
      typeof subscriptions === 'object',
      'Please provide subscriptions to manage subscriptions.',
    );
    assert.ok(
      ttl === false || (typeof ttl === 'number' && ttl > 0),
      'Please provide ttl as a number greater than 0 or false to turn it off',
    );
    assert.ok(
      dynamoDbClient == null || typeof dynamoDbClient === 'object',
      'Please provide dynamoDbClient as an instance of DynamoDB.DocumentClient',
    );
    assert.ok(
      apiGatewayManager == null || typeof apiGatewayManager === 'object',
      'Please provide apiGatewayManager as an instance of ApiGatewayManagementApi',
    );
    assert.ok(typeof debug === 'boolean', 'Please provide debug as a boolean');

    this.apiGatewayManager = apiGatewayManager;
    this.region = region;
    this.connectionsTable = connectionsTable;
    this.db = dynamoDbClient || new DynamoDBClient({});
    this.subscriptions = subscriptions;
    this.ttl = ttl;
    this.debug = debug;
  }

  hydrateConnection = async (
    connectionId: string,
    options?: HydrateConnectionOptions,
  ): Promise<DynamoDBConnection> => {
    const { retryCount = 0, timeout = 50 } = options || {};
    // if connection is not found, throw so we can terminate connection
    let connection;

    for (let i = 0; i <= retryCount; i++) {
      const result = await this.db.send(
        new GetItemCommand({
          TableName: this.connectionsTable,
          Key: marshall({
            id: connectionId,
          }),
        }),
      );

      if (result.Item) {
        // Jump out of loop
        connection = unmarshall(result.Item) as DynamoDBConnection;
        break;
      }

      // wait for another round
      await new Promise((r) => setTimeout(r, timeout));
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
    await this.db.send(
      new UpdateItemCommand({
        TableName: this.connectionsTable,
        Key: marshall({
          id,
        }),
        UpdateExpression: 'set #data = :data',
        ExpressionAttributeValues: marshall({
          ':data': data,
        }),
        ExpressionAttributeNames: {
          '#data': 'data',
        },
      }),
    );
  };

  registerConnection = async ({
    connectionId,
    endpoint,
  }: IConnectEvent): Promise<DynamoDBConnection> => {
    const connection: IConnection = {
      id: connectionId,
      data: { endpoint, context: {}, isInitialized: false },
    };
    if (this.debug) console.log(`Connected ${connection.id}`, connection.data);
    await this.db.send(
      new PutItemCommand({
        TableName: this.connectionsTable,
        Item: marshall({
          createdAt: new Date().toString(),
          id: connection.id,
          data: connection.data,
          ...(this.ttl === false || this.ttl == null
            ? {}
            : {
                ttl: computeTTL(this.ttl),
              }),
        }),
      }),
    );

    return connection;
  };

  sendToConnection = async (
    connection: DynamoDBConnection,
    payload: Buffer,
  ): Promise<void> => {
    try {
      // TODO filter on region of connection (dont' try to send to wrong region in the 1st place)
      console.debug('=== sendToConnection', connection.data.endpoint);
      await this.createApiGatewayManager(connection.data.endpoint).send(
        new PostToConnectionCommand({
          ConnectionId: connection.id,
          Data: payload,
        }),
      );
    } catch (e) {
      // this is stale connection
      // remove it from DB
      if (e && e.statusCode === 410) {
        await this.unregisterConnection(connection);
      } else {
        console.warn('=== error in sendToConnection', e);
      }
    }
  };

  unregisterConnection = async ({ id }: DynamoDBConnection): Promise<void> => {
    await Promise.all([
      this.db.send(
        new DeleteItemCommand({
          Key: marshall({
            id,
          }),
          TableName: this.connectionsTable,
        }),
      ),
      this.subscriptions.unsubscribeAllByConnectionId(id),
    ]);
  };

  closeConnection = async ({ id, data }: DynamoDBConnection): Promise<void> => {
    if (this.debug) console.log('Disconnected ', id);
    await this.createApiGatewayManager(data.endpoint).send(
      new DeleteConnectionCommand({
        ConnectionId: id,
      }),
    );
  };

  /**
   * Creates api gateway manager
   *
   * If custom api gateway manager is provided, uses it instead
   */
  private createApiGatewayManager(
    endpoint: string,
  ): ApiGatewayManagementApiClient {
    if (this.apiGatewayManager) {
      return this.apiGatewayManager;
    }

    this.apiGatewayManager = new ApiGatewayManagementApiClient({ endpoint });

    return this.apiGatewayManager;
  }
}
