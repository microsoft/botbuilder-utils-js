# Botbuilder CosmosDB Transcript Store Middleware

## Summary

Learn how to quickly integrate CosmosDB transcript logging into your NodeJS bot.

The CosmosDB Transcript Store is a node module for Bot Framework SDK v4, implementing the TranscriptStore interface. It is designed to be used as middleware to log all transcripts to CosmosDB. It can also be used to list and delete the transcripts in CosmosDB.

The following are the data access operations supported by the CosmosDB Transcript Store:
- `logActivity` - Log an activity to the transcript.
- `listTranscripts` - List conversations in the channelId.
- `getTranscriptActivities` - Get activities for a conversation (Aka the transcript).
- `deleteTranscript` - Delete a specific conversation and all of it's activites.

This writeup will show you how you can use all these operations using code snippets that you can add to your existing bot.

## Prerequisites

- A [CosmosDB](https://docs.microsoft.com/en-us/azure/cosmos-db/introduction) account
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

Install the CosmosDB Transcript Store node module:

```
npm install botbuilder-transcript-cosmosdb
```

Install the DocumentDB node module, if you don't already have it:

```
npm install documentdb
```

## Usage

Now that you have the node modules installed, you can enable CosmosDB transcript logging by adding the following code to your existing bot framework app.

Add this import statement for the CosmosDB Transcript Store:

```TypeScript
import { CosmosDbTranscriptStore} from 'botbuilder-transcript-cosmosdb';
```

Add import statements for the Transcript Logging Middleware and CosmosDB Document Client DB, if you don't already have them. For example:

```TypeScript
import { ActivityTypes, BotFrameworkAdapter, TranscriptLoggerMiddleware } from 'botbuilder';
import { DocumentClient } from 'documentdb';
```

Add the following configuration settings either to your code or a configuration file, making sure to replace YOUR-SERVICE-ENDPOINT and YOUR-MASTER-KEY. For example:

```TypeScript
const serviceEndpoint = '<YOUR-SERVICE-ENDPOINT>';
const masterKey = '<YOUR-MASTER-KEY>';
```

Create a DocumentClient using your configuration settings. This allows the user to configure things like keys, endpoints, and reconnect policies outside of the scope of the transcript store. For example:

```TypeScript
const client = new DocumentClient(serviceEndpoint, {masterKey});
```

### Logging Messages to CosmosDB

Attaching the middleware to your bot adapter logs every incoming and outgoing event between the user and the bot. Events are written to the transcript store by implicitly calling `logActivity`.  

First you will need a `CosmosDBTranscriptStore`. It takes the following as parameters:

- `client` - (DocumentClient - required) User provides an already-configured documentdb instance to the transcript store. 
- `databaseName` - (string - optional) The name of the CosmosDb database where transcripts will be stored (default: botframework).
- `collectionName`- (string - optional) The name of the CosmosDb collection where transcripts will be stored (default: transcripts).
- `throughput` - (number - optional) Mumber of request units (RU) to be assigned to the transcripts collection, if it does not already exist.
- `ttl` - (number - optional) Time-to-live, or the number of seconds that a logged transcript should be kept (default: 0, or does not expire).

Here's an example using the defaults:

```TypeScript
const store = new CosmosDbTranscriptStore(client);
```

Update your bot adapter to use a Transcript Logger middleware using the store, for example:

```TypeScript
const logger = new TranscriptLoggerMiddleware(store);
const adapter = new BotFrameworkAdapter({
   appId: process.env.MICROSOFT_APP_ID,
   appPassword: process.env.MICROSOFT_APP_PASSWORD,
 })
.use(logger);
```

Explicitly calling `logActivity` in your bot code can be achieved as well, for example:  

```TypeScript
store.logActivity(context.activity)
.then((resp) => {
  ...
})
.catch(console.error);
```  

### Listing Conversations in CosmosDB

This middleware also exposes an API, `listTranscripts`, which returns a promise that resolves to a list of all conversation activities for a **channel id** from the CosmosDB transcript store.

It takes the following as parameters:  
- `channelId` - (String - required) Identifier for the channel of interest.

```TypeScript
store.listTranscripts(<channel_id>)
.then((resp) => {
  ...
})
.catch(console.error);
```

### Get Conversation Activities in CosmosDB

This middleware exposes an API, `getTranscriptActivities`, which returns a promise that resolves to all activities of a conversation from the CosmosDB transcript store.

It takes the following as parameters:
- `channelId` - (String - required) Identifier for the channel of interest.  
- `conversationId` - (String - required) Identifier of the conversation of interest.  
- `continuationToken` - (String - Optional) Continuation Token  
- `startDate` - (DateObject - Optional) ISO Date object indicating a start date to scan for conversations from.  

```Typescript
store.getTranscriptActivities(<channel_id>, <conversation_id>)
.then((resp) => {
  ...
})
.catch(console.error);
```

### Delete Conversation in CosmosDB

This middleware exposes an API, `deleteTranscript`, which deletes a specific conversation and all of its activites from the CosmosDB transcript store.

It takes the following as parameters: 
- `channelId` -  (String - required) Identifier for the channel of interest.  
- `conversationId` - (String - required) Identifier of the conversation of interest. 

```TypeScript
store.deleteTranscript(<channel_id>, <conversation_id>)
.then((resp) => {
  ...
})
.catch(console.error); 
```