// functions/index.js
const functions = require("firebase-functions");

exports.verifyAdmin = functions.https.onCall((data, context) => {
  // This function will log whatever data it receives...
  functions.logger.log("Echo function received data:", data);

  // ...and then send it straight back to the browser.
  return {
    iReceivedThis: data,
    message: "Data was echoed successfully by the server.",
  };
});
