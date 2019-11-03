import { APIGatewayProxyHandler, APIGatewayProxyEvent } from 'aws-lambda';
import * as contentType from 'content-type';
import { GraphQLSchema, ValidationContext, ASTVisitor } from 'graphql';
import * as querystring from 'querystring';
import { ExtendableError } from './errors';
import { execute, ExecuteOptions } from './execute';
import { IConnectionManager, OperationRequest } from './types';

class HTTPError extends ExtendableError {
  statusCode: number;

  constructor(statusCode: number, message?: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

function normalizeHeaders(event: APIGatewayProxyEvent) {
  Object.keys(event.headers).forEach(header => {
    // eslint-disable-next-line no-param-reassign
    event.headers[header.toLowerCase()] = event.headers[header];
  });
}

function parseGraphQLParams(event: APIGatewayProxyEvent): OperationRequest {
  switch (event.httpMethod) {
    case 'GET': {
      // get cannot have a body so parse operation from query params
      throw new HTTPError(405, 'Method not allowed');
    }
    case 'POST': {
      const parsedType = contentType.parse(event.headers['content-type']);

      switch (parsedType.type) {
        case 'application/json': {
          return JSON.parse(event.body!);
        }
        case 'application/x-www-form-urlencoded': {
          return querystring.parse(event.body!) as any;
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

interface HttpHandlerOptions {
  connectionManager: IConnectionManager;
  context?: ExecuteOptions['context'];
  schema: GraphQLSchema;
  formatResponse?: (body: any) => string;
  /**
   * An optional array of validation rules that will be applied on the document
   * in additional to those defined by the GraphQL spec.
   */
  validationRules?: ((context: ValidationContext) => ASTVisitor)[];
}

function createHttpHandler({
  connectionManager,
  context,
  schema,
  formatResponse = JSON.stringify,
  validationRules,
}: HttpHandlerOptions): APIGatewayProxyHandler {
  return async function serveHttp(event, lambdaContext) {
    try {
      // normalize headers to lower case
      normalizeHeaders(event);

      const operation = parseGraphQLParams(event);
      const result = await execute({
        connectionManager,
        event,
        lambdaContext,
        operation,
        context,
        schema,
        connection: {} as any,
        pubSub: {} as any,
        subscriptionManager: {} as any,
        useSubscriptions: false,
        validationRules,
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
