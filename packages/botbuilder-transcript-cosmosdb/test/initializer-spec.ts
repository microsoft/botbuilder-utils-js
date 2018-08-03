// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { expect } from 'chai';

import { Initializer } from '../src/initializer';

describe('Initializer', () => {
  describe('Successful init', () => {
    let initializer: Initializer;
    let initCount: number;
    beforeEach(() => {
      initCount = 0;
      initializer = new Initializer(() => {
        initCount++;
        return Promise.resolve();
      });
    });

    it('inits only once', async () => {
      const p1 = initializer.wait();
      const p2 = initializer.wait();

      await Promise.all([p1, p2]);

      expect(initCount).to.equal(1);
    });
  });

  describe('Failed init', () => {
    const err = new Error('foo');
    let initializer: Initializer;
    beforeEach(() => {
      initializer = new Initializer(() => Promise.reject(err));
    });

    it('propogates init error', async () => {
      let caught: Error;
      try {
        await initializer.wait();
        expect.fail();
      } catch (err) {
        caught = err;
      }
      expect(caught).to.equal(err);
    });
  });
});
