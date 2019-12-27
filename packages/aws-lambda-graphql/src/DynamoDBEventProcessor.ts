import { DynamoDBStreamHandler } from 'aws-lambda';
import { DynamoDB } from 'aws-sdk';
import { isAsyncIterable, getAsyncIterator } from 'iterall';
import { ExecutionResult } from 'graphql';
import { ArrayPubSub } from './ArrayPubSub';
import { ISubscriptionEvent, IEventProcessor } from './types';
import { formatMessage } from './formatMessage';
import { execute } from './execute';
import { SERVER_EVENT_TYPES } from './protocol';
import { Server } from './Server';

interface DynamoDBEventProcessorOptions {
  onError?: (err: any) => void;
}

/**
 * DynamoDBEventProcessor
 *
 * Processes DynamoDB stream event in order to send events to subscribed clients
 */
export class DynamoDBEventProcessor<TServer extends Server = Server>
  implements IEventProcessor<TServer, DynamoDBStreamHandler> {
  private onError: (err: any) => void;

  constructor(options: DynamoDBEventProcessorOptions) {
    this.onError = options.onError || ((err: any) => console.log(err));
  }

  public createHandler(server: TServer): DynamoDBStreamHandler {
    return async (lambdaEvent, lambdaContext) => {
      const options = await server.createGraphQLServerOptions(
        lambdaEvent as any,
        lambdaContext,
      );
      const { connectionManager, subscriptionManager } = options.$$internal;
      const { Records } = lambdaEvent;

      for (const record of Records) {
        // process only INSERT events
        if (record.eventName !== 'INSERT') {
          continue;
        }

        // now construct event from dynamodb image
        const event: ISubscriptionEvent = DynamoDB.Converter.unmarshall(
          record.dynamodb!.NewImage as any,
        ) as any;

        // iterate over subscribers that listen to this event
        // and for each connection:
        //  - create a schema (so we have subscribers registered in PubSub)
        //  - execute operation from event againt schema
        //  - if iterator returns a result, send it to client
        //  - clean up subscriptions and follow with next page of subscriptions
        //  - if the are no more subscriptions, process next event
        // make sure that you won't throw any errors otherwise dynamo will call
        // handler with same events again
        for await (const subscribers of subscriptionManager.subscribersByEventName(
          event.event,
        )) {
          const promises = subscribers
            .map(async subscriber => {
              // create PubSub for this subscriber
              const pubSub = new ArrayPubSub([event]);

              // execute operation by executing it and then publishing the event
              const iterable = await execute({
                connectionManager,
                subscriptionManager,
                schema: options.schema,
                event: lambdaEvent as any, // we don't have an API GW event here
                lambdaContext,
                context: options.context,
                connection: subscriber.connection,
                operation: subscriber.operation,
                pubSub,
                registerSubscriptions: false,
              });

              if (!isAsyncIterable(iterable)) {
                // something went wrong, probably there is an error
                return Promise.resolve();
              }

              const iterator = getAsyncIterator(iterable);
              const result: IteratorResult<ExecutionResult> = await iterator.next();

              if (result.value != null) {
                return connectionManager.sendToConnection(
                  subscriber.connection,
                  formatMessage({
                    id: subscriber.operationId,
                    payload: result.value,
                    type: SERVER_EVENT_TYPES.GQL_DATA,
                  }),
                );
              }

              return Promise.resolve();
            })
            .map(promise => promise.catch(this.onError));

          await Promise.all(promises);
        }
      }
    };
  }
}
