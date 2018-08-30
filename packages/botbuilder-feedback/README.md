# Botbuilder Feedback-Collection Middleware


## Install
> This package is currently published to a private npm repo at https://msdata.pkgs.visualstudio.com/_packaging/botbuilder-utils/npm/registry/
>
> For access, please contact chstone.

`npm i botbuilder@4.0.0-aicat1.2 botbuilder-feedback`

## Usage

```TypeScript
import { BotFrameworkAdapter, ConversationState, MemoryStorage } from 'botbuilder';
import { Feedback } from 'botbuilder-feedback';

const conversationState = new ConversationState(new MemoryStorage());
const feedback = new Feedback({ conversationState }); // customization available here
const adapter = new BotFrameworkAdapter({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD,
  }).use(conversationState, feedback);

const logic = (context: TurnContext) => {
  if (context.activity.text === 'what?') {

    // bot will show text with 2 suggested action buttons (good answer / bad answer)
    // if user clicks a button, the response is captured as a trace activity, along with original question and original bot response.
    // if user does not click a button, normal bot processing occurs
    const message = Feedback.requestFeedback(context, 'the answer is FOO');
    await context.sendActivity(message);
  } else {
    await context.sendActivity(`You said '${context.activity.text}`);
  }
};
```