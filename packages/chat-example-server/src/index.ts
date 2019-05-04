import { APIGatewayEvent, SNSEvent } from 'aws-lambda';
import {
  APIGatewayWebSocketEvent,
  createSNSEventProcessor,
  createHttpHandler,
  createWsHandler,
  MemoryConnectionManager,
  MemoryEventStore,
  MemorySubscriptionManager,
  PubSub,
  withFilter,
} from 'aws-lambda-graphql';
import * as assert from 'assert';
import { makeExecutableSchema } from 'graphql-tools';
import { ulid } from 'ulid';

import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLBoolean,
  GraphQLNonNull,
  GraphQLFloat,
  GraphQLID,
} from 'graphql';

const eventStore = new MemoryEventStore();

const pubSub = new PubSub({
  eventStore,
  topic: process.env.snsArn,
});
type MessageType = 'greeting' | 'test';

type Message = {
  id: string;
  text: string;
  type: MessageType;
};

type SendMessageArgs = {
  text: string;
  type: MessageType;
};

export default function createSchemas() {
  const schema = new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'Query',
      fields: {
        serverTime: {
          type: GraphQLFloat,
          resolve() {
            return Date.now();
          },
        },
      },
    }),
    mutation: new GraphQLObjectType({
      name: 'Mutation',
      fields: {
        sendMessage: {
          type: new GraphQLObjectType({
            name: 'sendMessageMutation',
            fields: {
              text: {
                type: GraphQLString,
              },
              id: {
                type: GraphQLID,
              },
              type: {
                type: GraphQLString,
              },
            },
          }),
          args: {
            text: {
              type: GraphQLString,
            },
            type: {
              type: GraphQLString,
            },
          },
          description: 'Send a new message to all',
          async resolve(_, { text, type }) {
            console.log('{ text, type }', { text, type });
            const payload = { id: String(Math.random() * 1000), text, type };

            console.log('send new message!', payload);

            await pubSub.publish('NEW_MESSAGE', payload);

            return payload; // { success: true };
          },
        },
      },
    }),
    subscription: new GraphQLObjectType({
      name: 'Subscription',
      fields: {
        messageFeed: {
          type: new GraphQLObjectType({
            name: 'newMessage',
            fields: {
              text: {
                type: GraphQLString,
              },
              id: {
                type: GraphQLID,
              },
              type: {
                type: GraphQLString,
              },
            },
          }),
          resolve: a => a,
          subscribe: pubSub.subscribe('NEW_MESSAGE'),
        },
      },
    }),
  });

  return schema;
}

const schema = createSchemas();;

const connectionManager = new MemoryConnectionManager();
const subscriptionManager = new MemorySubscriptionManager();

const eventProcessor = createSNSEventProcessor({
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
  WSS_URL: process.env.WSS_URL
});

export async function handler(
  event: APIGatewayEvent | APIGatewayWebSocketEvent | SNSEvent,
  context,
) {
  console.log('▶️ received event', JSON.stringify(event, null, '  '));
  // detect event type
  if ((event as SNSEvent).Records != null) {
    // event is DynamoDB stream event
    console.log('🚁 SNS Event');
    return eventProcessor(event as SNSEvent, context, null);
  } else if (
    (event as APIGatewayWebSocketEvent).requestContext != null &&
    (event as APIGatewayWebSocketEvent).requestContext.routeKey != null
  ) {
    // event is web socket event from api gateway v2
    console.log('🏎 Websocket Event');

    return wsHandler(event as APIGatewayWebSocketEvent, context);
  } else if (
    (event as APIGatewayEvent).requestContext != null &&
    (event as APIGatewayEvent).requestContext.path != null
  ) {
    // event is http event from api gateway v1
    console.log('☎️ HTTP Event');

    return httpHandler(event as APIGatewayEvent, context, null as any);
  } else {
    throw new Error('Invalid event');
  }
}
