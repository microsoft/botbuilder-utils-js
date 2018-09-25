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

const URI = 'https://api.applicationinsights.io/v1';

interface QueryResponse {
  tables: AnalyticsTable[];
}

interface AnalyticsTable {
  name: string;
  columns: AnalyticsColumn[];
  rows: string[][];
}

interface AnalyticsColumn {
  name: string;
  type: string;
}

const handleError = (err: any) => {
  if (err.response && err.response.body) {
    const body = err.response.body;
    const url = err.response.request.url;
    const method = err.response.request.method.toUpperCase();
    const status = err.response.status;
    if (body.error) {
      throw new Error(`Cannot ${method} ${url} (${status}): ${JSON.stringify(body.error)}`);
    }
  }
  throw err;
};

export class AppInsightsReadClient {
  constructor(private appId: string, private key: string) { }

  async customEvents(query: EventQuery) {
    return this.request('get', 'events/customEvents')
      .query(query)
      .catch(handleError);
  }

  async query<T = any>(query: string): Promise<T[]> {
    const resp = await this.request('post', 'query')
      .set('Content-Type', 'application/json; charset=utf-8')
      .send({ query })
      .then((resp) => resp.body as QueryResponse)
      .catch(handleError);

    const table = resp.tables.find((x) => x.name === 'PrimaryResult');
    if (!table) {
      throw new Error('Cannot find primary result in analytics query response');
    }

    return table.rows.map((row) => {
      const item: { [key: string]: string } = { };
      table.columns.forEach((col, i) => item[col.name] = row[i]);
      if (item.customDimensions) {
        item.customDimensions = JSON.parse(item.customDimensions);
      }
      return item as any as T;
    });
  }

  private request(method: string, path: string) {
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    return request(method, `${URI}/apps/${this.appId}${path}`)
      .set('X-Api-Key', this.key);
  }
}
