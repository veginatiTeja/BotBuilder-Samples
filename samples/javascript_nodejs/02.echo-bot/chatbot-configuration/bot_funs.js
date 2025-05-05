

const { sendMessage, remove_tags } = require("../teams_utils/teams_custom_Funs.js");

async function is_valid_url(url_string) {
    let protocol = null;
    let url_exists = null;
    console.log("url string is " + JSON.stringify(url_string));
    try {
      console.log("url regex is ")
      let urlRegex = new RegExp(/^((https?|ftp|smtp):\/\/)?(www.)?[a-z0-9]+(\.[a-z]{2,}){1,3}(#?\/?[a-zA-Z0-9#]+)*\/?(\?[a-zA-Z0-9-_]+=[a-zA-Z0-9-%]+&?)?$/);
      protocol = urlRegex.test(url_string)
      //removing protocol from url[works for all kinds of protocols if valid]
      console.log("protocol of website url regex is " + JSON.stringify(protocol));
      if (protocol) {
        if (!url_string.includes("www")) url_string = "www" + url_string;
      }
    } catch (_) {
      return false;
    }
  
    //checking whether URL exists or not
    if (protocol) {
      return url_exists = true
    } else {
      return url_exists = false;
    }
  
  }


  async function isValidEmailIs(emailId) {
    let options = {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      form: {
        email: emailId
      },
      url: `https://www.smatbot.com/kya_backend/Kya/validateEmail`
    };
  
    let response = await sendMessage(options);
    response = JSON.parse(response);
    response = response[0] || {};
    let mail_response = response.email_status;
    console.log("mail status is " + JSON.stringify(mail_response))
    return mail_response;
  }

  module.exports = {is_valid_url,isValidEmailIs}