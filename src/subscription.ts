import type { Message, Subscription } from '@google-cloud/pubsub';
import { pickRandom, emptyResponse } from './utils';

export type MockSubscription = Subscription & {
  _queueMessage: (message: Message) => void;
};

export function createSubscription({
  name,
  subscriptions,
}: {
  name: string;
  subscriptions: Map<string, MockSubscription>;
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
      subscriptions.delete(name);
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
    _queueMessage(message) {
      messageQueue.push(message);
      processMessageQueue();
    },
  };

  subscriptions.set(name, subscription);
  return subscription;
}
