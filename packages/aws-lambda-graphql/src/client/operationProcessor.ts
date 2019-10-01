import { ExecutionResult, Observable } from 'apollo-link';
import { getOperationAST, parse, print } from 'graphql';
import { w3cwebsocket } from 'websocket';
import { formatMessage } from '../formatMessage';
import {
  LEGACY_CLIENT_EVENT_TYPES as CLIENT_EVENT_TYPES,
  GQLOperationResult,
} from '../protocol';
import { OperationRequest } from '../types';

interface GQLOperationRequest {
  id: string;
  isSubscription: boolean;
  observer: ZenObservable.SubscriptionObserver<any>;
  operation: OperationRequest;
  clearTimeout: () => void;
  startTimeout: () => void;
  type: CLIENT_EVENT_TYPES.GQL_START;
}

interface GQLUnsubscribeRequest {
  /**
   * Same as ID of operation used to start the subscription
   */
  id: string;
  type: CLIENT_EVENT_TYPES.GQL_STOP;
}

type ExecutedOperation = GQLOperationRequest | GQLUnsubscribeRequest;

type Options = {
  /**
   * Number of ms to wait for operation result (in case of subscriptions this is ignored)
   * 0/Infinity is the same
   */
  operationTimeout?: number;
};

class OperationProcessor {
  public executedOperations: { [id: string]: GQLOperationRequest };

  private nextOperationId: number;

  private queuedOperations: ExecutedOperation[];

  private operationTimeout: number;

  private stopped: boolean;

  private socket: null | w3cwebsocket;

  constructor({ operationTimeout = Infinity }: Options) {
    this.nextOperationId = 0;
    this.stopped = true;
    this.operationTimeout = operationTimeout;
    this.queuedOperations = [];
    this.executedOperations = {};
    this.socket = null;
  }

  public execute = (
    operation: OperationRequest,
  ): Observable<ExecutionResult> => {
    return new Observable(observer => {
      try {
        const isSubscription =
          getOperationAST(
            typeof operation.query !== 'string'
              ? operation.query
              : parse(operation.query),
            operation.operationName || '',
          )!.operation === 'subscription';
        let tmt: any = null;
        let closed: boolean = false;
        const id = this.generateNextOperationId();
        const op: GQLOperationRequest = {
          id,
          isSubscription,
          observer,
          operation,
          clearTimeout: () => {
            clearTimeout(tmt);
          },
          startTimeout: () => {
            if (
              this.operationTimeout !== Infinity &&
              this.operationTimeout !== 0
            ) {
              tmt = setTimeout(() => {
                clearTimeout(tmt);
                delete this.executedOperations[id];

                observer.error(new Error('Timed out'));
              }, this.operationTimeout);
            }
          },
          type: CLIENT_EVENT_TYPES.GQL_START,
        };

        this.executedOperations[op.id] = op;

        this.send(op);

        if (isSubscription) {
          return {
            get closed() {
              return closed;
            },
            unsubscribe: () => {
              closed = true;
              this.unsubscribeOperation(op.id);
            },
          };
        }
      } catch (e) {
        observer.error(e);
      }

      return undefined;
    });
  };

  public processOperationResult = (event: GQLOperationResult) => {
    // if operation is a subscription, just stream a value
    // otherwise stream value and close observable (and remove it from operations)
    const operation = this.executedOperations[event.id];

    if (operation) {
      operation.clearTimeout();

      operation.observer.next(event.payload);

      if (!operation.isSubscription) {
        delete this.executedOperations[event.id];
        operation.observer.complete();
      }
    }
  };

  public start = (socket: w3cwebsocket) => {
    this.socket = socket;
    this.stopped = false;

    // send all pending operations
    this.flushQueuedMessages();
  };

  public stop = () => {
    this.stopped = true;
    this.socket = null;
  };

  public unsubscribeFromAllOperations = () => {
    Object.keys(this.executedOperations).forEach(id => {
      this.unsubscribeOperation(id);
    });
  };

  private generateNextOperationId = (): string => {
    return (++this.nextOperationId).toString();
  };

  private unsubscribeOperation = (id: string) => {
    const executedOperation = this.executedOperations[id];

    if (executedOperation) {
      if (executedOperation.isSubscription) {
        // send STOP event
        this.send({
          id,
          type: CLIENT_EVENT_TYPES.GQL_STOP,
        });
      }

      delete this.executedOperations[id];
    } else {
      // this operation is only queued, so it hasn't been sent yet
      this.queuedOperations = this.queuedOperations.filter(op => {
        if (op.id === id) {
          return false;
        }

        return true;
      });
    }
  };

  private send = (operation: ExecutedOperation) => {
    // if is stopped, queue
    if (this.stopped) {
      this.queuedOperations.push(operation);
    } else {
      this.sendRaw(operation);
    }
  };

  private sendRaw = (operation: ExecutedOperation) => {
    if (operation.type === CLIENT_EVENT_TYPES.GQL_START) {
      operation.startTimeout();
    }

    if (this.socket) {
      this.socket.send(
        formatMessage(
          operation.type === CLIENT_EVENT_TYPES.GQL_START
            ? {
                type: CLIENT_EVENT_TYPES.GQL_START,
                id: operation.id,
                payload: {
                  ...operation.operation,
                  query:
                    typeof operation.operation.query !== 'string'
                      ? print(operation.operation.query)
                      : operation.operation.query,
                },
              }
            : { type: CLIENT_EVENT_TYPES.GQL_STOP, id: operation.id },
        ),
      );
    }
  };

  private flushQueuedMessages = () => {
    this.queuedOperations.forEach(this.sendRaw);
    this.queuedOperations = [];
  };
}

export { OperationProcessor };
export default OperationProcessor;
