import {
  makePubSubInstances,
  clearPubSubInstance,
  makeTestConfig,
} from './test-utils';

const { projectId } = makeTestConfig();

describe('Topic', () => {
  makePubSubInstances({ projectId }).forEach(({ title, pubsub }) => {
    describe(title, () => {
      beforeEach(async () => {
        await clearPubSubInstance(pubsub);
      });

      describe('topic.createSubscription()', () => {
        describe('with name', () => {
          it('should create a subscription', async () => {
            const [topic] = await pubsub.createTopic('topic1');
            const [subscription] = await topic.createSubscription('sub1');

            expect(subscription.name).toEqual(
              `projects/${projectId}/subscriptions/sub1`,
            );
          });
        });

        describe('with full name', () => {
          it('should create a subscription', async () => {
            const [topic] = await pubsub.createTopic('topic1');
            const [subscription] = await topic.createSubscription(
              `projects/${projectId}/subscriptions/sub1`,
            );

            expect(subscription.name).toEqual(
              `projects/${projectId}/subscriptions/sub1`,
            );
          });
        });

        describe('with malformed full name', () => {
          it('should throw error', async () => {
            const [topic] = await pubsub.createTopic('topic1');
            const malformedName = `projects/${projectId}/malformed-name/sub1`;
            try {
              await topic.createSubscription(malformedName);
              throw new Error('should throw before');
            } catch (error) {
              // @ts-expect-error error expected
              expect(error.message).toEqual(
                `3 INVALID_ARGUMENT: Invalid [subscriptions] name: (name=${malformedName})`,
              );
              // @ts-expect-error error expected
              expect(error.code).toEqual(3);
            }
          });
        });

        it('should throw error if subscription already exists', async () => {
          const [topic] = await pubsub.createTopic('topic1');
          await topic.createSubscription('sub1');

          try {
            await topic.createSubscription('sub1');
            throw new Error('should throw before');
          } catch (error) {
            // @ts-expect-error error expected
            expect(error.message).toEqual(
              '6 ALREADY_EXISTS: Subscription already exists',
            );
            // @ts-expect-error error expected
            expect(error.code).toEqual(6);
          }
        });
      });

      describe('topic.subscription()', () => {
        it('should return subscription through a topic object', async () => {
          const [topic] = await pubsub.createTopic('topic1');
          await topic.createSubscription('sub1');
          await topic.createSubscription('sub2');

          const subscription1 = topic.subscription('sub1');
          const subscription2 = topic.subscription(
            `projects/${projectId}/subscriptions/sub2`,
          );

          expect(subscription1.name).toEqual(
            `projects/${projectId}/subscriptions/sub1`,
          );
          expect(subscription2.name).toEqual(
            `projects/${projectId}/subscriptions/sub2`,
          );
        });
      });

      describe('topic.delete()', () => {
        it('should delete a topic', async () => {
          await Promise.all([
            pubsub.createTopic('topic1'),
            pubsub.createTopic('topic2'),
          ]);
          await pubsub.topic('topic1').delete();
          const [topics] = await pubsub.getTopics();

          expect(topics.map((t) => t.name)).toEqual([
            `projects/${projectId}/topics/topic2`,
          ]);
        });

        it('should delete topic by its full name', async () => {
          await pubsub.createTopic('topic1');
          await pubsub.topic(`projects/${projectId}/topics/topic1`).delete();

          const [topics] = await pubsub.getTopics();
          expect(topics).toEqual([]);
        });

        it('should throw error when deleting a non existing topic', async () => {
          try {
            await pubsub.topic('non-existing').delete();
            throw new Error('should throw before');
          } catch (error) {
            // @ts-expect-error error expected
            expect(error.message).toEqual('5 NOT_FOUND: Topic not found');
            // @ts-expect-error error expected
            expect(error.code).toEqual(5);
          }
        });
      });
    });
  });
});
