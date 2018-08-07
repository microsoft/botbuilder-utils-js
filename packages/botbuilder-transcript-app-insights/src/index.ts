// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TelemetryClient } from 'applicationinsights';
import { PagedResult, Transcript, TranscriptStore } from 'botbuilder-core-extensions';
import { Activity } from 'botframework-schema';

import { AppInsightsEventClient } from './app-insights';
import { deserialize, serialize, serializeMetadata } from './serializer';

export interface AppInsightsTranscriptStoreOptions {
  /**
   * AppInsights application id
   */
  applicationId: string;

  /**
   * Optional key to read from the AppInsights store
   *  when the provided TelemetryClient does not use an instrumentation key with read privileges
   */
  readKey?: string;
}

export class AppInsightsTranscriptStore implements TranscriptStore {
  private transcriptIdCache = new Set<string>();

  constructor(private client: TelemetryClient, private options: AppInsightsTranscriptStoreOptions, private readClient?: AppInsightsEventClient) {
    this.readClient = readClient || new AppInsightsEventClient(this.options.applicationId, options.readKey || client.config.instrumentationKey);
  }

  logActivity(activity: Activity): Promise<void> {
    const properties = serialize(activity);
    const transcriptId = activity.channelId + activity.conversation.id;

    // select non-string/deep properties are copied to top level so that they can be queried
    //   these properties should be deleted from the returned object at query time
    serializeMetadata(properties, {
      conversationId: activity.conversation.id,
      fromId: activity.from.id,
      recipientId: activity.recipient.id,
      timestamp: activity.timestamp.toISOString(),
      start: (!this.transcriptIdCache.has(transcriptId)).toString(),
    });

    this.transcriptIdCache.add(transcriptId);
    this.client.trackEvent({ name: 'activity', properties });
    return Promise.resolve();
  }

  async getTranscriptActivities(channelId: string, conversationId: string, continuationToken?: string, startDate?: Date): Promise<PagedResult<Activity>> {
    const filters = [
      `channelId eq '${channelId}'`,
      `$conversationId eq '${conversationId}'`,
    ];
    if (startDate) {
      filters.push(`$timestamp ge '${startDate.toISOString()}'`);
    }
    const $filter = filters.join(' and ');
    const resp = await this.readClient.customEvents({ $filter });
    const activities = resp.values.map((x) => deserialize<Activity>(x));
    return {
      items: activities,
      continuationToken: undefined,
    };
  }

  async listTranscripts(channelId: string, continuationToken?: string): Promise<PagedResult<Transcript>> {
    const $filter = [
      `channelId eq '${channelId}'`,
      `$start eq 'true'`,
    ].join(' and ');
    const $select = 'channelId,$conversationId,$timestamp';
    const resp = await this.readClient.customEvents({ $filter, $select });
    const activities = resp.values.map((x) => deserialize<Activity>(x));

    // due to concurrency, a transcript may have duplicate records
    // use a Map to limit each transcript to a single (earliest by date) output record
    const transcripts = new Map<string, Transcript>();
    for (const activity of activities) {
      const id = activity.channelId + activity.conversation.id;

      // add the transcript to output
      if (!transcripts.has(id) || activity.timestamp < transcripts.get(id).created) {
        transcripts.set(id, {
          channelId: activity.channelId,
          id: activity.conversation.id,
          created: activity.timestamp,
        });
      }
    }

    return {
      items: Array.from(transcripts.values()),
      continuationToken: undefined,
    };
  }

  deleteTranscript(channelId: string, conversationId: string): Promise<void> {
    // https://stackoverflow.com/questions/38219702/delete-specific-application-insights-events-on-azure
    return Promise.reject(new Error('AppInsights event deletion is not supported'));
  }
}
