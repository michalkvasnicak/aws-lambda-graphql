import { makeExecutableSchema } from 'graphql-tools';
import { PubSub } from '../PubSub';
import { withFilter } from '../withFilter';
import { IContext } from '../types';

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
        testMutation(
          rootValue: any,
          args: { text: string },
          context: IContext,
        ) {
          if (context.lambdaContext == null) {
            throw new Error('Missing lambda context');
          }

          return args.text;
        },
        async testPublish(
          rootValue: any,
          args: { authorId: string; text: string },
          context: IContext,
        ) {
          if (context.lambdaContext == null) {
            throw new Error('Missing lambda context');
          }

          await pubSub.publish('test', args);

          return args.text;
        },
      },
      Query: {
        delayed: () => new Promise(r => setTimeout(() => r(true), 100)),
        testQuery(parent: any, args: any, context: IContext) {
          if (context.lambdaContext == null) {
            throw new Error('Missing lambda context');
          }

          return 'test';
        },
      },
      Subscription: {
        textFeed: {
          resolve: (
            payload: { text: string },
            args: any,
            context: IContext,
          ) => {
            if (context.lambdaContext == null) {
              throw new Error('Missing lambda context');
            }

            return payload.text;
          },
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
