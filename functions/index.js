// functions/index.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.verifyAdmin = functions.https.onCall(async (data, context) => {
  const submittedPassword = data.password;

  if (!submittedPassword) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "The function must be called with a 'password' argument.",
    );
  }

  try {
    const db = admin.database();
    const snapshot = await db.ref("admin/password").once("value");
    const actualPassword = snapshot.val();

    if (submittedPassword === actualPassword) {
      return {success: true};
    } else {
      return {success: false};
    }
  } catch (error) {
    console.error("Error verifying admin password:", error);
    throw new functions.https.HttpsError(
        "internal",
        "An internal error occurred while verifying the password.",
    );
  }
});
