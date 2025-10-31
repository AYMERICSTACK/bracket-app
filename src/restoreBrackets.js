// restoreBrackets.js
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

// 🔹 Fonction principale
async function restoreBrackets(backupFilePath) {
  if (!fs.existsSync(backupFilePath)) {
    console.error("❌ Fichier de backup introuvable :", backupFilePath);
    return;
  }

  const backupData = JSON.parse(fs.readFileSync(backupFilePath, "utf8"));
  console.log("🔄 Restauration des brackets depuis :", backupFilePath);

  for (const participant in backupData) {
    const combats = backupData[participant];
    await db.collection("brackets").doc(participant).set({ combats });
    console.log(`✅ Données restaurées pour ${participant}`);
  }

  console.log("🎉 Restauration terminée !");
}

// 🔹 Exemple d’utilisation
// node restoreBrackets.js brackets_backup_1698732354000.json
const backupFile = process.argv[2];
if (!backupFile) {
  console.error("❌ Merci de préciser le fichier backup à restaurer.");
  process.exit(1);
}

restoreBrackets(path.resolve(backupFile)).catch(err => console.error(err));
