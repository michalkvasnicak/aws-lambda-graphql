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

import { idArg, queryType, stringArg } from 'nexus'
import { makePrismaSchema, prismaObjectType } from 'nexus-prisma'
import * as path from 'path'
import datamodelInfo from './generated/nexus-prisma'
import { prisma } from './generated/prisma-client'

// const User = prismaObjectType({
//   name: 'User',
//   definition(t) {
//     t.prismaFields(['*'])
//   },
// })

// const Post = prismaObjectType({
//   name: 'Post',
//   definition(t) {
//     t.prismaFields(['*'])
//   },
// })

// const Query = prismaObjectType({
//   name: 'Query',
//   definition(t) {
//     t.prismaFields(['*'])
//     // t.field('serverTime', {
//     //   type: 'Time',
//     //   resolve() {
//     //     return {now: new Date()};
//     //   },
//     // })
//   },
// })
// const Mutation = prismaObjectType({
//   name: 'Mutation',
//   definition(t) {
//     t.prismaFields(['*'])
//   },
// })


// export const Query = queryType({
//   definition(t) {
//     t.field('me', {
//       type: 'User',
//       resolve: (parent, args, ctx) => {
//         const userId = getUserId(ctx)
//         return ctx.prisma.user({ id: userId })
//       },
//     })

//     t.list.field('feed', {
//       type: 'Post',
//       resolve: (parent, args, ctx) => {
//         return ctx.prisma.posts({
//           where: { published: true },
//         })
//       },
//     })

//     t.list.field('filterPosts', {
//       type: 'Post',
//       args: {
//         searchString: stringArg({ nullable: true }),
//       },
//       resolve: (parent, { searchString }, ctx) => {
//         return ctx.prisma.posts({
//           where: {
//             OR: [
//               { title_contains: searchString },
//               { content_contains: searchString },
//             ],
//           },
//         })
//       },
//     })

//     t.field('post', {
//       type: 'Post',
//       nullable: true,
//       args: { id: idArg() },
//       resolve: (parent, { id }, ctx) => {
//         return ctx.prisma.post({ id })
//       },
//     })
//   },
// })



// const serverQueries = new GraphQLObjectType({
//   name: 'Query',
//   fields: {
//     serverTime: {
//       type: GraphQLFloat,
//       resolve() {
//         return Date.now();
//       },
//     },
//   },
// })

// const Subscription = prismaObjectType({
//   name: 'Subscription',
//   definition(t) {
//     t.prismaFields(['*'])
//   },
// })


const User = prismaObjectType({
  name: 'User',
  definition(t) {
    t.prismaFields([
      'id',
      'name',
      'email',
      {
        name: 'posts',
        args: [], // remove the arguments from the `posts` field of the `User` type in the Prisma schema
      },
    ])
  },
})

const Post = prismaObjectType({
  name: 'Post',
  definition(t) {
    t.prismaFields(['*'])
  },
})

const Query = queryType({
  definition(t) {
    t.list.field('feed', {
      type: 'Post',
      resolve: (parent, args, ctx) => {
        return [
            {
              "title": "Carlos1"
            },
            {
              "title": "Carlos2"
            }
          ]
        // return ctx.prisma.posts({
        //   where: { published: true },
        // })
      },
    })

    t.list.field('filterPosts', {
      type: 'Post',
      args: {
        searchString: stringArg({ nullable: true }),
      },
      resolve: (parent, { searchString }, ctx) => {
        return ctx.prisma.posts({
          where: {
            OR: [
              { title_contains: searchString },
              { content_contains: searchString },
            ],
          },
        })
      },
    })

    // t.field('post', {
    //   type: 'Post',
    //   nullable: true,
    //   args: { id: idArg() },
    //   resolve: (parent, { id }, ctx) => {
    //     return ctx.prisma.post({ id })
    //   },
    // })
  },
})

