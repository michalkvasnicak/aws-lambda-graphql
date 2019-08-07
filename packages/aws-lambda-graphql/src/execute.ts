import { APIGatewayEvent, Context as LambdaContext } from 'aws-lambda';
import {
  ASTVisitor,
  DocumentNode,
  getOperationAST,
  GraphQLSchema,
  execute as gqlExecute,
  ExecutionResult,
  parse,
  specifiedRules,
  subscribe as gqlSubscribe,
  validate,
  ValidationContext,
} from 'graphql';
import { PubSub } from 'graphql-subscriptions';
import {
  APIGatewayWebSocketEvent,
  IConnection,
  IContext,
  IConnectionManager,
  ISubscriptionManager,
  OperationRequest,
} from './types';

export interface ExecuteOptions {
  connection: IConnection;
  connectionManager: IConnectionManager;
  context?:
    | { [key: string]: any }
    | ((
        ctx: IContext,
      ) => { [key: string]: any } | Promise<{ [key: string]: any }>);
  event: APIGatewayEvent | APIGatewayWebSocketEvent;
  lambdaContext?: LambdaContext;
  operation: OperationRequest;
  pubSub: PubSub;
  /**
   * This is internal param used to indicate if we should register subscriptions to storage
   * Basically this is used by WebSocket handler to manage subscriptions
   * But in case of event processor this is always false, because we don't want to register
   * new subscriptions in event processor
   */
  registerSubscriptions?: boolean;
  rootValue?: any;
  schema: GraphQLSchema;
  subscriptionManager: ISubscriptionManager;
  /**
   * This is internal param used to indicate if we should use graphql.subscribe or graphql.execute methods
   * Basically for HTTP this is always false, for WS/event processor this is always true
   */
  useSubscriptions?: boolean;
  /**
   * An optional array of validation rules that will be applied on the document
   * in additional to those defined by the GraphQL spec.
   */
  validationRules?: ((context: ValidationContext) => ASTVisitor)[];
}

/**
 * Execute methods executes graphql operations
 *
 * In case of mutation/query it returns ExecutionResult
 * In case of subscriptions it returns AsyncIterator of ExecutionResults (only if useSubscriptions is true)
 *
 * @param param0
 */
async function execute({
  connection,
  connectionManager,
  context,
  event,
  lambdaContext = {} as any,
  operation,
  pubSub,
  rootValue,
  schema,
  subscriptionManager,
  registerSubscriptions = true,
  useSubscriptions = false,
  validationRules = [],
}: ExecuteOptions): Promise<ExecutionResult | AsyncIterator<ExecutionResult>> {
  // extract query from operation (parse if is string);
  const document: DocumentNode =
    typeof operation.query !== 'string'
      ? operation.query
      : parse(operation.query);

  // validate document
  const validationErrors = validate(schema, document, [
    ...specifiedRules,
    ...validationRules,
  ]);

  if (validationErrors.length > 0) {
    return {
      errors: validationErrors,
    };
  }

  // this is internal context that should not be used by a user in resolvers
  // this is only added to provide access for PubSub to get connection managers and other
  // internal stuff
  const internalContext: IContext = {
    event,
    lambdaContext,
    $$internal: {
      connection,
      connectionManager,
      operation,
      pubSub,
      registerSubscriptions,
      subscriptionManager,
    },
  };

  // instantiate context
  const contextValue: { [key: string]: any } =
    typeof context === 'function' ? await context(internalContext) : context;

  // detect operation type
  const operationAST = getOperationAST(document, operation.operationName || '');

  if (useSubscriptions) {
    if (operationAST!.operation === 'subscription') {
      return gqlSubscribe({
        document,
        rootValue,
        schema,
        contextValue: {
          ...internalContext,
          ...contextValue,
        },
        operationName: operation.operationName,
        variableValues: operation.variables,
      });
    }
  } else if (!useSubscriptions && operationAST!.operation === 'subscription') {
    throw new Error('Cannot subscribe using HTTP');
  }

  return gqlExecute({
    document,
    rootValue,
    schema,
    contextValue: {
      ...internalContext,
      ...contextValue,
    },
    operationName: operation.operationName,
    variableValues: operation.variables,
  });
}

export { execute };
export default execute;
