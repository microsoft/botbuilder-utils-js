# Application Insights Transcript Store for Microsoft Bot Framework
 
This directory contains sample code that can be used to build a [TranscriptLogger](https://github.com/Microsoft/botbuilder-js/blob/master/libraries/botbuilder-core/src/transcriptLogger.ts) that stores and queries bot transcripts backed by Application Insights.

## Prerequisites

- An [App Insights](https://azuremarketplace.microsoft.com/en-us/marketplace/apps/Microsoft.AppInsights) deployment  
- A NodeJS bot using [Bot Framework v4](https://docs.microsoft.com/en-us/azure/bot-service/?view=azure-bot-service-4.0)

## Install

Because this package is provided as sample code, it is not available on npm and it comes with no guarantee of support or updates. To use this software in your own app:

1. clone this repo
2. `cd botbuilder-utils-js/packages/botbuilder-transcript-app-insights`
3. `npm install`
4. `cd {your-app}`
5. `npm install file:path-to-botbuilder-utils-js/packages/botbuilder-transcript-app-insights`
6. `npm install applicationinsights` (if you don't already have it)

> To support CI and other automation tasks, you may also choose to publish this package on a private npm repo, or simply copy the code/dependencies into your own app.

## Usage

> JavaScript example are shown below, but this package also works great in TypeScript projects.

```JavaScript
const { BotFrameworkAdapter, TranscriptLoggerMiddleware } = require('botbuilder');
const { AppInsightsTranscriptStore } = require('botbuilder-transcript-app-insights');
const { TelemetryClient } = require('applicationinsights'); 

// App Insights configuration
const appInsightsIKey = '<INSTRUMENTATION-KEY>';
const client = new TelemetryClient(appInsightsIKey);

// Attach store to middleware and bot
const store = new AppInsightsTranscriptStore(client);
const logger = new TranscriptLoggerMiddleware(store);
const adapter = new BotFrameworkAdapter({
	appId: process.env.MICROSOFT_APP_ID,
	appPassword: process.env.MICROSOFT_APP_PASSWORD,
}).use(logger);
```

Attaching the middleware to your bot adapter logs every incoming and outgoing Activity between the user and the bot to your App Insights instance.

## API

### AppInsightsTranscriptStore (class)

```TypeScript
constructor(client: TelemetryClient, readOptions?: AppInsightsTranscriptStoreOptions)
```

* `client`: Provide your configured App Insights TelemetryClient instance from the `applicationinsights` package.
* `readOptions` Optional, only needed if you will call the data access functions to retrieve transcripts and activities.
* `readOptions.applicationId` (string): application id for API access
* `readOptions.readKey` (string): API access key with _Read telemetry_ permissions

> Learn how to [get your API key and Application ID](https://dev.applicationinsights.io/documentation/Authorization/API-key-and-App-ID)

This class implements the [TranscriptStore](https://github.com/Microsoft/botbuilder-js/blob/master/libraries/botbuilder-core/src/transcriptLogger.ts#L154-L183) interface, which includes functions to support retrieval of transcripts and activities.

This class does _not_ implement `deleteTranscript()` due to the immutable nature of App Insights records. Calling this function will result in a thrown `Error`.

## Schema

> Learn more about [App Insights Analytics](https://docs.microsoft.com/en-us/azure/application-insights/app-insights-analytics).

Each transcript activity is stored in App Insights as a `customEvent`. Because [customEvent properties](https://docs.microsoft.com/en-us/azure/application-insights/app-insights-api-custom-events-metrics#properties) are always `string` values, activities are stored in a special way:

* All top-level string values of the activity are stored verbatim as filterable properties
* Any non-string values of the activity (arrays, complex objects, number, boolean, Date) are stored as JSON-encoded strings. These property names are prefixed by a `_` character.
* Select nested activity strings are copied to top-level properties so that they can be used in App Insights analytics filters. These property names are prefixed by a `$` character:
	* `$conversationId` <= `activity.conversation.id`
	* `$fromId` <= `activity.from.id`
	* `$recipientId` <= `activity.recipient.id`
	* `$timestamp` <= `activity.timestamp.toISOString()`
	* `$start` (if this is the first activity in the conversation)

> due to concurrency, multiple records belonging to a single conversation may be flagged as `start`, and they should be de-duped in the results by sorting on `timestamp`.

Here are some example properties from a customEvent record:

| Property | Value (string) |
| -------- | -------------- |
| id | `g17a2nle29eg` |
| type | `conversationUpdate` |
| timestamp | `2018-08-29T14:29:13.1450000Z` |
| $conversationId | `06c8jb90efga9` |
| _conversation | `{"id":"06c8jb90efga9"}` |
| $recipientId | `default-bot` |
| $timestamp | `2018-08-29T14:29:13.1450000Z` |
| serviceUrl | `http://localhost:60086` |
| _recipient | `{"id":"default-bot","name":"Bot"}` |
| channelId | `emulator` |
| $fromId | `default-user` |
| $start | `true` |
| _from | `{"id":"default-user","name":"User","role":"user"}` |
| localTimestamp | `2018-08-29T14:29:13.0000000Z` |
| _membersAdded | `[{"id":"default-bot","name":"Bot"}]` |

[Sample queries](./src/index.ts#L38-L50) are available in this package's implementation.
