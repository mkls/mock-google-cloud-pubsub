import type { Subscription, Message, Topic } from '@google-cloud/pubsub';
import type { MockSubscription } from './subscription';

export type TopicMap = Map<string, Topic>;
export type SubscriptionMap = Map<string, MockSubscription>;

export type TestOptions =
  | {
      interceptors?: {
        createMessage?: (input: {
          subscription: Subscription;
          message: Message;
        }) => Message;
        onSubscription?: (input: {
          subscription: Subscription;
          event: string;
          listener: Function | void;
        }) => Function | void;
      };
    }
  | undefined;
