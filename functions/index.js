const functions = require("firebase-functions");

exports.verifyAdmin = functions.https.onCall((data, context) => {
  functions.logger.log("Hello World function was called!");
  // This function always returns a unique success message.
  return {result: "The new Hello World function is working!"};
});
