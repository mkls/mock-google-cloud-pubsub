require('dotenv-haphap').config('confidential.env');
import waitForExpect from 'wait-for-expect';
import type { Message } from '@google-cloud/pubsub';
import {
  expectToBeDefined,
  makePubSubInstances,
  clearPubSubInstance,
} from './test-utils';

const projectId = process.env.GCP_PROJECT_ID;

describe('Message', () => {
  makePubSubInstances({ projectId }).forEach(({ title, pubsub }) => {
    describe(title, () => {
      beforeEach(async () => {
        await clearPubSubInstance(pubsub);
      });

      it('has expected shape', async () => {
        const [topic] = await pubsub.createTopic('topic1');
        const [subscription] = await topic.createSubscription('sub1');

        const receivedMessages: Message[] = [];
        subscription.on('message', (message) => receivedMessages.push(message));

        await topic.publish(Buffer.from('Test message!'), { kacsa: 'hap' });

        await waitForExpect(() =>
          expect(receivedMessages.length).toBeGreaterThan(0),
        );
        const message = receivedMessages[0];
        expectToBeDefined(message);

        /**
         * @NOTE can't assert against the full message object due to the following error:
         * HTTP/2 sockets should not be directly manipulated (e.g. read and written)
         */
        expect(message.ackId).toMatch(
          new RegExp(`^projects/${projectId}/subscriptions/sub1:\\d+$`),
        );
        expect(message.attributes).toEqual({ kacsa: 'hap' });
        expect(message.data).toEqual(expect.any(Buffer));
        expect(message.length).toBe(message.data.length);
        expect(message.deliveryAttempt).toBe(0);
        expect(message.publishTime).toEqual(expect.any(Date));
        expect(message.id).toEqual(expect.any(String));
        expect(message.received).toEqual(expect.any(Number));
        expect(message.isExactlyOnceDelivery).toBe(false);
        expect(message.orderingKey).toBe('');

        expect(message.endParentSpan).toEqual(expect.any(Function));
        expect(message.ack).toEqual(expect.any(Function));
        expect(message.ackFailed).toEqual(expect.any(Function));
        expect(await message.ackWithResponse()).toBe('SUCCESS');
        expect(message.nack).toEqual(expect.any(Function));
        expect(message.nackWithResponse).toEqual(expect.any(Function));
        expect(message.modAck).toEqual(expect.any(Function));
        expect(await message.modAckWithResponse(1)).toBe('SUCCESS');

        subscription.removeAllListeners('message');
      });

      describe('.nack()', () => {
        it('should redeliver a message', async () => {
          const [topic] = await pubsub.createTopic('topic1');
          const [subscription] = await topic.createSubscription('sub1');

          const receivedMessages: Message[] = [];
          let nackedOnce = false;
          subscription.on('message', (message) => {
            receivedMessages.push(message);
            if (!nackedOnce) {
              nackedOnce = true;
              message.nack();
            }
          });
          await topic.publish(Buffer.from('message-data'));

          await waitForExpect(() => expect(receivedMessages.length).toBe(2));
          expect(receivedMessages[0]?.data.toString()).toBe('message-data');
          expect(receivedMessages[1]?.data.toString()).toBe('message-data');
          subscription.removeAllListeners('message');
        });
      });

      describe('.nackWithResponse()', () => {
        it('should redeliver a message', async () => {
          const [topic] = await pubsub.createTopic('topic1');
          const [subscription] = await topic.createSubscription('sub1');

          const receivedMessages: Message[] = [];
          let nackedOnce = false;
          subscription.on('message', async (message) => {
            receivedMessages.push(message);
            if (!nackedOnce) {
              nackedOnce = true;
              await message.nackWithResponse();
            }
          });
          await topic.publish(Buffer.from('message-data'));

          await waitForExpect(() => expect(receivedMessages.length).toBe(2));
          expect(receivedMessages[0]?.data.toString()).toBe('message-data');
          expect(receivedMessages[1]?.data.toString()).toBe('message-data');

          subscription.removeAllListeners('message');
        });
      });
    });
  });
});
