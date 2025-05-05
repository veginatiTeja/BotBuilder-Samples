
const smat_constants = require("../constants.js");
let moment = require("moment-timezone");
let request = require("request");
const { ActivityHandler, MessageFactory, CardFactory } = require('botbuilder');
const { language_codes, obj_lang } = require("../teams_utils/multi_lang_codes.json");
const { sendMessage, remove_tags } = require("../teams_utils/teams_custom_Funs.js");
const multi_lang = require('../teams_utils/errorTextLanguages.js');
const { is_valid_url, isValidEmailIs } = require('./bot_funs.js')


async function previous_question(chatbot_id, sender_id, instagram_business_id) {

  //   let get_language_code, user_get_language_code;
  //   if (instagram_business_id != null) {
  //     get_language_code = await readCache(`${instagram_business_id}_${sender_id}`, 'language_code');

  //   }

  //   console.log("user get language code =========>" + JSON.stringify(user_get_language_code) + "get language code " + JSON.stringify(get_language_code));

  //   if (get_language_code == null || get_language_code == undefined || get_language_code == 'default') {
  //     get_language_code = await default_language(chatbot_id);

  //   }
  //   console.log("==============>langauge code previous question================> " + JSON.stringify(get_language_code));
  let options = {
    method: "POST",
    url: "" + smat_constants.previous_question,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    form: {
      action: "init_chat",
      device_print: sender_id,
      chatbot_id: chatbot_id,
      need_session: 1,
      channel: "instagram",
      language_code: "default"
    },
  };

  //   user_get_language_code = await default_language(chatbot_id);


  //   if (user_get_language_code == get_language_code) {
  //     options.form.language_code = "default"
  //   }


  console.log("previous question params is " + JSON.stringify(options));

  let resp = await sendMessage(options);
  console.log("resp of previous queston" + JSON.stringify(resp))
  try {
    resp = JSON.parse(resp);
  } catch { }
  return resp;
}

async function deleteSession(session_id) {
  let options = {
    url: "" + smat_constants.deleteSession,
    qs: {
      cb_session: session_id,
    },
    method: "GET",
  };
  let response = await sendMessage(options);
  console.log("response in deleteSession===========>" + JSON.stringify(response) + "typeof " + JSON.stringify(typeof response));
  try {
    if (response instanceof Error) return response;
    if (response) {
      response = JSON.parse(response);
      console.log("response from deleteSession===================>" + JSON.stringify(response));
      //   let delete_session = await delAsync(
      //     "check_Counter_prod",
      //     response.session_id.toString()
      //   );

      //   if (delete_session instanceof Error) {
      //     fs.appendFile(
      //       "./redis_error.logs",
      //       `\n\n ${moment().unix()}  delete check_Counter ========> ${JSON.stringify(
      //         delete_session
      //       )}`,
      //       () => { }
      //     );
      //     return;
      //   }

      //   number_of_delted_alerts = await delAsync(
      //     "check_send_alert_prod",
      //     response.session_id.toString()
      //   );
      //   if (number_of_delted_alerts instanceof Error) {
      //     fs.appendFile(
      //       "./redis_error.logs",
      //       `\n\n ${moment().unix()}  number_of_delted_alerts ========> ${JSON.stringify(
      //         number_of_delted_alerts
      //       )}`,
      //       () => { }
      //     );
      //     return;
      //   }
      //   number_of_delted_sessions = await delAsync(
      //     "check_bot_id_prod",
      //     response.session_id.toString()
      //   );
      //   if (number_of_delted_sessions instanceof Error) {
      //     fs.appendFile(
      //       "./redis_error.logs",
      //       `\n\n ${moment().unix()}  number_of_delted_sessions ========> ${JSON.stringify(
      //         number_of_delted_sessions
      //       )}`,
      //       () => { }
      //     );
      //     return;
      //   }
    }
  }
  catch (e) {
    console.log("error delete session", e)
  }
  // fs.appendFile('./sessions.logs', `\n\n ${moment().unix()}  current session_id ========> ${(response.session_id).toString()}`, () => {});
}

async function refresh_chat(chatbot_id, sender_id, cb_session) {

  let options = {
    method: "POST",
    url: smat_constants.refreshchat,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    form: {
      action: "refresh_chat",
      device_print: sender_id,
      chatbot_id: chatbot_id,
      cb_session: cb_session,
    },
  };
  console.log("options in refresh_chat=====>" + JSON.stringify(options));
  let response = await sendMessage(options);
  console.log("refresh chat response" + JSON.stringify(response));
  return response;
}

