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
