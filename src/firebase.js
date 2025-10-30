// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { 
  getAuth, 
  GoogleAuthProvider,
  EmailAuthProvider 
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAqmV4cGPR5ukBSQvormWognk6YwMVmAYY",
  authDomain: "bracketapp-48387.firebaseapp.com",
  projectId: "bracketapp-48387",
  storageBucket: "bracketapp-48387.firebasestorage.app",
  messagingSenderId: "968998996438",
  appId: "1:968998996438:web:0bb15e61b7ebfe2eeabc77"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

// Fournisseurs d’authentification
export const googleProvider = new GoogleAuthProvider();
export const emailProvider = new EmailAuthProvider();
