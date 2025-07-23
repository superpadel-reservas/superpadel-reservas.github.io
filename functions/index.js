// functions/index.js

const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Initialize the Firebase Admin SDK
admin.initializeApp();

/**
 * A callable function to verify the admin password.
 * Receives a password attempt and checks it against the one in the database.
 */
exports.verifyAdmin = functions.https.onCall(async (data, context) => {
  // Get the password sent from the user's browser
  const submittedPassword = data.password;

  if (!submittedPassword) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "The function must be called with a 'password' argument.",
    );
  }

  try {
    // Get the actual password securely from the database on the server
    const db = admin.database();
    const snapshot = await db.ref("admin/password").once("value");
    const actualPassword = snapshot.val();

    // Compare the passwords
    if (submittedPassword === actualPassword) {
      // Success!
      return {success: true};
    } else {
      // Failure.
      return {success: false};
    }
  } catch (error) {
    // Log the error for debugging and throw a generic error to the client
    console.error("Error verifying admin password:", error);
    throw new functions.https.HttpsError(
        "internal",
        "An internal error occurred while verifying the password.",
    );
  }
});
