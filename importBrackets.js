// importBrackets.js
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import fs from "fs";

// Remplace par le chemin vers ton fichier brackets.json
const bracketsData = JSON.parse(fs.readFileSync("./public/brackets.json", "utf-8"));

// Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAqmV4cGPR5ukBSQvormWognk6YwMVmAYY",
  authDomain: "bracketapp-48387.firebaseapp.com",
  projectId: "bracketapp-48387",
  storageBucket: "bracketapp-48387.appspot.com",
  messagingSenderId: "968998996438",
  appId: "1:968998996438:web:0bb15e61b7ebfe2eeabc77"
};

// Initialisation Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function importBrackets() {
  for (const participant in bracketsData) {
    const combats = bracketsData[participant];
    await setDoc(doc(db, "brackets", participant), { combats });
    console.log(`✅ Données importées pour ${participant}`);
  }
  console.log("🎉 Import terminé !");
}

importBrackets().catch(console.error);
