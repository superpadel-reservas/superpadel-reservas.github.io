const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({origin: "https://superpadel-reservas.github.io"});

admin.initializeApp();

// This function logs a user in
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
        return response.status(200).json({success: true});
      } else {
        return response.status(200).json({success: false});
      }
    } catch (error) {
      functions.logger.error("Error in verifyAdmin:", error);
      return response.status(500).json({error: "Internal Server Error"});
    }
  });
});

// This is the secure function for cancellations
exports.cancelBookingAdmin = functions.https.onRequest((request, response) => {
  cors(request, response, async () => {
    const {slotKey, password, reason} = request.body;
    if (request.method !== "POST") {
      return response.status(405).send("Method Not Allowed");
    }
    if (!slotKey || !password || !reason) {
      return response.status(400).json({error: "Missing required fields."});
    }

    try {
      // Step 1: Verify Admin Password
      const passRef = admin.database().ref("admin/password");
      const passwordSnapshot = await passRef.once("value");
      if (password !== passwordSnapshot.val()) {
        // This is the line that has been fixed
        return response.status(403)
            .json({error: "Forbidden: Invalid Password"});
      }

      // Step 2: Get booking data to log it before deleting
      const bookingRef = admin.database().ref(`bookings/${slotKey}`);
      const bookingSnapshot = await bookingRef.once("value");
      if (!bookingSnapshot.exists()) {
        return response.status(404).json({error: "Booking not found."});
      }
      const bookingData = bookingSnapshot.val();

      // Step 3: Log the cancellation
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

      // Step 4: Delete the original booking
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
