const functions = require("firebase-functions");

exports.verifyAdmin = functions.https.onCall((data, context) => {
  // We expect 'data' to be the password string itself.
  functions.logger.log("Direct data test. Received:", data);

  const receivedData = data || "[No data was received]";

  return {result: `The server received the direct data: '${receivedData}'`};
});
