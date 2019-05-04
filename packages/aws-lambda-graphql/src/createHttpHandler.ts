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
      return { operationName: 'getGraphiQL', variables: {}, query: '' };
    }
    case 'OPTIONS': {
      return { operationName: 'getOptions', variables: {}, query: '' };
    }
    case 'POST': {
      const parsedType = contentType.parse(
        event.headers['Content-Type'] || event.headers['content-type'],
      );

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
  WSS_URL: string;
  formatResponse?: (body: any) => string;
};

function createHttpHandler({
  connectionManager,
  schema,
  formatResponse = JSON.stringify,
  WSS_URL
}: Options): APIGatewayProxyHandler {


  const graphiql = `<!DOCTYPE html>
  <html>
  
  <head>
    <meta charset=utf-8/>
    <meta name="viewport" content="user-scalable=no, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, minimal-ui">
    <title>GraphQL Playground</title>
    <link rel="stylesheet" href="//cdn.jsdelivr.net/npm/graphql-playground-react/build/static/css/index.css" />
    <link rel="shortcut icon" href="//cdn.jsdelivr.net/npm/graphql-playground-react/build/favicon.png" />
    <script src="//cdn.jsdelivr.net/npm/graphql-playground-react-aws/build/static/js/middleware.js"></script>
  </head>
  
  <body>
    <div id="root">
      <style>
        body {
          background-color: rgb(23, 42, 58);
          font-family: Open Sans, sans-serif;
          height: 90vh;
        }
        #root {
          height: 100%;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .loading {
          font-size: 32px;
          font-weight: 200;
          color: rgba(255, 255, 255, .6);
          margin-left: 20px;
        }
        img {
          width: 78px;
          height: 78px;
        }
        .title {
          font-weight: 400;
        }
      </style>
      <img src='//cdn.jsdelivr.net/npm/graphql-playground-react/build/logo.png' alt=''>
      <div class="loading"> Loading
        <span class="title">GraphQL Playground</span>
      </div>
    </div>
  
    <script>window.addEventListener('load', function (event) {
        GraphQLPlayground.init(document.getElementById('root'), {
          subscriptionEndpoint: '${WSS_URL}',
          aws: true
        })
      })</script>
  </body>
  
  </html>`;

  return async function serveHttp(event) {
    try {
      const operation = parseGraphQLParams(event);
      console.log('operation', operation);
      if (operation.operationName === 'getGraphiQL' || operation.operationName === 'getOptions') {
        return {
          body: graphiql,
          headers: {
            'Access-Control-Allow-Origin': event.headers.origin || event.headers.Origin,
            'Access-Control-Allow-Credentials': true,
            'Access-Control-Allow-Headers': event.headers['access-control-request-headers'],
            'Access-Control-Allow-Methods': '*',
            'Content-Type': 'text/html',
          },
          statusCode: 200,
        };
      } else {
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
            'Access-Control-Allow-Origin': event.headers.origin || event.headers.Origin,
            'Access-Control-Allow-Credentials': true,
            'Access-Control-Allow-Methods': '*',
            'Content-Type': 'application/json',
          },
          statusCode: 200,
        };
      }
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
