// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { QueryError } from 'documentdb';
import { SinonStub, stub } from 'sinon';

export interface MockDocumentDb {
  createDatabase: SinonStub;
  createCollection: SinonStub;
  createDocument: SinonStub;
  queryDocuments: SinonStub;
  deleteDocument: SinonStub;
}

export interface MockDocumentDbExecutor {
  executeNext: SinonStub;
}

export function createMockDocumentDb(): MockDocumentDb {
  return {
    createDatabase: stub().yields(),
    createCollection: stub().yields(),
    createDocument: stub().yields(),
    queryDocuments: stub().returns(createMockQueryExecutor(null, [], {})),
    deleteDocument: stub().yields(),
  };
}

export function createMockQueryExecutor(error: QueryError, results: any[], headers: {[key: string]: string}) {
  return {
    executeNext: stub().yields(error, results.slice(), headers),
  };
}
