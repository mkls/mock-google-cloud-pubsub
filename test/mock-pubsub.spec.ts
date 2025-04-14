require('dotenv-haphap').config('confidential.env');
import waitForExpect from 'wait-for-expect';
import { PubSub, type Message } from '@google-cloud/pubsub';
import { PubSub as MockPubSub } from '../src/mock-pubsub';
import { delay } from '../src/utils';

const projectId = process.env.GCP_PROJECT_ID;
const gcpCredential = process.env.gcpCredential || '{}';

function expectToBeDefined<Element>(
  element: Element | undefined,
): asserts element is Element {
  expect(element).toBeDefined();
}

async function clearPubSubInstance(pubsub: PubSub | MockPubSub) {
  const [topics] = await pubsub.getTopics();
  const [subscriptions] = await pubsub.getSubscriptions();

  for (const topic of topics) {
    await topic.delete();
  }

  for (const subscription of subscriptions) {
    await subscription.delete();
  }
}

[
  {
    title: 'Real PubSub',
    pubsub: new PubSub({
      projectId,
      credentials: JSON.parse(gcpCredential),
    }),
    PubSubClass: PubSub,
  },
  {
    title: 'Mock PubSub',
    pubsub: new MockPubSub({ projectId }),
    PubSubClass: MockPubSub,
  },
].forEach(({ title, pubsub, PubSubClass }) => {
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

    describe('creating, listing and deleting topics and subscriptions', () => {
      describe('createTopic', () => {
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

        it('should throw error if topic already exists', async () => {
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

      describe('getTopics', () => {
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

      describe('topic.delete', () => {
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

      describe('topic.createSubscription', () => {
        describe('with name', () => {
          it('should create a subscription', async () => {
            const [topic] = await pubsub.createTopic('topic1');
            const [subscription] = await topic.createSubscription('topic1');

            expect(subscription.name).toEqual(
              `projects/${projectId}/subscriptions/topic1`,
            );
          });
        });

        describe('with full name', () => {
          it('should create a subscription', async () => {
            const [topic] = await pubsub.createTopic('topic1');
            const [subscription] = await topic.createSubscription(
              `projects/${projectId}/subscriptions/topic1`,
            );

            expect(subscription.name).toEqual(
              `projects/${projectId}/subscriptions/topic1`,
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

      describe('getSubscriptions', () => {
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

      describe('subscription.delete', () => {
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

      describe('topic.subscription', () => {
        it('should return subscription through a topic object', async () => {
          const [topic] = await pubsub.createTopic('topic1');
          await topic.createSubscription('sub1');
          const subscription = pubsub.topic('topic1').subscription('sub1');

          expect(subscription.name).toEqual(
            `projects/${projectId}/subscriptions/sub1`,
          );
        });
      });
    });

    describe('publishing and consuming messages', () => {
      describe('topic.publish', () => {
        it('should send message to expected topic subscriber', async () => {
          const [topic] = await pubsub.createTopic('topic1');
          const [subscription] = await topic.createSubscription('sub1');

          const receivedMessages: Message[] = [];
          subscription.on('message', (message) =>
            receivedMessages.push(message),
          );

          await topic.publish(Buffer.from('Test message!'), { kacsa: 'hap' });

          await waitForExpect(() =>
            expect(receivedMessages.length).toBeGreaterThan(0),
          );
          const message = receivedMessages[0];

          expectToBeDefined(message);
          expect(message.data.toString()).toEqual('Test message!');
          expect(message.attributes).toEqual({ kacsa: 'hap' });
          subscription.removeAllListeners('message');
        });
      });

      describe('topic.publishMessage({data: Buffer})', () => {
        it('should send message to expected topic subscriber', async () => {
          const [topic] = await pubsub.createTopic('topic1');
          const [subscription] = await topic.createSubscription('sub1');

          const receivedMessages: Message[] = [];
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

          expectToBeDefined(message);
          expect(message.data.toString()).toEqual('Test message!');
          expect(message.attributes).toEqual({ kacsa: 'hap' });
          subscription.removeAllListeners('message');
        });
      });

      describe('topic.publishMessage({json: String})', () => {
        it('should send message to expected topic subscriber', async () => {
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

      it('should consume messages that were published before subscription consumption was started', async () => {
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

      it('should not receive messages if removeAllListeners was called on subscription', async () => {
        const [topic] = await pubsub.createTopic('topic1');
        const [subscription] = await topic.createSubscription('sub1');
        const receivedMessages: Message[] = [];
        subscription.on('message', (message) => receivedMessages.push(message));

        subscription.removeAllListeners();

        await topic.publish(Buffer.from('message-data'));
        await delay(100);
        expect(receivedMessages).toEqual([]);
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

    describe('message object', () => {
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

        expect(message.ackId).toEqual(
          expect.stringContaining(`projects/${projectId}/subscriptions/sub1:`),
        );
        expect(message.attributes).toEqual({ kacsa: 'hap' });
        expect(message.data).toEqual(expect.any(Buffer));
        expect(message.length).toBe(message.data.length);
        expect(message.deliveryAttempt).toBe(0);
        expect(message.publishTime).toEqual(expect.any(Date));
        expect(message.id).toEqual(expect.any(String));
        expect(message.received).toEqual(expect.any(Number));
        expect(message.isExactlyOnceDelivery).toBe(false);

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

      describe('.nack method', () => {
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

      describe('.nackWithResponse method', () => {
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
