const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({origin: "https://superpadel-reservas.github.io"});

admin.initializeApp();

exports.verifyAdmin = functions.https.onRequest((request, response) => {
  // This uses the 'cors' package to handle security.
  cors(request, response, async () => {
    // We now get the password from the request 'body'.
    const submittedPassword = request.body.password;

    if (request.method !== "POST") {
      return response.status(405).send("Method Not Allowed");
    }

    if (!submittedPassword) {
      return response.status(400).json({
        error: "The function must be called with a 'password' argument.",
      });
    }

    try {
      const db = admin.database();
      const snapshot = await db.ref("admin/password").once("value");
      const actualPassword = snapshot.val();

      if (submittedPassword === actualPassword) {
        // Success! Send back a success status.
        return response.status(200).json({success: true});
      } else {
        // Failure. Send back a failure status.
        return response.status(200).json({success: false});
      }
    } catch (error) {
      functions.logger.error("Error verifying admin password:", error);
      return response.status(500).json({error: "Internal Server Error"});
    }
  });
});
