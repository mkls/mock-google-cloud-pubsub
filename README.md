# mock-google-cloud-pubsub

The goal of this project is to create an in memory emulator for Google Cloud Pub/Sub so this module
can be used interchangeably with `@google-cloud/pubsub` in integration tests for faster test execution.

As an alternative to this package, you could also use a pubsub emulator docker image
(eg https://github.com/marcelcorso/gcloud-pubsub-emulator). This package is recomended
if the emulator is still not fast enough for you.

## Feature set

Only parts of the official API (https://googleapis.dev/nodejs/pubsub/latest/PubSub.html) are
covered with this package. A simple example like the one below would work, but you will have
to check if more complicated use cases are covered or not.


```js
const { PubSub } = require('mock-google-cloud-pubsub');
const pubsub = new PubSub({});

const [topic] = await pubsub.createTopic(topicName);
const [subscription] = await topic.createSubscription(subscriptionName);
subscription.on('message', message => {
  console.log('Received message:', message.data.toString());
});
topic.publish(Buffer.from('Test message!'));
```

Pull request for covering more features are welcome, just make sure to write tests for them.

## Usage

Intead of using the real thing like `const { PubSub } = require('@google-cloud/pubsub')`,
simply require the emulator module `const { Pubsub } = require('mock-google-cloud-pubsub')` and
use this instead when running integration tests.

## Changelog

- from version 2.0.0 the `initializeMocker` method was removed, now subscriptions and topics can be
created with the regular api methods.

## Local dev

Tests cases are run both for an actual and the mocked version, to ensure they work the same way.

To setup connection for real pubsub

- create a `confidential.env` file in root
- set `GCP_PROJECT_ID=<your-project-id>`
- set `GCP_CREDENTIALS=<credentials for a service account as json>`
- set `RESOURCE_PREFIX` to a uniq string, resources created during tests will be prefix with this value

You can use the docker pubsub emulator instead of the real pubsub:

- run `docker-compose up -d`
- in `confidential.env` set `GCP_PROJECT_ID=mock-gcp-project` and `PUBSUB_EMULATOR_HOST=localhost:8685`

Run tests with `npm t` or `npm run test:watch` for watch mode.
