const admin = require("firebase-admin");
admin.initializeApp({ projectId: "polyface-ae6d3" });
const db = admin.firestore();

async function main() {
  const bookingId = "YUitRGZkDOdBJ5QvIQfG";
  const athleteNames = ["Mya Athlete", "Mason Athlete", "Johnson Wales"];

  const ref = db.collection("bookings").doc(bookingId);
  const snap = await ref.get();
  if (!snap.exists) {
    console.log("Booking not found:", bookingId);
    return;
  }

  const d = snap.data();
  console.log("Before:", {
    athleteName: d.athleteName,
    secondAthleteName: d.secondAthleteName,
    athleteNames: d.athleteNames,
  });

  await ref.update({ athleteNames });

  console.log("Updated athleteNames to:", athleteNames);
}

main().catch(console.error).finally(() => process.exit());
