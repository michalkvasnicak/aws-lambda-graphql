import { ISubscriptionEvent } from './subscriptions';

export interface IEventStore {
  publish(event: ISubscriptionEvent): Promise<any>;
}