async function smatbot_api_started(chatbot_id, sender_id, answer, language_code) {
  //   console.log("smatbot api started" + JSON.stringify(chatbot_id) + "answer is" + JSON.stringify(answer) + "lanuage code " + JSON.stringify(language_code) + "instafram businees id " + JSON.stringify(instagram_business_id));

  //   let get_language_code, user_get_language_code;
  //   if (instagram_business_id != null && (language_code == null || language_code == undefined)) {
  //     get_language_code = await readCache(`${instagram_business_id}_${sender_id}`, 'language_code');
  //   }
  //   else {
  //     get_language_code = language_code;
  //   }

  //   console.log("user get language code =========>" + JSON.stringify(user_get_language_code) + "get language code " + JSON.stringify(get_language_code));


  let created_at = moment().toISOString();
  console.log("created at is " + JSON.stringify(created_at));
  let source = {
    url: "https://www.instagram.com/",
    date: created_at,
    channel: "instagram",

  };
  if (language_code) {
    source.user_language_code = "default";
  }
  if (answer) {
    source["init_answer"] = answer;
  }
  let options = {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    form: {
      action: "init_chat",
      device_print: sender_id,
      chatbot_id: chatbot_id,
      channel: "instagram",
      language_code: "default"
    },
    url: "" + smat_constants.smatbot_api_started,
  };

  //   user_get_language_code = await default_language(chatbot_id)

  //   if (get_language_code === user_get_language_code) {
  //     options.form.language_code = "default"
  //     source.user_language_code = "default"
  //   }
  options.form.source = JSON.stringify(source);

  console.log(options);
  let resp = await sendMessage(options);
  console.log(
    "This is inside smatbotapistarted ========================================>" +
    resp
  );

  console.log("type of resp in api_started==========>", typeof resp, resp);
  if (typeof resp == 'string') {
    console.log("string block")
    resp = JSON.parse(resp);
  }
  return resp;
}

async function smatbot_api(
  session_id,
  chatbot_id,
  answer_text,
  is_logical,
  sequence,
  question_id,
  option,
  sender_id,
) {
  console.log(
    "inside smatbot_api =====================================>" + JSON.stringify(option));

  // let get_language_code, user_get_language_code;

  // if (instagram_business_id != null) {
  //   get_language_code = await readCache(`${instagram_business_id}_${sender_id}`, 'language_code');
  // }



  // console.log("user get language code =========>" + JSON.stringify(user_get_language_code) + "get language code " + JSON.stringify(get_language_code));

  // if (get_language_code == null || get_language_code == undefined || get_language_code == 'default') {
  //   get_language_code = await default_language(chatbot_id);
  // }

  let created_at = moment().toISOString();

  let url = "" + smat_constants.smatbot_api;
  let params = {
    action: "answer",
    answer_text: answer_text,
    cb_session: session_id,
    chatbot_id: chatbot_id,
    is_logical: is_logical,
    option: "sometext",
    question_id: question_id,
    sequence: sequence,
    language_code: "default"
  };
  if (option) params.option = option;
  let source = {
    url: "https://www.instagram.com/",
    date: created_at,
    channel: "instagram",

  };
  params.source = JSON.stringify(source)

  // user_get_language_code = await default_language(chatbot_id);


  // if (user_get_language_code == get_language_code) {
  //   params.language_code = "default"
  // }

  if (option && option.question_channel && option.question_channel.length > 0) {
    params.option = 'sometext';
    params.question_channel = option.question_channel;
    params.question_type = option.question_type;
  }
  let request_options = {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  };
  // let send_email_sequence = null;
  // let smatbot_db = new smatsocialdb();
  // let chatbot_settings = await smatbot_db.send_email_after(chatbot_id);
  // console.log("chatbot settings send mail after ", chatbot_settings);
  // if (
  //   chatbot_settings.send_email_after &&
  //   chatbot_settings.send_email_after != ""
  // ) {
  //   try {
  //     send_email_sequence = chatbot_settings["send_email_after"].split(",");
  //   } catch (_) {
  //     send_email_sequence = [];
  //   }
  //   console.log("send email sequence is ", send_email_sequence, "question id is ", question_id)
  //   if (send_email_sequence.includes(question_id.toString())) {
  //     smatbot_api_send_alert(session_id, chatbot_id);
  //   }
  // }
  console.log("chatbot utils params==================>" + JSON.stringify(params));
  request_options.url = url;
  request_options.form = params;
  let response = await sendMessage(request_options);
  if (response instanceof Error) {
    console.log(response);
    return response;
  }
  console.log("response===============>", response);
  response = JSON.parse(response);
  console.log(response);
  console.log("response from chatbot utils is ===============>" + JSON.stringify(response));

  // let get_Details_answers = `SELECT * from chatbot_answers where question_id = ${question_id} ORDER by created_at DESC LIMIT 1`
  // get_Details_answers = await smatbot_db.query_execute(get_Details_answers);

  // console.log("get_Details_answers ", get_Details_answers);

  // if (get_Details_answers && Array.isArray(get_Details_answers)) {
  //   get_Details_answers = get_Details_answers[0];

  //   let answer_id = null;

  //   if (get_Details_answers && get_Details_answers.hasOwnProperty("id")) {
  //     answer_id = get_Details_answers["id"];
  //   }

  //   // store in instagram_messages_id table
  //   if (answer_id && instagram_message_id) {
  //     let insert_details_instagram_message_ids = `INSERT INTO instagram_message_ids (instagram_message_id, answer_id) VALUES ('${instagram_message_id}', ${answer_id})`;

  //     insert_details_instagram_message_ids = await smatbot_db.query_execute(insert_details_instagram_message_ids);
  //     console.log("insert_details_instagram_message_ids ", insert_details_instagram_message_ids)
  //   }

  // }
  return response;
}

