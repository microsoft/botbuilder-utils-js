// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { dirname } from 'path';

export function findRootModuleDir() {
  let m = module;
  let p: NodeModule;
  while (m) {
    if (m.parent) {
      p = m.parent;
    }
    m = m.parent;
  }

  return dirname(p.filename);
}
