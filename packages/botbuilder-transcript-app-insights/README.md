# Botbuilder Transcript Store for Application Insights 
 
Learn how to quickly integrate an Azure Application Insights (App Insights) transcript logging into your NodeJS bot. 

## Summary
The App Insights Transcript Store is a node module for Bot Framework SDK v4, implementing the [TranscriptStore](https://docs.microsoft.com/en-us/javascript/api/botbuilder-core-extensions/transcriptstore) interface. It is designed to be used as [middleware](https://docs.microsoft.com/en-us/azure/bot-service/bot-builder-concept-middleware?view=azure-bot-service-4.0) to log all transcripts to App Insights. The middleware exposes reading and writing abilities on directly from your bot to the transcript store.  

Let's begin by defining a few terms you should familiarize yourself with:

> [`activity`](https://docs.microsoft.com/en-us/azure/bot-service/bot-builder-concept-activity-processing?view=azure-bot-service-4.0) - A single message sent between the user and the bot.

> [`conversation`](https://docs.microsoft.com/en-us/azure/bot-service/bot-builder-conversations?view=azure-bot-service-4.0) - A group of activities between the user and the bot with a defined start and stop date. Typically a conversation starts with an initial message from the user.

> [`transcript`](https://github.com/Microsoft/BotBuilder/blob/hub/specs/transcript/transcript.md) - A collection of activities and corresponding processing artifacts (such as calls to external APIs such as LUIS, QnA Maker, or AzureSearch) in a defined schema. Transcripts can be stored for subsequent analysis.

> [`channel`](https://docs.microsoft.com/en-us/azure/bot-service/bot-concepts?view=azure-bot-service-4.0) - The communication service being used for your bot, such as Cortana, Skype, Web Chat, Facebook Messenger, Kik, and Slack.


The following are the data operations supported by the App Insights Transcript Store:
- `getTranscriptActivities` - Get activities for a conversation from the transcript.
- `listTranscripts` - List conversations in the channelId.
- `logActivity` - Log an activity to the transcript.  
- `deleteTranscript` - Delete transcipt activities.  

> **NOTE**: Make sure to select a **NodeJS app** when creating your App Insights resource on Azure.  

## Prerequisites

- An [App Insights](https://azuremarketplace.microsoft.com/en-us/marketplace/apps/Microsoft.AppInsights) deployment  
- An existing NodeJS bot, using the [Bot Framework SDK v4](https://dev.botframework.com/)  

## Install

> This project uses a private npm repo. For access, please contact chstone.
>
> Create a file called **.npmrc** in your project root directory and add the following to it:
>
> ```
> registry=https://msdata.pkgs.visualstudio.com/_packaging/botbuilder-utils/npm/registry/
> always-auth=true
> ```
>
> Run the following in your project root directory: `vsts-npm-auth -config .npmrc`.
>
> If you do not have `vsts-npm-auth`, you can install it with: `npm install -g vsts-npm-auth --registry https://registry.npmjs.com --always-auth false`

Install the App Insights Transcript Store node module:

```Javascript 
npm install botbuilder-transcript-app-insights
```

Install the App Insights node module, if you don't already have it:

```Javascript
npm install applicationinsights
```

## Usage

Now that you have the node modules installed, you can enable App Insights transcript logging by adding the following code to your existing bot framework app.

First, add this import statement for the App Insights Transcript Store:

```TypeScript
import { AppInsightsTranscriptStore } from 'botbuilder-transcript-app-insights';
```

Next, import the App Insights `TelemetryClient`:

```TypeScript
import { TelemetryClient } from 'applicationinsights'; 
```

Add the following configuration settings either to your code or a configuration file, making sure to replace APPLICATION-ID, INSTRUMENTATION-KEY and API-KEY:

```TypeScript
const appInsightsIKey = '<INSTRUMENTATION-KEY>';
const appInsightsId = '<APPLICATION-ID>';
const appInsightsApiKey = '<API-KEY>'
```

### Logging Messages to App Insights
Attaching the middleware to your bot adapter logs every incoming and outgoing events between the user and the bot. Events are written to the transcript Store by implicitly calling the `logActivity`.  


Add the logging middleware to your adapter, for example:

```TypeScript
const client = new TelemetryClient(appInsightsIKey);
const loggerStore = new AppInsightsTranscriptStore(client, { applicationId: appInsightsId });
const logger = new TranscriptLoggerMiddleware(loggerStore);
const adapter = new BotFrameworkAdapter({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD,
});
adapter.use(logger);
```   

Explicitly calling `logActivity` in your bot code can be achieved as follows:  

```TypeScript
loggerStore.logActivity(context.activity)
.then((resp) => {
  ...
})
.catch(console.error);
```  

### Get Conversation Activities in App Insights
This middleware exposes an API, `getTranscriptActivities`, which returns a promise that resolves to all activities of a conversation from the app insights transcript store.  

It takes the following as parameters:  
- `channelId` -  (String - required) Identifier for the channel of interest.  
- `conversationId` - (String - required)Identifier of the conversation of interest.  
- `continuationToken` - (String - Optional) Continuation Token  
- `startDate` - (DateObject - Optional) ISO Date object indicating a start date to scan for conversations from.  

```Typescript
loggerStore.getTranscriptActivities(<channel_id>, <conversation_id>)
.then((resp) => {
  ...
})
.catch(console.error);
```  
### Listing Converstations in App Insights

This middleware also exposes another API, `listTranscripts`, which returns a promise that resolves to a list of all conversationsall activities of a **channel id** from the app insights transcript store.  

It takes the following as parameters:  
- `channelId` -  (String - required) Identifier for the channel of interest.  

```TypeScript
loggerStore.listTranscripts(<channel_id>)
.then((resp) => {
  ...
})
.catch(console.error);
```


### Delete Conversation in App Insights
As this transcript store implements a Middleware, `deleteTranscript` API is intended to delete a specific conversation and all of it's activites. However, App Insights events are immutable so this API is a no-op.   

It takes the following as parameters:  
- `channelId` -  (String - required) Identifier for the channel of interest.  
- `conversationId` - (String - required)Identifier of the conversation of interest. 

```TypeScript
loggerStore.deleteTranscript(<channel_id>, <conversation_id>)
.then((resp) => {
  ...
})
.catch(console.error); 
```

