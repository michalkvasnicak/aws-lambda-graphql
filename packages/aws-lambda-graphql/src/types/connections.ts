export interface IConnection {
  /**
   * Unique connection id
   */
  readonly id: string;

  /**
   * Extra connection data, this data is stored only upon registration
   * All values should be JSON serializable
   */
  readonly data: IConnectionData;
}

export interface IConnectionData {
  [key: string]: any;

  /**
   * Connection context data provided from GQL_CONNECTION_INIT message or from onConnect method
   * This data is passed to graphql resolvers' context
   * All values should be JSON serializable
   */
  context: Object;

  /**
   * Indicates whether connection sent GQL_CONNECTION_INIT message or
   */
  readonly isInitialized: boolean;
}

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
  unregisterConnection(connection: IConnection): Promise<void>;
  closeConnection(connection: IConnection): Promise<void>;
}
