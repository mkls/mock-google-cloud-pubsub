'use strict';

require('dotenv-haphap').config('confidential.env');

const MockPubSub = require('./mock-pubsub');
const { PubSub } = require('@google-cloud/pubsub');

const prefix = process.env.RESOURCE_PREFIX || 'mock-pubsub-prefix-';
const projectId = process.env.GCP_PROJECT_ID;

const prefixedName = name => `${prefix}${name}`;

[
  {
    title: 'Real PubSub',
    pubsub: new PubSub({ projectId, credentials: JSON.parse(process.env.GCP_CREDENTIALS) })
  },
  { title: 'Mock PubSub', pubsub: new MockPubSub({ projectId }) }
].forEach(({ title, pubsub }) => {
  describe(title, () => {
    const getPrefixedTopics = async () => {
      const [topics] = await pubsub.getTopics();
      return topics.filter(topic => topic.name.includes(`topics/${prefix}`));
    };
    const getPrefixedSubscriptions = async () => {
      const [subscriptions] = await pubsub.getSubscriptions();
      return subscriptions.filter(topic => topic.name.includes(`subscriptions/${prefix}`));
    };

    beforeEach(async () => {
      for (const topic of await getPrefixedTopics()) {
        await topic.delete();
      }
      for (const subscription of await getPrefixedSubscriptions()) {
        await subscription.delete();
      }
    });

    describe('creating, listing and deleting topics and subscriptions', () => {
      describe('createTopic', () => {
        it('should create a topic', async () => {
          const topicName = prefixedName('topic1');

          const [topic] = await pubsub.createTopic(topicName);

          expect(topic.name).toEqual(`projects/${projectId}/topics/${topicName}`);
        });

        it('should throw error if topic already exists', async () => {
          const topicName = prefixedName('topic1');

          await pubsub.createTopic(topicName);
          try {
            await pubsub.createTopic(topicName);
            throw new Error('should throw before');
          } catch (error) {
            expect(error.message).toEqual('6 ALREADY_EXISTS: Topic already exists');
            expect(error.code).toEqual(6);
          }
        });
      });

      describe('getTopics', () => {
        it('should return exisiting topics', async () => {
          await Promise.all([
            pubsub.createTopic(prefixedName('t1')),
            pubsub.createTopic(prefixedName('t2'))
          ]);

          const [topics] = await pubsub.getTopics();

          const topicNames = topics.map(t => t.name).filter(name => name.includes(prefix));
          expect(topicNames).toEqual([
            `projects/${projectId}/topics/${prefixedName('t1')}`,
            `projects/${projectId}/topics/${prefixedName('t2')}`
          ]);
        });
      });

      describe('topic.delete', () => {
        it('should delete a topic', async () => {
          await Promise.all([
            pubsub.createTopic(prefixedName('t1')),
            pubsub.createTopic(prefixedName('t2'))
          ]);

          await pubsub.topic(prefixedName('t1')).delete();

          const topics = await getPrefixedTopics();
          expect(topics.map(t => t.name)).toEqual([
            `projects/${projectId}/topics/${prefixedName('t2')}`
          ]);
        });

        it('should delete topic by its full name', async () => {
          await pubsub.createTopic(prefixedName('tod'));

          await pubsub.topic(`projects/${projectId}/topics/${prefixedName('tod')}`).delete();

          const topics = await getPrefixedTopics();
          expect(topics).toEqual([]);
        });

        it('should throw error when deleting a non existing topic', async () => {
          try {
            await pubsub.topic(prefixedName('non-let')).delete();
            throw new Error('should throw before');
          } catch (error) {
            expect(error.message).toEqual('5 NOT_FOUND: Topic not found');
            expect(error.code).toEqual(5);
          }
        });
      });

      describe('topic.createSubscription', () => {
        it('should create a subscription', async () => {
          const [topic] = await pubsub.createTopic(prefixedName('ted'));
          const [subscription] = await topic.createSubscription(prefixedName('ted'));

          expect(subscription.name).toEqual(
            `projects/${projectId}/subscriptions/${prefixedName('ted')}`
          );
        });

        it('should throw error if subscription already exists', async () => {
          const [topic] = await pubsub.createTopic(prefixedName('lajos'));
          await topic.createSubscription(prefixedName('lajos'));

          try {
            await topic.createSubscription(prefixedName('lajos'));
            throw new Error('should throw before');
          } catch (error) {
            expect(error.message).toEqual('6 ALREADY_EXISTS: Subscription already exists');
            expect(error.code).toEqual(6);
          }
        });
      });

      describe('getSubscriptions', () => {
        it('should return list of existing subscriptions', async () => {
          const [topic] = await pubsub.createTopic(prefixedName('lajos'));
          await topic.createSubscription(prefixedName('l1'));
          await topic.createSubscription(prefixedName('l2'));

          const [subscriptions] = await pubsub.getSubscriptions();

          const subNames = subscriptions.map(s => s.name).filter(name => name.includes(prefix));
          expect(subNames).toEqual([
            `projects/${projectId}/subscriptions/${prefixedName('l1')}`,
            `projects/${projectId}/subscriptions/${prefixedName('l2')}`
          ]);
        });
      });

      describe('subscription.delete', () => {
        it('should delete subscription', async () => {
          const [topic] = await pubsub.createTopic(prefixedName('lajos'));
          await topic.createSubscription(prefixedName('l1'));
          await topic.createSubscription(prefixedName('l2'));

          await pubsub.subscription(prefixedName('l1')).delete();

          const subscriptions = await getPrefixedSubscriptions();
          expect(subscriptions.map(s => s.name)).toEqual([
            `projects/${projectId}/subscriptions/${prefixedName('l2')}`
          ]);
        });

        it('should delete subscription by its full name', async () => {
          const [topic] = await pubsub.createTopic(prefixedName('lajos'));
          await topic.createSubscription(prefixedName('l1'));

          await pubsub
            .subscription(`projects/${projectId}/subscriptions/${prefixedName('l1')}`)
            .delete();

          expect(await getPrefixedSubscriptions()).toEqual([]);
        });

        it('should throw error when deleting a non existing subscription', async () => {
          try {
            await pubsub.subscription(prefixedName('non-let')).delete();
            throw new Error('should throw before');
          } catch (error) {
            expect(error.message).toEqual('5 NOT_FOUND: Subscription does not exist');
            expect(error.code).toEqual(5);
          }
        });
      });
    });
  });
});
