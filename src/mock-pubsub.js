'use strict';

const topics = {};

module.exports = class MockPubSub {
  constructor({ projectId }) {
    this.projectId = projectId;
  }

  async getTopics() {
    return [Object.values(topics)];
  }

  async createTopic(topicName) {
    const name = `projects/${this.projectId}/topics/${topicName}`;
    if (topics[name]) {
      throw libError(6, 'ALREADY_EXISTS: Topic already exists');
    }
    const topic = createTopic(name);
    topics[name] = topic;
    return [topic];
  }

  topic(topicName) {
    const name = topicName.startsWith('projects')
      ? topicName
      : `projects/${this.projectId}/topics/${topicName}`;
    return topics[name] || nonExisitingTopic;
  }
};

const createTopic = name => ({
  name,
  async delete() {
    delete topics[name];
  }
});

const nonExisitingTopic = {
  async delete() {
    throw libError(5, 'NOT_FOUND: Topic not found');
  }
};

const libError = (code, message) => {
  const error = new Error(`${code} ${message}`);
  error.code = code;
  return error;
};
