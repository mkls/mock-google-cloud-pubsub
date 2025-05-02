import type {
  Topic,
  CreateSubscriptionResponse,
  GetTopicSubscriptionsResponse,
} from '@google-cloud/pubsub';
import {
  delay,
  libError,
  makeSubscriptionName,
  emptyResponse,
  makeSequentialNumberString,
} from './utils';
import { createSubscription, getSubscription } from './subscription';
import { createMessage } from './message';
import type { TestOptions, TopicMap, SubscriptionMap } from './types';

export function createTopic({
  projectId,
  name,
  topics,
  subscriptions,
  testOptions,
}: {
  projectId: string;
  name: string;
  topics: TopicMap;
  subscriptions: SubscriptionMap;
  testOptions: TestOptions;
}): Topic {
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

    async createSubscription(
      subscriptionName: string,
    ): Promise<CreateSubscriptionResponse> {
      const name = makeSubscriptionName({ projectId, subscriptionName });
      if (subscriptions.has(name)) {
        throw libError(6, 'ALREADY_EXISTS: Subscription already exists');
      }

      const subscription = createSubscription({
        projectId,
        name,
        subscriptions,
        registerSubscription: true,
        testOptions,
      });
      topicSubscriptionNames.push(name);

      return [subscription, {}];
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
            testOptions,
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
            testOptions,
          });
          subscription._queueMessage(message);
        }
      });

      return messageId;
    },

    setPublishOptions() {},

    subscription(subscriptionName: string) {
      return getSubscription({
        projectId,
        subscriptionName,
        subscriptions,
        testOptions,
      });
    },

    async getSubscriptions(): Promise<GetTopicSubscriptionsResponse> {
      const topicSubscriptions = topicSubscriptionNames
        .map((name) => subscriptions.get(name))
        .filter((sub) => sub !== undefined);

      return [topicSubscriptions];
    },
  };
  topic.getSubscriptions;

  return topic;
}
