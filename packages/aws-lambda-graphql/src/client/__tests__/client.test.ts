import { WebSocket, Server } from 'mock-socket';
import waitFor from 'wait-for-expect';
import { Client } from '../client';

describe('Client', () => {
  it('works correctly', async () => {
    const uri = 'ws://localhost:8083';
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const server = new Server(uri);

    // on creation, client is in idle state
    const client = new Client({
      uri,
      webSockImpl: WebSocket as any,
    });

    expect(client.status).toBe('connecting');

    await waitFor(() => {
      expect(client.status).toBe('connected');
    });
  });

  it('works correctly (lazy)', async () => {
    const uri = 'ws://localhost:8084';
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const server = new Server(uri);

    // on creation, client is in idle state
    const client = new Client({
      uri,
      options: {
        lazy: true,
      },
      webSockImpl: WebSocket as any,
    });

    expect(client.status).toBe('idle');

    // it will turn connect on operation
    client.request({} as any);

    expect(client.status).toBe('connecting');

    await waitFor(() => {
      expect(client.status).toBe('connected');
    });
  });
});
