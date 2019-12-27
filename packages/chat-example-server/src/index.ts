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
const apiGatewayManager = new ApiGatewayManagementApi({
  ...(process.env.IS_OFFLINE
    ? {
        endpoint: 'http://localhost:3001',
      }
    : {}),
});
const dynamoDbClient = new DynamoDB.DocumentClient({
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
  apiGatewayManager,
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
  typeDefs,
});

export const handleHttp = server.createHttpHandler();
export const handleWebSocket = server.createWebSocketHandler();
export const handleDynamoDBStream = server.createEventHandler();
