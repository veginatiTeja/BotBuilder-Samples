let request = require("request");


function sendMessage(options) {
  return new Promise((resolve, reject) => {
    request(options, (error, response, body) => {
      if (error) return resolve(error);
      resolve(body);
    });
  });
}

function remove_tags(data) {
    try {
      data = data.replace("<br>", "\n");
      data = data.replace(/<.*?>/gi, ""); //this will remove all tags including image and href tags
      data = data.replace("&nbsp;", " ");
    } catch (error) {
      console.log(error);
      log.error("error from remove tags is" + JSON.stringify(error));
    }
    return data;
  }
  

module.exports = {sendMessage,remove_tags}