import { Middleware, TurnContext } from 'botbuilder-core';
import { NockDefinition } from 'nock';

const LUIS_HOST = /^https:\/\/[^.]+\.api\.cognitive\.microsoft\.com:443/;
const LUIS_PATH = /\/luis\/v2.0\/apps\/[^?]+/;
const LUIS_QS_KEY = /subscription-key=[^&]+/;
const AZURE_SEARCH_HOST = /^https:\/\/[^.]+\.search\.windows\.net:443/;
const BING_HOST = /https:\/\/api\.cognitive\.microsoft\.com:443/;

export type RequestTransformer = (request: NockDefinition) => NockDefinition;
export type RequestFilter = (request: NockDefinition) => boolean;

export interface HttpTestRecorderOptions {

  /** stored requests/responses will be passed through these functions. use to remove secrets or change parts of the url or path */
  transformRequest?: RequestTransformer | RequestTransformer[];

  /** only requests matching all of these filter will be stored */
  requestFilter?: RequestFilter | RequestFilter[];
}

export class HttpTestRecorder implements Middleware {
  constructor(private options?: HttpTestRecorderOptions) {
    if (!options) {
      this.options = {};
    }
    if (!this.options.requestFilter) {
      this.options.requestFilter = [];
    } else if (!Array.isArray(this.options.requestFilter)) {
      this.options.requestFilter = [this.options.requestFilter];
    }
    if (!this.options.transformRequest) {
      this.options.transformRequest = [];
    } else if (!Array.isArray(this.options.transformRequest)) {
      this.options.transformRequest = [this.options.transformRequest];
    }
  }
  async onTurn(context: TurnContext, next: () => Promise<void>): Promise<void> {
    return;
  }

  /**
   * Configure the test recorder to capture LUIS requests
   * @param testRegion replace region in captured request with this value
   * @param testKey replace key in captured request query params with this value
   */
  captureLuis(testRegion = 'westus', testAppId = 'testAppId', testKey = 'testKey') {
    if (Array.isArray(this.options.requestFilter)) {
      this.options.requestFilter.push((req) => LUIS_HOST.test(req.scope));
    }
    if (Array.isArray(this.options.transformRequest)) {
      this.options.transformRequest.push((req) => {
        req.path = req.path
          .replace(LUIS_QS_KEY, `subscription-key=${testKey}`)
          .replace(LUIS_PATH, `/luis/v2.0/apps/${testAppId}`);
        req.scope = req.scope
          .replace(LUIS_HOST, `https://${testRegion}.api.cognitive.microsoft.com`);
        return req;
      });
    }
    return this;
  }

  /**
   * Configure the test recorder to capture Azure Search requests
   * @param testService replace search service name in captured request with this value
   */
  captureAzureSearch(testService = 'testsearch') {
    if (Array.isArray(this.options.requestFilter)) {
      this.options.requestFilter.push((req) => AZURE_SEARCH_HOST.test(req.scope));
    }
    if (Array.isArray(this.options.transformRequest)) {
      this.options.transformRequest.push((req) => {
        req.scope = req.scope
          .replace(LUIS_HOST, `https://${testService}.api.cognitive.microsoft.com`);
        return req;
      });
    }

    return this;
  }
}
