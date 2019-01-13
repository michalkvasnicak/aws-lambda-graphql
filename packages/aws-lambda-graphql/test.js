const { DynamoDBSubscriptionManager } = require('./dist');

const sm = new DynamoDBSubscriptionManager();
const iterator = sm.subscribersByEventName('NEW_MESSAGE');

async function iterate() {
  for (let i = 0; i < 3; i++) {
    console.log(JSON.stringify(await iterator.next(), null, '  '));
  }
}

iterate();
