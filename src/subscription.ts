import type { Message, Subscription } from '@google-cloud/pubsub';
import {
  pickRandom,
  emptyResponse,
  makeSubscriptionName,
  libError,
} from './utils';
import type { TestOptions, SubscriptionMap } from './types';

export type MockSubscription = Subscription & {
  _queueMessage: (message: Message) => void;
};

export function getSubscription({
  projectId,
  subscriptionName,
  subscriptions,
  testOptions,
}: {
  projectId: string;
  subscriptionName: string;
  subscriptions: SubscriptionMap;
  testOptions: TestOptions;
}): Subscription {
  const name = makeSubscriptionName({ projectId, subscriptionName });
  return (
    subscriptions.get(name) ||
    createSubscription({
      projectId,
      name,
      subscriptions,
      registerSubscription: false,
      testOptions,
    })
  );
}

export function createSubscription({
  projectId,
  name,
  subscriptions,
  registerSubscription,
  testOptions,
}: {
  projectId: string;
  name: string;
  subscriptions: Map<string, MockSubscription>;
  registerSubscription: boolean;
  testOptions: TestOptions;
}): MockSubscription {
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
      const subscriptionName = makeSubscriptionName({
        projectId,
        subscriptionName: name,
      });
      if (!subscriptions.has(subscriptionName)) {
        throw libError(5, 'NOT_FOUND: Subscription does not exist');
      }

      subscriptions.delete(subscriptionName);
      return emptyResponse;
    },

    on(eventName, listener) {
      if (testOptions?.interceptors?.onSubscription) {
        testOptions.interceptors.onSubscription({
          subscription,
          event: eventName,
          listener,
        });
      }

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

    _queueMessage(message) {
      messageQueue.push(message);
      processMessageQueue();
    },
  };

  if (registerSubscription) {
    subscriptions.set(name, subscription);
  }

  return subscription;
}
