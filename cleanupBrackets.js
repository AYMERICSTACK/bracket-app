// cleanupBrackets.js
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

const serviceAccountPath = path.resolve("serviceAccountKey.json");
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function cleanupBrackets() {
  console.log("🧹 Nettoyage des doublons...");

  const snapshot = await db.collection("brackets").get();

  for (const doc of snapshot.docs) {
    const id = doc.id;

    // On supprime tout ce qui n’est PAS une catégorie
    if (!["LightContact", "KickLight", "K1Light"].includes(id)) {
      await db.collection("brackets").doc(id).delete();
      console.log(`❌ Supprimé : ${id}`);
    }
  }

  console.log("✅ Nettoyage terminé !");
}

cleanupBrackets().catch(console.error);
