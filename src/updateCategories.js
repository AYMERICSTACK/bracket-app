// updateCategories.js
// updateCategories.js
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

// Chemin vers la clé
const serviceAccountPath = path.resolve("serviceAccountKey.json");
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

// Initialisation Firebase Admin
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// Ici ton code pour updateCategories



// 🔹 Catégories par participant
const CATEGORIES = {
  "Mélanie": "-70kg",
  "Nadège": "-60kg",
  "Léony": "-37kg",
  "Cécile": "-65kg",
  "Iona": "-55kg",
  "Chloé": "-55kg",
  "Samira": "-60kg",
  "Alicia": "-60kg",
  "Valentin": "-75kg",
  "Arthur": "-75kg",
  "Alban": "-68kg",
  "Mathis": "-68kg",
  "Joris": "-70kg",
  "Rémy": "-70kg",
  "Julien": "-73kg",
  "Sacha": "-73kg",
  "Samir": "-80kg",
  "Zakaria": "-80kg"
};

async function updateCategories() {
  console.log("🔄 Lecture de la collection 'brackets'...");
  const snapshot = await db.collection("brackets").get();

  // 🔸 Backup automatique avant modification
  const backup = snapshot.docs.map(d => ({ id: d.id, data: d.data() }));
  fs.writeFileSync("brackets_backup.json", JSON.stringify(backup, null, 2));
  console.log("📦 Sauvegarde créée → brackets_backup.json");

  // 🔸 Mise à jour des documents
  let success = 0;
  let errors = 0;

  for (const docSnap of snapshot.docs) {
    try {
      const data = docSnap.data();
      const combats = (data.combats || []).map((c) => {
        if (c.categorie) return c;
        return {
          ...c,
          categorie: CATEGORIES[c.participant] || "N/A",
        };
      });

      await docSnap.ref.update({ combats });
      console.log(`✅ ${docSnap.id} mis à jour`);
      success++;
    } catch (err) {
      console.error(`❌ Erreur sur ${docSnap.id}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\n🎯 Terminé : ${success} succès / ${errors} erreurs`);
}

updateCategories().catch(err => console.error("💥 Erreur globale:", err));
