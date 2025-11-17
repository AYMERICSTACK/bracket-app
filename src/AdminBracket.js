// src/AdminBracket.js
import React, { useState, useEffect } from "react";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { useNavigate } from "react-router-dom"; // ⬅️ AJOUT
import "./AdminBracket.css";

export default function AdminBracket() {
  const [brackets, setBrackets] = useState({});
  const [discipline, setDiscipline] = useState("");
  const [participant, setParticipant] = useState("");
  const [combats, setCombats] = useState([]);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate(); // ⬅️ AJOUT POUR NAVIGATION

  const DISCIPLINES = ["LightContact", "KickLight", "K1Light", "FullContact"];
  const COULEURS = ["rouge", "bleu"];
  const COACHS = [
    "Chris",
    "Benoit",
    "Guillaume",
    "Nadège",
    "Julien",
    "Mélanie",
  ];

  useEffect(() => {
    fetchBrackets();
  }, []);

  const fetchBrackets = async () => {
    const snapshot = await getDocs(collection(db, "brackets"));
    const data = {};
    snapshot.forEach((docSnap) => {
      data[docSnap.id] = docSnap.data();
    });
    setBrackets(data);
  };

  const addCombat = () => {
    if (!participant || !discipline) {
      alert(
        "Veuillez remplir Discipline et Participant avant d'ajouter un combat."
      );
      return;
    }
    setCombats([
      ...combats,
      {
        etape: "",
        num: "",
        typeCombat: "",
        adversaire: "",
        couleur: "",
        aire: "",
        coach: "",
        statut: "En attente",
        categorie: "",
        date: "",
        time: "",
        participant,
        discipline,
      },
    ]);
  };

  const handleCombatChange = (idx, field, value) => {
    const newCombats = [...combats];
    newCombats[idx][field] = value;
    setCombats(newCombats);
  };

  const saveParticipant = async () => {
    if (!discipline || !participant) {
      alert("Discipline et participant requis !");
      return;
    }
    setLoading(true);
    try {
      const combatsWithParticipant = combats.map((c) => ({
        ...c,
        participant,
        discipline,
      }));

      await setDoc(doc(db, "brackets", `${discipline}_${participant}`), {
        discipline,
        participant,
        combats: combatsWithParticipant,
      });
      alert(
        `✅ ${participant} importé dans ${discipline} (${combats.length} combats)`
      );

      fetchBrackets();
      setCombats([]);
    } catch (err) {
      console.error(err);
      alert("❌ Erreur lors de la sauvegarde");
    }
    setLoading(false);
  };

  const clearAll = async () => {
    if (!window.confirm("Voulez-vous vraiment supprimer tous les brackets ?"))
      return;

    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "brackets"));
      for (const docSnap of snapshot.docs) await deleteDoc(docSnap.ref);
      setBrackets({});
      alert("✅ Tous les documents supprimés");
    } catch (err) {
      console.error(err);
      alert("❌ Erreur lors de la suppression");
    }
    setLoading(false);
  };

  const deleteParticipant = async (docId) => {
    if (!window.confirm("Voulez-vous vraiment supprimer ce participant ?"))
      return;

    setLoading(true);
    try {
      await deleteDoc(doc(db, "brackets", docId));
      setBrackets((prev) => {
        const updated = { ...prev };
        delete updated[docId];
        return updated;
      });
      alert(`✅ Participant supprimé`);
    } catch (err) {
      console.error(err);
      alert("❌ Erreur lors de la suppression du participant");
    }
    setLoading(false);
  };

  const importJSON = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target.result);

        if (
          !window.confirm(
            "⚠️ Cette action va écraser toute la base actuelle. Continuer ?"
          )
        )
          return;

        setLoading(true);

        const snapshot = await getDocs(collection(db, "brackets"));
        for (const docSnap of snapshot.docs) await deleteDoc(docSnap.ref);

        for (const disciplineName in json) {
          const participants = json[disciplineName];

          for (const participantName in participants) {
            const participantData = participants[participantName];
            const combats = (participantData.combats || []).map((c) => ({
              ...c,
              participant: c.participant || participantName,
              discipline: c.discipline || disciplineName,
            }));

            await setDoc(
              doc(db, "brackets", `${disciplineName}_${participantName}`),
              {
                discipline: disciplineName,
                participant: participantName,
                combats,
              }
            );
          }
        }

        alert("✅ Import JSON terminé !");
        fetchBrackets();
      } catch (err) {
        console.error(err);
        alert("❌ Erreur lors de l'import JSON");
      }
      setLoading(false);
    };
    reader.readAsText(file);
  };

  return (
    <div style={{ padding: "20px" }}>
      {/* 🔙 Bouton retour */}
      <button
        onClick={() => navigate("/")}
        style={{
          background: "#444",
          color: "white",
          border: "none",
          padding: "8px 14px",
          borderRadius: "6px",
          cursor: "pointer",
          marginBottom: "15px",
        }}
      >
        🔙 Retour au tableau
      </button>

      <h2>⚡ Admin Bracket</h2>

      {/* --- FORMULAIRE --- */}
      <div style={{ marginBottom: "30px" }}>
        <select
          className="admin-input"
          value={discipline}
          onChange={(e) => setDiscipline(e.target.value)}
          style={{ marginRight: "10px" }}
        >
          <option value="">Discipline</option>
          {DISCIPLINES.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <input
          className="admin-input"
          type="text"
          placeholder="Participant"
          value={participant}
          onChange={(e) => setParticipant(e.target.value)}
          style={{ marginRight: "10px" }}
        />

        <button onClick={addCombat}>➕ Ajouter un combat</button>

        {combats.map((combat, idx) => (
          <div
            key={idx}
            className="combat-card"
            style={{ marginTop: "10px", padding: "10px" }}
          >
            <div className="combat-header">
              <span className="combat-type-badge">
                {combat.typeCombat || "Type"}
              </span>
              <span className={`combat-color ${combat.couleur || ""}`}></span>
            </div>

            <div className="combat-info">
              <input
                className="admin-input"
                type="text"
                placeholder="Adversaire"
                value={combat.adversaire}
                onChange={(e) =>
                  handleCombatChange(idx, "adversaire", e.target.value)
                }
              />

              <select
                className="admin-input"
                value={combat.typeCombat}
                onChange={(e) =>
                  handleCombatChange(idx, "typeCombat", e.target.value)
                }
              >
                <option value="">Type</option>
                {DISCIPLINES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              <select
                className="admin-input"
                value={combat.couleur}
                onChange={(e) =>
                  handleCombatChange(idx, "couleur", e.target.value)
                }
              >
                <option value="">Couleur</option>
                {COULEURS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <input
                className="admin-input"
                type="text"
                placeholder="Aire"
                value={combat.aire}
                onChange={(e) =>
                  handleCombatChange(idx, "aire", e.target.value)
                }
              />

              <select
                className="admin-input"
                value={combat.coach}
                onChange={(e) =>
                  handleCombatChange(idx, "coach", e.target.value)
                }
              >
                <option value="">Coach</option>
                {COACHS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <input
                className="admin-input"
                type="date"
                value={combat.date}
                onChange={(e) =>
                  handleCombatChange(idx, "date", e.target.value)
                }
              />

              <input
                className="admin-input"
                type="time"
                value={combat.time}
                onChange={(e) =>
                  handleCombatChange(idx, "time", e.target.value)
                }
              />
            </div>
          </div>
        ))}

        <div style={{ marginTop: "15px" }}>
          <button onClick={saveParticipant} disabled={loading}>
            💾 Sauvegarder
          </button>

          <button
            onClick={clearAll}
            disabled={loading}
            style={{ marginLeft: "10px" }}
          >
            🗑 Supprimer tous
          </button>

          <label style={{ marginLeft: "10px", cursor: "pointer" }}>
            📂 Importer JSON
            <input
              type="file"
              accept=".json"
              onChange={importJSON}
              style={{ display: "none" }}
            />
          </label>
        </div>
      </div>

      {/* --- LISTE DES PARTICIPANTS --- */}
      <div>
        <h3>📋 Brackets existants</h3>

        {Object.keys(brackets).map((docId) => (
          <div
            key={docId}
            style={{
              position: "relative",
              marginBottom: "20px",
              border: "1px solid #ddd",
              padding: "10px",
              borderRadius: "6px",
              background: "#f9f9f9",
            }}
          >
            <button
              style={{
                position: "absolute",
                right: "10px",
                top: "10px",
                background: "#ff4d4f",
                color: "white",
                border: "none",
                padding: "4px 8px",
                borderRadius: "4px",
                cursor: "pointer",
              }}
              onClick={() => deleteParticipant(docId)}
              disabled={loading}
            >
              ❌ Supprimer
            </button>

            <pre style={{ overflowX: "auto", marginTop: "30px" }}>
              {JSON.stringify(brackets[docId], null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}
