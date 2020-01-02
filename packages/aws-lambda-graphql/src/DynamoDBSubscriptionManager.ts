import { DynamoDB } from 'aws-sdk';
import {
  IConnection,
  ISubscriber,
  ISubscriptionManager,
  IdentifiedOperationRequest,
} from './types';

// polyfill Symbol.asyncIterator
if (Symbol.asyncIterator === undefined) {
  (Symbol as any).asyncIterator = Symbol.for('asyncIterator');
}

interface DynamoDBSubscriber extends ISubscriber {
  /**
   * works as range key in DynamoDb (event is partition key)
   * it is in format connectionId:operationId
   */
  subscriptionId: string;
}

interface DynamoDBSubscriptionManagerOptions {
  /**
   * Use this to override default document client (for example if you want to use local dynamodb)
   */
  dynamoDbClient?: DynamoDB.DocumentClient;
  /**
   * Subscriptions table name (default is Subscriptions)
   */
  subscriptionsTableName?: string;
  /**
   * Subscriptions operations table name (default is SubscriptionOperations)
   */
  subscriptionOperationsTableName?: string;
}

/**
 * DynamoDBSubscriptionManager
 *
 * Stores all subsrciptions in Subscriptions and SubscriptionOperations tables (both can be overridden)
 *
 * DynamoDB table structures
 *
 * Subscriptions:
 *  event: primary key (HASH)
 *  subscriptionId: range key (RANGE) - connectionId:operationId (this is always unique per client)
 *
 * SubscriptionOperations:
 *  subscriptionId: primary key (HASH) - connectionId:operationId (this is always unique per client)
 */
export class DynamoDBSubscriptionManager implements ISubscriptionManager {
  private subscriptionsTableName: string;

  private subscriptionOperationsTableName: string;

  private db: DynamoDB.DocumentClient;

  constructor({
    dynamoDbClient,
    subscriptionsTableName = 'Subscriptions',
    subscriptionOperationsTableName = 'SubscriptionOperations',
  }: DynamoDBSubscriptionManagerOptions = {}) {
    this.subscriptionsTableName = subscriptionsTableName;
    this.subscriptionOperationsTableName = subscriptionOperationsTableName;
    this.db = dynamoDbClient || new DynamoDB.DocumentClient();
  }

  subscribersByEventName = (
    name: string,
  ): AsyncIterable<ISubscriber[]> & AsyncIterator<ISubscriber[]> => {
    let ExclusiveStartKey: DynamoDB.DocumentClient.Key | undefined;
    let done = false;

    return {
      next: async () => {
        if (done) {
          return { value: [], done: true };
        }

        const result = await this.db
          .query({
            ExclusiveStartKey,
            TableName: this.subscriptionsTableName,
            Limit: 50,
            KeyConditionExpression: 'event = :event',
            ExpressionAttributeValues: {
              ':event': name,
            },
          })
          .promise();

        ExclusiveStartKey = result.LastEvaluatedKey;

        if (ExclusiveStartKey == null) {
          done = true;
        }

        // we store connectionData on subscription too so we don't
        // need to load data from connections table
        const value = result.Items as DynamoDBSubscriber[];

        return { value, done: value.length === 0 };
      },
      [Symbol.asyncIterator]() {
        return this;
      },
    };
  };

  subscribe = async (
    names: string[],
    connection: IConnection,
    operation: IdentifiedOperationRequest,
  ): Promise<void> => {
    const subscriptionId = this.generateSubscriptionId(
      connection.id,
      operation.operationId,
    );

    // we can only subscribe to one subscription in GQL document
    if (names.length !== 1) {
      throw new Error('Only one active operation per event name is allowed');
    }
    const [name] = names;

    await this.db
      .batchWrite({
        RequestItems: {
          [this.subscriptionsTableName]: [
            {
              PutRequest: {
                Item: {
                  connection,
                  operation,
                  event: name,
                  subscriptionId,
                  operationId: operation.operationId,
                } as DynamoDBSubscriber,
              },
            },
          ],
          [this.subscriptionOperationsTableName]: [
            {
              PutRequest: {
                Item: {
                  subscriptionId,
                  event: name,
                },
              },
            },
          ],
        },
      })
      .promise();
  };

  unsubscribe = async (subscriber: ISubscriber) => {
    const subscriptionId = this.generateSubscriptionId(
      subscriber.connection.id,
      subscriber.operationId,
    );

    await this.db
      .transactWrite({
        TransactItems: [
          {
            Delete: {
              TableName: this.subscriptionsTableName,
              Key: {
                event: subscriber.event,
                subscriptionId,
              },
            },
          },
          {
            Delete: {
              TableName: this.subscriptionOperationsTableName,
              Key: {
                subscriptionId,
              },
            },
          },
        ],
      })
      .promise();
  };

  unsubscribeOperation = async (connectionId: string, operationId: string) => {
    const operation = await this.db
      .get({
        TableName: this.subscriptionOperationsTableName,
        Key: {
          subscriptionId: this.generateSubscriptionId(
            connectionId,
            operationId,
          ),
        },
      })
      .promise();

    if (operation.Item) {
      await this.db
        .transactWrite({
          TransactItems: [
            {
              Delete: {
                TableName: this.subscriptionsTableName,
                Key: {
                  event: operation.Item.event,
                  subscriptionId: operation.Item.subscriptionId,
                },
              },
            },
            {
              Delete: {
                TableName: this.subscriptionOperationsTableName,
                Key: {
                  subscriptionId: operation.Item.subscriptionId,
                },
              },
            },
          ],
        })
        .promise();
    }
  };

  unsubscribeAllByConnectionId = async (connectionId: string) => {
    let cursor: DynamoDB.DocumentClient.Key | undefined;

    do {
      const { Items, LastEvaluatedKey } = await this.db
        .scan({
          TableName: this.subscriptionsTableName,
          ExclusiveStartKey: cursor,
          FilterExpression: 'begins_with(subscriptionId, :connection_id)',
          ExpressionAttributeValues: {
            ':connection_id': connectionId,
          },
          Limit: 12, // Maximum of 25 request items sent to DynamoDB a time
        })
        .promise();

      if (Items == null || !Items.length) {
        return;
      }

      await this.db
        .batchWrite({
          RequestItems: {
            [this.subscriptionsTableName]: Items.map(item => ({
              DeleteRequest: {
                Key: { event: item.event, subscriptionId: item.subscriptionId },
              },
            })),
            [this.subscriptionOperationsTableName]: Items.map(item => ({
              DeleteRequest: {
                Key: { subscriptionId: item.subscriptionId },
              },
            })),
          },
        })
        .promise();

      cursor = LastEvaluatedKey;
    } while (cursor);
  };

  generateSubscriptionId = (
    connectionId: string,
    operationId: string,
  ): string => {
    return `${connectionId}:${operationId}`;
  };
}
