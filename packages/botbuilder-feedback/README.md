# Botbuilder Feedback Collection Middleware

## Summary

Learn how to quickly add feedback collection into your NodeJS bot.

The Feedback Collection Middleware is a node module for Bot Framework SDK v4 that gives users the ability to provide feedback for the bot responses. For example, they can specify that a particular reply is 'good' or 'bad'. They can also add free-form feedback text if they want. The bot developer also has the ability to customize the interaction, such as specifying the list of feedback options that the user can select.

<<Screenshot>>

It does this by creating a `Feedback` bot middleware class that can be registered with the `BotFrameworkAdapter`, giving the bot developer the ability to modify the converation flow. Specifically, when processing the user's activity, the bot developer can decide to add a customizable list of buttons (or CardActions) to the bot's reply back to the user. This feedback is stored in the transcript log and can be analyzed, for example, to improve the bot responses.

The following is the operation supported by the Feedback Collection Middleware:
- `requestFeedback` - Returns a message that includes feedback prompts in the form of Suggested Actions.

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

You will need a `ConversationState`, if you don't already have one. For this example we create it using `MemoryStorage`, but for more robust applications you may want a more durable storage such as `TableStorage`:

```TypeScript
const conversationState = new ConversationState(new MemoryStorage());
```

Next you will need a `Feedback` instance. It takes the following as parameters:

- `conversationState` - (ConversationState - required) The instance of ConversationState used by your bot
- `feedbackActions` - (FeedbackAction[] - optional) Custom feedback choices for the user. Default values are: `['👍 good answer', '👎 bad answer']`
- `feedbackResponse` - (Message - optional) Message to show when a user provides some feedback. Default value is `'Thanks for your feedback!'`
- `dismissAction` - (FeedbackAction - optional) Text to show on button that allows user to hide/ignore the feedback request. Default value is `'dismiss'`
- `promptFreeForm` - (boolean | string[] - optional) Optionally enable prompting for free-form comments for all or select feedback choices (free-form prompt is shown after user selects a preset choice)
- `freeFormPrompt` - (Message - optional) - Message to show when `promptFreeForm` is enabled. Default value is `'Please add any additional comments in the chat'`

Here's an example using the defaults:

```TypeScript
const feedback = new Feedback({ conversationState });
```

Update your bot adapter to use feedback, for example:

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

## Customize

Now that you have the basics working, let's see how to customize `Feedback`. Let's do this by taking another look at each of the optional constructor parameters.

As you go through the various examples, note that you can construct `Feedback` with zero or more of these optional parameters. Here's an example using all of them (note that `conversationState` is required):

```TypeScript
const feedback = new Feedback({ conversationState, feedbackActions, feedbackResponse, dismissAction, promptFreeForm, freeFormPrompt });
```

### feedbackActions

By setting this you can control the feedback choices for the user. The default values are: `['👍 good answer', '👎 bad answer']`. The data type is a `FeedbackAction` array, where `FeedbackAction` can either be a `string` or a `CardAction`.

For a string array, here are some examples:

```TypeScript
const feedbackActions: FeedbackAction[] = ['✔ Correct', '✖ Incorrect'];
const feedbackActions: FeedbackAction[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
const feedbackActions: FeedbackAction[] = ['Not at all helpful', 'Slightly helpful', 'Somewhat helpful', 'Very helpful', 'Extremely helpful'];
const feedbackActions: FeedbackAction[] = ['Strongly disagree', 'Somewhat disagree', 'Somewhat agree', 'Strongly agree'];
```

For a CardAction array, here is an example:

```TypeScript
const feedbackActions: FeedbackAction[] = [
    { title: "😩 Poor", type: ActionTypes.ImBack, value: "😩 Poor" },
    { title: "😟 Fair", type: ActionTypes.ImBack, value: "😟 Fair" },
    { title: "😐 Good", type: ActionTypes.ImBack, value: "😐 Good" },
    { title: "😊 Very Good", type: ActionTypes.ImBack, value: "😊 Very Good" },
    { title: "😄 Excellent", type: ActionTypes.ImBack, value: "😄 Excellent" },
];
```

### feedbackResponse

By setting this you can control the message that appears when a user provides some feedback. The default value is `'Thanks for your feedback!'`. The data type is a `Message`, where `Message` can either be a single `string` or a text `string` and a speak `string` (the speak `string` can be spoken if the channel supports it).

Here are some examples:

```TypeScript
const feedbackResponse: Message = 'Thanks a million!';
const feedbackResponse: Message = {text: 'Thanks a million!', speak: 'Thanks a <emphasis level=\"moderate\">million</emphasis>!' };
```

### dismissAction

By setting this you can control the text to show on the button that allows users to hide/ignore the feedback request. The default value is `'dismiss'`. The data type is a `FeedbackAction`, where `FeedbackAction` can either be a `string` or a `CardAction`.

For a string, here is an example:

```TypeScript
const dismissAction: FeedbackAction = "ignore!!!";
```

### promptFreeForm

By setting this you can control whether or not free-form comments are allowed for all or select feedback choices (free-form prompt is shown after user selects a preset choice). The default value is false. The data type as `boolean` or a `string` array (used to specify for which choices to allow free-form feedback).

For a boolean, here is an example:

```TypeScript
const promptFreeForm: boolean = true;
```

For a string array, here is an example (free-form prompt is shown for this particular selection):

```TypeScript
const promptFreeForm: string[] = ['Strongly disagree'];
```

### freeFormPrompt

By setting this you can control the message to show when `promptFreeForm` is enabled. The default value is `'Please add any additional comments in the chat'`.  The data type is a `Message`, where `Message` can either be a single `string` or a text `string` and a speak `string` (the speak `string` can be spoken if the channel supports it).

Here is an example:

```TypeScript
const freeFormPrompt: Message = 'You strongly disagree? Please provide additional feedback';
```