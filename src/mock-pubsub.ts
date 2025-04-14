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
  makeTopicName,
  makeSubscriptionName,
  nonExisitingTopic,
  nonExisitingSubscription,
  emptyResponse,
  makeSequentialNumberString,
} from './utils';

type MockSubscription = Subscription & {
  _createMessage: (input: {
    id: string;
    dataInput: Message['data'] | Uint8Array | string | null | undefined;
    attributes?: Message['attributes'];
  }) => Message;
  _queueMessage: (message: Message) => void;
};

const topics: Record<string, Topic> = {};
const subscriptions: Record<string, MockSubscription> = {};

function getSubscription(
  projectId: string,
  subscriptionName: string,
): Subscription {
  const name = makeSubscriptionName({ projectId, subscriptionName });
  return subscriptions[name] || nonExisitingSubscription;
}

// @ts-expect-error partial PubSub implementation
class PubSub implements RealPubSub {
  projectId: string;

  constructor({ projectId = '{{projectId}}' } = {}) {
    this.projectId = projectId;
  }

  async getTopics() {
    const projectTopics = Object.values(topics).filter((topic) =>
      topic.name.startsWith(`projects/${this.projectId}/`),
    );

    const response: GetTopicsResponse = [projectTopics];
    return response;
  }

  async getSubscriptions() {
    const projectSubscriptions = Object.values(subscriptions).filter(
      (subscription) =>
        subscription.name.startsWith(`projects/${this.projectId}/`),
    );
    const response: GetSubscriptionsResponse = [projectSubscriptions];
    return response;
  }

  async createTopic(topicName: string) {
    const name = makeTopicName({ projectId: this.projectId, topicName });
    if (topics[name]) {
      throw libError(6, 'ALREADY_EXISTS: Topic already exists');
    }
    const topic = createTopic(this.projectId, name);
    topics[name] = topic;

    const response: CreateTopicResponse = [topic, {}];
    return response;
  }

  topic(topicName: string) {
    const name = makeTopicName({ projectId: this.projectId, topicName });
    return topics[name] || nonExisitingTopic;
  }

  subscription(subscriptionName: string) {
    return getSubscription(this.projectId, subscriptionName);
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
      const name = makeSubscriptionName({ projectId, subscriptionName });
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
      const messageId = makeSequentialNumberString();
      topicSubscriptionNames.forEach((name) => {
        const subscription = subscriptions[name];
        if (subscription) {
          const message = subscription._createMessage({
            id: messageId,
            dataInput: data,
            // Currently not supporting callback api
            attributes:
              typeof attributes === 'function' ? undefined : attributes,
          });
          subscription._queueMessage(message);
        }
      });

      return messageId;
    },
    async publishMessage(messageOptions) {
      await delay(5);
      const messageId = makeSequentialNumberString();
      const data = messageOptions.json
        ? JSON.stringify(messageOptions.json)
        : messageOptions.data;
      const attributes = messageOptions.attributes ?? undefined;

      topicSubscriptionNames.forEach((name) => {
        const subscription = subscriptions[name];
        if (subscription) {
          const message = subscription._createMessage({
            id: messageId,
            dataInput: data,
            attributes,
          });
          subscription._queueMessage(message);
        }
      });

      return messageId;
    },
    setPublishOptions() {},
    subscription(subscriptionName: string) {
      return getSubscription(projectId, subscriptionName);
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
    _createMessage({ id, dataInput, attributes = {} }) {
      // Currently not handling dataInput as Uint8Array<ArrayBufferLike>
      const data = Buffer.isBuffer(dataInput)
        ? dataInput
        : Buffer.from(typeof dataInput === 'string' ? dataInput : '');

      // https://cloud.google.com/nodejs/docs/reference/pubsub/latest/pubsub/message
      const message: Message = {
        ackId: `${name}:${makeSequentialNumberString()}`,
        attributes,
        data,
        length: data.length,
        deliveryAttempt: 0,
        // @ts-expect-error This should be actually a GCP PreciseDate instance
        publishTime: new Date(),
        id,
        received: Date.now(),
        isExactlyOnceDelivery: false,
        orderingKey: '',

        endParentSpan: () => {},
        ack: () => {},
        ackFailed: (error) => {},
        ackWithResponse: async () => 'SUCCESS',
        nack: () => {
          setTimeout(() => {
            subscription._queueMessage(message);
          }, 10);
        },
        nackWithResponse: async () => {
          setTimeout(() => {
            subscription._queueMessage(message);
          }, 10);
          return 'SUCCESS';
        },
        modAck: (deadline) => {},
        modAckWithResponse: async (deadline) => 'SUCCESS',
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
