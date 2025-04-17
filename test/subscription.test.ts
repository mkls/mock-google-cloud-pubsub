require('dotenv-haphap').config('confidential.env');
import type { Message } from '@google-cloud/pubsub';
import { delay } from '../src/utils';
import { makePubSubInstances, clearPubSubInstance } from './test-utils';

const projectId = process.env.GCP_PROJECT_ID;

describe('Subscription', () => {
  makePubSubInstances({ projectId }).forEach(({ title, pubsub }) => {
    describe(title, () => {
      beforeEach(async () => {
        await clearPubSubInstance(pubsub);
      });

      describe('subscription.delete()', () => {
        it('should delete subscription', async () => {
          const [topic] = await pubsub.createTopic('topic1');
          await topic.createSubscription('sub1');
          await topic.createSubscription('sub2');
          await pubsub.subscription('sub1').delete();
          const [subscriptions] = await pubsub.getSubscriptions();

          expect(subscriptions.map((s) => s.name)).toEqual([
            `projects/${projectId}/subscriptions/sub2`,
          ]);
        });

        it('should delete subscription by its full name', async () => {
          const [topic] = await pubsub.createTopic('topic1');
          await topic.createSubscription('sub1');

          await pubsub
            .subscription(`projects/${projectId}/subscriptions/sub1`)
            .delete();

          const [subscriptions] = await pubsub.getSubscriptions();
          expect(subscriptions).toEqual([]);
        });

        it('should throw error when deleting a non existing subscription', async () => {
          try {
            await pubsub.subscription('non-existing').delete();
            throw new Error('should throw before');
          } catch (error) {
            // @ts-expect-error error expected
            expect(error.message).toEqual(
              '5 NOT_FOUND: Subscription does not exist',
            );
            // @ts-expect-error error expected
            expect(error.code).toEqual(5);
          }
        });
      });

      describe('subscription.removeAllListeners()', () => {
        it('should stop receiving messages', async () => {
          const [topic] = await pubsub.createTopic('topic1');
          const [subscription] = await topic.createSubscription('sub1');
          const receivedMessages: Message[] = [];
          subscription.on('message', (message) =>
            receivedMessages.push(message),
          );

          subscription.removeAllListeners();

          await topic.publish(Buffer.from('message-data'));
          await delay(100);
          expect(receivedMessages).toEqual([]);
        });
      });
    });
  });
});
