import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

// 🔹 Initialise Firebase Admin
const serviceAccountPath = path.resolve("serviceAccountKey.json");
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// 🔹 Charge ton JSON
const dataPath = path.resolve("brackets.json"); // ton fichier JSON
const combatsData = JSON.parse(fs.readFileSync(dataPath, "utf8"));

async function updateFirestore() {
  let success = 0;
  let errors = 0;

  for (const typeCombat of Object.keys(combatsData)) {
    const participants = combatsData[typeCombat];

    try {
      // 🔹 On met à jour ou crée un doc pour chaque type de combat
      const docRef = db.collection("brackets").doc(typeCombat);
      await docRef.set({ participants }, { merge: true });
      console.log(`✅ ${typeCombat} mis à jour avec tous les participants`);
      success++;
    } catch (err) {
      console.error(`❌ Erreur lors de la mise à jour de ${typeCombat}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\n🎯 Terminé : ${success} succès / ${errors} erreurs`);
}

updateFirestore().catch(err => console.error("💥 Erreur globale:", err));
