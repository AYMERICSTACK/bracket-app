// updateCategories.js
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc } from "firebase/firestore";

// 🔹 Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAqmV4cGPR5ukBSQvormWognk6YwMVmAYY",
  authDomain: "bracketapp-48387.firebaseapp.com",
  projectId: "bracketapp-48387",
  storageBucket: "bracketapp-48387.firebasestorage.app",
  messagingSenderId: "968998996438",
  appId: "1:968998996438:web:0bb15e61b7ebfe2eeabc77"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 🔹 Catégories par participant
const CATEGORIES = {
  "Mélanie": "-70kg",
  "Nadège": "-60kg",
  "Léony": "-37kg",
  // Les autres participants par défaut à mettre au hasard ou N/A
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
  const bracketCol = collection(db, "brackets");
  const snapshot = await getDocs(bracketCol);

  const updates = [];

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const combats = (data.combats || []).map(c => {
      // Si la catégorie existe déjà, on ne change rien
      if (c.categorie) return c;
      return {
        ...c,
        categorie: CATEGORIES[c.participant] || "N/A"
      };
    });
    updates.push(updateDoc(doc(db, "brackets", docSnap.id), { combats }));
  });

  await Promise.all(updates);
  console.log("✅ Catégories mises à jour pour tous les participants !");
}

updateCategories().catch(err => console.error(err));
