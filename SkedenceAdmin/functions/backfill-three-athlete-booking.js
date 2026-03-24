const admin = require("firebase-admin");
admin.initializeApp({ projectId: "polyface-ae6d3" });
const db = admin.firestore();

async function main() {
  // Find Mike Parent
  const usersSnap = await db.collection("users")
    .where("firstName", "==", "Mike")
    .where("lastName", "==", "Parent")
    .get();

  if (usersSnap.empty) {
    console.log("Mike Parent not found");
    return;
  }

  const mikeId = usersSnap.docs[0].id;
  console.log("Mike Parent userId:", mikeId);

  // Get all his bookings
  const bookingsSnap = await db.collection("bookings")
    .where("clientUID", "==", mikeId)
    .get();

  console.log("Total bookings for Mike:", bookingsSnap.docs.length);

  for (const doc of bookingsSnap.docs) {
    const d = doc.data();
    const st = d.startTime ? d.startTime.toDate() : null;
    console.log(
      "  ID:", doc.id,
      "| start:", st ? st.toISOString() : "null",
      "| athlete1:", d.athleteName || "-",
      "| athlete2:", d.secondAthleteName || "-",
      "| athleteNames:", JSON.stringify(d.athleteNames || null),
      "| status:", d.status
    );
  }
}

main().catch(console.error).finally(() => process.exit());
