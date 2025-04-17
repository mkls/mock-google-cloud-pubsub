import type {
  PubSub as RealPubSub,
  Subscription,
  Topic,
  CreateSubscriptionResponse,
  GetTopicsResponse,
  GetSubscriptionsResponse,
  CreateTopicResponse,
} from '@google-cloud/pubsub';
import {
  delay,
  libError,
  makeTopicName,
  makeSubscriptionName,
  emptyResponse,
  makeSequentialNumberString,
} from './utils';
import { createMessage } from './message';
import { createSubscription, type MockSubscription } from './subscription';

const topics: Map<string, Topic> = new Map();
const subscriptions: Map<string, MockSubscription> = new Map();

function getSubscription({
  projectId,
  subscriptionName,
}: {
  projectId: string;
  subscriptionName: string;
}): Subscription {
  const name = makeSubscriptionName({ projectId, subscriptionName });
  return (
    subscriptions.get(name) ||
    createSubscription({
      projectId,
      name,
      subscriptions,
      registerSubscription: false,
    })
  );
}

// @ts-expect-error partial PubSub implementation
class PubSub implements RealPubSub {
  projectId: string;

  constructor({ projectId = '{{projectId}}' } = {}) {
    this.projectId = projectId;
  }

  async getTopics() {
    const projectTopics = Array.from(topics.values()).filter((topic) =>
      topic.name.startsWith(`projects/${this.projectId}/`),
    );

    const response: GetTopicsResponse = [projectTopics];
    return response;
  }

  async getSubscriptions() {
    const projectSubscriptions = Array.from(subscriptions.values()).filter(
      (subscription) =>
        subscription.name.startsWith(`projects/${this.projectId}/`),
    );
    const response: GetSubscriptionsResponse = [projectSubscriptions];
    return response;
  }

  async createTopic(topicName: string) {
    const name = makeTopicName({ projectId: this.projectId, topicName });
    if (topics.has(name)) {
      throw libError(6, 'ALREADY_EXISTS: Topic already exists');
    }
    const topic = createTopic(this.projectId, name);
    topics.set(name, topic);

    const response: CreateTopicResponse = [topic, {}];
    return response;
  }

  topic(topicName: string) {
    const name = makeTopicName({ projectId: this.projectId, topicName });
    return topics.get(name) || createTopic(this.projectId, name);
  }

  subscription(subscriptionName: string) {
    return getSubscription({ projectId: this.projectId, subscriptionName });
  }
}

function createTopic(projectId: string, name: string): Topic {
  const topicSubscriptionNames: string[] = [];

  // @ts-expect-error partial Topic implementation
  const topic: Topic = {
    name,
    async delete() {
      if (!topics.has(name)) {
        throw libError(5, 'NOT_FOUND: Topic not found');
      }

      topics.delete(name);
      return emptyResponse;
    },
    async createSubscription(subscriptionName: string, options: object) {
      const name = makeSubscriptionName({ projectId, subscriptionName });
      if (subscriptions.has(name)) {
        throw libError(6, 'ALREADY_EXISTS: Subscription already exists');
      }

      const subscription = createSubscription({
        projectId,
        name,
        subscriptions,
        registerSubscription: true,
      });
      topicSubscriptionNames.push(name);

      const response: CreateSubscriptionResponse = [subscription, {}];
      return response;
    },
    async publish(data, attributes) {
      await delay(5);
      const messageId = makeSequentialNumberString();
      topicSubscriptionNames.forEach((name) => {
        const subscription = subscriptions.get(name);
        if (subscription) {
          const message = createMessage({
            id: messageId,
            subscription: subscription,
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
        const subscription = subscriptions.get(name);
        if (subscription) {
          const message = createMessage({
            id: messageId,
            subscription: subscription,
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
      return getSubscription({ projectId, subscriptionName });
    },
  };

  return topic;
}

export { PubSub };
