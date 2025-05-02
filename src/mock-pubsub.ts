import type {
  PubSub as RealPubSub,
  Topic,
  GetTopicsResponse,
  GetSubscriptionsResponse,
  CreateTopicResponse,
} from '@google-cloud/pubsub';
import { libError, makeTopicName } from './utils';
import { createTopic } from './topic';
import { getSubscription, type MockSubscription } from './subscription';
import type { TestOptions } from './types';

const topics: Map<string, Topic> = new Map();
const subscriptions: Map<string, MockSubscription> = new Map();

// @ts-expect-error partial PubSub implementation
class PubSub implements RealPubSub {
  projectId: string;
  #testOptions: TestOptions;

  constructor({ projectId = '{{projectId}}' } = {}, testOptions?: TestOptions) {
    this.projectId = projectId;
    this.#testOptions = testOptions;
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
    const topic = createTopic({
      projectId: this.projectId,
      name,
      topics,
      subscriptions,
      testOptions: this.#testOptions,
    });
    topics.set(name, topic);

    const response: CreateTopicResponse = [topic, {}];
    return response;
  }

  topic(topicName: string) {
    const name = makeTopicName({ projectId: this.projectId, topicName });
    return (
      topics.get(name) ||
      createTopic({
        projectId: this.projectId,
        name,
        topics,
        subscriptions,
        testOptions: this.#testOptions,
      })
    );
  }

  subscription(subscriptionName: string) {
    return getSubscription({
      projectId: this.projectId,
      subscriptionName,
      subscriptions,
      testOptions: this.#testOptions,
    });
  }
}

export { PubSub };