async function smatbot_facebook_automation(sender_id, resp, BOT_ID, answer, context) {
  let prev_response = await previous_question(BOT_ID, sender_id);
  let get_language_code = "en"

  try {
    session_id = prev_response["cb_session"];
    is_logical = prev_response["init_question"][0]["logical_jump"];
    sequence = prev_response["init_question"][0]["sequence"];
    question_id = prev_response["init_question"][0]["id"];
    type1 = prev_response["init_question"][0]["type"];
  } catch (_) {
    session_id = prev_response["cb_session"];
    is_logical = prev_response["qna_prev"][-1]["logical_jump"]
    sequence = prev_response["qna_prev"][-1]["sequence"];
    question_id = prev_response["qna_prev"][-1]["id"];
    type1 = prev_response["qna_prev"][-1]["type"];
  }
  let question_text;

  try {
    question_text = resp['question_text']
      // Replace <div> tags with a newline character
      .replace(/<div[^>]*>/g, '\n')
      // Replace </div> tags with an empty string
      .replace(/<\/div>/g, '')
      // Replace <span> tags with the content followed by a newline character
      .replace(/<span[^>]*>(.*?)<\/span>/g, '$1')
      // Replace <br> tags with a newline character
      .replace(/<br\s*\/?>/g, '\n')
      // Replace any remaining HTML tags
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      // Replace multiple newline characters with a single newline
      .replace(/\n+/g, '\n')
      // Trim leading and trailing whitespace
      .trim();
  } catch (e) {
    console.log("error in replacing tags=======>" + JSON.stringify(e));
    question_text = resp['question_text'];
  }

  console.log("question text ", question_text,);
  // console.log("context activity ", context, context ? context.activity : null);

  let userText;
  if (context && context.activity && context.activity.text) {
    userText = context.activity.text.toLowerCase();
    // continue processing
  } else {
    userText = null
  }
  // console.log("context text   ", userText);

  userText = userText ? userText : "sometext"

  if (resp["type"] == "statement") {
    console.log("======================================>");

    if (resp['question_text']) await context.sendActivity(MessageFactory.text(question_text, userText));
    if (resp['image_url'] && resp['image_url'] != "null" && (resp['image_url'].slice(-3) == 'pdf')) {
      console.log("This is pdf file===========>" + resp['image_url']);
      await reply(sender_id, resp['image_url'], ACCESS_TOKEN, connection_type, true);
    } else if (resp['image_url'] && resp['image_url'] != "null") {
      console.log("++++++++++++++++++++====other than pdf++++++======");
      await attach_an_image(sender_id, resp['image_url'], ACCESS_TOKEN, connection_type);
    }

    resp = await smatbot_api(
      session_id,
      BOT_ID,
      "something",
      resp["logical_jump"],
      resp["sequence"],
      resp["id"],
      "sometext",
      sender_id
    );
    console.log("inside statement type", resp);
    if (resp["next_question"] && resp["next_question"].length > 0) {
      resp["next_question"][0]["cb_session"] = resp["livechat_session"];

      await smatbot_facebook_automation(
        sender_id,
        resp["next_question"][0],
        BOT_ID,
        null,
        context
      );
      return "ok";
    }
  }
  else if (resp["type"] == "phone" || resp["type"] == "ask_contacts") {
    //askign user to enter country code for mobile number
    let questiontext = question_text
    // if (multi_lang.hasOwnProperty('please enter your country code. Ex:+91') && BOT_ID && !smat_constants.remove_country_Code_list.includes(BOT_ID)) {
    //   questiontext = multi_lang['please enter your country code. Ex:+91'][get_language_code]
    // }
    await context.sendActivity(MessageFactory.text(question_text, userText));
    return "ok";
  }
  else if (resp["type"] == "location") {
    await context.sendActivity(MessageFactory.text(question_text, userText));
    return "ok";
  }
  else if (resp["type"] == "email") {
    await context.sendActivity(MessageFactory.text(question_text, userText));
    return "ok";
  }
  else if (resp["type"] == "website") {
    await context.sendActivity(MessageFactory.text(question_text, userText));
    return "ok";
  }

  else if (resp["type"] == "radio") {
    if (resp["question_text"]) {
      let options = resp["default_options"].split(";;");
      console.log("options in radio question type ", options);


      let options_array = []

      if (options && Array.isArray(options)) {
        options.forEach(eachoption => {
          let obj = {}
          obj["type"] = "imBack",
            obj["title"] = eachoption;
          obj["value"] = eachoption
          options_array.push(obj)
        });
      }

      if (options_array) {
        //send a HeroCard with option buttons (like a radio list)

        // const card = CardFactory.heroCard(question_text, null, options_array);
        // console.log("option in card ",card);
        // await context.sendActivity({attachments: [card]});

        //Use Suggested Actions (shows like quick replies)

        await context.sendActivity({
          text: question_text,
          suggestedActions: {
            actions: options_array
          }
        });
      }
      return;
    }
  }
  else if (resp["type"] == "checkbox") {
    console.log("This is inside checkbox ==========================>");

    let default_options = resp["default_options"].split(";;");

    console.log(
      "default options in teams checkbox ", default_options,
      "question text ", question_text
    );

    // Dynamically build Adaptive Card
    const adaptiveCard = {
      type: "AdaptiveCard",
      body: [
        {
          type: "TextBlock",
          text: question_text,
          wrap: true
        },
        {
          type: "Input.ChoiceSet",
          id: "selectedOptions",
          style: "expanded",       // shows all options
          isMultiSelect: true,     // enables checkboxes
          choices: default_options.map(opt => ({
            title: opt,
            value: opt
          }))
        }
      ],
      actions: [
        {
          type: "Action.Submit",
          title: "Submit"
        }
      ],
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.5"
    };

    // Send Adaptive Card to user
    await context.sendActivity({
      attachments: [CardFactory.adaptiveCard(adaptiveCard)]
    });

    return;
  }
  else if (resp["type"] == "number" || resp["type"] == "range") {
    let options = resp["default_options"].split(";;");
    console.log("options in number and range selection ", options);

    let min = parseInt(options[0]);
    let max = parseInt(options[1]);

    let numberRangeCard = {
      type: "AdaptiveCard",
      body: [
        {
          type: "TextBlock",
          text: question_text,
          wrap: true,
          weight: "Bolder",
          size: "Medium"
        },
        {
          type: "TextBlock",
          text: `Please enter a number between ${min} and ${max}`,
          isSubtle: true,
          wrap: true,
          spacing: "None"
        },
        {
          type: "Input.Number",
          id: "numberInput",
          placeholder: `Between ${min} and ${max}`,
          min: min,
          max: max
        }
      ],
      actions: [
        {
          type: "Action.Submit",
          title: "Submit"
        }
      ],
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.4"
    };

    await context.sendActivity({
      attachments: [CardFactory.adaptiveCard(numberRangeCard)]
    });

    return;
  }
  else if (resp["type"] == "date") {

    let start_date = null;
    let end_date = null;
    let end = null;
    let start = null;
    let date_options_formats = null;
    let date_default_options = resp["default_options"];

    try {
      date_default_options = JSON.parse(date_default_options);

      async function isArrayDateFormat(arr, dateFormat) {
        return arr.every(item => dateFormat.test(item));
      }

      date_options_formats = await isArrayDateFormat(date_default_options.date_range[0], /^\d{4}-\d{2}-\d{2}$/);
    } catch {
      date_default_options = date_default_options;
    }

    if (date_default_options == "") {
      let m_text;
      if (multi_lang.hasOwnProperty('Enter the date in *dd-mm-yyyy* format please')) {
        m_text = multi_lang['Enter the date in *dd-mm-yyyy* format please'][get_language_code];
      }
      question_text = `${question_text} \n ${m_text}`;
      await context.sendActivity(question_text);
    } else if (date_default_options["date_output_format"] && date_options_formats === false) {
      let date_format = date_default_options["date_output_format"];
      let m_text = multi_lang['Enter the date in *dd-mm-yyyy* format please'][get_language_code];
      let gtu = m_text.replace('*dd-mm-yyyy*', date_format);
      question_text = `${question_text} \n ${gtu}`;
      await context.sendActivity(question_text);
    } else if (
      date_default_options &&
      Object.keys(date_default_options).length > 0 &&
      date_default_options.hasOwnProperty("date_range")
    ) {
      // 1. Start and end date from date_range
      if (moment(date_default_options['date_range'][0][0], 'YYYY-MM-DD').isValid()) {
        start_date = moment(date_default_options['date_range'][0][0], 'YYYY-MM-DD').format('YYYY-MM-DD');
      }
      if (moment(date_default_options.date_range[date_default_options.date_range.length - 1][1], 'YYYY-MM-DD').isValid()) {
        end_date = moment(date_default_options.date_range[date_default_options.date_range.length - 1][1], 'YYYY-MM-DD').format('YYYY-MM-DD');
      }
      console.log("Start date, end date ", start_date, end_date)


      // 2. Adjust end_date using period
      try {
        if (date_default_options["period"] && Array.isArray(date_default_options["period"])) {
          if (date_default_options["period"][1] !== "b" && typeof date_default_options["period"][1] !== "string") {
            const periodOffset = date_default_options["period"][1] - 1;
            end = moment().startOf("day").add(periodOffset, "days");
            if (!end_date || end.isBefore(moment(end_date, "YYYY-MM-DD"))) {
              end_date = end.format("YYYY-MM-DD");
            }
          }
        }
      } catch (err) {
        console.log("no default period options");
      }

      console.log("Start date, end date after period ", start_date, end_date)


      // 3. Adjust start_date using next_days
      try {
        if (date_default_options.next_days) {
          start = moment().startOf("day").add(date_default_options.next_days, "days");
          if (!start_date || moment(start_date, "YYYY-MM-DD").isBefore(start)) {
            start_date = start.format("YYYY-MM-DD");
          }
        }
      } catch {
        console.log("no default options next days");
      }

      console.log("Start date, end date after next days ", start_date, end_date)


      // 4. Adjust for weekdays
      if (date_default_options.weekdays && date_default_options.weekdays.length) {
        let weekdays = date_default_options.weekdays;
        date_default_options.weekdays = weekdays.sort();
        console.log("date week days is " + JSON.stringify(date_default_options.weekdays));

        let next_start = null;
        start = moment(start_date, "DD-MM-YYYY") || moment().startOf("day");
        console.log("start of weekday is" + JSON.stringify(start) + "start day is" + JSON.stringify(start.day()));

        if (start.day() == 0) {
          console.log("date of week is 0")
          date_default_options.weekdays.unshift(start.day())
        }

        if (date_default_options.weekdays.includes(start.day())) {
          console.log("current date is start day");
          if (!start_date)
            start_date = moment().startOf("day").format("DD-MM-YYYY");
          else if (moment(start_date, "DD-MM-YYYY").isBefore(start))
            start_date = start.format("DD-MM-YYYY");
        }
        else {
          for (let i = 0; i < date_default_options.weekdays.length; i++) {
            if (date_default_options.weekdays[i] > start.day()) {
              next_start = date_default_options.weekdays[i];
              break;
            }
          }

          if (!next_start) {
            next_start = date_default_options.weekdays[0];
            console.log("start of next week " + JSON.stringify(next_start));
            // start = moment().add(1, "weeks").isoWeekday(next_start);
          } else {
            console.log("next heighest start" + JSON.stringify(next_start));
            start = moment().isoWeekday(next_start);
          }

          if (moment(start_date, "DD-MM-YYYY").isBefore(start)) { start_date = start.format("DD-MM-YYYY"); }
        }


      }

      // Fallback: if somehow dates are still null
      if (!start_date) start_date = moment().startOf("day").format("YYYY-MM-DD");
      if (!end_date) end_date = moment().add(1, "year").format("YYYY-MM-DD");

      // Send Adaptive Card with valid min/max
      const datePickerCard = {
        type: "AdaptiveCard",
        body: [
          {
            type: "TextBlock",
            text: question_text,
            wrap: true
          },
          {
            type: "Input.Date",
            id: "selectedDate",
            placeholder: "Select a date",
            min: start_date,
            max: end_date
          }
        ],
        actions: [
          {
            type: "Action.Submit",
            title: "Submit"
          }
        ],
        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
        version: "1.3"
      };

      console.log("Final date picker card: ", JSON.stringify(datePickerCard));
      await context.sendActivity({
        attachments: [CardFactory.adaptiveCard(datePickerCard)]
      });
    }
  }
  else if (resp["type"] == "time") {
    try {

      let time_format = "HH:MM";

      // Send image if present
      if (
        resp["image_url"] &&
        resp["image_url"] !== "null" &&
        resp["image_url"] !== ""
      ) {
        await context.sendActivity({
          type: 'message',
          attachments: [
            {
              contentType: 'image/png',
              contentUrl: resp["image_url"],
              name: 'image.png'
            }
          ]
        });
      }

      // Build multi-language message if available
      let m_text;
      if (multi_lang.hasOwnProperty('Please Enter the time in *${time_format}* format.')) {
        m_text = multi_lang['Please Enter the time in *${time_format}* format.'][get_language_code];
      } else {
        m_text = `Please Enter the time in *${time_format}* format.`;
      }
      console.log("mtext ",m_text)

      // Final message text
      let gtu = m_text.replace('*${time_format}*', time_format);
      let final_message = `${question_text}\n${gtu}`;

      // Send time input prompt
      await context.sendActivity({
        type: 'message',
        text: final_message
      });
    } catch (e) {
      console.log("error in shwoing time ",e);
    }

  }



}

