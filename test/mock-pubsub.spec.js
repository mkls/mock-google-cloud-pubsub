'use strict';

require('dotenv-haphap').config('confidential.env');

const waitForExpect = require('wait-for-expect');
const { PubSub: MockPubSub } = require('../src/mock-pubsub');
const { PubSub } = require('@google-cloud/pubsub');

const prefix = process.env.RESOURCE_PREFIX || 'mock-pubsub-prefix-';
const projectId = process.env.GCP_PROJECT_ID;

const prefixedName = (name) => `${prefix}${name}`;

[
  {
    title: 'Real PubSub',
    pubsub: new PubSub({
      projectId,
      credentials: JSON.parse(process.env.GCP_CREDENTIALS),
    }),
  },
  { title: 'Mock PubSub', pubsub: new MockPubSub({ projectId }) },
].forEach(({ title, pubsub }) => {
  describe(title, () => {
    const getPrefixedTopics = async () => {
      const [topics] = await pubsub.getTopics();
      return topics.filter((topic) => topic.name.includes(`topics/${prefix}`));
    };
    const getPrefixedSubscriptions = async () => {
      const [subscriptions] = await pubsub.getSubscriptions();
      return subscriptions.filter((topic) =>
        topic.name.includes(`subscriptions/${prefix}`),
      );
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

          expect(topic.name).toEqual(
            `projects/${projectId}/topics/${topicName}`,
          );
          expect(typeof topic.setPublishOptions).toEqual('function');
        });

        it('should throw error if topic already exists', async () => {
          const topicName = prefixedName('topic1');

          await pubsub.createTopic(topicName);
          try {
            await pubsub.createTopic(topicName);
            throw new Error('should throw before');
          } catch (error) {
            expect(error.message).toEqual(
              '6 ALREADY_EXISTS: Topic already exists',
            );
            expect(error.code).toEqual(6);
          }
        });
      });

      describe('getTopics', () => {
        it('should return exisiting topics', async () => {
          await Promise.all([
            pubsub.createTopic(prefixedName('t1')),
            pubsub.createTopic(prefixedName('t2')),
          ]);

          const [topics] = await pubsub.getTopics();

          const topicNames = topics
            .map((t) => t.name)
            .filter((name) => name.includes(prefix));
          expect(topicNames).toEqual([
            `projects/${projectId}/topics/${prefixedName('t1')}`,
            `projects/${projectId}/topics/${prefixedName('t2')}`,
          ]);
        });
      });

      describe('topic.delete', () => {
        it('should delete a topic', async () => {
          await Promise.all([
            pubsub.createTopic(prefixedName('t1')),
            pubsub.createTopic(prefixedName('t2')),
          ]);

          await pubsub.topic(prefixedName('t1')).delete();

          const topics = await getPrefixedTopics();
          expect(topics.map((t) => t.name)).toEqual([
            `projects/${projectId}/topics/${prefixedName('t2')}`,
          ]);
        });

        it('should delete topic by its full name', async () => {
          await pubsub.createTopic(prefixedName('tod'));

          await pubsub
            .topic(`projects/${projectId}/topics/${prefixedName('tod')}`)
            .delete();

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
          const [subscription] = await topic.createSubscription(
            prefixedName('ted'),
          );

          expect(subscription.name).toEqual(
            `projects/${projectId}/subscriptions/${prefixedName('ted')}`,
          );
        });

        it('should throw error if subscription already exists', async () => {
          const [topic] = await pubsub.createTopic(prefixedName('lajos'));
          await topic.createSubscription(prefixedName('lajos'));

          try {
            await topic.createSubscription(prefixedName('lajos'));
            throw new Error('should throw before');
          } catch (error) {
            expect(error.message).toEqual(
              '6 ALREADY_EXISTS: Subscription already exists',
            );
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

          const subNames = subscriptions
            .map((s) => s.name)
            .filter((name) => name.includes(prefix));
          expect(subNames).toEqual([
            `projects/${projectId}/subscriptions/${prefixedName('l1')}`,
            `projects/${projectId}/subscriptions/${prefixedName('l2')}`,
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
          expect(subscriptions.map((s) => s.name)).toEqual([
            `projects/${projectId}/subscriptions/${prefixedName('l2')}`,
          ]);
        });

        it('should delete subscription by its full name', async () => {
          const [topic] = await pubsub.createTopic(prefixedName('lajos'));
          await topic.createSubscription(prefixedName('l1'));

          await pubsub
            .subscription(
              `projects/${projectId}/subscriptions/${prefixedName('l1')}`,
            )
            .delete();

          expect(await getPrefixedSubscriptions()).toEqual([]);
        });

        it('should throw error when deleting a non existing subscription', async () => {
          try {
            await pubsub.subscription(prefixedName('non-let')).delete();
            throw new Error('should throw before');
          } catch (error) {
            expect(error.message).toEqual(
              '5 NOT_FOUND: Subscription does not exist',
            );
            expect(error.code).toEqual(5);
          }
        });
      });

      describe('topic.subscription', () => {
        it('should return subscription through a topic object', async () => {
          const [topic] = await pubsub.createTopic(prefixedName('kacsa'));
          await topic.createSubscription(prefixedName('nyul'));

          const subscription = pubsub
            .topic(prefixedName('kacsa'))
            .subscription(prefixedName('nyul'));

          expect(subscription.name).toEqual(
            `projects/${projectId}/subscriptions/${prefixedName('nyul')}`,
          );
        });
      });
    });

    describe('publishing and consuming messages', () => {
      describe('topic.publish', () => {
        it('should consume messages published to a topic', async () => {
          const [topic] = await pubsub.createTopic(prefixedName('t32'));
          const [subscription] = await topic.createSubscription(
            prefixedName('s32'),
          );

          const receivedMessages = [];
          subscription.on('message', (message) =>
            receivedMessages.push(message),
          );

          await topic.publish(Buffer.from('Test message!'), { kacsa: 'hap' });

          await waitForExpect(() =>
            expect(receivedMessages.length).toBeGreaterThan(0),
          );
          const message = receivedMessages[0];
          expect(message.data.toString()).toEqual('Test message!');
          expect(message.attributes).toEqual({ kacsa: 'hap' });
          expect(typeof message.ack).toEqual('function');
          expect(typeof message.nack).toEqual('function');
          subscription.removeAllListeners('message');
        });
      });

      describe('topic.publishMessage({data})', () => {
        it('should consume messages published to a topic', async () => {
          const [topic] = await pubsub.createTopic(prefixedName('t32'));
          const [subscription] = await topic.createSubscription(
            prefixedName('s32'),
          );

          const receivedMessages = [];
          subscription.on('message', (message) =>
            receivedMessages.push(message),
          );

          await topic.publishMessage({
            data: Buffer.from('Test message!'),
            attributes: { kacsa: 'hap' },
          });

          await waitForExpect(() =>
            expect(receivedMessages.length).toBeGreaterThan(0),
          );
          const message = receivedMessages[0];
          expect(message.data.toString()).toEqual('Test message!');
          expect(message.attributes).toEqual({ kacsa: 'hap' });
          expect(typeof message.ack).toEqual('function');
          expect(typeof message.nack).toEqual('function');
          subscription.removeAllListeners('message');
        });
      });

      describe('topic.publishMessage({json})', () => {
        it('should consume messages published to a topic', async () => {
          const [topic] = await pubsub.createTopic(prefixedName('t32'));
          const [subscription] = await topic.createSubscription(
            prefixedName('s32'),
          );

          const receivedMessages = [];
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
          expect(JSON.parse(message.data.toString())).toEqual({
            data: 'Test message!',
          });
          expect(message.attributes).toEqual({ kacsa: 'hap' });
          expect(typeof message.ack).toEqual('function');
          expect(typeof message.nack).toEqual('function');
          subscription.removeAllListeners('message');
        });
      });

      it('should consume messages that were published before subscription consumption was started', async () => {
        const [topic] = await pubsub.createTopic(prefixedName('t34'));
        const [subscription] = await topic.createSubscription(
          prefixedName('s34'),
        );

        await topic.publish(Buffer.from('t45'));

        const receivedMessages = [];
        subscription.on('message', (message) => receivedMessages.push(message));

        await waitForExpect(() =>
          expect(receivedMessages.length).toBeGreaterThan(0),
        );
        expect(receivedMessages[0].data.toString()).toEqual('t45');
        subscription.removeAllListeners('message');
      });

      it('should not receive messages if removeAllListeners was called on subscription', async () => {
        const [topic] = await pubsub.createTopic(prefixedName('t45'));
        const [subscription] = await topic.createSubscription(
          prefixedName('s45'),
        );
        const receivedMessages = [];
        subscription.on('message', (message) => receivedMessages.push(message));

        subscription.removeAllListeners();

        await topic.publish(Buffer.from('t45'));
        await wait(100);
        expect(receivedMessages).toEqual([]);
      });

      it('should only pass messages to "message" event listeners', async () => {
        const [topic] = await pubsub.createTopic(prefixedName('t45'));
        const [subscription] = await topic.createSubscription(
          prefixedName('s45'),
        );

        const receivedMessages = [];
        subscription.on('error', (message) => receivedMessages.push(message));

        await topic.publish(Buffer.from('t45'));
        await wait(100);
        expect(receivedMessages).toEqual([]);
      });

      it('should redeliver a message if it was nacked', async () => {
        const [topic] = await pubsub.createTopic(prefixedName('t45'));
        const [subscription] = await topic.createSubscription(
          prefixedName('s45'),
        );

        const receivedMessages = [];
        let nackedOnce = false;
        subscription.on('message', (message) => {
          receivedMessages.push(message);
          if (!nackedOnce) {
            nackedOnce = true;
            message.nack();
          }
        });
        await topic.publish(Buffer.from('tm43'));

        await waitForExpect(() => expect(receivedMessages.length).toBe(2));
        expect(receivedMessages[0].data.toString()).toEqual('tm43');
        expect(receivedMessages[1].data.toString()).toEqual('tm43');
        subscription.removeAllListeners('message');
      });

      it('should call all listeners randomly when more are attached to a single subscription', async () => {
        const [topic] = await pubsub.createTopic(prefixedName('t34'));
        const [subscription] = await topic.createSubscription(
          prefixedName('s34'),
        );

        const receivedMessages1 = [];
        subscription.on('message', (message) =>
          receivedMessages1.push(message),
        );
        const receivedMessages2 = [];
        subscription.on('message', (message) =>
          receivedMessages2.push(message),
        );

        for (let i = 0; i < 10; i++) {
          await topic.publish(Buffer.from('tm435'));
        }

        expect(receivedMessages1.length).toBeGreaterThan(1);
        expect(receivedMessages2.length).toBeGreaterThan(1);
        subscription.removeAllListeners();
      });
    });
  });
});

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
