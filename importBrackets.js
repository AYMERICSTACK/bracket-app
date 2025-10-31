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
  credential: cert(serviceAccount)
});

const db = getFirestore();

// 🔹 Lecture du fichier JSON contenant les brackets
const bracketsDataPath = path.resolve("public/brackets.json");
const bracketsData = JSON.parse(fs.readFileSync(bracketsDataPath, "utf8"));

// 🔹 Fonction pour sauvegarder les données existantes
async function backupBrackets() {
  console.log("💾 Sauvegarde de la collection 'brackets'...");

  const snapshot = await db.collection("brackets").get();
  const backupData = {};

  snapshot.forEach(docSnap => {
    backupData[docSnap.id] = docSnap.data().combats || [];
  });

  const backupPath = path.resolve(`brackets_backup_${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), "utf8");

  console.log(`✅ Sauvegarde créée → ${backupPath}`);
}

// 🔹 Fonction principale
async function importBrackets() {
  await backupBrackets();

  console.log("🔄 Import des brackets...");

  for (const participant in bracketsData) {
    const combats = bracketsData[participant];
    await db.collection("brackets").doc(participant).set({ combats });
    console.log(`✅ Données importées pour ${participant}`);
  }

  console.log("🎉 Import terminé !");
}

importBrackets().catch(err => console.error(err));
