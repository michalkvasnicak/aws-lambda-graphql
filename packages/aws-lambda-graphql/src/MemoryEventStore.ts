import { IEventStore, ISubscriptionEvent } from './types';

export class MemoryEventStore implements IEventStore {
  public events: ISubscriptionEvent[];

  constructor() {
    this.events = [];
  }

  publish = async (event: ISubscriptionEvent): Promise<void> => {
    this.events.push(event);
  };
}
