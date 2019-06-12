import { Observable } from 'apollo-link';
import { getOperationAST, parse, print } from 'graphql';
import { w3cwebsocket } from 'websocket';
import { formatMessage } from '../formatMessage';
import { GQLOperationResult } from '../protocol';
import { OperationRequest } from '../types';

type ExecutedOperation = {
  id: string;
  isSubscription: boolean;
  observer: ZenObservable.SubscriptionObserver<any>;
  operation: OperationRequest;
  clearTimeout: () => void;
  startTimeout: () => void;
};

type Options = {
  /**
   * Number of ms to wait for operation result (in case of subscriptions this is ignored)
   * 0/Infinity is the same
   */
  operationTimeout?: number;
};

class OperationProcessor {
  public executedOperations: { [id: string]: ExecutedOperation };

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

  public execute = (operation: OperationRequest) => {
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
        const id = this.generateNextOperationId();
        const op: ExecutedOperation = {
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
        };

        this.executedOperations[op.id] = op;

        this.send(op);
      } catch (e) {
        observer.error(e);
      }
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

  private generateNextOperationId = (): string => {
    return (++this.nextOperationId).toString();
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
    const message = {
      id: operation.id,
      payload: {
        ...operation.operation,
        query:
          typeof operation.operation.query !== 'string'
            ? print(operation.operation.query)
            : operation.operation.query,
      },
      type: 'GQL_OP',
    };

    if (this.socket) {
      this.socket.send(formatMessage(message));
    }

    operation.startTimeout();
  };

  private flushQueuedMessages = () => {
    this.queuedOperations.forEach(this.sendRaw);
    this.queuedOperations = [];
  };
}

export { OperationProcessor };
export default OperationProcessor;
