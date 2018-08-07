// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Activity } from 'botframework-schema';
import { SinonStub, stub } from 'sinon';

export const CHANNEL_ID = 'foo';
export const CONVERSATION_ID = 'bar';
export const FROM_ID = 'from.id';
export const RECIPIENT_ID = 'recipient.id';
export const TIMESTAMP = new Date();

export interface MockTelemetryClient {
  trackEvent: SinonStub;
}

export interface MockEventClient {
  customEvents: SinonStub;
}

export function createMockTelemetryClient(): MockTelemetryClient {
  return {
    trackEvent: stub(),
  };
}

export function createMockAppInsightsEventClient(): MockEventClient {
  return {
    customEvents: stub().resolves(customEvents([])),
  };
}

export function customEvents(events: any[]) {
  return {
    values: events,
    count: events.length,
  };
}

export const createActivity = (channelId = CHANNEL_ID, conversationId = CONVERSATION_ID) => ({
  channelId,
  timestamp: TIMESTAMP,
  conversation: { id: conversationId },
  from: { id: FROM_ID },
  recipient: { id: RECIPIENT_ID },
}) as any as Activity;

export const createStoredActivity = (start = false, channelId = CHANNEL_ID, conversationId = CONVERSATION_ID) => ({
  $conversationId: conversationId,
  $fromId: FROM_ID,
  $recipientId: RECIPIENT_ID,
  $timestamp: TIMESTAMP.toISOString(),
  $start: start.toString(),
  channelId,
  _conversation: JSON.stringify({ id: conversationId }),
  _from: JSON.stringify({ id: FROM_ID }),
  _recipient: JSON.stringify({ id: RECIPIENT_ID }),
  _timestamp: JSON.stringify(TIMESTAMP),
});
