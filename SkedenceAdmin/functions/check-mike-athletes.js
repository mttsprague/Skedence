const admin = require("firebase-admin");
admin.initializeApp({ projectId: "polyface-ae6d3" });
const db = admin.firestore();

async function main() {
  const doc = await db.collection("users").doc("mike_parent").get();
  const d = doc.data();
  console.log("Mike athletes array:", JSON.stringify(d.athletes, null, 2));
  console.log("Mike athlete1:", d.athleteFirstName, d.athleteLastName);
  console.log("Mike athlete2:", d.athlete2FirstName, d.athlete2LastName);
  console.log("Mike athlete3:", d.athlete3FirstName, d.athlete3LastName);
}

main().catch(console.error).finally(() => process.exit());
