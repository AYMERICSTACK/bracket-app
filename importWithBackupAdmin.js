// importWithBackupAdmin.js
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

// 🔹 Chemin vers ta clé Admin
const serviceAccount = JSON.parse(
  fs.readFileSync(path.resolve("serviceAccountKey.json"), "utf8")
);

// 🔹 Initialisation Admin
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// 🔹 Charger le fichier brackets à importer
const bracketsFilePath = path.resolve("./public/brackets.json");
if (!fs.existsSync(bracketsFilePath)) {
  console.error("❌ Fichier brackets.json introuvable !");
  process.exit(1);
}
const bracketsData = JSON.parse(fs.readFileSync(bracketsFilePath, "utf8"));

// 🔹 Backup de la collection avant import
async function backupBrackets() {
  console.log("🔄 Création du backup avant import...");
  const snapshot = await db.collection("brackets").get();
  const backup = {};
  snapshot.forEach(docSnap => {
    backup[docSnap.id] = docSnap.data().combats || [];
  });

  const backupFileName = `brackets_backup_${Date.now()}.json`;
  fs.writeFileSync(path.resolve(backupFileName), JSON.stringify(backup, null, 2));
  console.log("✅ Backup créé :", backupFileName);
  return backupFileName;
}

// 🔹 Import des nouvelles données
async function importBrackets() {
  const backupFile = await backupBrackets();

  console.log("🔄 Import des nouvelles données...");
  for (const participant in bracketsData) {
    await db.collection("brackets").doc(participant).set({ combats: bracketsData[participant] });
    console.log(`✅ Données importées pour ${participant}`);
  }

  console.log("🎉 Import terminé !");
  console.log(`🗂 Backup disponible : ${backupFile}`);
}

// 🔹 Lancer le script
importBrackets().catch(err => console.error(err));