const Mutation = prismaObjectType({
  name: 'Mutation',
  definition(t) {
    t.field('signupUser', {
      type: 'User',
      args: {
        name: stringArg({ nullable: true }),
        email: stringArg(),
      },
      resolve: (parent, { name, email }, ctx) => {
        return ctx.prisma.createUser({
          name,
          email,
        })
      },
    })

    t.field('createDraft', {
      type: 'Post',
      args: {
        title: stringArg(),
        content: stringArg({ nullable: true }),
        authorEmail: stringArg(),
      },
      resolve: (parent, { title, content, authorEmail }, ctx) => {
        return ctx.prisma.createPost({
          title,
          content,
          author: {
            connect: { email: authorEmail },
          },
        })
      },
    })

    t.field('deletePost', {
      type: 'Post',
      nullable: true,
      args: {
        id: idArg(),
      },
      resolve: (parent, { where : { id } }, ctx) => {
        return ctx.prisma.deletePost({ id })
      },
    })

    t.field('publish', {
      type: 'Post',
      nullable: true,
      args: {
        id: idArg(),
      },
      resolve: (parent, { id }, ctx) => {
        return ctx.prisma.updatePost({
          where: { id },
          data: { published: true },
        })
      },
    })
  },
})


const schema = makePrismaSchema({
  // Provide all the GraphQL types we've implemented
  types: [Query, Mutation, User, Post],

  // Configure the interface to Prisma
  prisma: {
    datamodelInfo,
    client: prisma,
  },

  // Specify where Nexus should put the generated files
  outputs: {
    schema: path.join(__dirname, './generated/schema.graphql'),
    typegen: path.join(__dirname, './generated/nexus.ts'),
  },

  // Configure nullability of input arguments: All arguments are non-nullable by default
  nonNullDefaults: {
    input: false,
    output: false,
  },

  // Configure automatic type resolution for the TS representations of the associated types
  typegenAutoConfig: {
    sources: [
      {
        source: path.join(__dirname, './types.ts'),
        alias: 'types',
      },
    ],
    contextType: 'types.Context',
  },
})

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

// export default function createSchemas() {
//   const schema = new GraphQLSchema({
//     query: new GraphQLObjectType({
//       name: 'Query',
//       fields: {
//         serverTime: {
//           type: GraphQLFloat,
//           resolve() {
//             return Date.now();
//           },
//         },
//       },
//     }),
//     mutation: new GraphQLObjectType({
//       name: 'Mutation',
//       fields: {
//         sendMessage: {
//           type: new GraphQLObjectType({
//             name: 'sendMessageMutation',
//             fields: {
//               text: {
//                 type: GraphQLString,
//               },
//               id: {
//                 type: GraphQLID,
//               },
//               type: {
//                 type: GraphQLString,
//               },
//             },
//           }),
//           args: {
//             text: {
//               type: GraphQLString,
//             },
//             type: {
//               type: GraphQLString,
//             },
//           },
//           description: 'Send a new message to all',
//           async resolve(_, { text, type }) {
//             console.log('{ text, type }', { text, type });
//             const payload = { id: String(Math.random() * 1000), text, type };

//             console.log('send new message!', payload);

//             await pubSub.publish('NEW_MESSAGE', payload);

//             return payload; // { success: true };
//           },
//         },
//       },
//     }),
//     subscription: new GraphQLObjectType({
//       name: 'Subscription',
//       fields: {
//         messageFeed: {
//           type: new GraphQLObjectType({
//             name: 'newMessage',
//             fields: {
//               text: {
//                 type: GraphQLString,
//               },
//               id: {
//                 type: GraphQLID,
//               },
//               type: {
//                 type: GraphQLString,
//               },
//             },
//           }),
//           resolve: a => a,
//           subscribe: pubSub.subscribe('NEW_MESSAGE'),
//         },
//       },
//     }),
//   });

//   return schema;
// }

// // const schema = createSchemas();;

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
    context.prisma = prisma
    return wsHandler(event as APIGatewayWebSocketEvent, context);
  } else if (
    (event as APIGatewayEvent).requestContext != null &&
    (event as APIGatewayEvent).requestContext.path != null
  ) {
    // event is http event from api gateway v1
    console.log('☎️ HTTP Event');
    context.prisma = prisma
    return httpHandler(event as APIGatewayEvent, context, null as any);
  } else {
    throw new Error('Invalid event');
  }
}
