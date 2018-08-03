// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Activity } from 'botframework-schema';
import { expect } from 'chai';
import { DocumentQuery, FeedOptions, SqlQuerySpec } from 'documentdb';
import { stub } from 'sinon';

import { CosmosDbTranscriptStore } from '../src';
import { createMockDocumentDb, createMockQueryExecutor, MockDocumentDb } from './mock-documentdb';

describe('CosmosDb Transcript Store', () => {
  const channelId = 'foo';
  const conversationId = 'bar';
  let client: MockDocumentDb;
  let store: CosmosDbTranscriptStore;

  beforeEach(() => {
    client = createMockDocumentDb();
    store = new CosmosDbTranscriptStore(client as any);
  });

  describe('Logging', () => {

    describe('First Activity', () => {
      it('should log activity as start', async () => {
        const activity = { channelId: 'test', conversation: { id: 'convo1' } } as any as Activity;
        await store.logActivity(activity);
        const [, doc] = client.createDocument.args[0];
        expect(doc).to.deep.equal({ activity, start: true });
      });
    });

    describe('Second Activity', () => {
      beforeEach(() => {
        client.queryDocuments = stub().returns(createMockQueryExecutor(null, [{}], {}));
      });
      it('should log activity as not start', async () => {
        const activity = { channelId: 'test', conversation: { id: 'convo1' } } as any as Activity;
        await store.logActivity(activity);
        const [, doc] = client.createDocument.args[0];
        expect(doc).to.deep.equal({ activity, start: false });
      });
    });
  });

  describe('Transcript Retrieval', () => {
    const storedActivities = [{ activity: { foo: 'bar' } }];
    const continuationToken = 'abc';

    beforeEach(() => {
      client.queryDocuments = stub().returns(createMockQueryExecutor(null, storedActivities, {}));
    });

    it('should return transcript activities', async () => {
      const retrieved = await store.getTranscriptActivities(channelId, conversationId);
      expect(retrieved.items).to.deep.equal(storedActivities.map((x) => x.activity));
      expect(retrieved.continuationToken).to.be.undefined;
    });

    describe('With Continuation in Request', () => {
      it('should return transcript activities', async () => {
        const retrieved = await store.getTranscriptActivities(channelId, conversationId, continuationToken);
        const [[, , queryOptions]] = client.queryDocuments.args as [[string, DocumentQuery, FeedOptions]];
        expect(retrieved.items).to.deep.equal(storedActivities.map((x) => x.activity));
        expect(retrieved.continuationToken).to.be.undefined;
        expect(queryOptions.continuation).to.equal(continuationToken);
      });
    });

    describe('With StartDate in Request', () => {
      const startDate = new Date();
      it('should return transcript activities', async () => {
        const retrieved = await store.getTranscriptActivities(channelId, conversationId, null, startDate);
        const [[, query]] = client.queryDocuments.args as [[string, SqlQuerySpec]];
        expect(retrieved.items).to.deep.equal(storedActivities.map((x) => x.activity));
        expect(retrieved.continuationToken).to.be.undefined;
        expect(query.parameters).to.deep.include({name: '@startDate', value: startDate});
      });
    });

    describe('With Continuation in Response', () => {
      beforeEach(() => {
        client.queryDocuments = stub().returns(createMockQueryExecutor(null, storedActivities, {'x-ms-continuation': continuationToken}));
      });
      it('should return transcript activities and a continuation token', async () => {
        const retrieved = await store.getTranscriptActivities(channelId, conversationId);
        expect(retrieved.items).to.deep.equal(storedActivities.map((x) => x.activity));
        expect(retrieved.continuationToken).to.equal(continuationToken);
      });
    });
  });

  describe('Transcript Listing', () => {
    const continuationToken = 'abc';
    const storedActivities = [
      { channelId: 'test1', id: '1', created: new Date().toISOString() },
      { channelId: 'test1', id: '2', created: new Date().toISOString() },
    ];

    beforeEach(() => {
      client.queryDocuments = stub().returns(createMockQueryExecutor(null, storedActivities, {}));
    });

    it('should list transcripts', async () => {
      const retrieved = await store.listTranscripts(channelId);
      expect(retrieved.items).to.deep.equal(storedActivities);
      expect(retrieved.continuationToken).to.be.undefined;
    });

    describe('With Continuation in Request', () => {
      it('should list transcripts', async () => {
        const retrieved = await store.listTranscripts(channelId, continuationToken);
        const [[, , queryOptions]] = client.queryDocuments.args as [[string, DocumentQuery, FeedOptions]];
        expect(retrieved.items).to.deep.equal(storedActivities);
        expect(retrieved.continuationToken).to.be.undefined;
        expect(queryOptions.continuation).to.equal(continuationToken);
      });
    });

    describe('With Continuation in Response', () => {
      beforeEach(() => {
        client.queryDocuments = stub().returns(createMockQueryExecutor(null, storedActivities, { 'x-ms-continuation': continuationToken }));
      });

      it('should list transcripts and a continuation token', async () => {
        const retrieved = await store.listTranscripts(channelId);
        expect(retrieved.items).to.deep.equal(storedActivities);
        expect(retrieved.continuationToken).to.equal(continuationToken);
      });
    });

    describe('With Extra Conversation Activity Record', () => {
      beforeEach(() => {
        const extra = { channelId: 'test1', id: '2', created: new Date().toISOString() };
        client.queryDocuments = stub().returns(createMockQueryExecutor(null, storedActivities.concat(extra), {}));
      });

      it('should list transcripts', async () => {
        const retrieved = await store.listTranscripts(channelId);
        expect(retrieved.items).to.deep.equal(storedActivities);
        expect(retrieved.continuationToken).to.be.undefined;
      });
    });
  });

  describe('Delete Transcript', () => {
    const storedActivities = [
      { _self: '1', activity: {foo: 'bar' } },
      { _self: '2', activity: {foo: 'bar' } },
    ];

    beforeEach(() => {
      client.queryDocuments = stub().returns(createMockQueryExecutor(null, storedActivities, {}));
    });

    it('should delete all activities', async () => {
      await store.deleteTranscript(channelId, conversationId);
      const deletes = client.deleteDocument.getCalls();
      expect(deletes.length).to.equal(storedActivities.length);
      storedActivities.forEach((activity, i) => {
        expect(deletes[i].calledWith(activity._self)).to.be.true;
      });
    });

    describe('With Continuation in Response', () => {
      const continuationToken = 'abc';
      const storedActivitiesContinued = [
        { _self: '3', activity: { foo: 'bar' } },
        { _self: '4', activity: { foo: 'bar' } },
      ];
      const storedActivitiesAll = storedActivities.concat(storedActivitiesContinued);
      beforeEach(() => {
        client.queryDocuments = stub()
          .onFirstCall().returns(createMockQueryExecutor(null, storedActivities, { 'x-ms-continuation': continuationToken }))
          .onSecondCall().returns(createMockQueryExecutor(null, storedActivitiesContinued, { }));
      });
      it('should delete all activities', async () => {
        await store.deleteTranscript(channelId, conversationId);
        const deletes = client.deleteDocument.getCalls();
        expect(deletes.length).to.equal(storedActivitiesAll.length);
        expect(client.queryDocuments.callCount).to.equal(2);
        storedActivitiesAll.forEach((activity, i) => {
          expect(deletes[i].calledWith(activity._self)).to.be.true;
        });
      });
    });
  });

  afterEach(() => {
    expect(client.createDatabase.calledOnce).to.be.true;
    expect(client.createCollection.calledOnce).to.be.true;
  });
});
