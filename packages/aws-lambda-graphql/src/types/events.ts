import { ISubscriptionEvent } from './subscriptions';

export interface IEventStore {
  publish(event: ISubscriptionEvent, topic: string): Promise<any>;
}
