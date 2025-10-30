import React, { useState, useEffect, useRef } from "react";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import Login from "./Login";
import Bracket from "./Bracket";
import { CSSTransition, SwitchTransition } from "react-transition-group";
import "./App.css";

const ALLOWED_UIDS = [
  "2VqoJdZpE6NOtSWx3ko7OtzXBFk1",
  "BLqmftqFsgSKtceNI3c76jrdE0p1",
];

export default function App() {
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const auth = getAuth();
  const nodeRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, [auth]);

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const isAuthorized = user && ALLOWED_UIDS.includes(user.uid);

  return (
    <div>
      {/* Bandeau connexion */}
      <div
        style={{
          background: user
            ? isAuthorized
              ? "#d4edda"
              : "#fff3cd"
            : "#f8d7da",
          color: "#333",
          padding: "10px 20px",
          borderRadius: "8px",
          margin: "10px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          {user ? (
            isAuthorized ? (
              <b>✅ Connecté et autorisé à modifier</b>
            ) : (
              <b>⚠️ Connecté, lecture seule</b>
            )
          ) : (
            <b>👋 Bienvenue — lecture seule</b>
          )}
        </div>

        <div>
          {user ? (
            <button
              onClick={handleLogout}
              style={{
                padding: "5px 10px",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                background: "#ff4d4d",
                color: "#fff",
                fontWeight: "bold",
              }}
            >
              Déconnexion
            </button>
          ) : (
            <button
              onClick={() => setShowLogin(true)}
              style={{
                padding: "5px 10px",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                background: "#007bff",
                color: "#fff",
                fontWeight: "bold",
              }}
            >
              Connexion coach 🔐
            </button>
          )}
        </div>
      </div>

      {/* Transition principale */}
      <SwitchTransition mode="out-in">
        <CSSTransition
          key={"bracket"}
          timeout={300}
          classNames="fade"
          nodeRef={nodeRef}
        >
          <div ref={nodeRef}>
            <Bracket user={user} />
          </div>
        </CSSTransition>
      </SwitchTransition>

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
    </div>
  );
}
