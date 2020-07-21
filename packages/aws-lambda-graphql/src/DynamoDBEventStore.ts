import { DynamoDB } from 'aws-sdk';
import { ulid } from 'ulid';
import { IEventStore, ISubscriptionEvent } from './types';
import { computeTTL } from './helpers';

export interface IDynamoDBSubscriptionEvent extends ISubscriptionEvent {
  /**
   * TTL in UNIX seconds
   */
  ttl?: number;
}

const DEFAULT_TTL = 7200;

interface DynamoDBEventStoreOptions {
  /**
   * Use this to override default document client (for example if you want to use local dynamodb)
   */
  dynamoDbClient?: DynamoDB.DocumentClient;
  /**
   * Events table name (default is Events)
   */
  eventsTable?: string;
  /**
   * Optional TTL for events (stored in ttl field) in seconds
   *
   * Default value is 2 hours
   *
   * Set to false to turn off TTL
   */
  ttl?: number | false;
}

/**
 * DynamoDB event store
 *
 * This event store stores published events in DynamoDB table
 *
 * The server needs to expose DynamoDBEventProcessor handler in order to process these events
 */
export class DynamoDBEventStore implements IEventStore {
  private db: DynamoDB.DocumentClient;

  private tableName: string;

  private ttl: number | false;

  constructor({
    dynamoDbClient,
    eventsTable = 'Events',
    ttl = DEFAULT_TTL,
  }: DynamoDBEventStoreOptions = {}) {
    this.db = dynamoDbClient || new DynamoDB.DocumentClient();
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
          ...(this.ttl === false || this.ttl == null
            ? {}
            : { ttl: computeTTL(this.ttl) }),
        },
      })
      .promise();
  };
}
