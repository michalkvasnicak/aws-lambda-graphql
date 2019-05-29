import { ApiGatewayManagementApi, DynamoDB } from 'aws-sdk';
import { ExtendableError } from './errors';
import { IConnection, IConnectEvent, IConnectionManager } from './types';

export class ConnectionNotFoundError extends ExtendableError {}

type Options = {
  connectionsTable?: string;
};

class DynamoDBConnectionManager implements IConnectionManager {
  private connectionsTable: string;

  private db: DynamoDB.DocumentClient;

  constructor({ connectionsTable = 'Connections' }: Options = {}) {
    this.connectionsTable = connectionsTable;
    this.db = new DynamoDB.DocumentClient();
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

  registerConnection = async ({
    connectionId,
    endpoint,
  }: IConnectEvent): Promise<IConnection> => {
    const connection: IConnection = { id: connectionId, data: { endpoint } };

    await this.db
      .put({
        TableName: this.connectionsTable,
        Item: {
          createdAt: new Date(),
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
    const {
      data: { endpoint },
      id,
    } = connection;
    const managementApi = new ApiGatewayManagementApi({
      endpoint,
      apiVersion: '2018-11-29',
    });

    try {
      await managementApi
        .postToConnection({ ConnectionId: id, Data: payload })
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

  unregisterConnection = async (connection: IConnection): Promise<void> => {
    await Promise.all([
      this.db
        .delete({
          Key: {
            id: connection.id,
          },
          TableName: this.connectionsTable,
        })
        .promise(),
    ]);
  };
}

export { DynamoDBConnectionManager };
export default DynamoDBConnectionManager;