let userSubmissionStatus = {}; // Key = user ID, Value = true/false

async function handle_incomingmessages(context, prev_response, sender_id, BOT_ID, get_language_code) {
  console.log("inside of handle incoming ", context.activity.value)
  try {
    let session_id, is_logical, sequence, question_id, type1, default_options
    let get_language_code = "en";
    try {
      session_id = prev_response["cb_session"];
      is_logical = prev_response["init_question"][0]["logical_jump"];
      sequence = prev_response["init_question"][0]["sequence"];
      question_id = prev_response["init_question"][0]["id"];
      type1 = prev_response["init_question"][0]["type"];
      default_options = prev_response["init_question"][0]["default_options"];
    } catch (_) {
      session_id = prev_response["cb_session"];
      is_logical = prev_response["qna_prev"][-1]["logical_jump"];
      sequence = prev_response["qna_prev"][-1]["sequence"];
      question_id = prev_response["qna_prev"][-1]["question_id"];
      type1 = prev_response["qna_prev"][-1]["type"];
      answer_text = prev_response["qna_prev"][-1]["answer_text"];
      default_options = prev_response["qna_prev"][-1]["default_options"];
    }

    let answer_text;
    const userId = context.activity.from.id;

    // Initialize user's submission status if not already
    if (!userSubmissionStatus[userId]) {
      userSubmissionStatus[userId] = {};
    }

    if (context && context.activity && context.activity.text) {
      answer_text = context.activity.text.toLowerCase();
      // continue processing
    } else if (context && context.activity && context.activity.value && context.activity.value.selectedOptions) {

      if (type1 == "checkbox") {
        // Check if already submitted
        if (userSubmissionStatus[userId]["choice"]) {
          await context.sendActivity("You have already submitted the checkbox options");
          return;
        }

        const selectedValues = context.activity.value.selectedOptions; // this will be a comma-separated string
        const selectedArray = selectedValues.split(",");
        await context.sendActivity(`You selected: ${selectedArray.join(", ")}`);
        // Mark as submitted
        userSubmissionStatus[userId]["choice"] = true;
        answer_text = selectedArray ? selectedArray.join(";;") : null
      }
    }
    else if (context && context.activity && context.activity.value && context.activity.value.numberInput) {

      if (type1 == "range") {

        console.log("inside number npu ", userSubmissionStatus[userId]["range"]);
        // Check if already submitted
        if (userSubmissionStatus[userId]["range"]) {
          await context.sendActivity("You have already selected the range in number");
          return;
        }

        let selectedValues = context.activity.value.numberInput; // this will be a comma-separated string
        await context.sendActivity(`You selected value: ${selectedValues}`);
        // Mark as submitted
        userSubmissionStatus[userId]["range"] = true;
        answer_text = parseInt(selectedValues);
      }
    }
    else if (context && context.activity && context.activity.value && context.activity.value.selectedDate) {

      if (type1 == "date") {
        console.log("inside number selected date  ", userSubmissionStatus[userId]["selectedDate"]);
        // Check if already submitted
        if (userSubmissionStatus[userId]["selectedDate"]) {
          await context.sendActivity("You have already selected the date");
          return;
        }

        let selectedValues = context.activity.value.selectedDate; // this will be a comma-separated string
        await context.sendActivity(`You selected date is: ${selectedValues}`);
        // Mark as submitted
        userSubmissionStatus[userId]["selectedDate"] = true;
        answer_text = selectedValues;
      }
    }
    else {
      answer_text = null
    }
    console.log("context text in handle_incoming  ", answer_text);

    answer_text = answer_text ? answer_text : "sometext"

    if (type1 == "question" || type1 == "payment") {
      let error_text = prev_response['init_question'][0]['error_text']
      try {
        console.log("qustion default options " + JSON.stringify(default_options) + typeof default_options);
        default_options = JSON.parse(default_options);
      } catch (e) {
        console.log("error in question type" + JSON.stringify(e));
      }
      if (default_options && default_options['regex']) {
        let regexQues = RegExp(default_options['regex']);
        console.log("inside regex" + JSON.stringify(regexQues) + "test" + JSON.stringify(regexQues.test(answer_text)));
        if (!regexQues.test(answer_text)) {
          if (error_text && (error_text != null)) er_text = error_text;
          else if (multi_lang.hasOwnProperty('please enter a valid Input.')) er_text = multi_lang['please enter a valid Input.'][get_language_code];
          console.log("==========>your entered anwser text is invalid===========>");
          await context.sendActivity(MessageFactory.text(er_text, answer_text));
          return;
        }
      }
    }

    if (type1 == "website") {
      let is_url_valid = await is_valid_url(answer_text);
      console.log("url is valid or not " + JSON.stringify(is_url_valid));
      if (is_url_valid) {
        resp = await smatbot_api(
          session_id,
          BOT_ID,
          answer_text,
          is_logical,
          sequence,
          question_id,
          "sometext",
          sender_id
        );
        console.log("resp from website==========>" + JSON.stringify(resp));

        resp['next_question'][0]["cb_session"] = resp.cb_session;
        await smatbot_facebook_automation(
          sender_id,
          resp['next_question'][0],
          BOT_ID,
          answer_text,
          context,
        );
        // request_response.send("OK");
        return;
      } else {
        if (multi_lang.hasOwnProperty('Please check the URL you have entered.')) er_text = multi_lang['Please check the URL you have entered.'][get_language_code];
        await context.sendActivity(MessageFactory.text(er_text, answer_text));
        return;
      }
    }
    if (type1 == "email") {
      let error_text = '';
      let company_mails, is_strict_validation;
      console.log("email_address in type email===========>" + JSON.stringify(answer_text) + "get language code " + JSON.stringify(get_language_code));
      answer_text = answer_text.toLowerCase();

      // Validate the email using regex
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

      if (!emailRegex.test(answer_text)) {
        // If email is invalid, send error text
        console.log("Invalid email format.");
        error_text = multi_lang['Please Enter a valid email address.'][get_language_code] || "Please enter a valid email address.";
        await context.sendActivity(MessageFactory.text(error_text, answer_text));
        return;
      }

      if (default_options != null) {
        default_options.length > 0 ? default_options = JSON.parse(default_options) : "";
        console.log("default_options " + JSON.stringify(default_options) + "Company mails is " + JSON.stringify(default_options['company_emails_only']));
        company_mails = default_options['company_emails_only'] ? default_options['company_emails_only'] : null
        is_strict_validation = default_options["is_strict_validation"] ? default_options["is_strict_validation"] : null
      }

      if (multi_lang.hasOwnProperty('Please Enter a valid email address.')) er_text = multi_lang['Please Enter a valid email address.'][get_language_code];
      if (default_options && Object.keys(default_options).length > 0 && company_mails == "1") {
        console.log("company mails is true");
        let block_list_emails = ["gmail.com", "yahoo.com", "hotmail.com", "yahoo.co.in", "aol.com", "abc.com", "xyz.com", "pqr.com", "rediffmail.com", "live.com", "outlook.com", "me.com", "msn.com", "ymail.com", "yahoo.in", "gmail.in", "hotmail.in", "outlook.in", "rediff.co.in", "rediff.com"]

        answer_mail = answer_text.split('@')[1];

        console.log("answer_mail && block_list_emails.includes(answer_mail) ", answer_mail && block_list_emails.includes(answer_mail))

        if (answer_mail && block_list_emails.includes(answer_mail)) {
          prev_response && prev_response["init_question"][0]['error_text'] ? error_text = prev_response["init_question"][0]['error_text'] : error_text = er_text;
          await context.sendActivity(MessageFactory.text(error_text, answer_text));
          return
        } else if (is_strict_validation) {
          console.log("is strict validation")
          let mailStatus = await isValidEmailIs(answer_text);
          console.log("mail status ", mailStatus);
          if (mailStatus) {
            console.log("Your mail validated ")
          }
          else {
            //send error text
            prev_response && prev_response["init_question"][0]['error_text'] ? error_text = prev_response["init_question"][0]['error_text'] : er_text
            await context.sendActivity(MessageFactory.text(error_text, answer_text));

            return;
          }
        }
      } else if (is_strict_validation) {
        console.log("company mails false");
        let mailStatus = await isValidEmailIs(answer_text);
        if (mailStatus) {
          console.log("Your mail validated ")
        }
        else {
          prev_response && prev_response["init_question"][0]['error_text'] ? error_text = prev_response["init_question"][0]['error_text'] : er_text;
          console.log("error text display" + JSON.stringify(error_text));
          await context.sendActivity(MessageFactory.text(error_text, answer_text));
          return;
        }
      }
    }

    if (type1 == "phone" || type1 == "ask_contacts") {

      console.log("bot id from innov source")
      let phn_number_regex = RegExp("^[0-9]{10}$");
      console.log("answer_text && phn_number_regex.test(answer_text) ", answer_text && phn_number_regex.test(answer_text))
      if (answer_text && phn_number_regex.test(answer_text)) {
        console.log("<=============phone number validated 13829=====================>");
        resp = await smatbot_api(
          session_id,
          BOT_ID,
          answer_text,
          is_logical,
          sequence,
          question_id,
          "sometext",
          sender_id
        );

        if (resp["next_question"] && resp["next_question"].length) {
          resp["next_question"][0]["cb_session"] = resp["livechat_session"];

          await smatbot_facebook_automation(
            sender_id,
            resp["next_question"][0],
            BOT_ID,
            answer_text,
            context
          );
          return;
        }

      } else {
        let er_text = '';
        if (multi_lang.hasOwnProperty('Please enter your valid country code')) {
          er_text = multi_lang['Please check the phone number you have entered.'][get_language_code]
        }
        console.log("erro txt ", er_text, answer_text)
        await context.sendActivity(MessageFactory.text(er_text, answer_text));

        return;

      }

    }

    if (type1 == "number") {

      console.log("default options number type " + JSON.stringify(default_options) + "answer text is " + JSON.stringify(answer_text));
      let options;
      try {
        options = default_options ? JSON.parse(default_options) : ""
      } catch (e) {
        console.log("Error parsing default_options: " + e.message);
        await context.sendActivity(MessageFactory.text("An error occurred. Please try again later.", userText));
        return;
      }

      console.log(options);
      answer_text = parseInt(answer_text);
      console.log(options && !(options.min <= answer_text && options.max >= answer_text));

      if (isNaN(answer_text) && !(options && options.min <= answer_text && options.max >= answer_text)) {

        if (multi_lang.hasOwnProperty('Please check the number you have entered.')) er_text = multi_lang['Please check the number you have entered.'][get_language_code];
        await context.sendActivity(MessageFactory.text(er_text, userText));
        return;
      }
      else if (options && options == "" && isNaN(answer_text)) {
        if (multi_lang.hasOwnProperty('Please check the number you have entered.')) er_text = multi_lang['Please check the number you have entered.'][get_language_code];
        await context.sendActivity(MessageFactory.text(er_text, userText));
        return;
      }

    }


    if (
      [
        "location",
        "question",
        "payment",
        "phone",
        "date",
        "email",
        "statement",
        "checkbox",
        "range",
        "slides",
        "number",
        "website",
        "file_upload",
        "time",
        "dynamic_question",
        "audio",
        "real_time_search",
        "custom_answer",
        "custom_end_choice",
        "user_question",
        "custom_actions",
        "images_slider",
      ].includes(type1)
    ) {
      resp = await smatbot_api(
        session_id,
        BOT_ID,
        answer_text,
        is_logical,
        sequence,
        question_id,
        "sometext",
        sender_id
      );
    } else
      resp = await smatbot_api(
        session_id,
        BOT_ID,
        answer_text,
        is_logical,
        sequence,
        question_id,
        "None",
        sender_id
      );

    console.log("resp from question type1 includes question types is " + JSON.stringify(resp));

    if (resp["next_question"] && resp["next_question"].length) {
      resp["next_question"][0]["cb_session"] = resp["livechat_session"];

      await smatbot_facebook_automation(
        sender_id,
        resp["next_question"][0],
        BOT_ID,
        answer_text,
        context
      );
      return;
    }
    else {
      let error_text = "There is no questions in the flow , Type menu flow will be restarted"
      await context.sendActivity(MessageFactory.text(error_text, answer_text));
      return;
    }

  }
  catch (e) {

  }

}



module.exports = { previous_question, deleteSession, refresh_chat, smatbot_api_started, smatbot_facebook_automation, handle_incomingmessages }