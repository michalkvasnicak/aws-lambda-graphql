// import AWS from 'aws-sdk';
import { ExtendableError } from './errors';
import { IConnection, IConnectEvent, IConnectionManager } from './types';
const AWS = require('aws-sdk');

const ensureApiGatewayManagementApi = require('aws-apigatewaymanagementapi')
ensureApiGatewayManagementApi(AWS)

export class ConnectionNotFoundError extends ExtendableError {}

type Options = {
  connectionsTable?: string;
};

class MemoryConnectionManager implements IConnectionManager {
  private connectionsTable: string;
  private db: Object;

  constructor({ connectionsTable = 'Connections' }: Options = {}) {
    this.connectionsTable = connectionsTable;
    this.db = {};
  }

  hydrateConnection = async (connectionId: string): Promise<IConnection> => {
    // if connection is not found, throw so we can terminate connection

    const result = this.db[this.connectionsTable + connectionId];

    if (result == null) {
      throw new ConnectionNotFoundError(`Connection ${connectionId} not found`);
    }

    return result as IConnection;
  };

  registerConnection = async ({
    connectionId,
    endpoint,
  }: IConnectEvent): Promise<IConnection> => {
    const connection: IConnection = { id: connectionId, data: { endpoint } };

    this.db[this.connectionsTable + connection.id] = {
      createdAt: new Date(),
      id: connection.id,
      data: connection.data,
    };

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
    const managementApi = new AWS.ApiGatewayManagementApi({
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
    delete this.db[this.connectionsTable + connection.id];

    // @todo delete all subscriptions too
  };
}

export { MemoryConnectionManager };
export default MemoryConnectionManager;
