// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// @ts-check

const { ActivityHandler, MessageFactory } = require('botbuilder');
const smat_constants = require("./constants.js");
let { previous_question, deleteSession, refresh_chat, smatbot_api_started, smatbot_facebook_automation,handle_incomingmessages } = require("./chatbot-configuration/bot-apis.js");

let chatbot_id = 3628
let sender_id = "459093420351638";
let get_language_code = "default"

class EchoBot extends ActivityHandler {
    constructor() {
        super();
        // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
        this.onMessage(async (context, next) => {

            console.log("context activity text when user messages ", context.activity);
            console.log("activity text when user messages ", context.activity.text,);

            let answer_text = null;
            answer_text = context.activity.text || context.activity.value
            let prev_response = await previous_question(chatbot_id, sender_id);
            console.log("response from prev response ", prev_response);


            if (answer_text && (answer_text == "menu" || answer_text == "hi")) {

                let dec_session_id = await deleteSession(prev_response["cb_session"]);
                await refresh_chat(chatbot_id, sender_id, prev_response["cb_session"]);

                let smatbot_api_resp = await smatbot_api_started(chatbot_id, sender_id, answer_text, "default");
                console.log("response from smatbot_api======>" + JSON.stringify(smatbot_api_resp));

                if (smatbot_api_resp["init_question"] && smatbot_api_resp["init_question"][0]) {
                    smatbot_api_resp["init_question"][0]["cb_session"] = smatbot_api_resp["cb_session"];
                }
                await smatbot_facebook_automation(sender_id, smatbot_api_resp["init_question"][0], chatbot_id, "menu", context);
            }
            else {

                await handle_incomingmessages(context,prev_response,sender_id,chatbot_id,get_language_code );

            }


            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });

        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded ?? [];
            const welcomeText = 'Hello and welcome!';
            for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {
                    await context.sendActivity(MessageFactory.text(welcomeText, welcomeText));
                }
            }
            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
    }
}


module.exports.EchoBot = EchoBot;
