# Botbuilder Transcript Store for App Insights


## Install
> This package is currently published to a private npm repo at https://msdata.pkgs.visualstudio.com/_packaging/botbuilder-utils/npm/registry/
>
> For access, please contact chstone.

`npm i botbuilder@4.0.0-aicat1.2 botbuilder-transcript-app-insights applicationinsights`

## Usage

```TypeScript
import { BotFrameworkAdapter, TranscriptLoggerMiddleware } from 'botbuilder';
import { TelemetryClient } from 'applicationinsights';
import { AppInsightsTranscriptStore } from 'botbuilder-transcript-app-insights';

const appInsights = new TelemetryClient(process.env.APP_INSIGHTS_IKEY);
const logstore = new AppInsightsTranscriptStore(appInsights, {
  applicationId: process.env.APP_INSIGHTS_APP_ID,
  readKey: process.env.APP_INSIGHTS_API_KEY,
});
const logger = new TranscriptLoggerMiddleware(logstore);
const adapter = new BotFrameworkAdapter({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD,
  }).use(logger);

// attach adapter to web server normally
```
