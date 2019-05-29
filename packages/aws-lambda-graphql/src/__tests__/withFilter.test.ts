import { createAsyncIterator } from 'iterall';
import { withFilter } from '../withFilter';

describe('withFilter', () => {
  it('filters async iterator based on function result', async () => {
    const events = [{ type: 'A' }, { type: 'B' }, { type: 'A' }];

    const iterator = await withFilter(
      async () => createAsyncIterator(events) as any,
      payload => payload.type === 'A',
    )();

    await expect(iterator.next()).resolves.toEqual({
      done: false,
      value: { type: 'A' },
    });
    await expect(iterator.next()).resolves.toEqual({
      done: false,
      value: { type: 'A' },
    });
    await expect(iterator.next()).resolves.toEqual({
      done: true,
      value: undefined,
    });
  });

  it('filters async iterator based on async function result', async () => {
    const events = [{ type: 'A' }, { type: 'B' }, { type: 'A' }];

    const iterator = await withFilter(
      async () => createAsyncIterator(events) as any,
      async payload => payload.type === 'A',
    )();

    await expect(iterator.next()).resolves.toEqual({
      done: false,
      value: { type: 'A' },
    });
    await expect(iterator.next()).resolves.toEqual({
      done: false,
      value: { type: 'A' },
    });
    await expect(iterator.next()).resolves.toEqual({
      done: true,
      value: undefined,
    });
  });
});
