import React, { useEffect, useState } from "react";
import { auth, googleProvider } from "./firebase";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "firebase/auth";

export default function Auth({ onUserChange }) {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      onUserChange(u);
    });
    return () => unsubscribe();
  }, [onUserChange]);

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (user) {
    return (
      <div className="auth-container" style={{ textAlign: "center", marginBottom: "20px" }}>
        <p>👋 Connecté en tant que <b>{user.displayName || user.email}</b></p>
        <button onClick={handleLogout}>Se déconnecter</button>
      </div>
    );
  }

  return (
    <div className="auth-container" style={{ textAlign: "center", marginBottom: "20px" }}>
      <h3>Connexion</h3>

      <button onClick={handleGoogleLogin} style={{ marginBottom: "10px" }}>
        Se connecter avec Google
      </button>

      <form onSubmit={handleEmailAuth} style={{ display: "inline-block", textAlign: "left" }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ display: "block", margin: "5px 0", padding: "6px" }}
        />
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ display: "block", margin: "5px 0", padding: "6px" }}
        />
        <button type="submit" style={{ display: "block", marginTop: "10px" }}>
          {isRegister ? "Créer un compte" : "Se connecter"}
        </button>
      </form>

      <p style={{ marginTop: "10px", cursor: "pointer", color: "#007bff" }}
         onClick={() => setIsRegister(!isRegister)}>
        {isRegister ? "Déjà un compte ? Se connecter" : "Pas encore de compte ? S’inscrire"}
      </p>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
