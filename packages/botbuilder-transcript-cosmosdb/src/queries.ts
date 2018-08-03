// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export const LIST_TRANSCRIPT_ACTIVITIES = `
  SELECT *
  FROM c
  WHERE
    c.activity.channelId = @channelId
    AND c.activity.conversation.id = @conversationId
    AND c.activity.timestamp > @startDate
  ORDER BY
    c.activity.timestamp`;

export const LIST_TRANSCRIPTS = `
  SELECT
    c.activity.channelId,
    c.activity.conversation.id,
    c.activity.timestamp as created
  FROM c
  WHERE
    c.activity.channelId = @channelId
    AND c.start
  ORDER BY
    c.activity.timestamp DESC`;

export const FIND_CONVERSATION_START = `
  SELECT TOP 1 c.id
  FROM c
  WHERE
    c.activity.conversation.id = @conversationId
    AND c.activity.channelId = @channelId
    AND c.start
`;
