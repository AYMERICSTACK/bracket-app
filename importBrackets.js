// importBrackets.js
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

// 🔹 Chemin vers ta clé Admin
const serviceAccountPath = path.resolve("serviceAccountKey.json");
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

// 🔹 Initialisation Admin
initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

// 🔹 Lecture du fichier JSON contenant les brackets
const bracketsDataPath = path.resolve("public/brackets.json");
const bracketsData = JSON.parse(fs.readFileSync(bracketsDataPath, "utf8"));

// 🔹 Sauvegarde de la collection actuelle
async function backupBrackets() {
  console.log("💾 Sauvegarde de la collection 'brackets'...");

  const snapshot = await db.collection("brackets").get();
  const backupData = {};

  snapshot.forEach((docSnap) => {
    backupData[docSnap.id] = docSnap.data();
  });

  const backupPath = path.resolve(`brackets_backup_${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), "utf8");

  console.log(`✅ Sauvegarde créée → ${backupPath}`);
}

// 🔹 Suppression de tous les documents existants
async function clearBrackets() {
  console.log("🗑 Suppression de tous les documents de 'brackets'...");
  const snapshot = await db.collection("brackets").get();
  const batch = db.batch();

  snapshot.forEach((docSnap) => batch.delete(docSnap.ref));

  await batch.commit();
  console.log("✅ Tous les documents existants ont été supprimés.");
}

// 🔹 Import principal
async function importBrackets() {
  await backupBrackets();
  await clearBrackets();

  console.log("🔄 Import des données des brackets...");

  for (const discipline in bracketsData) {
    const participants = bracketsData[discipline];

    for (const participant in participants) {
      const combats = participants[participant];

      await db.collection("brackets").doc(`${discipline}_${participant}`).set({
        discipline,
        participant,
        combats,
      });

      console.log(
        `✅ ${participant} importé dans ${discipline} (${combats.length} combats)`
      );
    }
  }

  console.log("🎉 Import complet terminé !");
}

// 🔹 Exécution
importBrackets().catch((err) =>
  console.error("❌ Erreur lors de l’import :", err)
);
