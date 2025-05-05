# mock-google-cloud-pubsub

## 3.1.0

### Minor Changes

- support `topic.getSubscriptions` method

## 3.0.2

### Patch Changes

- fix `pubsub.subscription`/`topics.subscription` methods with non existing subscription names

## 3.0.1

### Patch Changes

- fix `pubsub.topic` method with non existing topic name

## 3.0.0

- scope `getTopics` and `getSubscriptions` to their own pubsub instance

### Minor Changes

- `publish` and `publishMessage` return expected message id
- `pubsub.createTopic()` and `topic.createSubscription()` accept full path name
- complete message object mock

### Major Changes

- `PubSub` constructor defaults `options.projectId` to `{{projectId}}`
- Update `@google-cloud/pubsub` to v4

## 2.1.0

### Minor Changes

- partial support `topic.publishMessage`

## 2.0.0

- the `initializeMocker` method was removed, now subscriptions and topics can be created with the regular api methods.
