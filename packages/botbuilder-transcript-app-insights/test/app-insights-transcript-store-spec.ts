// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { expect } from 'chai';
import { stub } from 'sinon';

import { AppInsightsTranscriptStore } from '../src';
import { EventQuery } from '../src/app-insights';
import {
  CHANNEL_ID, CONVERSATION_ID, createActivity,
  createMockAppInsightsEventClient, createMockTelemetryClient, createStoredActivity,
  customEvents, MockEventClient, MockTelemetryClient,
  TIMESTAMP } from './mocks';

describe('AppInsights Transcript Store', () => {
  let client: MockTelemetryClient;
  // let readClient: MockEventClient;
  let store: AppInsightsTranscriptStore;

  beforeEach(() => {
    client = createMockTelemetryClient();
    // readClient = createMockAppInsightsEventClient();
    store = new AppInsightsTranscriptStore(
      client as any,
      { readKey: 'test', applicationId: 'test' });
  });

  describe('Logging', () => {
    it('should annotate only first activity', async () => {
      await store.logActivity(createActivity());
      await store.logActivity(createActivity());
      const [[telemetry1], [telemetry2]] = client.trackEvent.args;
      expect(telemetry1.properties.$start).to.equal('true');
      expect(telemetry2.properties.$start).to.equal('false');
    });
  });

  // describe('Transcript Retrieval', () => {

  //   beforeEach(() => {
  //     readClient.customEvents = stub().resolves(customEvents([createStoredActivity(true)]));
  //   });

  //   it('should return transcript activities', async () => {
  //     const retrieved = await store.getTranscriptActivities(CHANNEL_ID, CONVERSATION_ID);
  //     expect(retrieved.items).to.deep.equal([createActivity()]);
  //     expect(retrieved.continuationToken).to.be.undefined;
  //   });

  //   describe('With StartDate in Request', () => {
  //     const startDate = new Date();
  //     it('should return transcript activities', async () => {
  //       const retrieved = await store.getTranscriptActivities(CHANNEL_ID, CONVERSATION_ID, null, startDate);
  //       const [[query]] = readClient.customEvents.args as [[EventQuery]];
  //       expect(retrieved.items).to.deep.equal([createActivity()]);
  //       expect(retrieved.continuationToken).to.be.undefined;
  //       expect(query.$filter).to.include(`$timestamp ge '${startDate.toISOString()}'`);
  //     });
  //   });
  // });

  // describe('Transcript Listing', () => {
  //   const storedActivities = [
  //     createStoredActivity(true, CHANNEL_ID, '1'),
  //     createStoredActivity(true, CHANNEL_ID, '2'),
  //   ];

  //   beforeEach(() => {
  //     readClient.customEvents = stub().resolves(customEvents(storedActivities));
  //   });

  //   it('should list transcripts', async () => {
  //     const retrieved = await store.listTranscripts(CHANNEL_ID);
  //     expect(retrieved.items).to.deep.equal([
  //       { channelId: CHANNEL_ID, id: '1', created: TIMESTAMP },
  //       { channelId: CHANNEL_ID, id: '2', created: TIMESTAMP },
  //     ]);
  //     expect(retrieved.continuationToken).to.be.undefined;
  //   });

  //   describe('With Extra Conversation Activity Record', () => {
  //     beforeEach(() => {
  //       const extra = createStoredActivity(true, CHANNEL_ID, '2');
  //       readClient.customEvents = stub().resolves(customEvents(storedActivities.concat(extra)));
  //     });

  //     it('should list transcripts', async () => {
  //       const retrieved = await store.listTranscripts(CHANNEL_ID);
  //       expect(retrieved.items).to.deep.equal([
  //         { channelId: CHANNEL_ID, id: '1', created: TIMESTAMP },
  //         { channelId: CHANNEL_ID, id: '2', created: TIMESTAMP },
  //       ]);
  //       expect(retrieved.continuationToken).to.be.undefined;
  //     });
  //   });
  // });

  describe('Delete Transcript', () => {
    it('should throw error', async () => {
      try {
        await store.deleteTranscript(CHANNEL_ID, CONVERSATION_ID);
        expect.fail();
      } catch (err) {
        expect(err).to.be.an('error');
      }
    });
  });
});
