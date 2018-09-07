# Botbuilder Feedback Collection Middleware

## Summary

Learn how to quickly add feedback collection into your NodeJS bot.

The Feedback Collection Middleware is a node module for Bot Framework SDK v4 that gives users the ability to provide feedback for the bot responses. For example, they can specify that a particular reply is 'good' or 'bad'. They can also add free-form feedback text if they want. The bot developer also has the ability to customize the interaction, such as specifying the list of feedback options that the user can select.

It does this by creating a `Feedback` bot middleware class that can be registered with the `BotFrameworkAdapter`, giving the bot developer the ability to modify the converation flow. Specifically, when processing the user's activity, the bot developer can decide to add a customizable list of buttons (or CardActions) to the bot's reply back to the user. This feedback is stored in the transcript log and can be analyzed, for example, to improve the bot responses.

The following is the operation supported by the Feedback Collection Middleware:
- `reuestFeedback` - Returns a message that includes feedback prompts in the form of Suggested Actions 

This writeup will show you how you can use this operation using code snippets that you can add to your existing bot.

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

Install the Feedback Collection Middleware node module:

`npm install botbuilder-feedback@preview`

## Usage

Now that you have the node module installed, you can enable feedback collection by adding the following code to your existing bot framework app.

Add this import statement for the Feedback Collection Middleware (some of the optional constructor arguments, described later on, will also require `FeedbackAction` and `Message` from the same package):

```TypeScript
import { Feedback } from 'botbuilder-feedback';
```

Next you will need a `Feedback`. It takes the following as parameters:

- `conversationState` - (ConversationState - required) The instance of ConversationState used by your bot
- `feedbackActions` - (FeedbackAction[] - optional) Custom feedback choices for the user. Default values are: `['👍 good answer', '👎 bad answer']`
- `feedbackResponse` - (Message - optional) Message to show when a user provides some feedback. Default value is `'Thanks for your feedback!'`
- `dismissAction` - (FeedbackAction - optional) Text to show on button that allows user to hide/ignore the feedback request. Default value is `'dismiss'`
- `promptFreeForm` - (boolean | string[] - optional) Optionally enable prompting for free-form comments for all or select feedback choices (free-form prompt is shown after user selects a preset choice)
- `freeFormPrompt` - (Message - optional) - Message to show when `promptFreeForm` is enabled. Default value is `'Please add any additional comments in the chat'`

Next, create a `ConversationState`. For this example we create it using `MemoryStorage`, but for more robust applications you may want a more durable storage such as `TableStorage`. Use this to create a `Feedback` instance.

```TypeScript
const conversationState = new ConversationState(new MemoryStorage());
const feedback = new Feedback({ conversationState });
```

Update your bot adapter to use a Feedback Collection middleware using the store, for example:

```TypeScript
const adapter = new BotFrameworkAdapter({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD,
  }).use(conversationState, feedback);
```

Now you are ready to use it to enable feedback collection, for example:

```TypeScript
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