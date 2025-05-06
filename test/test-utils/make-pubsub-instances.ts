import { PubSub } from '@google-cloud/pubsub';
import { PubSub as MockPubSub, PubsubWithInterceptors } from '../../src';

export function makePubSubInstances({ projectId }: { projectId?: string }) {
  return [
    {
      title: 'real PubSub',
      pubsub: new PubSub({
        projectId,
      }),
      PubSubClass: PubSub,
    },
    {
      title: 'mock PubSub',
      pubsub: new MockPubSub({ projectId }),
      PubSubClass: MockPubSub,
    },
    {
      title: 'mock PubSub with interceptors',
      pubsub: new PubsubWithInterceptors({ projectId }),
      PubSubClass: PubsubWithInterceptors,
    },
  ] as const;
}
