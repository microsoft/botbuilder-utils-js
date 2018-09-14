# Cosmos DB Transcript Store for Microsoft Bot Framework

This directory contains sample code that can be used to build a [TranscriptLogger](https://github.com/Microsoft/botbuilder-js/blob/master/libraries/botbuilder-core/src/transcriptLogger.ts) that stores and queries bot transcripts backed by Cosmos DB SQL.

## Prerequisites

- A [Cosmos DB](https://docs.microsoft.com/en-us/azure/cosmos-db/introduction) service using the SQL API
- A NodeJS bot using [Bot Framework v4](https://docs.microsoft.com/en-us/azure/bot-service/?view=azure-bot-service-4.0)

## Install

Because this package is provided as sample code, it is not available on npm and it comes with no guarantee of support or updates. To use this software in your own app:

1. clone this repo
2. `cd botbuilder-utils-js/packages/botbuilder-transcript-cosmosdb`
3. `npm install`
4. `cd {your-app}`
5. `npm install file:path-to-botbuilder-utils-js/packages/botbuilder-transcript-cosmosdb`
6. `npm install documentdb` (if you don't already have it)

> To support CI and other automation tasks, you may also choose to publish this package on a private npm repo, or simply copy the code/dependencies into your own app.

## Usage

> JavaScript example is shown below, but this package also works great in TypeScript projects.

```JavaScript
const { CosmosDbTranscriptStore } = require('botbuilder-transcript-cosmosdb');
const { BotFrameworkAdapter, TranscriptLoggerMiddleware } = require('botbuilder');
const { DocumentClient } = require('documentdb');

// Cosmos DB configuration
const serviceEndpoint = '<YOUR-SERVICE-ENDPOINT>';
const masterKey = '<YOUR-MASTER-KEY>';
const client = new DocumentClient(serviceEndpoint, { masterKey });

// Attach store to middleware and bot
const store = new CosmosDbTranscriptStore(client);
const logger = new TranscriptLoggerMiddleware(store);
const adapter = new BotFrameworkAdapter({
	appId: process.env.MICROSOFT_APP_ID,
	appPassword: process.env.MICROSOFT_APP_PASSWORD,
}).use(logger);
```

Attaching the middleware to your bot adapter logs every incoming and outgoing Activity between the user and the bot to your Cosmos DB instance. The default database and collection names are `botframework` and `transcripts`, respectively.

## API

### CosmosDbTranscriptStore (class)

```TypeScript
constructor(client: DocumentClient, options?: CosmosDbTranscriptStoreOptions)
```

* `client`: Provide your configured `DocumentClient` instance from the `documentdb` package.
* `options.databaseName` (string): Database name (default: 'botframework'; created if it does not exist)
* `options.collectionName` (string): Collection name (default: 'transcripts'; created if it does not exist)
* `options.onCreateCollection.throughput` (number): Throughput for created collections (default: 1000)
* `options.onCreateCollection.ttl` (number): Time-to-live for created collections (default: none)

This class implements the [TranscriptStore](https://github.com/Microsoft/botbuilder-js/blob/master/libraries/botbuilder-core/src/transcriptLogger.ts#L154-L183) interface, which includes functions to support retrieval of transcripts and activities.

## Schema

> This section describes techniques for querying the data directly, instead of using the supported [TranscriptStore](https://github.com/Microsoft/botbuilder-js/blob/master/libraries/botbuilder-core/src/transcriptLogger.ts#L154-L183) APIs.

Before analyzing the stored transcript logs, it is important to understand the schema of the stored documents. Each document contains an `activity`, property, and an optional `start` property. Other properties like `id` and anything starting with `_` are [managed by Cosmos DB]((https://docs.microsoft.com/en-us/azure/cosmos-db/sql-api-resources#system-vs-user-defined-resources)).

The `activity` property stores the full payload processed by the bot, and aheres to the [Bot Framework Activity Schema](https://github.com/Microsoft/BotBuilder/blob/hub/specs/transcript/transcript.md). 

The `start` property is boolean flag indicating whether the corresponding Activty was the first activity in its conversation (due to concurrency, multiple documents in a conversation may be flagged as the start, and they should be de-duped in the results by sorting on `activity.timestamp`).

Here is an example document:

```JSON
{
	"activity": {
		"type": "conversationUpdate",
		"membersAdded": [
			{
				"id": "default-bot",
				"name": "Bot"
			}
		],
		"id": "9b7jb8lf4258",
		"channelId": "emulator",
		"timestamp": "2018-09-05T15:35:14.627Z",
		"localTimestamp": "2018-09-05T11:35:14-04:00",
		"recipient": {
			"id": "default-bot",
			"name": "Bot"
		},
		"conversation": {
			"id": "a2gigibf515i"
		},
		"from": {
			"id": "default-user",
			"name": "User",
			"role": "user"
		},
		"serviceUrl": "http://localhost:59426"
	},
	"start": true,
	"id": "beca96ae-8101-6bd6-8d27-349a2844e581",
	"_rid": "VOgVAP9F8HMDAAAAAAAAAA==",
	"_self": "dbs/VOgVAA==/colls/VOgVAP9F8HM=/docs/VOgVAP9F8HMDAAAAAAAAAA==/",
	"_etag": "\"0000d868-0000-0000-0000-5b8ff7b30000\"",
	"_attachments": "attachments/",
	"_ts": 1536161715
}
```