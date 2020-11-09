import { ExecutionResult } from 'graphql';
import { getAsyncIterator, isAsyncIterable } from 'iterall';
import { ArrayPubSub } from './ArrayPubSub';
import { formatMessage } from './formatMessage';
import { execute } from './execute';
import { ISubscriptionEvent, IEventProcessor } from './types';
import { SERVER_EVENT_TYPES } from './protocol';
import { Server } from './Server';

// polyfill Symbol.asyncIterator
if (Symbol.asyncIterator === undefined) {
  (Symbol as any).asyncIterator = Symbol.for('asyncIterator');
}

export type EventProcessorFn = (
  events: ISubscriptionEvent[],
  lambdaContext?: any,
) => Promise<void>;

export class MemoryEventProcessor<TServer extends Server = Server>
  implements IEventProcessor<TServer, EventProcessorFn> {
  public createHandler(server: TServer): EventProcessorFn {
    return async function processEvents(events, lambdaContext = {}) {
      const options = await server.createGraphQLServerOptions(
        events as any,
        lambdaContext,
      );
      const { connectionManager, subscriptionManager } = options.$$internal;

      for (const event of events) {
        // iterate over subscribers that listen to this event
        // and for each connection:
        //  - create a schema (so we have subscribers registered in PubSub)
        //  - execute operation from event againt schema
        //  - if iterator returns a result, send it to client
        //  - clean up subscriptions and follow with next page of subscriptions
        //  - if the are no more subscriptions, process next event
        // make sure that you won't throw any errors otherwise dynamo will call
        // handler with same events again
        for await (const subscribers of subscriptionManager.subscribersByEvent(
          event,
        )) {
          const promises = subscribers
            .map(async (subscriber) => {
              // create PubSub for this subscriber
              const pubSub = new ArrayPubSub([event]);

              // execute operation by executing it and then publishing the event
              const iterable = await execute({
                connectionManager,
                subscriptionManager,
                schema: options.schema,
                event: {} as any, // we don't have api gateway event here
                lambdaContext: lambdaContext as any, // we don't have a lambda's context here
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
            .map((promise) => promise.catch((e) => console.log(e)));

          await Promise.all(promises);
        }
      }
    };
  }
}
