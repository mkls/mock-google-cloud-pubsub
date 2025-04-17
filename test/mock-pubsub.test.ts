require('dotenv-haphap').config('confidential.env');
import { makePubSubInstances, clearPubSubInstance } from './test-utils';

const projectId = process.env.GCP_PROJECT_ID;

describe('PubSub class', () => {
  makePubSubInstances({ projectId }).forEach(
    ({ title, pubsub, PubSubClass }) => {
      describe(title, () => {
        beforeEach(async () => {
          await clearPubSubInstance(pubsub);
        });

        describe('no constructor options', () => {
          it('initializes pub sub with projectId === "{{projectId}}"', async () => {
            const pubsub = new PubSubClass();
            expect(pubsub.projectId).toBe('{{projectId}}');
          });
        });

        describe('pubsub.createTopic()', () => {
          describe('with name', () => {
            it('should create a topic', async () => {
              const topicName = 'topic1';
              const [topic] = await pubsub.createTopic(topicName);

              expect(topic.name).toEqual(
                `projects/${projectId}/topics/${topicName}`,
              );
              expect(typeof topic.setPublishOptions).toEqual('function');
            });
          });

          describe('with full name', () => {
            it('should create a topic', async () => {
              const topicName = 'topic1';
              const [topic] = await pubsub.createTopic(
                `projects/${projectId}/topics/${topicName}`,
              );

              expect(topic.name).toEqual(
                `projects/${projectId}/topics/${topicName}`,
              );
              expect(typeof topic.setPublishOptions).toEqual('function');
            });
          });

          describe('with malformed full name', () => {
            it('should throw error', async () => {
              const malformedName = `projects/${projectId}/malformed-name/ted}`;

              try {
                await pubsub.createTopic(malformedName);
                throw new Error('should throw before');
              } catch (error) {
                // @ts-expect-error error expected
                expect(error.message).toEqual(
                  `3 INVALID_ARGUMENT: Invalid [topics] name: (name=${malformedName})`,
                );
                // @ts-expect-error error expected
                expect(error.code).toEqual(3);
              }
            });
          });

          describe('topic already exists', () => {
            it('should throw error', async () => {
              const topicName = 'topic1';
              await pubsub.createTopic(topicName);

              try {
                await pubsub.createTopic(topicName);
                throw new Error('should throw before');
              } catch (error) {
                // @ts-expect-error error expected
                expect(error.message).toEqual(
                  '6 ALREADY_EXISTS: Topic already exists',
                );
                // @ts-expect-error error expected
                expect(error.code).toEqual(6);
              }
            });
          });

          it('creates topics with different projectId', async () => {
            const otherProjectId = 'another-project-id';
            const otherPubsub = new PubSubClass({
              projectId: otherProjectId,
            });
            await clearPubSubInstance(otherPubsub);

            const [topic] = await pubsub.createTopic(
              `projects/${otherProjectId}/topics/topic1`,
            );

            expect(topic.name).toEqual(
              `projects/${otherProjectId}/topics/topic1`,
            );
            const [pubSubTopics] = await pubsub.getTopics();
            const [otherPubsubTopics] = await otherPubsub.getTopics();

            expect(pubSubTopics).toEqual([]);
            expect(
              otherPubsubTopics.map((subscription) => subscription.name),
            ).toEqual([`projects/${otherProjectId}/topics/topic1`]);
          });
        });

        describe('pubsub.getTopics()', () => {
          it('should return list of existing topics for given PubSub instance', async () => {
            const otherProjectId = 'another-project-id';
            const otherPubsub = new PubSubClass({
              projectId: otherProjectId,
            });
            await clearPubSubInstance(otherPubsub);

            await Promise.all([
              pubsub.createTopic('topic1'),
              pubsub.createTopic('topic2'),
              otherPubsub.createTopic('topic1'),
              otherPubsub.createTopic('topic2'),
            ]);

            // pubsub instance 1
            {
              const [topics] = await pubsub.getTopics();
              const topicNames = topics.map((t) => t.name);

              expect(topicNames).toEqual([
                `projects/${projectId}/topics/topic1`,
                `projects/${projectId}/topics/topic2`,
              ]);
            }

            // pubsub instance 2
            {
              const [topics] = await otherPubsub.getTopics();
              const topicNames = topics.map((t) => t.name);

              expect(topicNames).toEqual([
                `projects/${otherProjectId}/topics/topic1`,
                `projects/${otherProjectId}/topics/topic2`,
              ]);
            }
          });
        });

        describe('pubsub.topic()', () => {
          it('should retrieve previously created topics by name', async () => {
            const topicName1 = 'topic1';
            const topicName2 = 'topic2';
            await pubsub.createTopic(topicName1);
            await pubsub.createTopic(topicName2);

            const topic1 = pubsub.topic(topicName1);
            const topic2 = pubsub.topic(
              `projects/${projectId}/topics/${topicName2}`,
            );

            expect(topic1.name).toBe(
              `projects/${projectId}/topics/${topicName1}`,
            );
            expect(topic2.name).toBe(
              `projects/${projectId}/topics/${topicName2}`,
            );

            expect(topic1.publish).toEqual(expect.any(Function));
            expect(topic1.publishMessage).toEqual(expect.any(Function));
          });

          describe('non existing topic', () => {
            it('should return a topic object anyway', async () => {
              const topic = pubsub.topic('non-existing');
              expect(topic.name).toBe(
                `projects/${projectId}/topics/non-existing`,
              );

              expect(topic.publish).toEqual(expect.any(Function));
              expect(topic.publishMessage).toEqual(expect.any(Function));

              const [existingTopics] = await pubsub.getTopics();
              expect(existingTopics).toHaveLength(0);
            });
          });
        });

        describe('pubsub.getSubscriptions()', () => {
          it('should return list of existing subscriptions for given PubSub instance', async () => {
            const otherProjectId = 'another-project-id';
            const otherPubsub = new PubSubClass({
              projectId: otherProjectId,
            });
            await clearPubSubInstance(otherPubsub);

            const [topic] = await pubsub.createTopic('topic1');
            const [otherProjectTopic] = await otherPubsub.createTopic('topic1');

            await Promise.all([
              await topic.createSubscription('sub1'),
              await topic.createSubscription('sub2'),
              await otherProjectTopic.createSubscription('sub1'),
              await otherProjectTopic.createSubscription('sub2'),
            ]);

            // pubsub instance 1
            {
              const [subscriptions] = await pubsub.getSubscriptions();
              const subNames = subscriptions.map((s) => s.name);

              expect(subNames).toEqual([
                `projects/${projectId}/subscriptions/sub1`,
                `projects/${projectId}/subscriptions/sub2`,
              ]);
            }

            // pubsub instance 2
            {
              const [subscriptions] = await otherPubsub.getSubscriptions();
              const subNames = subscriptions.map((s) => s.name);

              expect(subNames).toEqual([
                `projects/${otherProjectId}/subscriptions/sub1`,
                `projects/${otherProjectId}/subscriptions/sub2`,
              ]);
            }
          });
        });

        describe('pubsub.subscription()', () => {
          it('should retrieve previously created subscription by name', async () => {
            const [topic] = await pubsub.createTopic('topic');
            await topic.createSubscription('sub1');
            await topic.createSubscription('sub2');

            const sub1 = pubsub.subscription('sub1');
            const sub2 = pubsub.subscription(
              `projects/${projectId}/subscriptions/sub2`,
            );

            expect(sub1.name).toBe(`projects/${projectId}/subscriptions/sub1`);
            expect(sub2.name).toBe(`projects/${projectId}/subscriptions/sub2`);
          });

          // Execute once this PR gets merged
          // https://github.com/mkls/mock-google-cloud-pubsub/pull/31
          describe('non existing subscription', () => {
            it('should return a subscription which is not registered', async () => {
              const subscription = pubsub.subscription('non-existing');

              expect(subscription.name).toBe(
                `projects/${projectId}/subscriptions/non-existing`,
              );
              expect(subscription.on).toEqual(expect.any(Function));

              const [existingSubscriptions] = await pubsub.getSubscriptions();
              expect(existingSubscriptions).toHaveLength(0);
            });
          });
        });
      });
    },
  );
});
