import { APIGatewayProxyEvent } from 'aws-lambda';
import { createSchema } from '../fixtures/schema';
import { createHttpHandler } from '../createHttpHandler';

describe('createHttpHandler', () => {
  it('serves JSON POST requests', async () => {
    const handler = createHttpHandler({ schema: createSchema() } as any);
    const event: APIGatewayProxyEvent = {
      httpMethod: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          query Test {
            testQuery
          }
        `,
      }),
    } as any;

    await expect(handler(event, {} as any, {} as any)).resolves.toEqual({
      body: JSON.stringify({ data: { testQuery: 'test' } }),
      headers: {
        'Content-Type': 'application/json',
      },
      statusCode: 200,
    });
  });

  it('fails on subscription', async () => {
    const handler = createHttpHandler({ schema: createSchema() } as any);
    const event: APIGatewayProxyEvent = {
      body: JSON.stringify({
        query: /* GraphQL */ `
          subscription {
            textFeed(authorId: "1")
          }
        `,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      httpMethod: 'POST',
    } as any;

    await expect(handler(event, {} as any, {} as any)).resolves.toEqual({
      body: 'Cannot subscribe using HTTP',
      statusCode: 500,
    });
  });
});
