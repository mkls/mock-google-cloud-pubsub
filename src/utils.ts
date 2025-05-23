import type { EmptyResponse } from '@google-cloud/pubsub';

export function libError(code: number, message: string): Error {
  const error = new Error(`${code} ${message}`);
  // @ts-expect-error intentionally assigning code prop
  error.code = code;
  return error;
}

export function delay(ms: number): Promise<unknown> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function pickRandom<Item>(list: Item[]): Item | undefined {
  return list[Math.floor(Math.random() * list.length)];
}

let sequentialNumber = 0;
export function makeSequentialNumberString(): string {
  sequentialNumber++;
  return String(sequentialNumber);
}

const TOPIC_NAME_REGEX = /^projects\/.+\/topics\/.+$/;
export function makeTopicName({
  projectId,
  topicName,
}: {
  projectId: string;
  topicName: string;
}): string {
  if (topicName.startsWith('projects/')) {
    if (TOPIC_NAME_REGEX.test(topicName)) {
      return topicName;
    }
    throw libError(
      3,
      `INVALID_ARGUMENT: Invalid [topics] name: (name=${topicName})`,
    );
  }
  return `projects/${projectId}/topics/${topicName}`;
}

const SUBSCRIPTION_NAME_REGEX = /^projects\/.+\/subscriptions\/.+$/;
export function makeSubscriptionName({
  projectId,
  subscriptionName,
}: {
  projectId: string;
  subscriptionName: string;
}): string {
  if (subscriptionName.startsWith('projects/')) {
    if (SUBSCRIPTION_NAME_REGEX.test(subscriptionName)) {
      return subscriptionName;
    }
    throw libError(
      3,
      `INVALID_ARGUMENT: Invalid [subscriptions] name: (name=${subscriptionName})`,
    );
  }
  return `projects/${projectId}/subscriptions/${subscriptionName}`;
}

export const emptyResponse = undefined as unknown as EmptyResponse;
