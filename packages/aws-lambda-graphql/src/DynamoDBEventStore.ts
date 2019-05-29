import { ulid } from 'ulid';
import { DynamoDB } from 'aws-sdk';
import { IEventStore, ISubscriptionEvent } from './types';

type Options = {
  eventsTable?: string;
};

class DynamoDBEventStore implements IEventStore {
  private db: DynamoDB.DocumentClient;

  private tableName: string;

  constructor({ eventsTable = 'Events' }: Options = {}) {
    this.db = new DynamoDB.DocumentClient();
    this.tableName = eventsTable;
  }

  publish = async (event: ISubscriptionEvent): Promise<void> => {
    await this.db
      .put({
        TableName: this.tableName,
        Item: {
          id: ulid(),
          ...event,
        },
      })
      .promise();
  };
}

export { DynamoDBEventStore };
export default DynamoDBEventStore;
