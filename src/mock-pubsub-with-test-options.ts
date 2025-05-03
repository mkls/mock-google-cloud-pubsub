import { PubSub as MockPubSub } from './mock-pubsub';
import type { Options, TestOptions } from './types';

/**
 * Extend MockPubSub with testing features
 */
class PubSubWithTestOptions extends MockPubSub {
  constructor(options: Options = {}, testOptions?: TestOptions) {
    super(options);
    this._testOptions = testOptions;
  }
}

export { PubSubWithTestOptions };
