// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

enum InitializerState {
  none,
  ready,
  working,
}

/**
 * Perform an initialization task exactly once for multiple callers
 */
export class Initializer {

  private state = InitializerState.none;
  private worker: Promise<void>;

  /**
   * Create a new Initializer instance
   * @param task The initialization task
   */
  constructor(private task: () => Promise<void>) { }

  /**
   * Return a promise that is resolved when initialization is done
   */
  wait(): Promise<void> {
    switch (this.state) {
      case InitializerState.ready:
        return Promise.resolve();

      case InitializerState.working:
        return this.worker;

      default:
        this.state = InitializerState.working;
        return this.worker = this.task().then(() => {
          this.state = InitializerState.ready;
        });
    }
  }
}
