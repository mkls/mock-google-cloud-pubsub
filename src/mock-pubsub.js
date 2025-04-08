'use strict';

const topics = {};
const subscriptions = {};

exports.PubSub = class PubSub {
  constructor({ projectId = 'mock-project-id' } = {}) {
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
    return getSubscriptionObject(this.projectId, subscriptionName);
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
    this._subscriptions.forEach((name) => {
      const message = subscriptions[name]._createMessage({ data, attributes });
      subscriptions[name]._queueMessage(message);
    });
  },
  async publishMessage(messageOptions) {
    await delay(5);
    let data;
    let attributes;

    if (messageOptions.data) {
      data = messageOptions.data;
      attributes = messageOptions.attributes;
    }

    if (messageOptions.json) {
      data = JSON.stringify(messageOptions.json);
      attributes = messageOptions.attributes;
    }

    this._subscriptions.forEach((name) => {
      const message = subscriptions[name]._createMessage({ data, attributes });
      subscriptions[name]._queueMessage(message);
    });
  },
  setPublishOptions() {},
  subscription(subscriptionName) {
    return getSubscriptionObject(projectId, subscriptionName);
  },
});

const getSubscriptionObject = (projectId, subscriptionName) => {
  const name = subscriptionName.startsWith('projects')
    ? subscriptionName
    : `projects/${projectId}/subscriptions/${subscriptionName}`;
  return subscriptions[name] || nonExisitingSubscription;
};

const nonExisitingTopic = {
  async delete() {
    throw libError(5, 'NOT_FOUND: Topic not found');
  },
};

const createSubscription = (name) => ({
  name,
  _listeners: [],
  _undeliveredMessages: [],
  async delete() {
    delete subscriptions[name];
  },
  on(eventName, listener) {
    if (eventName !== 'message') return;
    this._listeners.push(listener);
    this._undeliveredMessages.forEach((message) =>
      pickRandom(this._listeners)(message),
    );
    this._undeliveredMessages = [];
  },
  removeAllListeners() {
    this._listeners = [];
  },
  close() {},
  _createMessage({ data, attributes }) {
    const message = {
      data,
      attributes,
      ack: () => {},
      nack: async () => {
        await delay(10);
        this._queueMessage(message);
      },
    };
    return message;
  },
  _queueMessage(message) {
    if (this._listeners.length > 0) {
      pickRandom(this._listeners)(message);
    } else {
      this._undeliveredMessages.push(message);
    }
  },
});

const nonExisitingSubscription = {
  async delete() {
    throw libError(5, 'NOT_FOUND: Subscription does not exist');
  },
};

const libError = (code, message) => {
  const error = new Error(`${code} ${message}`);
  error.code = code;
  return error;
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const pickRandom = (list) => list[Math.floor(Math.random() * list.length)];
