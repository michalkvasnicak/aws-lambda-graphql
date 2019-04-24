import { IEventStore, ISubscriptionEvent } from './types';
import { SNS } from 'aws-sdk';

class MemoryEventStore implements IEventStore {
  public events: ISubscriptionEvent[];
  private sns: SNS;

  constructor() {
    this.sns = new SNS();
  }

  publish = async (event: ISubscriptionEvent, topic): Promise<void> => {
    var params = {
      Message: JSON.stringify(event) /* required */,
      TopicArn: topic,
    };
    console.log('🌟 pushing SNS:', params);
    try {
      await this.sns.publish(params).promise()
    } catch (err) {
      console.log('err', err);
    }

    console.log('🌼 SNS pushed!');
  };
}

export { MemoryEventStore };
export default MemoryEventStore;
