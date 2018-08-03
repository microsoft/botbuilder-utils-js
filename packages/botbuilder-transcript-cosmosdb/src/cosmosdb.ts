// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Collection, DocumentClient, DocumentQuery, FeedOptions, NewDocument, QueryError, RequestOptions, RetrievedDocument, UriFactory } from 'documentdb';

const HTTP_CONFLICT = 409;

/**
 * Create a DocumentDb database if it does not exist
 * @param client DocumentDb client
 * @param id Database name
 */
export function createDatabaseIfNotExists(client: DocumentClient, id: string) {
  return new Promise<void>((resolve, reject) => {
    client.createDatabase({ id }, (err) => created(err, resolve, reject));
  });
}

/**
 * Create a DocumentDb collection if it does not exist
 * @param client DocumentDb client
 * @param db The self-link of the database
 * @param coll Definition of the collection to create if it does not already exist
 * @param options Request options that will be used to create the collection
 */
export function createCollectionIfNotExists(client: DocumentClient, db: string, coll: Collection, options?: RequestOptions ) {
  return new Promise<void>((resolve, reject) => {
    client.createCollection(db, coll, options, (err) => created(err, resolve, reject));
  });
}

/**
 * Create a DocumentDb document
 * @param client DocumentDb client
 * @param link Document feed link
 * @param doc Document content
 */
export function createDocument(client: DocumentClient, link: string, doc: NewDocument) {
  return new Promise((resolve, reject) => {
    client.createDocument(link, doc, (err) => created(err, resolve, reject));
  });
}

/**
 * Fetch next batch of documents for a DocumentDb query
 * @param client DocumentDb client
 * @param coll Collection link
 * @param query Document query
 * @param options Query Options
 */
export function queryDocuments<T = any>(client: DocumentClient, coll: string, query: DocumentQuery, options?: FeedOptions) {
  return new Promise<[Array<T & RetrievedDocument>, any]>((resolve, reject) => {
    client.queryDocuments(coll, query, options).executeNext((err, resource, headers) => {
      if (err) {
        reject(err);
      } else {
        resolve([resource as any[], headers]);
      }
    });
  });
}

/**
 * Delete a document from a DocumentDb collection
 * @param client DocumentDb client
 * @param docLink Document link
 */
export function deleteDocument(client: DocumentClient, docLink: string) {
  return new Promise<void>((resolve, reject) => {
    client.deleteDocument(docLink, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function created(err: QueryError, resolve: () => void, reject: (reason?: any) => void): void {
  if (err && err.code !== HTTP_CONFLICT) {
    reject(new Error(err.body));
  } else {
    resolve();
  }
}
