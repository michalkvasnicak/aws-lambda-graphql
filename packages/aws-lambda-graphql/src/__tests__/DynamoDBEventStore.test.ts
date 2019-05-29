// @ts-ignore
import { putPromiseMock } from 'aws-sdk';
import { DynamoDBEventStore } from '../DynamoDBEventStore';

describe('DynamoDBEventStore', () => {
  beforeEach(() => {
    putPromiseMock.mockReset();
  });

  it('works correctly', async () => {
    const eventStore = new DynamoDBEventStore();

    await expect(
      eventStore.publish({
        event: 'test',
        payload: {
          custom: true,
        },
      }),
    ).resolves.toBeUndefined();

    expect(putPromiseMock).toHaveBeenCalledTimes(1);
  });
});
