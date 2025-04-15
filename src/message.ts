import type { Message } from '@google-cloud/pubsub';
import { makeSequentialNumberString } from './utils';
import type { MockSubscription } from './subscription';

export function createMessage({
  id,
  subscription,
  dataInput,
  attributes = {},
}: {
  id: string;
  subscription: MockSubscription;
  dataInput: Message['data'] | Uint8Array | string | null | undefined;
  attributes?: Message['attributes'];
}): Message {
  // Currently not handling dataInput as Uint8Array<ArrayBufferLike>
  const data = Buffer.isBuffer(dataInput)
    ? dataInput
    : Buffer.from(typeof dataInput === 'string' ? dataInput : '');

  // https://cloud.google.com/nodejs/docs/reference/pubsub/latest/pubsub/message
  const message: Message = {
    ackId: `${subscription.name}:${makeSequentialNumberString()}`,
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
}
