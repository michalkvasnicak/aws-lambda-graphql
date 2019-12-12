import { ulid } from 'ulid';
import { DynamoDB } from 'aws-sdk';
import { IEventStore, ISubscriptionEvent } from './types';
import { computeTTL } from './helpers';

const DEFAULT_TTL = 7200;

interface DynamoDBEventStoreOptions {
  eventsTable?: string;
  /**
   * Optional TTL for events (stored in ttl field) in seconds
   *
   * Default value is 2 hours
   */
  ttl?: number;
}

class DynamoDBEventStore implements IEventStore {
  private db: DynamoDB.DocumentClient;

  private tableName: string;

  private ttl: number;

  constructor({
    eventsTable = 'Events',
    ttl = DEFAULT_TTL,
  }: DynamoDBEventStoreOptions = {}) {
    this.db = new DynamoDB.DocumentClient();
    this.tableName = eventsTable;
    this.ttl = ttl;
  }

  publish = async (event: ISubscriptionEvent): Promise<void> => {
    await this.db
      .put({
        TableName: this.tableName,
        Item: {
          id: ulid(),
          ...event,
          ttl: computeTTL(this.ttl),
        },
      })
      .promise();
  };
}

export { DynamoDBEventStore };
export default DynamoDBEventStore;
