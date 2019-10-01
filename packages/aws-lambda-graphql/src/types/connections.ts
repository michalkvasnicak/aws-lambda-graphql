export interface IConnection {
  /**
   * Unique connection id
   */
  readonly id: string;

  /**
   * Extra connection data, this data is stored only upon registration
   * All values should be JSON serializable
   */
  readonly data: { [key: string]: any };
}

export interface IConnectEvent {
  connectionId: string;
  endpoint: string;
}

export interface IConnectionManager {
  hydrateConnection(
    connectionId: string,
    useLegacyProtocol?: boolean,
  ): Promise<IConnection>;
  setLegacyProtocol(connection: IConnection): Promise<void>;
  registerConnection(event: IConnectEvent): Promise<IConnection>;
  sendToConnection(
    connection: IConnection,
    payload: string | Buffer,
  ): Promise<void>;
  unregisterConnection(connection: IConnection): Promise<void>;
}
