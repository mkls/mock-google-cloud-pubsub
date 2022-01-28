'use strict';

require('dotenv-haphap').config('confidential.env');

const MockPubSub = require('./mock-pubsub');
const { PubSub } = require('@google-cloud/pubsub');

const prefix = process.env.RESOURCE_PREFIX || 'mock-pubsub-prefix-';
const projectId = process.env.GCP_PROJECT_ID;
const realPubSubClient = new PubSub({
  projectId,
  credentials: JSON.parse(process.env.GCP_CREDENTIALS)
});
const mockPubSubClient = new MockPubSub({ projectId });

const prefixedName = name => `${prefix}${name}`;

[
  { title: 'Real PubSub', pubsub: realPubSubClient },
  { title: 'Mock PubSub', pubsub: mockPubSubClient }
].forEach(({ title, pubsub }) => {
  describe(title, () => {
    const getPrefixedTopics = async () => {
      const [topics] = await pubsub.getTopics();
      return topics.filter(topic =>
        topic.name.startsWith(`projects/${projectId}/topics/${prefix}`)
      );
    };

    beforeEach(async () => {
      for (const topic of await getPrefixedTopics()) {
        await topic.delete();
      }
    });

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
  });
});
