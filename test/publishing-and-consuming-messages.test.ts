require('dotenv-haphap').config('confidential.env');
import waitForExpect from 'wait-for-expect';
import type { Message } from '@google-cloud/pubsub';
import { delay } from '../src/utils';
import {
  makePubSubInstances,
  clearPubSubInstance,
  expectToBeDefined,
} from './test-utils';

const projectId = process.env.GCP_PROJECT_ID;

describe('Publishing and consuming messages', () => {
  makePubSubInstances({ projectId }).forEach(({ title, pubsub }) => {
    describe(title, () => {
      beforeEach(async () => {
        await clearPubSubInstance(pubsub);
      });

      describe('topic.publish()', () => {
        it('should send message to all expected topic subscribers', async () => {
          const [topic] = await pubsub.createTopic('topic1');
          const [sub1] = await topic.createSubscription('sub1');
          const [sub2] = await topic.createSubscription('sub2');

          const receivedMessages1: Message[] = [];
          const receivedMessages2: Message[] = [];
          sub1.on('message', (message) => receivedMessages1.push(message));
          sub2.on('message', (message) => receivedMessages2.push(message));

          const messageId = await topic.publish(Buffer.from('Test message!'), {
            kacsa: 'hap',
          });

          await waitForExpect(() => {
            expect(receivedMessages1.length).toBeGreaterThan(0);
            expect(receivedMessages2.length).toBeGreaterThan(0);
          });
          const message1 = receivedMessages1[0];
          const message2 = receivedMessages2[0];

          expectToBeDefined(message1);
          expectToBeDefined(message2);
          expect(message1.data.toString()).toEqual('Test message!');
          expect(message2.data.toString()).toEqual('Test message!');

          expect(message1.attributes).toEqual({ kacsa: 'hap' });
          expect(message1.attributes).toEqual(message2.attributes);

          expect(message1.id).toBe(messageId);
          expect(message1.id).toBe(message2.id);
          expect(message1.ackId).not.toBe(message2.ackId);

          sub1.removeAllListeners('message');
          sub2.removeAllListeners('message');
        });

        describe('no registered subscriptions', () => {
          it('returns expected message id anyway', async () => {
            const [topic] = await pubsub.createTopic('topic1');
            const messageId = await topic.publish(Buffer.from('Test message!'));

            expect(messageId).toEqual(expect.any(String));
          });
        });
      });

      describe('topic.publishMessage()', () => {
        describe('with ({data: Buffer})', () => {
          it('should send message to all expected topic subscribers', async () => {
            const [topic] = await pubsub.createTopic('topic1');
            const [sub1] = await topic.createSubscription('sub1');
            const [sub2] = await topic.createSubscription('sub2');

            const receivedMessages1: Message[] = [];
            const receivedMessages2: Message[] = [];
            sub1.on('message', (message) => receivedMessages1.push(message));
            sub2.on('message', (message) => receivedMessages2.push(message));

            const messageId = await topic.publishMessage({
              data: Buffer.from('Test message!'),
              attributes: { kacsa: 'hap' },
            });

            await waitForExpect(() => {
              expect(receivedMessages1.length).toBeGreaterThan(0);
              expect(receivedMessages2.length).toBeGreaterThan(0);
            });
            const message1 = receivedMessages1[0];
            const message2 = receivedMessages2[0];

            expectToBeDefined(message1);
            expectToBeDefined(message2);
            expect(message1.data.toString()).toEqual('Test message!');
            expect(message2.data.toString()).toEqual('Test message!');

            expect(message1.attributes).toEqual({ kacsa: 'hap' });
            expect(message1.attributes).toEqual(message2.attributes);

            expect(message1.id).toBe(messageId);
            expect(message1.id).toBe(message2.id);
            expect(message1.ackId).not.toBe(message2.ackId);

            sub1.removeAllListeners('message');
            sub2.removeAllListeners('message');
          });
        });

        describe('with ({json: String})', () => {
          it('should send message to all expected topic subscribers', async () => {
            const [topic] = await pubsub.createTopic('topic1');
            const [subscription] = await topic.createSubscription('sub1');

            const receivedMessages: Message[] = [];
            subscription.on('message', (message) =>
              receivedMessages.push(message),
            );

            await topic.publishMessage({
              json: { data: 'Test message!' },
              attributes: { kacsa: 'hap' },
            });

            await waitForExpect(() =>
              expect(receivedMessages.length).toBeGreaterThan(0),
            );
            const message = receivedMessages[0];

            expectToBeDefined(message);
            expect(JSON.parse(message.data.toString())).toEqual({
              data: 'Test message!',
            });
            expect(message.attributes).toEqual({ kacsa: 'hap' });
            subscription.removeAllListeners('message');
          });
        });

        describe('no registered subscriptions', () => {
          it('returns expected message id anyway', async () => {
            const [topic] = await pubsub.createTopic('topic1');
            const messageId = await topic.publishMessage({
              json: { data: 'Test message!' },
            });

            expect(messageId).toEqual(expect.any(String));
          });
        });
      });

      it('consume messaged published before "subscription.on" invocation', async () => {
        const [topic] = await pubsub.createTopic('topic1');
        const [subscription] = await topic.createSubscription('sub1');

        await topic.publish(Buffer.from('message-data'));

        const receivedMessages: Message[] = [];
        subscription.on('message', (message) => receivedMessages.push(message));

        await waitForExpect(() =>
          expect(receivedMessages.length).toBeGreaterThan(0),
        );
        expect(receivedMessages[0]?.data.toString()).toEqual('message-data');
        subscription.removeAllListeners('message');
      });

      it('should only pass messages to "message" event listeners', async () => {
        const [topic] = await pubsub.createTopic('topic1');
        const [subscription] = await topic.createSubscription('sub1');

        const receivedMessages: unknown[] = [];
        subscription.on('error', (message) => receivedMessages.push(message));

        await topic.publish(Buffer.from('message-data'));
        await delay(100);
        expect(receivedMessages).toEqual([]);
      });

      it('should call all listeners randomly when more are attached to a single subscription', async () => {
        const [topic] = await pubsub.createTopic('topic1');
        const [subscription] = await topic.createSubscription('sub1');

        const receivedMessages1 = [];
        subscription.on('message', (message) =>
          receivedMessages1.push(message),
        );
        const receivedMessages2 = [];
        subscription.on('message', (message) =>
          receivedMessages2.push(message),
        );

        for (let i = 0; i < 10; i++) {
          await topic.publish(Buffer.from('message-data'));
        }

        expect(receivedMessages1.length).toBeGreaterThan(1);
        expect(receivedMessages2.length).toBeGreaterThan(1);
        subscription.removeAllListeners();
      });
    });
  });
});
