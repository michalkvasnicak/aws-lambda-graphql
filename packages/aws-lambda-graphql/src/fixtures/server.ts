import { ulid } from 'ulid';
import { Server as WSServer } from 'ws';
import { PubSub } from '..';
import { createSchema } from './schema';
import {
  MemoryEventProcessor,
  EventProcessorFn,
} from '../MemoryEventProcessor';
import { MemoryEventStore } from '../MemoryEventStore';
import { MemorySubscriptionManager } from '../MemorySubscriptionManager';
import { WebSocketConnectionManager } from '../WebSocketConnectionManager';
import { Server } from '../Server';
import { APIGatewayV2Handler } from '../types';

export class TestLambdaServer {
  connectionManager: WebSocketConnectionManager;

  eventStore: MemoryEventStore;

  subscriptionManager: MemorySubscriptionManager;

  eventProcessor: EventProcessorFn;

  eventProcessingInterval: NodeJS.Timer | undefined;

  handler: APIGatewayV2Handler;

  port: number;

  wsServer: WSServer | undefined;

  constructor({
    port = 3001,
    onConnect,
  }: { port?: number; onConnect?: any } = {}) {
    this.eventStore = new MemoryEventStore();
    this.port = port;
    this.connectionManager = new WebSocketConnectionManager();
    this.subscriptionManager = new MemorySubscriptionManager();

    const schema = createSchema({
      pubSub: new PubSub({ eventStore: this.eventStore }),
    });

    const server = new Server({
      connectionManager: this.connectionManager,
      eventProcessor: new MemoryEventProcessor(),
      schema,
      subscriptionManager: this.subscriptionManager,
      subscriptions: {
        onConnect,
      },
    });

    this.handler = server.createWebSocketHandler();
    this.eventProcessor = server.createEventHandler();
  }

  close = async () => {
    const wsClose = new Promise((resolve, reject) => {
      if (this.wsServer == null) {
        reject(new Error('Server not initialized'));
      } else {
        this.wsServer.close(err => {
          clearInterval(this.eventProcessingInterval!);

          return err ? reject(err) : resolve();
        });
      }
    });

    return wsClose;
  };

  processEvents = () => {
    const events = this.eventStore.events.splice(0, 5);

    if (events) {
      this.eventProcessor(events);
    }
  };

  start = async () => {
    const wsStart = new Promise((resolve, reject) => {
      this.wsServer = new WSServer({ port: this.port });

      this.wsServer.on('connection', async ws => {
        const connectionId = ulid();
        const result = await this.handler(
          {
            requestContext: {
              connectionId,
              routeKey: '$connect',
              socket: ws,
            },
          } as any,
          {} as any,
        );

        ws.on('close', () => {
          this.handler(
            {
              requestContext: {
                connectionId,
                routeKey: '$disconnect',
                socket: ws,
              },
            } as any,
            {} as any,
          );
        });

        ws.on('message', async data => {
          const defaultResult = await this.handler(
            {
              requestContext: {
                connectionId,
                routeKey: '$default',
                socket: ws,
              },
              body: data.toString('utf8'),
            } as any,
            {} as any,
          );

          if (defaultResult && defaultResult.body) {
            ws.send(defaultResult.body);
          }
        });

        if (result && result.statusCode === 403) {
          ws.send(result.body);

          ws.close();
          return;
        }

        if (result) {
          const conn = this.connectionManager.connections.get(connectionId);

          if (conn) {
            conn.socket = ws as any;
          }

          if (result && result.body) {
            ws.send(result.body);
          }
        }
      });

      this.wsServer.on('listening', () => {
        // start event processing
        this.eventProcessingInterval = setInterval(this.processEvents, 20);
        this.wsServer!.removeListener('error', reject);
        resolve();
      });

      this.wsServer.on('error', reject);
    });

    return wsStart;
  };
}
