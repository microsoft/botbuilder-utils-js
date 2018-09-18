// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TelemetryClient } from 'applicationinsights';
import { PagedResult, TranscriptInfo, TranscriptStore } from 'botbuilder-core';
import { Activity } from 'botframework-schema';

import { AppInsightsReadClient } from './app-insights';
import { deserialize, serialize, serializeMetadata, serializeProperties } from './serializer';

export interface AppInsightsQueryOptions {
  /**
   * API Access application id
   */
  applicationId: string;

  /**
   * API Access key with 'Read telemetry' permissions
   */
  readKey: string;
}

export interface AppInsightsTranscriptOptions {

  /**
   * Configure transcript store for reading (only if using `getTranscriptActivities` and `listTranscripts` functions)
   */
  query?: AppInsightsQueryOptions;

  /**
   * Specify nested activity fields that should be exposed as queryable AppInsights properties
   *
   * @example
   * // Given a trace Activity like:
   * { "type": "trace", "value": { "nested": { "property": 123 } } }
   *
   * // And an `filterableActivityProperties` configuration of:
   * [ 'value.nested.property' ]
   *
   * // You can use the string property in an AppInsights analytics query as:
   * customEvents
   *   | where customDimensions.$valueNestedProperty == '123'
   *
   * // Such activities are prefixed with `$` to differentiate them from other Activity properties, which are automatically stored
   * // Note that select Activity are automatically converted to properties:
   * ['conversation.id', 'from.id', 'recipient.id']
   */
  filterableActivityProperties?: string[];
}

/**
 * Some clients (emulator) might send timestamp as a string
 * @param activity bot activity
 */
const getTimestamp = (activity: Activity): Date => {
  const ts: Date | string = activity.timestamp;
  if (typeof ts === 'string') {
    return new Date(ts);
  } else if (!ts) {
    return new Date();
  } else {
    return ts;
  }
};

const qTranscriptActivities = (channelId: string, conversationId: string, startDate: Date) => `
  customEvents
    | where customDimensions.channelId == '${channelId}'
      and customDimensions.$conversationId == '${conversationId}'
      ${startDate ? `and customDimensions.$timestamp ge '${startDate.toISOString()}'` : ''}`;

const qListTranscripts = (channelId: string) => `
  customEvents
    | where customDimensions.channelId == '${channelId}'
      and customDimensions.$start == 'true'
    | project channelId=customDimensions.channelId
        , id=customDimensions.$conversationId
        , created=customDimensions.$timestamp`;

export class AppInsightsTranscriptStore implements TranscriptStore {
  private transcriptIdCache = new Set<string>();
  private readClient: AppInsightsReadClient;

  /**
   * Create a new Application Insights transcript store for use in a Bot Framework bot
   * @param client Application Insights telemetry client
   * @param options Optional configuration parameters
   */
  constructor(private client: TelemetryClient, private options?: AppInsightsTranscriptOptions) {
    if (this.options) {
      if (this.options.query) {
        this.readClient = new AppInsightsReadClient(this.options.query.applicationId, options.query.readKey);
      }
    }
  }

  logActivity(activity: Activity): Promise<void> {
    const properties = serialize(activity);
    const transcriptId = activity.channelId + activity.conversation.id;
    const timestamp = getTimestamp(activity);

    // select non-string/deep properties are copied to top level so that they can be queried
    //   these properties should be deleted from the returned object at query time
    serializeMetadata(properties, {
      conversationId: activity.conversation.id,
      fromId: activity.from.id,
      recipientId: activity.recipient.id,
      timestamp: timestamp.toISOString(),
      start: (!this.transcriptIdCache.has(transcriptId)).toString(),
    });
    if (this.options && this.options.filterableActivityProperties) {
      serializeProperties(properties, this.options.filterableActivityProperties, activity);
    }

    this.transcriptIdCache.add(transcriptId);
    this.client.trackEvent({ name: 'activity', properties });
    return Promise.resolve();
  }

  async getTranscriptActivities(channelId: string, conversationId: string, continuationToken?: string, startDate?: Date): Promise<PagedResult<Activity>> {
    this.throwIfNoReader();
    const query = qTranscriptActivities(channelId, conversationId, startDate);
    const resp = await this.readClient.query(query);
    const activities = resp.map((x) => deserialize<Activity>(x.customDimensions));
    return {
      items: activities,
      continuationToken: undefined,
    };
  }

  async listTranscripts(channelId: string, continuationToken?: string): Promise<PagedResult<TranscriptInfo>> {
    this.throwIfNoReader();
    const query = qListTranscripts(channelId);
    const resp = await this.readClient.query(query);
    const transcripts = resp.map((x) => deserialize<TranscriptInfo>(x));

    // due to concurrency, a transcript may have duplicate records
    // use a Map to limit each transcript to a single (earliest by date) output record
    const transcriptStarts = new Map<string, TranscriptInfo>();
    for (const transcript of transcripts) {
      const key = transcript.channelId + transcript.id;

      // add the transcript to output
      if (!transcriptStarts.has(key) || transcript.created < transcriptStarts.get(key).created) {
        transcriptStarts.set(key, {
          channelId: transcript.channelId,
          id: transcript.id,
          created: transcript.created,
        });
      }
    }

    return {
      items: Array.from(transcriptStarts.values()),
      continuationToken: undefined,
    };
  }

  deleteTranscript(channelId: string, conversationId: string): Promise<void> {
    // https://stackoverflow.com/questions/38219702/delete-specific-application-insights-events-on-azure
    return Promise.reject(new Error('AppInsights event deletion is not supported'));
  }

  private throwIfNoReader() {
    if (!this.readClient) {
      throw new Error('Please configure AppInsightsTranscriptStore readOptions');
    }
  }
}
