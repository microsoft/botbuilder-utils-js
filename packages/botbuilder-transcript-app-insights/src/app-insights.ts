// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as request from 'superagent';

export interface EventQuery {
  $top?: number;
  $skip?: number;
  $count?: boolean;
  $filter?: string;
  $search?: string;
  $select?: string;
  $orderBy?: string;
  $apply?: string;
}

export interface EventResponse<T> {
  values: T[];
  count: number;
}

const URI = 'https://api.applicationinsights.io/v1';

export class AppInsightsEventClient {
  constructor(private appId: string, private key: string) { }

  customEvents<T = any>(query: EventQuery): Promise<EventResponse<T>> {
    return this.fetch('customEvents', query);
  }

  private async fetch<T>(type: string, query: EventQuery): Promise<EventResponse<T>> {
    const resp = await request
      .get(`${URI}/${this.appId}/events/${type}`)
      .set('X-Api-Key', this.key)
      .query(query);

    return {
      values: resp.body.value,
      count: resp.body['@odata.count'],
    };
  }
}
