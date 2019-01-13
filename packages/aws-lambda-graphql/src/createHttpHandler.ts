import { APIGatewayProxyHandler, APIGatewayProxyEvent } from 'aws-lambda';
import * as contentType from 'content-type';
import { GraphQLSchema } from 'graphql';
import * as querystring from 'querystring';
import { ExtendableError } from './errors';
import execute from './execute';
import { IConnectionManager, OperationRequest } from './types';

class HTTPError extends ExtendableError {
  statusCode: number;

  constructor(statusCode: number, message?: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

function parseGraphQLParams(event: APIGatewayProxyEvent): OperationRequest {
  switch (event.httpMethod) {
    case 'GET': {
      // get cannot have a body so parse operation from query params
      throw new HTTPError(405, 'Method not allowed');
    }
    case 'POST': {
      const parsedType = contentType.parse(event.headers['Content-Type']);

      switch (parsedType.type) {
        case 'application/json': {
          return JSON.parse(event.body);
        }
        case 'application/x-www-form-urlencoded': {
          return querystring.parse(event.body) as any;
        }
        default: {
          throw new HTTPError(400, 'Invalid request content type');
        }
      }
    }
    default: {
      throw new HTTPError(405, 'Method not allowed');
    }
  }
}

type Options = {
  connectionManager: IConnectionManager;
  schema: GraphQLSchema;
  formatResponse?: (body: any) => string;
};

function createHttpHandler({
  connectionManager,
  schema,
  formatResponse = JSON.stringify,
}: Options): APIGatewayProxyHandler {
  return async function serveHttp(event) {
    try {
      const operation = parseGraphQLParams(event);
      const result = await execute({
        connectionManager,
        operation,
        schema,
        connection: {} as any,
        pubSub: {} as any,
        subscriptionManager: {} as any,
        useSubscriptions: false,
      });

      return {
        body: formatResponse(result),
        headers: {
          'Content-Type': 'application/json',
        },
        statusCode: 200,
      };
    } catch (e) {
      if (e instanceof HTTPError) {
        return { statusCode: e.statusCode, body: e.message };
      }

      return { statusCode: 500, body: e.message || 'Internal server error' };
    }
  };
}

export { createHttpHandler };
export default createHttpHandler;
