'use strict';

const topics = {};
const subscriptions = {};

exports.initializeMocker = config => {
  Object.entries(config).forEach(([topic, subscriptionNames]) => {
    topics[topic] = subscriptionNames;
    subscriptionNames.map(subscriptionName => {
      subscriptions[subscriptionName] = createSubscription();
    });
  });
};

exports.subscription = subscriptionName => subscriptions[subscriptionName];

exports.topic = topicName => ({
  setPublishOptions() {},
  publish(data, attributes) {
    topics[topicName].forEach(subscriptionName =>
      subscriptions[subscriptionName]._add(data, attributes)
    );
  }
});

const createSubscription = () => {
  let deliveredMessages = []
  let pendingMessages = [];
  let callbacks = [];

  const createMessage = (data, attributes) => ({
    ack_id: Math.random(),
    data,
    attributes,
    ack() {},
    nack() {
      processMessage(this);
    }
  });

  const processMessage = message => {
    if (callbacks.length > 0) {
      callbacks.forEach(callback => callback(message));
      deliveredMessages.push(message);
    } else {
      pendingMessages.push(message);
    }
  }

  return {
    _add(data, attributes) {
      processMessage(createMessage(data, attributes));
    },
    on(eventName, callback) {
      if (eventName !== 'message') return;

      pendingMessages.forEach(message => {
        callback(message);
        deliveredMessages.push(message);
      });
      pendingMessages = [];
      callbacks.push(callback);
    },
    removeListener(eventName, callback) {
      callbacks = callbacks.filter(fn => fn !== callback);
    },
    removeAllListeners(eventName) {
      callbacks = [];
    }
  };
}
