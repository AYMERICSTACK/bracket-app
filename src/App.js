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
    setShowLogin(false); // fermeture automatique de la pop-up
  };

  const isAuthorized = user && ALLOWED_UIDS.includes(user.uid);

  return (
    <div>
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

  <div className="banner-right">
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




      {/* Affichage d’un lien Retour si pas connecté */}
      {!user && showLogin && (
        <div style={{ textAlign: "center", marginBottom: "10px" }}>
          🔙{" "}
          <span
            style={{ color: "#007bff", cursor: "pointer" }}
            onClick={() => setShowLogin(false)}
          >
            Retour au Bracket
          </span>
        </div>
      )}

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
