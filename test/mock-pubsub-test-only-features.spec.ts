import { PubSub } from '../src/mock-pubsub';

describe('test only features', () => {
  it('enable message inspection', async () => {
    const inspectMessage = jest.fn((m) => m);
    const pubsub = new PubSub(
      { projectId: 'project-id-1' },
      {
        interceptMessage: inspectMessage,
      },
    );

    const [topic] = await pubsub.createTopic('topic');
    await topic.createSubscription('subscription');

    await topic.publish(Buffer.from('Message123'));

    expect(inspectMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        data: Buffer.from('Message123'),
      }),
    );
  });

  it('mock ack', async () => {
    let ackSpy;

    const pubsub = new PubSub(
      { projectId: 'project-id-2' },
      {
        interceptMessage: (msg) => {
          ackSpy = jest.spyOn(msg, 'ack');
          return msg;
        },
      },
    );

    const [topic] = await pubsub.createTopic('topic');
    const [subscription] = await topic.createSubscription('subscription');

    subscription.on('message', (msg) => {
      msg.ack();
    });

    await topic.publish(Buffer.from('Message123'));

    expect(ackSpy).toHaveBeenCalledTimes(1);
  });
});
