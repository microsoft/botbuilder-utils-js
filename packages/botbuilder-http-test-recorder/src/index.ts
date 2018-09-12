import { Middleware, TurnContext } from 'botbuilder-core';
import { NockDefinition, recorder } from 'nock';
import * as path from 'path';

import { createDirIfNotExist } from './create-dir-if-not-exist';
import { findRootModuleDir } from './find-root-module-dir';
import { writeFilePromise } from './fs-promise';

const LUIS_HOST = /^https:\/\/[^.]+\.api\.cognitive\.microsoft\.com:443/;
const LUIS_PATH = /\/luis\/v2.0\/apps\/[^?]+/;
const LUIS_QS_KEY = /subscription-key=[^&]+/;
const AZURE_SEARCH_HOST = /^https:\/\/[^.]+\.search\.windows\.net:443/;
const SESSION_NAME = /rec:(?:end|stop):(.+)/;

export type RequestTransformer = (request: NockDefinition) => NockDefinition;
export type RequestFilter = (request: NockDefinition) => boolean;

export interface HttpTestRecorderOptions {

  /** stored requests/responses will be passed through these functions. use to remove secrets or change parts of the url or path */
  transformRequest?: RequestTransformer[];

  /** only requests matching all of these filter will be stored */
  requestFilter?: RequestFilter[];

  /** path to store captured JSON request/response data (default = `./test/data`, relative to root package.json). this directory will be created if it does not exist */
  testDataDirectory?: string;
}

export class HttpTestRecorder implements Middleware {
  private dirChecked = false;

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

    if (!this.options.testDataDirectory) {
      this.options.testDataDirectory = path.join(findRootModuleDir(), 'test', 'data');
    }
  }
  async onTurn(context: TurnContext, next: () => Promise<void>): Promise<void> {

    // extract optional session name from the end directive
    const sessionName = this.extractSessionName(context);

    // look for recording directives
    switch (context.activity.text) {
      case 'rec:start':
        return this.startRecording(context);
      case 'rec:clear':
      case 'rec:reset':
        return this.clearRecording(context);
      case 'rec:stop':
      case 'rec:end':
        return this.stopRecording(context, sessionName);

      default:
        return next();
    }
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
          .replace(LUIS_HOST, `https://${testRegion}.api.cognitive.microsoft.com:443`);
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
          .replace(AZURE_SEARCH_HOST, `https://${testService}.search.windows.net:443`);
        return req;
      });
    }

    return this;
  }

  private extractSessionName(context: TurnContext) {
    const matchedName = SESSION_NAME.exec(context.activity.text);
    const sessionName = matchedName
      ? matchedName[1].replace(/[^\w-.]/g, '_')
      : null;
    context.activity.text = sessionName ? 'rec:end' : context.activity.text;
    return sessionName;
  }

  private async startRecording(context: TurnContext): Promise<void> {
    try {
      recorder.rec({
        dont_print: true,
        output_objects: true,
      });
      await context.sendActivity(`⏺️ HTTP recording has started`);
      await context.sendActivity(`⏺️ ${this.options.requestFilter.length} filter(s) are in use.`);
      await context.sendActivity('⏺️ Say `rec:stop` or `rec:stop:mySessionName` to stop recording and write requests and responses. Say `rec:clear` to clear the recorder.');
    } catch (err) {
      await context.sendActivity(`**ERROR**: ${err.message}`);
      console.error(err);
    }
  }

  private async clearRecording(context: TurnContext): Promise<void> {
    try {
      recorder.clear();
      await context.sendActivity('Recording has stopped');
    } catch (err) {
      await context.sendActivity(`**ERROR**: ${err.message}`);
      console.error(err);
    }
  }

  private async stopRecording(context: TurnContext, name?: string) {

    try {
      name = name || new Date().toISOString().replace(/[:-]/g, '_');
      const filePath = path.join(this.options.testDataDirectory, `${name}.json`);
      const requests = (recorder.play() as NockDefinition[])
        .filter((req) => this.options.requestFilter.every((filter) => filter(req)))
        .map((req) => this.options.transformRequest.reduce((m, xform) => xform(m), req));
      recorder.clear();

      await createDirIfNotExist(this.options.testDataDirectory);
      await writeFilePromise(filePath, JSON.stringify(requests, null, 2));
      await context.sendActivity(`⏺️ HTTP recording has stopped.`);
      await context.sendActivity(`⏺️ Requests and responses were written to \`${filePath}\`.`);
    } catch (err) {
      await context.sendActivity(`**ERROR**: ${err.message}`);
      console.error(err);
    }
  }
}
