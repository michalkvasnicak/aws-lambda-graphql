import assert from 'assert';
import {
  BatchWriteItemCommand,
  DynamoDBClient,
  QueryCommand,
  ScanCommand,
  TransactWriteItemsCommand,
} from '@aws-sdk/client-dynamodb';
import { AttributeValue } from '@aws-sdk/client-dynamodb/models/models_0';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import {
  IConnection,
  IdentifiedOperationRequest,
  ISubscriber,
  ISubscriptionEvent,
  ISubscriptionManager,
} from './types';
import { computeTTL } from './helpers';

const DEFAULT_TTL = 7200;

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
  /**
   * TTL in UNIX seconds
   */
  ttl?: number;
}

interface DynamoDBSubscriptionManagerOptions {
  /**
   * Use this to override default document client (for example if you want to use local dynamodb)
   */
  dynamoDbClient?: DynamoDBClient;
  /**
   * Subscriptions table name (default is Subscriptions)
   */
  subscriptionsTableName?: string;
  /**
   * Subscriptions operations table name (default is SubscriptionOperations)
   */
  subscriptionOperationsTableName?: string;
  /**
   * Optional TTL for subscriptions (stored in ttl field) in seconds
   *
   * Default value is 2 hours
   *
   * Set to false to turn off TTL
   */
  ttl?: number | false;
  /**
   * Optional function that can get subscription name from event
   *
   * Default is (event: ISubscriptionEvent) => event.event
   *
   * Useful for multi-tenancy
   */
  getSubscriptionNameFromEvent?: (event: ISubscriptionEvent) => string;
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
 *  event: range key (RANGE)

 */

/** In order to use this implementation you need to use RANGE key for event in serverless.yml */
export class DynamoDBRangeSubscriptionManager implements ISubscriptionManager {
  private subscriptionsTableName: string;

  private subscriptionOperationsTableName: string;

  private db: DynamoDBClient;

  private ttl: number | false;

  private getSubscriptionNameFromEvent: (event: ISubscriptionEvent) => string;

  constructor({
    dynamoDbClient,
    subscriptionsTableName = 'Subscriptions',
    subscriptionOperationsTableName = 'SubscriptionOperations',
    ttl = DEFAULT_TTL,
    getSubscriptionNameFromEvent = (event) => event.event,
  }: DynamoDBSubscriptionManagerOptions = {}) {
    assert.ok(
      typeof subscriptionOperationsTableName === 'string',
      'Please provide subscriptionOperationsTableName as a string',
    );
    assert.ok(
      typeof subscriptionsTableName === 'string',
      'Please provide subscriptionsTableName as a string',
    );
    assert.ok(
      ttl === false || (typeof ttl === 'number' && ttl > 0),
      'Please provide ttl as a number greater than 0 or false to turn it off',
    );
    assert.ok(
      dynamoDbClient == null || typeof dynamoDbClient === 'object',
      'Please provide dynamoDbClient as an instance of DynamoDB.DocumentClient',
    );

    this.subscriptionsTableName = subscriptionsTableName;
    this.subscriptionOperationsTableName = subscriptionOperationsTableName;
    this.db = dynamoDbClient || new DynamoDBClient({});
    this.ttl = ttl;
    this.getSubscriptionNameFromEvent = getSubscriptionNameFromEvent;
  }

