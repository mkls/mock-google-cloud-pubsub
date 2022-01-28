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
    return [subscription];
  }
});

const nonExisitingTopic = {
  async delete() {
    throw libError(5, 'NOT_FOUND: Topic not found');
  }
};

const createSubscription = name => ({
  name,
  async delete() {
    delete subscriptions[name];
  }
});

const nonExisitingSubscription = {
  async delete() {
    throw libError(5, 'NOT_FOUND: Subscription does not exist');
  }
}

const libError = (code, message) => {
  const error = new Error(`${code} ${message}`);
  error.code = code;
  return error;
};
