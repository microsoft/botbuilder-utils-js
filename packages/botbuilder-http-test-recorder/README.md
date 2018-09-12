# Http Test Recorder

## Install

> This package uses a private npm repo. For access, please contact chstone.
>
> https://msdata.pkgs.visualstudio.com/_packaging/botbuilder-utils/npm/registry/

```
npm install botbuilder-http-test-recorder
```

## Usage

### Recording HTTP traffic in the bot

```TypeScript
import { BotFrameworkAdapter } from 'botbuilder';
import { HttpTestRecorder } from 'botbuilder-http-test-recorder';

const testRecorder = new HttpTestRecorder()
  .captureLuis()
  .captureAzureSearch(); // default capturing is provided. for complete control use the optional constructor parameters
const adapter = new BotFrameworkAdapter({
  appId: process.env.MICROSOFT_APP_ID,
  appPassword: process.env.MICROSOFT_APP_PASSWORD,
}).use(testRecorder);
```

When the HttpTestRecorder middleware is attached to your bot it will respond to several chat commands:

* `rec:start`: Begin recording HTTP requests and responses. Only HTTP requests made to a matching host will be recorded.
* `rec:stop[:name]` Stop recording, and give an optional recording name that describes the session. If no name is provided, a timestamp will be used. HTTP sessions are stored to disk (default location is at `./test/data`, relative to the root module).
* `rec:cancel` Stop the recording without storing any requests.

### Playback HTTP responses during test

_This sample uses Mocha and Chai, but any test framework or assertion library will work_

```TypeScript
import { TestAdapter } from 'botbuilder';
import { LuisRecognizer } from 'botbuilder-ai';
import { HttpTestPlayback } from 'botbuilder-http-test-recorder';

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