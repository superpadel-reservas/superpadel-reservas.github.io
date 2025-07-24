const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({origin: "https://superpadel-reservas.github.io"});
const crypto = require("crypto");

admin.initializeApp();

exports.verifyAdmin = functions.https.onRequest((request, response) => {
  cors(request, response, async () => {
    const submittedPassword = request.body.password;
    if (request.method !== "POST") {
      return response.status(405).send("Method Not Allowed");
    }
    if (!submittedPassword) {
      return response.status(400).json({error: "Password is required."});
    }
    try {
      const passwordRef = admin.database().ref("admin/password");
      const snapshot = await passwordRef.once("value");

      if (submittedPassword === snapshot.val()) {
        // Password is correct, now create and save a session token.
        const token = crypto.randomUUID();
        const tokenData = {
          token: token,
          createdAt: admin.database.ServerValue.TIMESTAMP,
        };
        // Save the new token to the database
        await admin.database().ref("admin/session").set(tokenData);

        // Send success and the new token back to the browser
        return response.status(200).json({success: true, token: token});
      } else {
        return response.status(200).json({success: false});
      }
    } catch (error) {
      functions.logger.error("Error in verifyAdmin:", error);
      return response.status(500).json({error: "Internal Server Error"});
    }
  });
});

exports.cancelBookingAdmin = functions.https.onRequest((request, response) => {
  cors(request, response, async () => {
    // We now expect a sessionToken instead of a password
    const {slotKey, reason, token} = request.body;
    if (request.method !== "POST") {
      return response.status(405).send("Method Not Allowed");
    }
    if (!slotKey || !reason || !token) {
      return response.status(400).json({error: "Missing required fields."});
    }

    try {
      // Step 1: Verify the Session Token
      const sessionRef = admin.database().ref("admin/session");
      const sessionSnapshot = await sessionRef.once("value");
      const serverToken = sessionSnapshot.val();

      // Check if the token from the browser matches the one on the server
      // and check if it's less than 8 hours old
      const isTokenValid = serverToken && serverToken.token === token;
      const isTokenRecent = serverToken &&
        (Date.now() - serverToken.createdAt < 8 * 60 * 60 * 1000);

      if (!isTokenValid || !isTokenRecent) {
        return response.status(403).json({error: "Forbidden: Invalid Session"});
      }

      // Step 2: Get booking data to log it
      const bookingRef = admin.database().ref(`bookings/${slotKey}`);
      // ... (The rest of the function remains the same)
      const bookingSnapshot = await bookingRef.once("value");
      if (!bookingSnapshot.exists()) {
        return response.status(404).json({error: "Booking not found."});
      }
      const bookingData = bookingSnapshot.val();

      const cancellationData = {
        reason: reason,
        name: bookingData.name || "",
        team1: bookingData.team1 || "",
        team2: bookingData.team2 || "",
        court: bookingData.court || "",
        date: bookingData.date || "",
        hour: bookingData.time || "",
        timestamp: new Date().toISOString(),
      };
      await admin.database().ref("cancellations").push(cancellationData);

      await bookingRef.remove();

      return response.status(200).json({
        success: true,
        message: "Booking cancelled successfully.",
      });
    } catch (error) {
      functions.logger.error("Error in cancelBookingAdmin:", error);
      return response.status(500).json({error: "Internal Server Error"});
    }
  });
});
