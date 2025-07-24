const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({
  origin: "https://superpadel-reservas.github.io",
});
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
      const adminRef = admin.database().ref("admin");
      const adminPasswordsSnapshot = await adminRef.once("value");
      const passwords = adminPasswordsSnapshot.val();
      let role = "none";

      if (submittedPassword === passwords.password) {
        role = "full";
      } else if (submittedPassword === passwords.semiAdminPassword) {
        role = "semi";
      }

      if (role !== "none") {
        const token = crypto.randomUUID();
        const tokenData = {
          token: token,
          createdAt: admin.database.ServerValue.TIMESTAMP,
          role: role,
        };
        await admin.database().ref("admin/session").set(tokenData);

        return response.status(200).json({
          success: true,
          token: token,
          role: role,
        });
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
    const {slotKey, reason, token} = request.body;
    if (request.method !== "POST") {
      return response.status(405).send("Method Not Allowed");
    }
    if (!slotKey || !reason || !token) {
      return response.status(400).json({error: "Missing required fields."});
    }

    try {
      const sessionRef = admin.database().ref("admin/session");
      const sessionSnapshot = await sessionRef.once("value");
      const serverToken = sessionSnapshot.val();

      const isTokenValid = serverToken && serverToken.token === token;
      const isTokenRecent = serverToken &&
        (Date.now() - serverToken.createdAt < 8 * 60 * 60 * 1000);
      const isFullAdmin = serverToken && serverToken.role === "full";

      if (!isTokenValid || !isTokenRecent || !isFullAdmin) {
        return response.status(403)
            .json({error: "Forbidden: Insufficient Permissions"});
      }

      const bookingRef = admin.database().ref(`bookings/${slotKey}`);
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
