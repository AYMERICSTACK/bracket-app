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
import { db } from "./firebase"; // ton init firebase

export default function AdminBracket() {
  const [brackets, setBrackets] = useState({});
  const [discipline, setDiscipline] = useState("");
  const [participant, setParticipant] = useState("");
  const [combats, setCombats] = useState([]);
  const [loading, setLoading] = useState(false);

  // 🔹 Charger les brackets existants
  const fetchBrackets = async () => {
    const snapshot = await getDocs(collection(db, "brackets"));
    const data = {};
    snapshot.forEach((docSnap) => {
      data[docSnap.id] = docSnap.data();
    });
    setBrackets(data);
  };

  useEffect(() => {
    fetchBrackets();
  }, []);

  // 🔹 Ajouter un combat vide (avec participant et discipline)
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
        participant, // <- important !
      },
    ]);
  };

  // 🔹 Modifier un champ d’un combat
  const handleCombatChange = (index, field, value) => {
    const newCombats = [...combats];
    newCombats[index][field] = value;
    setCombats(newCombats);
  };

  // 🔹 Sauvegarder un participant dans Firestore
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
      setCombats([]); // vider les combats après sauvegarde
    } catch (err) {
      console.error(err);
      alert("❌ Erreur lors de la sauvegarde");
    }
    setLoading(false);
  };

  // 🔹 Supprimer tous les brackets
  const clearAll = async () => {
    if (!window.confirm("Voulez-vous vraiment supprimer tous les brackets ?"))
      return;
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "brackets"));
      for (const docSnap of snapshot.docs) {
        await deleteDoc(docSnap.ref);
      }
      setBrackets({});
      alert("✅ Tous les documents supprimés");
    } catch (err) {
      console.error(err);
      alert("❌ Erreur lors de la suppression");
    }
    setLoading(false);
  };

  // 🔹 Supprimer un participant spécifique
  const deleteParticipant = async (docId) => {
    if (!window.confirm("Voulez-vous vraiment supprimer ce participant ?"))
      return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, "brackets", docId));
      setBrackets((prev) => {
        const newBrackets = { ...prev };
        delete newBrackets[docId];
        return newBrackets;
      });
      alert(`✅ Participant supprimé`);
    } catch (err) {
      console.error(err);
      alert("❌ Erreur lors de la suppression du participant");
    }
    setLoading(false);
  };

  // 🔹 Importer un fichier JSON
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
        // Supprimer tous les documents existants
        const snapshot = await getDocs(collection(db, "brackets"));
        for (const docSnap of snapshot.docs) {
          await deleteDoc(docSnap.ref);
        }

        // Importer le JSON
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
      <h2>⚡ Admin Bracket</h2>

      {/* 🔹 Formulaire ajout/modification */}
      <div style={{ marginBottom: "30px" }}>
        <input
          type="text"
          placeholder="Discipline"
          value={discipline}
          onChange={(e) => setDiscipline(e.target.value)}
          style={{ marginRight: "10px" }}
        />
        <input
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
            style={{
              marginTop: "10px",
              border: "1px solid #ccc",
              padding: "10px",
            }}
          >
            <strong>Combat {idx + 1}</strong>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "10px",
                marginTop: "5px",
              }}
            >
              {Object.keys(combat).map((field) => (
                <input
                  key={field}
                  type="text"
                  placeholder={field}
                  value={combat[field]}
                  onChange={(e) =>
                    handleCombatChange(idx, field, e.target.value)
                  }
                  style={{ flex: "1 0 120px" }}
                />
              ))}
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

      {/* 🔹 Liste des brackets existants avec bouton supprimer par participant */}
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
