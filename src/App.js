// src/App.js
import React, { useState, useEffect, useRef } from "react";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { CSSTransition, SwitchTransition } from "react-transition-group";

import Login from "./Login";
import Bracket from "./Bracket";
import AdminBracket from "./AdminBracket";
import "./App.css";

const ALLOWED_UIDS = [
  "2VqoJdZpE6NOtSWx3ko7OtzXBFk1",
  "BLqmftqFsgSKtceNI3c76jrdE0p1",
];

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = pas encore chargé
  const [showLogin, setShowLogin] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const nodeRef = useRef(null);

  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser || null);
    });
    return () => unsubscribe();
  }, [auth]);

  const isAuthorized = user && ALLOWED_UIDS.includes(user.uid);

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setShowLogin(false);
  };

  const handleScroll = () => {
    if (window.scrollY > 300) setShowScrollTop(true);
    else setShowScrollTop(false);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ⚠️ Attente du chargement de l'utilisateur avant d'afficher les routes
  if (user === undefined) {
    return <div>Chargement...</div>;
  }

  return (
    <Router>
      {/* Bandeau connexion */}
      <div className="top-banner-modern">
        <div className="banner-left">
          {user ? (
            isAuthorized ? (
              <span className="status authorized">✅ Connecté & autorisé</span>
            ) : (
              <span className="status connected">⚠️ Connecté</span>
            )
          ) : (
            <span className="status guest">👋 Bienvenue</span>
          )}
        </div>

        <div className="banner-center">
          <span>🏆 Tableau des combats</span>
        </div>

        <div className="banner-right" style={{ display: "flex", gap: "10px" }}>
          {user && isAuthorized && (
            <button
              onClick={() => (window.location.href = "/admin")}
              style={{
                backgroundColor: "#fff",
                color: "#2575fc",
                padding: "8px 16px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
              }}
            >
              ⚡ Admin
            </button>
          )}

          {user ? (
            <button className="btn-logout" onClick={handleLogout}>
              🔒 Déconnexion
            </button>
          ) : (
            <button className="btn-login" onClick={() => setShowLogin(true)}>
              🔑 Connexion coach
            </button>
          )}
        </div>
      </div>

      {/* Pop-up connexion */}
      {showLogin && !user && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
          onClick={() => setShowLogin(false)}
        >
          <div
            style={{
              background: "#fff",
              padding: "30px",
              borderRadius: "12px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
              minWidth: "320px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: "15px", textAlign: "center" }}>
              🔐 Connexion coach
            </h3>
            <Login
              onUserChange={(u) => {
                setUser(u);
                setShowLogin(false);
              }}
            />
            <div style={{ textAlign: "center", marginTop: "10px" }}>
              <button
                onClick={() => setShowLogin(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#007bff",
                  textDecoration: "underline",
                  cursor: "pointer",
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transition principale */}
      <SwitchTransition mode="out-in">
        <CSSTransition
          key="bracket-router"
          timeout={300}
          classNames="fade"
          nodeRef={nodeRef}
        >
          <div ref={nodeRef}>
            <Routes>
              <Route path="/" element={<Bracket user={user} />} />
              <Route
                path="/admin"
                element={
                  isAuthorized ? <AdminBracket /> : <Navigate to="/" replace />
                }
              />
            </Routes>
          </div>
        </CSSTransition>
      </SwitchTransition>

      {/* Bouton "Back to Top" */}
      {showScrollTop && (
        <button className="scroll-to-top" onClick={scrollToTop}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="scroll-icon"
          >
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
      )}
    </Router>
  );
}
