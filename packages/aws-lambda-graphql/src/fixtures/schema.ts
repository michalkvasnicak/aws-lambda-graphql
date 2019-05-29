import { makeExecutableSchema } from 'graphql-tools';
import { PubSub } from '../PubSub';
import { withFilter } from '../withFilter';

const typeDefs = /* GraphQL */ `
  type Mutation {
    testMutation(text: String!): String!
    testPublish(authorId: ID!, text: String!): String!
  }

  type Query {
    delayed: Boolean!
    testQuery: String!
  }

  type Subscription {
    textFeed(authorId: ID!): String!
  }
`;

function createSchema({
  pubSub = new PubSub({ eventStore: {} as any }),
}: { pubSub?: PubSub } = {}) {
  return makeExecutableSchema({
    typeDefs,
    resolvers: {
      Mutation: {
        testMutation(rootValue: any, args: { text: string }) {
          return args.text;
        },
        async testPublish(
          rootValue: any,
          args: { authorId: string; text: string },
        ) {
          await pubSub.publish('test', args);

          return args.text;
        },
      },
      Query: {
        delayed: () => new Promise(r => setTimeout(() => r(true), 100)),
        testQuery() {
          return 'test';
        },
      },
      Subscription: {
        textFeed: {
          resolve: (payload: { text: string }) => payload.text,
          subscribe: withFilter(
            pubSub.subscribe('test'),
            (payload, args) => payload.authorId === args.authorId,
          ),
        },
      },
    } as any,
  });
}

export { createSchema };

export default createSchema;
