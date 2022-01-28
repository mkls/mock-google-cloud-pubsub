'use strict';

const topics = {};
const subscriptions = {};

module.exports = class MockPubSub {
  constructor({ projectId }) {
    this.projectId = projectId;
  }

  async getTopics() {
    return [Object.values(topics)];
  }

  async getSubscriptions() {
    return [Object.values(subscriptions)];
  }

  async createTopic(topicName) {
    const name = `projects/${this.projectId}/topics/${topicName}`;
    if (topics[name]) {
      throw libError(6, 'ALREADY_EXISTS: Topic already exists');
    }
    const topic = createTopic(this.projectId, name);
    topics[name] = topic;
    return [topic];
  }

  topic(topicName) {
    const name = topicName.startsWith('projects')
      ? topicName
      : `projects/${this.projectId}/topics/${topicName}`;
    return topics[name] || nonExisitingTopic;
  }

  subscription(subscriptionName) {
    const name = subscriptionName.startsWith('projects')
      ? subscriptionName
      : `projects/${this.projectId}/subscriptions/${subscriptionName}`;
    return subscriptions[name] || nonExisitingSubscription;
  }
};

const createTopic = (projectId, name) => ({
  name,
  _subscriptions: [],
  async delete() {
    delete topics[name];
  },
  async createSubscription(subscriptionName) {
    const name = `projects/${projectId}/subscriptions/${subscriptionName}`;
    if (subscriptions[name]) {
      throw libError(6, 'ALREADY_EXISTS: Subscription already exists');
    }
    const subscription = createSubscription(name);
    subscriptions[name] = subscription;
    this._subscriptions.push(name);
    return [subscription];
  },
  async publish(data, attributes) {
    await delay(5);
    const message = { data, attributes, ack() {}, nack() {} };
    this._subscriptions.forEach(name => {
      subscriptions[name]._addMessage(message);
    });
  }
});

const nonExisitingTopic = {
  async delete() {
    throw libError(5, 'NOT_FOUND: Topic not found');
  }
};

const createSubscription = name => ({
  name,
  _listeners: [],
  _undeliveredMessages: [],
  async delete() {
    delete subscriptions[name];
  },
  on(eventName, listener) {
    this._listeners.push(listener);
    this._undeliveredMessages.forEach(message => this._listeners[0](message));
    this._undeliveredMessages = [];
  },
  removeAllListeners() {},
  close() {},
  _addMessage(message) {
    if (this._listeners.length > 0) {
      this._listeners[0](message);
    } else {
      this._undeliveredMessages.push(message);
    }
  }
});

const nonExisitingSubscription = {
  async delete() {
    throw libError(5, 'NOT_FOUND: Subscription does not exist');
  }
};

const libError = (code, message) => {
  const error = new Error(`${code} ${message}`);
  error.code = code;
  return error;
};

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
