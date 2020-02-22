'use strict';

const { initializeMocker, topic, subscription } = require('./main');
const delay = require('delay');

it('should call consumer with published messages', async () => {
  initializeMocker({
    'topic-1': ['subscription-1']
  });

  await topic('topic-1').publish('test-message-1', 'test-attribute-1');

  const consumer = jest.fn();
  subscription('subscription-1').on('message', consumer);

  await topic('topic-1').publish('test-message-2');

  expect(consumer.mock.calls).toMatchObject([
    [{ data: 'test-message-1', attributes: 'test-attribute-1' }],
    [{ data: 'test-message-2' }]
  ]);
});

it('should put back nacked messages to queue', async () => {
  initializeMocker({
    'topic-1': ['subscription-1']
  });

  await topic('topic-1').publish('test-message-1');

  const consumer = jest.fn().mockImplementation(async message => {
    await delay(5);
    message.nack();
  });
  subscription('subscription-1').on('message', consumer);
  subscription('subscription-1').removeAllListeners('message');

  expect(consumer.mock.calls).toMatchObject([[{ data: 'test-message-1' }]]);

  await delay(6);
  await delay(0);
  let redeliveredMessage;
  subscription('subscription-1').on('message', message => (redeliveredMessage = message));
  expect(redeliveredMessage).toMatchObject({
    data: 'test-message-1'
  });
});

it('should distribute message to multiple subscriptions', async () => {
  initializeMocker({
    'topic-1': ['sub-1', 'sub-2']
  });

  await topic('topic-1').publish('test-message');

  const consumer1 = jest.fn();
  subscription('sub-1').on('message', consumer1);
  const consumer2 = jest.fn();
  subscription('sub-2').on('message', consumer2);

  expect(consumer1.mock.calls).toMatchObject([[{ data: 'test-message' }]]);
  expect(consumer2.mock.calls).toMatchObject([[{ data: 'test-message' }]]);
});

it('should remove event listener with removeListener', async () => {
  initializeMocker({ 'topic-1': ['sub-1'] });

  const consumer = jest.fn();
  subscription('sub-1').on('message', consumer);
  subscription('sub-1').removeListener('message', consumer);

  await topic('topic-1').publish('test-message');

  expect(consumer).not.toHaveBeenCalled();
});

it.todo('should throw error if topic does not exist');

it.todo('should throw error is subscription does not exist');
