// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { PagedResult, TranscriptInfo, TranscriptStore } from 'botbuilder-core';
import { Activity } from 'botframework-schema';
import { Collection, DocumentClient, IncludedPath } from 'documentdb';

import { createCollectionIfNotExists, createDatabaseIfNotExists, createDocument, deleteDocument, queryDocuments } from './cosmosdb';
import { Initializer } from './initializer';
import { FIND_CONVERSATION_START, LIST_TRANSCRIPT_ACTIVITIES, LIST_TRANSCRIPTS } from './queries';

const DEFAULT_DB_NAME = 'botframework';
const DEFAULT_COLL_NAME = 'transcripts';
const DEFAULT_COLL_THROUGHPUT = 1000;
const DEFAULT_COLL_TTL = 0;

const DEFAULT_COLL: any = {
  id: null,
  indexingPolicy: {
    automatic: true,
    indexingMode: 'consistent',
    includedPaths: [
      {
        path: '/*',
        indexes: [
          {
            kind: 'Range',
            dataType: 'Number',
            precision: -1,
          },
          {
            kind: 'Range',
            dataType: 'String',
            precision: -1,
          },
          {
            kind: 'Spatial',
            dataType: 'Point',
          },
        ],
      },
      indexForDate('/activity/timestamp/?'),
      indexForDate('/activity/localTimestamp/?'),
    ],
    excludedPaths: [
      {
        path: '/attachments/[]/content/*',
      },
    ],
  },
};

function indexForDate(path: string): any {
  return {
    path,
    indexes: [
      {
        kind: 'Range',
        dataType: 'Number',
        precision: -1,
      },
      {
        kind: 'Range',
        dataType: 'String',
        precision: -1,
      },
    ],
  };
}

export interface CosmosDbTranscriptStoreOptions {
  /** Database name (default = 'botframework'; created if it does not exist) */
  databaseName?: string;

  /** Collection name (default = 'transcripts'; created if it does not exist) */
  collectionName?: string;

  /** Default configuration for created collections */
  onCreateCollection?: {

    /** Throughput for created collections (default = 1000) */
    throughput?: number;

    /** Time-to-live for created collections (default = none) */
    ttl?: number;
  };
}

export class CosmosDbTranscriptStore implements TranscriptStore {

  private initializer: Initializer;
  private transcriptIdCache = new Set<string>();
  private get db() { return `dbs/${this.options.databaseName}`; }
  private get coll() { return `${this.db}/colls/${this.options.collectionName}`; }

  constructor(private client: DocumentClient, private options?: CosmosDbTranscriptStoreOptions) {
    options = this.options = options || { };
    options.onCreateCollection = options.onCreateCollection || {};
    options.databaseName = options.databaseName || DEFAULT_DB_NAME;
    options.collectionName = options.collectionName || DEFAULT_COLL_NAME;
    options.onCreateCollection.throughput = options.onCreateCollection.throughput || DEFAULT_COLL_THROUGHPUT;
    options.onCreateCollection.ttl = options.onCreateCollection.ttl || DEFAULT_COLL_TTL;
    this.initializer = new Initializer(async () => {
      const collection: Collection = Object.assign({}, DEFAULT_COLL, { id: options.collectionName });
      const createOptions = { offerThroughput: options.onCreateCollection.throughput };
      if (options.onCreateCollection.ttl) {
        collection.defaultTtl = options.onCreateCollection.ttl;
      }
      await createDatabaseIfNotExists(client, options.databaseName);
      await createCollectionIfNotExists(client, this.db, collection, createOptions);
    });
  }

  async logActivity(activity: Activity): Promise<void> {
    await this.initializer.wait();

    // set a 'start' flag on the db record if this is the first activity in a transcript
    // due to concurrency, a transcript record may have >1 activity with the 'start' flag
    // store known transcript ids in a local cache to avoid the extra DB lookup.
    let start = false;
    const transcriptId = activity.channelId + activity.conversation.id;
    if (!this.transcriptIdCache.has(transcriptId)) {
      this.transcriptIdCache.add(transcriptId);
      const parameters = [
        { name: '@channelId', value: activity.channelId },
        { name: '@conversationId', value: activity.conversation.id },
      ];
      const sql = { query: FIND_CONVERSATION_START, parameters };
      const [results] = await queryDocuments<Activity>(this.client, this.coll, sql);
      start = !results.length;
    }

    await createDocument(this.client, this.coll, {activity, start} as any);
  }

  async getTranscriptActivities(channelId: string, conversationId: string, continuationToken?: string, startDate?: Date): Promise<PagedResult<Activity>> {
    await this.initializer.wait();
    const [results, headers] = await this.listTranscriptActivities(channelId, conversationId, continuationToken, startDate);

    return {
      items: results.map((x) => x.activity),
      continuationToken: headers['x-ms-continuation'],
    };
  }

  async listTranscripts(channelId: string, continuationToken?: string): Promise<PagedResult<TranscriptInfo>> {
    await this.initializer.wait();
    const parameters = [
      { name: '@channelId', value: channelId },
    ];
    const sql = { query: LIST_TRANSCRIPTS, parameters };
    const options = { continuation: continuationToken };
    const [results, headers] = await queryDocuments<TranscriptInfo>(this.client, this.coll, sql, options);

    // due to concurrency, a transcript may have duplicate records
    // use a Map to limit each transcript to a single (earliest by date) output record
    const transcripts = new Map<string, TranscriptInfo>();
    for (const result of results) {
      const id = result.channelId + result.id;

      // add the transcript to output
      if (!transcripts.has(id)) {
        transcripts.set(id, result);

      // replace newer transcript with current older transcript
      } else if (result.created < transcripts.get(id).created) {
        transcripts.set(id, result);
      }
    }

    return {
      items: Array.from(transcripts.values()),
      continuationToken: headers['x-ms-continuation'],
    };
  }

  async deleteTranscript(channelId: string, conversationId: string): Promise<void> {
    await this.initializer.wait();

    let results: any[];
    let headers: any;
    let ct = null;

    do {
      [results, headers] = await this.listTranscriptActivities(channelId, conversationId, ct);
      for (const doc of results) {
        await deleteDocument(this.client, doc._self);
      }
      ct = headers['x-ms-continuation'];
    } while (ct);
  }

  private listTranscriptActivities(channelId: string, conversationId: string, continuationToken?: string, startDate?: Date) {
    const parameters = [
      { name: '@channelId', value: channelId },
      { name: '@conversationId', value: conversationId },
      { name: '@startDate', value: startDate || '' },
    ];
    const sql = { query: LIST_TRANSCRIPT_ACTIVITIES, parameters };
    const options = { continuation: continuationToken };
    return queryDocuments<Activity>(this.client, this.coll, sql, options);
  }
}
