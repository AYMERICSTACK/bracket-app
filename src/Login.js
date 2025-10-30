import React, { useState } from "react";
import { signInWithEmailAndPassword, signInWithPopup, sendPasswordResetEmail } from "firebase/auth";
import { auth, googleProvider } from "./firebase"; // ✅ utilise l'instance firebase déjà initialisée
import logo from "./logo.png";
import "./Login.css";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      onLogin(userCred.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const userCred = await signInWithPopup(auth, googleProvider);
      onLogin(userCred.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) return setError("Merci de saisir votre email pour réinitialiser le mot de passe.");
    setLoading(true);
    setError("");
    try {
      await sendPasswordResetEmail(auth, email);
      setError("Email de réinitialisation envoyé !");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <img src={logo} alt="Logo" className="login-logo" />
        <h2>Connexion</h2>
        {error && <div className="error-msg">{error}</div>}

        <form className="login-form" onSubmit={handleEmailLogin}>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)} required />
          <button type="submit" disabled={loading}>{loading ? "Connexion..." : "Se connecter"}</button>
        </form>

        <button className="google-btn" onClick={handleGoogleLogin} disabled={loading}>
          {loading ? "Connexion..." : "Se connecter avec Google"}
        </button>

        <button className="reset-btn" onClick={handleResetPassword} disabled={loading}>
          Mot de passe oublié ?
        </button>
      </div>
    </div>
  );
}
