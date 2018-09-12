import { ActivityTypes, ConversationState, MemoryStorage, TestAdapter } from 'botbuilder-core';
import { expect } from 'chai';

import { Feedback, FeedbackOptions, FeedbackRecord } from '../src';

const DEFAULT_OPTIONS: Partial<FeedbackOptions> = {
  feedbackActions: ['👍 good answer', '👎 bad answer'],
  feedbackResponse: 'Thanks for your feedback!',
  dismissAction: 'dismiss',
  promptFreeForm: false,
  freeFormPrompt: 'Please add any additional comments in the chat',
};

describe('Feedback Middleware', () => {
  let convState: ConversationState;
  let options: FeedbackOptions;

  beforeEach(() => {
    convState = new ConversationState(new MemoryStorage());
    options = Object.assign({}, DEFAULT_OPTIONS, { conversationState: null });
  });

  it('should set default options', () => {
    new Feedback(options);
    [
      options.feedbackActions,
      options.feedbackResponse,
      options.dismissAction,
      options.promptFreeForm,
      options.freeFormPrompt,
    ].forEach((x) => expect(x).to.not.be.undefined);
  });

  it('should pass through non-feedback', async () => {
    const adapter = new TestAdapter(async (context) => {
        await context.sendActivity('bot response');
      })
      .use(convState, new Feedback(options));

    await adapter
      .send('hello world')
      .assertReply((resp) => {
        expect(resp.text).to.equal('bot response');
      });
  });

  it('should write feedback choices onto response activity', async () => {
    const adapter = new TestAdapter(async (context) => {
        const resp = Feedback.requestFeedback(context, 'the answer is 123');
        const state = convState.get(context);
        expect(resp.suggestedActions.actions.length).to.equal(2);
        expect(state.feedback).to.not.be.undefined;
        await context.sendActivity(resp);
      })
      .use(convState, new Feedback(options));

    await adapter
      .send('what is 100 + 20 + 3?')
      .assertReply((resp) => {
        expect(resp.text).to.equal('the answer is 123');
        expect(resp.suggestedActions.actions.length).to.equal(options.feedbackActions.length);
      });
  });

  it('should send feedback trace activity', async () => {
    const adapter = new TestAdapter(async () => {
        expect.fail();
      })
      .use(convState)
      .use((context, next) => {
        const feedback: FeedbackRecord = {
          type: 'test',
          request: { type: 'message', text: 'foo' },
          response: 'bar',
          feedback: null,
          comments: null,
        };
        convState.get(context).feedback = feedback;
        return next();
      })
      .use(new Feedback(options));

    await adapter
      .send(options.feedbackActions[0])
      .assertReply((resp) => {
        expect(resp.text).to.equal(options.feedbackResponse);
      })
      .assertReply((resp) => {
        expect(resp.type).to.equal(ActivityTypes.Trace);
      });
  });
});
