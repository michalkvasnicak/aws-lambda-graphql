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
    getFooPropertyFromContext: String
  }

  type Subscription {
    textFeed(authorId: ID): String!
  }
`;

// this is just test graphql context (pubSub is provided in server.ts)
type TestGraphQLContext = IContext & { pubSub: PubSub };

function createSchema() {
  return makeExecutableSchema({
    typeDefs,
    resolvers: {
      Mutation: {
        testMutation(
          rootValue: any,
          args: { text: string },
          context: TestGraphQLContext,
        ) {
          if (context.lambdaContext == null) {
            throw new Error('Missing lambda context');
          }

          return args.text;
        },
        async testPublish(
          rootValue: any,
          args: { authorId: string; text: string },
          context: TestGraphQLContext,
        ) {
          if (context.lambdaContext == null) {
            throw new Error('Missing lambda context');
          }

          await context.pubSub.publish('test', args);

          return args.text;
        },
      },
      Query: {
        delayed: () => new Promise(r => setTimeout(() => r(true), 100)),
        testQuery(parent: any, args: any, context: TestGraphQLContext) {
          if (context.lambdaContext == null) {
            throw new Error('Missing lambda context');
          }

          return 'test';
        },
        getFooPropertyFromContext(
          parent: any,
          args: any,
          ctx: TestGraphQLContext,
        ) {
          return ctx.foo;
        },
      },
      Subscription: {
        textFeed: {
          resolve: (
            payload: { text: string },
            args: any,
            context: TestGraphQLContext,
          ) => {
            if (context.lambdaContext == null) {
              throw new Error('Missing lambda context');
            }

            return payload.text;
          },
          subscribe: withFilter(
            (payload, args, ctx, info) => {
              // this is test for more advanced use case when the user don't want to
              // use pubSub from the scope of a file but rather from GraphQL context
              return ctx.pubSub.subscribe('test')(payload, args, ctx, info);
            },
            (payload, args, ctx) => {
              const subscriberAuthorId = ctx.authorId
                ? ctx.authorId
                : args.authorId;
              return payload.authorId === subscriberAuthorId;
            },
          ),
        },
      },
    } as any,
  });
}

export { createSchema };
