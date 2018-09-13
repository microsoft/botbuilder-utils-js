import { cleanAll, disableNetConnect, isDone, load, Scope } from 'nock';
import * as path from 'path';

import { HttpTestFileOptions } from ".";
import { findRootModuleDir } from './find-root-module-dir';

/**
 * Test utility that will load stored HTTP sessions from disk and intercept subsequent requests.
 */
export class HttpTestPlayback {
  /**
   * Create a new instance of the Playback utility
   * @param options optional playback options
   */
  constructor(private options?: HttpTestFileOptions) {
    this.options = options || {};

    if (!this.options.testDataDirectory) {
      this.options.testDataDirectory = path.join(findRootModuleDir(), 'test', 'data');
    }
  }

  /**
   * Load a saved HTTP session from disk, serving requests from the saved session instead of making real HTTP requests
   * @param name Name of the saved session
   * @param disableOutboundHttp Disable all outbound HTTP traffic (i.e. serve only the content loaded in the saved session)
   */
  load(name: string, disableOutboundHttp = true): Scope[] {
    if (!isDone()) {
      throw new Error('HttpTestPlayback still has outstanding responses that were never requested!');
    }
    if (disableOutboundHttp) {
      disableNetConnect();
    }
    cleanAll();
    if (!name.endsWith('.json')) {
      name += '.json';
    }
    return load(path.join(this.options.testDataDirectory, name));
  }

  /**
   * Returns true if all loaded HTTP sessions have been served
   */
  isDone() {
    return isDone();
  }
}
