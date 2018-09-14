# Http Test Recorder for Microsoft Bot Framework

This directory contains sample code that can be used to build an HTTP recording mechanism, so that you can write effective unit tests for your bot. For example, if your bot logic relies on an external HTTP service like QnA Maker, botbuilder-http-test-recorder will help you record real responses during development so that they can be played back during unit testing without needing to make real network calls to external services.

## Prerequisites

- A NodeJS bot using [Bot Framework v4](https://docs.microsoft.com/en-us/azure/bot-service/?view=azure-bot-service-4.0)
- A bot that relies on external HTTP services (support for QnAMaker, LUIS, and Azure Search is provided, but extensions are available to support any service)

## Install

Because this package is supplied as sample code, it is not available on npm and it comes with no guarantee of support or updates. To use this software in your own app:

1. clone this repo
2. `cd botbuilder-utils-js/packages/botbuilder-http-test-recorder`
3. `npm install`
4. `cd {your-app}`
5. `npm install file:path-to-botbuilder-utils-js/packages/botbuilder-http-test-recorder`

> To support CI and other automation tasks, you may also choose to publish this package on a private npm repo, or simply copy the code/dependencies into your own app.

## Usage

> JavaScript examples are shown below, but this package also works great in TypeScript projects.

### Recording HTTP traffic in the bot

```JavaScript
const { BotFrameworkAdapter } = require('botbuilder');
const { HttpTestRecorder } = require('botbuilder-http-test-recorder');

const testRecorder = new HttpTestRecorder()
  .captureLuis()
  .captureAzureSearch(); // some default capturing configurations are provided. for complete control use the optional constructor parameters
const adapter = new BotFrameworkAdapter({
  appId: process.env.MICROSOFT_APP_ID,
  appPassword: process.env.MICROSOFT_APP_PASSWORD,
}).use(testRecorder);
```

When the HttpTestRecorder middleware is attached to your bot it will respond to several chat commands:

* `rec:start`: Begin recording HTTP requests and responses. Only HTTP requests made to a matching host will be recorded.
* `rec:stop[:name]` Stop recording, and give an optional recording name that describes the session. If no name is provided, a timestamp will be used. HTTP sessions are stored to disk (default location is at `./test/data`, relative to the root module).
* `rec:cancel` Stop the recording without storing any requests.

### Playback HTTP responses during unit tests

_This sample uses Mocha and Chai, but any test framework or assertion library will work_

```JavaScript
const { TestAdapter } = require('botbuilder');
const { LuisRecognizer } = require('botbuilder-ai');
const { HttpTestPlayback } = require('botbuilder-http-test-recorder');

describe('My bot', () => {
  it('should ask a question', () => {
    const playback = new HttpTestPlayback();

    // parameters should match the settings used in `textRecorder.captureLuis()`
    const luisRecognizer = new LuisRecognizer({
      applicationId: 'testAppId',
      endpointKey: 'testKey',
    });

    const adapter = new TestAdapter(async (context) => {
      // logic under test goes here
      const results = luisRecognizer.recognize(context);
      lui
      const intent = LuisRecognizer.topIntent(results);
      if (intent === 'None') {
        await context.sendActivity('I do not understand');
      } else {
        await context.sendActivity('OK!');
      }
    });

    // see naming above at rec:stop[:name]
    playback.load('my-stored-http-session');

    // execute the test logic
    await adapter
      .send('hello world')
      .assertReply((resp) => expect(resp.text).to.equal('OK!'));
  });
});
```
Results from luisRecognizer.recognize will reflect the stored LUIS response.
At no point will an actual LUIS endpoint be hit by the TestAdapter

## API

## HttpTestRecorder (class)

_This class implements the [Middleware](https://github.com/Microsoft/botbuilder-js/blob/master/libraries/botbuilder-core/src/middlewareSet.ts#L14-L16) interface._


```TypeScript
constructor(options?: HttpTestRecorderOptions)
```

* `options`: optional configuration parameters
* `options.transformRequest` (`RequestTransformer[]`): stored requests/responses will be passed through these functions. use to remove secrets or change parts of the url or path
* `options.requestFilter` (`RequestFilter[]`): only requests matching all of these filters will be stored

> Learn more about [scope filtering](https://www.npmjs.com/package/nock#scope-filtering)
>
> If you are configuring a new external service, and you're not sure what to use for `requestFilter` or `transformRequest`, reference the implementation of [`configureLuis`](https://github.com/Microsoft/botbuilder-utils-js/blob/docs/readme/packages/botbuilder-http-test-recorder/src/index.ts#L88-L103)

```TypeScript
captureLuis(testRegion = 'westus', testAppId = 'testAppId', testKey = 'testKey'): this
```

_Configure the test recorder to capture LUIS requests_

* `testRegion`: The live HTTP request will be stored as if it hit this region. Your unit tests should be configured to target this region.
* `testKey`: The live HTTP request will be be stored as if this key was used. It should not be a real key, and your unit tests should be configured to use the same value.
* _returns_ the HttpTestRecorder instance

```TypeScript
captureAzureSearch(testService = 'testsearch'): this
```

_Configure the test recorder to capture Azure Search requests_

* `testService`: The live HTTP request will be stored as if it hit this search service. It should not be a real service name, and your unit tests should be configured to use the same value.
* _returns_ the HttpTestRecorder instance

```TypeScript
createPlayback(): HttpTestPlayback
```

_Create a new playback instance to use in unit tests_

* _returns_ a configured `HttpTestPlayback` intance that you can use in your unit tests.

## HttpTestPlayback (class)

_Test utility that will load stored HTTP sessions from disk and intercept subsequent requests._

```TypeScript
constructor(options?: HttpTestFileOptions)
```

* `options`: optional configuration parameters
* `options.testDataDirectory`: path to store captured JSON request/response data (default = `./test/data`, relative to root module). this directory will be created if it does not exist

```TypeScript
load(name: string, disableOutboundHttp = true): Scope[]
```

* `name`: Name of the saved session (see `rec:stop` above)
* `disableOutboundHttp`: prevent any HTTP request that is not defined in the recorded session from completing. An error will be thrown if an unexpected HTTP request is made by your bot.
* _returns_ array of Nock Scope objects

```TypeScript
isDone()
```

_Returns true if all loaded HTTP sessions have been served. You can use this in your `afterEach()` callback to ensure that all expected requests were made by the bot_

## Other Types

```TypeScript
type RequestTransformer = (request: NockDefinition) => NockDefinition;
```
_Transform a request to protect secrets, etc._

```TypeScript
type RequestFilter = (request: NockDefinition) => boolean;
```
_Return true if the given request should stored in the captured HTTP session_

See [Nock package documentation](https://www.npmjs.com/package/nock) for more information about `Scopes` and `NockDefinitions`
