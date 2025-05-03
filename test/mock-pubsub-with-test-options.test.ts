import waitForExpect from 'wait-for-expect';
import { type Message } from '@google-cloud/pubsub';
import { PubSubWithTestOptions } from '../src';
import {
  clearPubSubInstance,
  makeTestConfig,
  expectToBeDefined,
} from './test-utils';

const { projectId } = makeTestConfig();

describe('PubSubWithTestOptions class', () => {
  describe('Test options', () => {
    describe('interceptors.createMessage', () => {
      it('intercepts each message', async () => {
        const createMessageSpy = jest.fn();
        const pubsub = new PubSubWithTestOptions(
          { projectId },
          {
            interceptors: {
              createMessage: (input) => {
                createMessageSpy(input);
                return input.message;
              },
            },
          },
        );
        await clearPubSubInstance(pubsub);

        const [topic] = await pubsub.createTopic('topic1');
        const [sub1] = await topic.createSubscription('sub1');
        const [sub2] = await topic.createSubscription('sub2');

        const receivedMessages: Message[] = [];
        sub1.on('message', (message) => receivedMessages.push(message));
        sub2.on('message', (message) => receivedMessages.push(message));

        await topic.publishMessage({
          data: Buffer.from('Test message 1'),
        });

        await waitForExpect(() => {
          expect(receivedMessages.length).toBe(2);
        });

        expect(createMessageSpy).toHaveBeenCalledTimes(2);
        expect(createMessageSpy).toHaveBeenNthCalledWith(1, {
          subscription: sub1,
          message: receivedMessages[0],
        });
        expect(createMessageSpy).toHaveBeenNthCalledWith(2, {
          subscription: sub2,
          message: receivedMessages[1],
        });
      });

      it('can modify/spy messages', async () => {
        const pubsub = new PubSubWithTestOptions(
          { projectId },
          {
            interceptors: {
              createMessage: ({ message }) => {
                message.ackWithResponse;
                jest
                  .spyOn(message, 'ackWithResponse')
                  .mockImplementation(async () => 'OTHER');
                return message;
              },
            },
          },
        );
        await clearPubSubInstance(pubsub);

        const [topic] = await pubsub.createTopic('topic1');
        const [sub] = await topic.createSubscription('sub1');

        const receivedMessages: Message[] = [];
        sub.on('message', async (message) => {
          await message.ackWithResponse();
          receivedMessages.push(message);
        });

        await topic.publishMessage({
          data: Buffer.from('Test message 1'),
        });

        await waitForExpect(() => {
          expect(receivedMessages.length).toBe(1);
        });

        const message = receivedMessages[0];
        expectToBeDefined(message);

        expect(jest.isMockFunction(message.ackWithResponse)).toBe(true);
        expect(message.ackWithResponse).toHaveBeenCalledTimes(1);
      });
    });

    describe('interceptors.onSubscription', () => {
      it('intercepts subscription.on invocations', async () => {
        const onSubscriptionSpy = jest.fn();
        const pubsub = new PubSubWithTestOptions(
          { projectId },
          {
            interceptors: {
              onSubscription: (input) => {
                onSubscriptionSpy(input);
              },
            },
          },
        );
        await clearPubSubInstance(pubsub);

        const [topic] = await pubsub.createTopic('topic1');
        const [sub1] = await topic.createSubscription('sub1');
        const [sub2] = await topic.createSubscription('sub2');

        const sub1Listener = () => {};
        sub1.on('message', sub1Listener);

        const sub2Listener = () => {};
        sub2.on('message', sub2Listener);

        expect(onSubscriptionSpy).toHaveBeenCalledTimes(2);
        expect(onSubscriptionSpy).toHaveBeenNthCalledWith(1, {
          subscription: sub1,
          event: 'message',
          listener: sub1Listener,
        });
        expect(onSubscriptionSpy).toHaveBeenNthCalledWith(2, {
          subscription: sub2,
          event: 'message',
          listener: sub2Listener,
        });
      });
    });
  });
});
