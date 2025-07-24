const functions = require("firebase-functions");

exports.verifyAdmin = functions.https.onCall((data, context) => {
  functions.logger.log("Password test function was called with data:", data);
  const receivedPassword = data.password || "[No password was received]";
  // This function always returns a unique success message.
  return {result: `Hello World, the server received the password: '${receivedPassword}'` };

});
