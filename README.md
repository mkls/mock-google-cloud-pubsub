# mock-google-cloud-pubsub

[![Build Status][ci-badge]][ci]
[![Npm version][npm-version-badge]][npm]
[![Coveralls][coveralls-badge]][coveralls]

The goal of this project is to develop an in-memory emulator for Google Cloud Pub/Sub, enabling this module to be used as a drop-in replacement for `@google-cloud/pubsub` in integration tests.

As an alternative to this package, you may consider using a [Pub/Sub emulator Docker image](https://hub.docker.com/r/google/cloud-sdk). However, this package is recommended if the Docker-based emulator does not meet your performance requirements.

## Installation

```
npm install mock-google-cloud-pubsub -D
```

## Feature set

This package implements a subset of the [official Pub/Sub API](https://googleapis.dev/nodejs/pubsub/latest/PubSub.html). While simple use cases—such as the example shown below—are supported, you should verify compatibility with more complex scenarios as needed.

```js
import { PubSub } from 'mock-google-cloud-pubsub';
const pubsub = new PubSub();

const [topic] = await pubsub.createTopic(topicName);
const [subscription] = await topic.createSubscription(subscriptionName);

subscription.on('message', (message) => {
  console.log('Received message:', message.data.toString());
});

topic.publish(Buffer.from('Test message!'));
```

Pull request for covering more features are welcome, just make sure to write tests for them.

## Usage

Instead of using the actual `@google-cloud/pubsub` package, replace it with `mock-google-cloud-pubsub` during integration testing:

```js
import { PubSub } from '@google-cloud/pubsub'
import { PubSub: MockPubSub } from 'mock-google-cloud-pubsub'

const pubsub = process.env.NODE_ENV !== 'test' ? new PubSub({ ... }) : new MockPubSub()
```

## `@google-cloud/pubsub` versions support

| mock-google-cloud-pubsub | @google-cloud/pubsub |
| ------------------------ | -------------------- |
| v3.1.0 +                 | v4.X.X -> v5.X.X     |

### Tests & introspection

#### Get registered topics:

```ts
const [topics] = await pubsub();
```

#### Get registered subscriptions for given topic:

```ts
const [subscriptions] = await topic.getSubscriptions();
```

#### Get registered subscriptions:

```ts
const [subscriptions] = await pubsub.getSubscriptions();
```

## Local dev

Tests cases are run both for an actual and the mocked version, to ensure they work the same way.

To setup connection for real pubsub

- create a `confidential.env` file in root
- set `GCP_PROJECT_ID=<your-project-id>`
- set `GCP_CREDENTIALS=<credentials for a service account as json>`

You can use the docker pubsub emulator instead of the real pubsub:

- run `docker-compose up -d`
- in `confidential.env` set `GCP_PROJECT_ID=mock-gcp-project` and `PUBSUB_EMULATOR_HOST=localhost:8685`

Run tests with `npm t` or `npm run test:watch` for watch mode.

[ci-badge]: https://github.com/mkls/mock-google-cloud-pubsub/actions/workflows/ci.yml/badge.svg
[ci]: https://github.com/mkls/mock-google-cloud-pubsub/actions/workflows/ci.yml
[coveralls-badge]: https://coveralls.io/repos/github/mkls/mock-google-cloud-pubsub/badge.svg?branch=master
[coveralls]: https://coveralls.io/github/mkls/mock-google-cloud-pubsub?branch=master
[npm]: https://www.npmjs.com/package/mock-google-cloud-pubsub
[npm-version-badge]: https://img.shields.io/npm/v/mock-google-cloud-pubsub.svg
