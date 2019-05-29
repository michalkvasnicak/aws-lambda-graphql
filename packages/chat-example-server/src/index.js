var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { createDynamoDBEventProcessor, createHttpHandler, createWsHandler, DynamoDBConnectionManager, DynamoDBEventStore, DynamoDBSubscriptionManager, PubSub, withFilter, } from 'aws-lambda-graphql';
import * as assert from 'assert';
import { makeExecutableSchema } from 'graphql-tools';
import { ulid } from 'ulid';
const eventStore = new DynamoDBEventStore();
const pubSub = new PubSub({ eventStore });
const schema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
    enum MessageType {
      greeting
      test
    }

    type Message {
      id: ID!
      text: String!
      type: MessageType!
    }

    type Mutation {
      sendMessage(text: String!, type: MessageType = greeting): Message!
    }

    type Query {
      serverTime: Float!
    }

    type Subscription {
      messageFeed(type: MessageType): Message!
    }
  `,
    resolvers: {
        Mutation: {
            sendMessage(rootValue, { text, type }) {
                return __awaiter(this, void 0, void 0, function* () {
                    assert.ok(text.length > 0 && text.length < 100);
                    const payload = { id: ulid(), text, type };
                    yield pubSub.publish('NEW_MESSAGE', payload);
                    return payload;
                });
            },
        },
        Query: {
            serverTime: () => Date.now(),
        },
        Subscription: {
            messageFeed: {
                resolve: (rootValue) => {
                    // root value is the payload from sendMessage mutation
                    return rootValue;
                },
                subscribe: withFilter(pubSub.subscribe('NEW_MESSAGE'), (rootValue, args) => {
                    // this can be async too :)
                    if (args.type == null) {
                        return true;
                    }
                    return args.type === rootValue.type;
                }),
            },
        },
    },
});
const connectionManager = new DynamoDBConnectionManager();
const subscriptionManager = new DynamoDBSubscriptionManager();
const eventProcessor = createDynamoDBEventProcessor({
    connectionManager,
    schema,
    subscriptionManager,
});
const wsHandler = createWsHandler({
    connectionManager,
    schema,
    subscriptionManager,
});
const httpHandler = createHttpHandler({
    connectionManager,
    schema,
});
export function handler(event, context) {
    return __awaiter(this, void 0, void 0, function* () {
        // detect event type
        if (event.Records != null) {
            // event is DynamoDB stream event
            return eventProcessor(event, context, null);
        }
        if (event.requestContext != null &&
            event.requestContext.routeKey != null) {
            // event is web socket event from api gateway v2
            return wsHandler(event, context);
        }
        if (event.requestContext != null &&
            event.requestContext.path != null) {
            // event is http event from api gateway v1
            return httpHandler(event, context, null);
        }
        throw new Error('Invalid event');
    });
}
