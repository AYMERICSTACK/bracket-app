import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "./firebase";

const allowedAdmins = [
  "2VqoJdZpE6NOtSWx3ko7OtzXBFk1",
  "BLqmftqFsgSKtceNI3c76jrdE0p1",
];

export default function UserMenu() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const currentUser = auth.currentUser;
    setUser(currentUser);
    if (currentUser && allowedAdmins.includes(currentUser.uid)) {
      setIsAdmin(true);
    }
  }, []);

  const handleLogout = async () => {
    await auth.signOut();
    setUser(null);
    navigate("/");
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      {user ? (
        <>
          <span>👤 {user.displayName || user.email}</span>
          {isAdmin && (
            <button
              onClick={() => navigate("/admin")}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                backgroundColor: "#2575fc",
                color: "#fff",
                border: "none",
                cursor: "pointer",
              }}
            >
              ⚡ Admin
            </button>
          )}
          <button
            onClick={handleLogout}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              backgroundColor: "#f44336",
              color: "#fff",
              border: "none",
              cursor: "pointer",
            }}
          >
            🔒 Déconnexion
          </button>
        </>
      ) : (
        <button
          onClick={() => navigate("/login")}
          style={{
            padding: "6px 12px",
            borderRadius: "6px",
            backgroundColor: "#4caf50",
            color: "#fff",
            border: "none",
            cursor: "pointer",
          }}
        >
          🔑 Connexion
        </button>
      )}
    </div>
  );
}
