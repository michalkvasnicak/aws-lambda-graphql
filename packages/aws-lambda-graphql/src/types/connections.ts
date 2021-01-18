import { IConnection, IConnectionData } from './connection';
import { ISubscriber } from './subscriptions';

export { IConnection, IConnectionData };

export interface HydrateConnectionOptions {
  /**
   * How many times should we retry the connection query in case it fails for timing issues
   *
   * Default is 0
   */
  retryCount?: number;
  /**
   * How long should we wait until we try determine connection state again?
   *
   * Default is 50ms
   */
  timeout?: number;
}

export interface IConnectEvent {
  connectionId: string;
  endpoint: string;
}

export interface IConnectionManager {
  hydrateConnection(
    connectionId: string,
    options?: HydrateConnectionOptions,
  ): Promise<IConnection>;
  setConnectionData(data: Object, connection: IConnection): Promise<void>;
  registerConnection(event: IConnectEvent): Promise<IConnection>;
  sendToConnection(
    connection: IConnection,
    payload: string | Buffer,
  ): Promise<void>;
  unregisterConnection(connection: IConnection): Promise<ISubscriber[]>;
  closeConnection(connection: IConnection): Promise<void>;
}
