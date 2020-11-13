import { IConnection } from './connections';
import { IdentifiedOperationRequest, OperationRequest } from './operations';

export interface ISubscriptionEvent {
  event: string;
  payload: any;
}

export interface ISubscriber {
  event: string;
  connection: IConnection;
  operation: OperationRequest;
  operationId: string;
}

export interface ISubscriptionManager {
  /**
   * Fetches all subscribers that listens to given event name and returns paged iterator
   *
   * @param name
   */
  subscribersByEvent(event: ISubscriptionEvent): AsyncIterable<ISubscriber[]>;

  /**
   * Subscribes to events
   *
   * @param names event names
   * @param connection
   * @param operation
   */
  subscribe(
    names: string[],
    connection: IConnection,
    operation: IdentifiedOperationRequest,
  ): Promise<any>;

  /**
   * Unsubscribes from subscription
   *
   * @param subscriber
   */
  unsubscribe(subscriber: ISubscriber): Promise<any>;

  /**
   * Unsubscribes client from specific subscription
   */
  unsubscribeOperation(connectionId: string, operationId: string): Promise<any>;

  /**
   * Unsubscribes all subscriptions for connection id
   *
   * @param connectionId
   */
  unsubscribeAllByConnectionId(connectionId: string): Promise<any>;
}
