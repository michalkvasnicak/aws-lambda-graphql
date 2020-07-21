import {
  DynamoDBEventProcessor,
  DynamoDBConnectionManager,
  DynamoDBEventStore,
  DynamoDBSubscriptionManager,
  PubSub,
  Server,
  withFilter,
} from 'aws-lambda-graphql';
import { ApiGatewayManagementApi, DynamoDB } from 'aws-sdk';
import * as assert from 'assert';
import { ulid } from 'ulid';

// serverless offline support
const dynamoDbClient = new DynamoDB.DocumentClient({
  // use serverless-dynamodb endpoint in offline mode
  ...(process.env.IS_OFFLINE
    ? {
        endpoint: 'http://localhost:8000',
      }
    : {}),
});

const eventStore = new DynamoDBEventStore({ dynamoDbClient });
const pubSub = new PubSub({ eventStore });
const subscriptionManager = new DynamoDBSubscriptionManager({ dynamoDbClient });
const connectionManager = new DynamoDBConnectionManager({
  // this one is weird but we don't care because you'll use it only if you want to use serverless-offline
  // why is it like that? because we are extracting api gateway endpoint from received events
  // but serverless offline has wrong stage and domainName values in event provided to websocket handler
  // so we need to override the endpoint manually
  // please do not use it otherwise because we need correct endpoint, if you use it similarly as dynamoDBClient above
  // you'll end up with errors
  apiGatewayManager: process.env.IS_OFFLINE
    ? new ApiGatewayManagementApi({
        endpoint: 'http://localhost:3001',
      })
    : undefined,
  dynamoDbClient,
  subscriptions: subscriptionManager,
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

const typeDefs = /* GraphQL */ `
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
`;

const resolvers = {
  Mutation: {
    async sendMessage(rootValue: any, { text, type }: SendMessageArgs) {
      assert.ok(text.length > 0 && text.length < 100);
      const payload: Message = { id: ulid(), text, type };

      await pubSub.publish('NEW_MESSAGE', payload);

      return payload;
    },
  },
  Query: {
    serverTime: () => Date.now(),
  },
  Subscription: {
    messageFeed: {
      resolve: (rootValue: Message) => {
        // root value is the payload from sendMessage mutation
        return rootValue;
      },
      subscribe: withFilter(
        pubSub.subscribe('NEW_MESSAGE'),
        (rootValue: Message, args: { type: null | MessageType }) => {
          // this can be async too :)
          if (args.type == null) {
            return true;
          }

          return args.type === rootValue.type;
        },
      ),
    },
  },
};

const server = new Server({
  connectionManager,
  eventProcessor: new DynamoDBEventProcessor(),
  resolvers,
  subscriptionManager,
  // use serverless-offline endpoint in offline mode
  ...(process.env.IS_OFFLINE
    ? {
        playground: {
          subscriptionEndpoint: 'ws://localhost:3001',
        },
      }
    : {}),
  typeDefs,
});

export const handleHttp = server.createHttpHandler();
export const handleWebSocket = server.createWebSocketHandler();
export const handleDynamoDBStream = server.createEventHandler();
