import type {
  PubSub as RealPubSub,
  Subscription,
  Topic,
  Message,
  CreateSubscriptionResponse,
  GetTopicsResponse,
  GetSubscriptionsResponse,
  CreateTopicResponse,
} from '@google-cloud/pubsub';
import {
  delay,
  libError,
  pickRandom,
  nonExisitingTopic,
  nonExisitingSubscription,
  emptyResponse,
} from './utils';

type MockSubscription = Subscription & {
  _createMessage: (
    data: Message['data'] | Uint8Array | string | null | undefined,
    attributes?: Message['attributes'],
  ) => Message;
  _queueMessage: (message: Message) => void;
};

const topics: Record<string, Topic> = {};
const subscriptions: Record<string, MockSubscription> = {};

function getSubscriptionObject(
  projectId: string,
  subscriptionName: string,
): Subscription {
  const name = subscriptionName.startsWith('projects')
    ? subscriptionName
    : `projects/${projectId}/subscriptions/${subscriptionName}`;
  return subscriptions[name] || nonExisitingSubscription;
}

// @ts-expect-error partial PubSub implementation
class PubSub implements RealPubSub {
  projectId: string;

  constructor({ projectId = 'mock-project-id' } = {}) {
    this.projectId = projectId;
  }

  async getTopics() {
    const response: GetTopicsResponse = [Object.values(topics)];
    return response;
  }

  async getSubscriptions() {
    const response: GetSubscriptionsResponse = [Object.values(subscriptions)];
    return response;
  }

  async createTopic(topicName: string) {
    const name = `projects/${this.projectId}/topics/${topicName}`;
    if (topics[name]) {
      throw libError(6, 'ALREADY_EXISTS: Topic already exists');
    }
    const topic = createTopic(this.projectId, name);
    topics[name] = topic;

    const response: CreateTopicResponse = [topic, {}];
    return response;
  }

  topic(topicName: string) {
    const name = topicName.startsWith('projects')
      ? topicName
      : `projects/${this.projectId}/topics/${topicName}`;
    return topics[name] || nonExisitingTopic;
  }

  subscription(subscriptionName: string) {
    return getSubscriptionObject(this.projectId, subscriptionName);
  }
}

function createTopic(projectId: string, name: string): Topic {
  const topicSubscriptionNames: string[] = [];

  // @ts-expect-error partial Topic implementation
  const topic: Topic = {
    name,
    async delete() {
      delete topics[name];
      return emptyResponse;
    },
    async createSubscription(subscriptionName: string, options: object) {
      const name = `projects/${projectId}/subscriptions/${subscriptionName}`;
      if (subscriptions[name]) {
        throw libError(6, 'ALREADY_EXISTS: Subscription already exists');
      }

      const subscription = createSubscription(name);
      subscriptions[name] = subscription;
      topicSubscriptionNames.push(name);

      const response: CreateSubscriptionResponse = [subscription, {}];
      return response;
    },
    async publish(data, attributes) {
      await delay(5);
      topicSubscriptionNames.forEach((name) => {
        const subscription = subscriptions[name];
        if (subscription) {
          const message = subscription._createMessage(
            data,
            // Currently not supporting callback api
            typeof attributes === 'function' ? undefined : attributes,
          );
          subscription._queueMessage(message);
        }
      });

      // @TODO return expected orderingKey value
      return 'orderingKey';
    },
    async publishMessage(messageOptions) {
      await delay(5);
      const data = messageOptions.json
        ? JSON.stringify(messageOptions.json)
        : messageOptions.data;
      const attributes = messageOptions.attributes ?? undefined;

      topicSubscriptionNames.forEach((name) => {
        const subscription = subscriptions[name];
        if (subscription) {
          const message = subscription._createMessage(data, attributes);
          subscription._queueMessage(message);
        }
      });

      // @TODO return expected orderingKey value
      return 'orderingKey';
    },
    setPublishOptions() {},
    subscription(subscriptionName: string) {
      return getSubscriptionObject(projectId, subscriptionName);
    },
  };

  return topic;
}

function createSubscription(name: string): MockSubscription {
  type Listener = (message: Message) => void;
  const listeners: Listener[] = [];
  const messageQueue: Message[] = [];

  function processMessageQueue() {
    if (!listeners.length) {
      return;
    }
    messageQueue.forEach((message) => {
      const listener = pickRandom(listeners);
      if (listener) {
        listener(message);
      }
    });

    messageQueue.length = 0;
  }

  // @ts-expect-error incomplete Subscription implementation
  const subscription: MockSubscription = {
    name,
    async delete() {
      delete subscriptions[name];
      return emptyResponse;
    },
    on(eventName, listener) {
      if (eventName !== 'message') {
        return subscription;
      }

      // @ts-expect-error currently supporting only "message" listeners
      listeners.push(listener);
      processMessageQueue();
      return subscription;
    },
    removeAllListeners() {
      listeners.length = 0;
      return subscription;
    },
    async close() {},
    _createMessage(dataInput, attributes = {}) {
      // Currently not handling dataInput as Uint8Array<ArrayBufferLike>
      const data = Buffer.isBuffer(dataInput)
        ? dataInput
        : Buffer.from(typeof dataInput === 'string' ? dataInput : '');

      // @ts-expect-error partial Message implementation
      const message: Message = {
        data,
        attributes,
        ack: () => {},
        nack: async () => {
          await delay(10);
          subscription._queueMessage(message);
        },
      };
      return message;
    },
    _queueMessage(message) {
      messageQueue.push(message);
      processMessageQueue();
    },
  };

  return subscription;
}

export { PubSub };
