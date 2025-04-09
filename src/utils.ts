import type { Subscription, Topic, EmptyResponse } from '@google-cloud/pubsub';

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

// Fake responses

// @ts-expect-error partial Topic implementation
export const nonExisitingTopic: Topic = {
  async delete() {
    throw libError(5, 'NOT_FOUND: Topic not found');
  },
};

// @ts-expect-error partial Subscription implementation
export const nonExisitingSubscription: Subscription = {
  async delete() {
    throw libError(5, 'NOT_FOUND: Subscription does not exist');
  },
};

export const emptyResponse = undefined as unknown as EmptyResponse;