  subscribersByEvent = (
    event: ISubscriptionEvent,
  ): AsyncIterable<ISubscriber[]> & AsyncIterator<ISubscriber[]> => {
    let ExclusiveStartKey: { [key: string]: AttributeValue } | undefined;
    let done = false;

    const name = this.getSubscriptionNameFromEvent(event);

    return {
      next: async () => {
        if (done) {
          return { value: [], done: true };
        }

        const time = Math.round(Date.now() / 1000);
        const result = await this.db.send(
          new QueryCommand({
            ExclusiveStartKey,
            TableName: this.subscriptionsTableName,
            Limit: 50,
            KeyConditionExpression: 'event = :event',
            FilterExpression: '#ttl > :time OR attribute_not_exists(#ttl)',
            ExpressionAttributeValues: marshall({
              ':event': name,
              ':time': time,
            }),
            ExpressionAttributeNames: {
              '#ttl': 'ttl',
            },
          }),
        );

        ExclusiveStartKey = result.LastEvaluatedKey;

        if (ExclusiveStartKey == null) {
          done = true;
        }

        // we store connectionData on subscription too so we don't
        // need to load data from connections table
        const value: DynamoDBSubscriber[] =
          result.Items?.map((item) => unmarshall(item) as DynamoDBSubscriber) ??
          [];

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

    const ttlField =
      this.ttl === false || this.ttl == null
        ? {}
        : { ttl: computeTTL(this.ttl) };

    await this.db.send(
      new BatchWriteItemCommand({
        RequestItems: {
          [this.subscriptionsTableName]: names.map((name) => ({
            PutRequest: {
              Item: marshall({
                connection,
                operation,
                event: name,
                subscriptionId,
                operationId: operation.operationId,
                ...ttlField,
              }),
            },
          })),
          [this.subscriptionOperationsTableName]: names.map((name) => ({
            PutRequest: {
              Item: marshall({
                subscriptionId,
                event: name,
                ...ttlField,
              }),
            },
          })),
        },
      }),
    );
  };

  unsubscribe = async (subscriber: ISubscriber) => {
    const subscriptionId = this.generateSubscriptionId(
      subscriber.connection.id,
      subscriber.operationId,
    );

    await this.db.send(
      new TransactWriteItemsCommand({
        TransactItems: [
          {
            Delete: {
              TableName: this.subscriptionsTableName,
              Key: marshall({
                event: subscriber.event,
                subscriptionId,
              }),
            },
          },
          {
            Delete: {
              TableName: this.subscriptionOperationsTableName,
              Key: marshall({
                subscriptionId,
                event: subscriber.event,
              }),
            },
          },
        ],
      }),
    );
  };

  unsubscribeOperation = async (connectionId: string, operationId: string) => {
    const operation = await this.db.send(
      new QueryCommand({
        TableName: this.subscriptionOperationsTableName,
        KeyConditionExpression: 'subscriptionId = :id',
        ExpressionAttributeValues: marshall({
          ':id': this.generateSubscriptionId(connectionId, operationId),
        }),
      }),
    );

    if (operation.Items) {
      await this.db.send(
        new BatchWriteItemCommand({
          RequestItems: {
            [this.subscriptionsTableName]: operation.Items.map((item) => ({
              DeleteRequest: {
                Key: marshall({
                  event: item.event,
                  subscriptionId: item.subscriptionId,
                }),
              },
            })),
            [this.subscriptionOperationsTableName]: operation.Items.map(
              (item) => ({
                DeleteRequest: {
                  Key: marshall({
                    subscriptionId: item.subscriptionId,
                    event: item.event,
                  }),
                },
              }),
            ),
          },
        }),
      );
    }
  };

  unsubscribeAllByConnectionId = async (connectionId: string) => {
    let cursor: { [key: string]: AttributeValue } | undefined;

    do {
      const { Items, LastEvaluatedKey } = await this.db.send(
        new ScanCommand({
          TableName: this.subscriptionsTableName,
          ExclusiveStartKey: cursor,
          FilterExpression: 'begins_with(subscriptionId, :connection_id)',
          ExpressionAttributeValues: marshall({
            ':connection_id': connectionId,
          }),
          Limit: 12, // Maximum of 25 request items sent to DynamoDB a time
        }),
      );

      if (Items == null || !Items.length) {
        return;
      }

      await this.db.send(
        new BatchWriteItemCommand({
          RequestItems: {
            [this.subscriptionsTableName]: Items.map((item) => ({
              DeleteRequest: {
                Key: marshall({
                  event: item.event,
                  subscriptionId: item.subscriptionId,
                }),
              },
            })),
            [this.subscriptionOperationsTableName]: Items.map((item) => ({
              DeleteRequest: {
                Key: marshall({
                  subscriptionId: item.subscriptionId,
                  event: item.event,
                }),
              },
            })),
          },
        }),
      );

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
