# mock-google-cloud-pubsub
mock @google-cloud/pubsub npm package in integration tests


## Usage

Currently only the `topic` and `subscription` methods of the PubSub class are implemented.
At the start of test running you can overwrite the real methods with these mocked versions:

```js
const { PubSub } = require('@google-cloud/pubsub');
const mockPubSub = require('mock-google-cloud-pubsub');
PubSub.prototype.subscription = mockPubSub.subscription;
PubSub.prototype.topic = mockPubSub.topic;
```

To create the topics and subscriptions you will use in the tests you should call `initializeMocker`:

```js
mockPubSub.initializeMocker({
  'topic-name-1': ['subscription-1', 'subscription-2']
})
```
