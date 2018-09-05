# Botbuilder Transcript Store for CosmosDB

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

Now that you have the node modules installed, let's see some code snippets that you could use in your bot.

### Logging Messages to CosmosDB

First let's see how to enable CosmosDB transcript logging in your existing bot. Note that the Transcript Logging middleware calls the **logActivity** method of the CosmosDB Transcript Store to write to CosmosDB.

Add an import statement for the CosmosDB Transcript Store. Also add import statements for the Transcript Logging Middleware and CosmosDB Document Client DB, if you don't already have them. For example:

```TypeScript
import { ActivityTypes, BotFrameworkAdapter, TranscriptLoggerMiddleware } from 'botbuilder';
import { CosmosDbTranscriptStore} from 'botbuilder-transcript-cosmosdb';
import { DocumentClient } from 'documentdb';
```

Set the service endpoint and key for your CosmosDB account in your code or a configuration file. For example, you could add this to your code, making sure to update with the settings from your account:

```TypeScript
const serviceEndpoint = '<YOUR-SERVICE-ENDPOINT>';
const masterKey = '<YOUR-MASTER-KEY>';
```

Create a DocumentClient for your CosmosDB account, and use it to create a CosmosDB Transcript Store. Lastly, update your bot adapter to use a Transcript Logger middleware using the store, for example:

```TypeScript
const client = new DocumentClient(serviceEndpoint, {masterKey});
const store = new CosmosDbTranscriptStore(client);
const logger = new TranscriptLoggerMiddleware(store);
const adapter = new BotFrameworkAdapter({
   appId: process.env.MICROSOFT_APP_ID,
   appPassword: process.env.MICROSOFT_APP_PASSWORD,
 })
.use(logger);
```

### Listing Converstations in CosmosDB

Next let's see how to list conversations in CosmosDB using the **listTranscripts** method of the CosmosDB Transcript Store.

### Get Conversation Activities in CosmosDB

Next let's see how to get conversations activities in CosmosDB using the **getTranscriptActivities** method of the CosmosDB Transcript Store.

### Delete Conversation in CosmosDB

Finally let's see how to delete conversations in CosmosDB using the **deleteTranscript** method of the CosmosDB Transcript Store.