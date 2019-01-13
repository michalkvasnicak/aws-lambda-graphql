import OperationProcessor from '../operationProcessor';

describe('OperationProcessor', () => {
  const socket = { send: jest.fn() };
  const op = new OperationProcessor({ operationTimeout: 50 });

  beforeEach(() => {
    socket.send.mockReset();
  });

  it('executes query operations', done => {
    op.start(socket as any);

    op.execute({
      query: /* GraphQL */ `
        query Test {
          test
        }
      `,
    }).subscribe(
      (result: any) => {
        expect(result.data.test).toBe('test');
      },
      done,
      () => {
        expect(op.executedOperations).toEqual({});
        done();
      },
    );

    expect(op.executedOperations).not.toEqual({});
    expect(socket.send).toHaveBeenCalledTimes(1);
    const [id] = Object.keys(op.executedOperations);

    op.processOperationResult({
      id,
      payload: { data: { test: 'test' } },
      type: 'GQL_OP_RESULT',
    });
  });

  it('fails on operation timeout', done => {
    op.start(socket as any);

    op.execute({
      query: /* GraphQL */ `
        query Test {
          test
        }
      `,
    }).subscribe(
      () => {
        done(new Error('Should not call next'));
      },
      err => {
        expect(op.executedOperations).toEqual({});
        done();
      },
      () => done(new Error('Should not call complete')),
    );

    expect(op.executedOperations).not.toEqual({});
    expect(socket.send).toHaveBeenCalledTimes(1);
  });

  it('queues operations if not running and then runs them', done => {
    op.stop();

    op.execute({
      query: /* GraphQL */ `
        query Test {
          test
        }
      `,
    }).subscribe(
      (result: any) => {
        expect(result.data.test).toBe('test');
      },
      () => done(new Error('Should not call error')),
      () => {
        expect(socket.send).toHaveBeenCalledTimes(1);

        done();
      },
    );

    expect(socket.send).not.toHaveBeenCalled();
    expect(op.executedOperations).not.toEqual({});

    op.start(socket as any);

    const [id] = Object.keys(op.executedOperations);

    op.processOperationResult({
      id,
      payload: { data: { test: 'test' } },
      type: 'GQL_OP_RESULT',
    });
  });
});
