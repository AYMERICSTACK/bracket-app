import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { FaSearch, FaFilter, FaRedo, FaArrowsAltV, FaArrowsAltH } from "react-icons/fa";
import "./Bracket.css";

const ETAPES = ["16ème", "8ème", "Quart", "Demi", "Finale"];
const COLOR_ALL = "Tous";
const ALLOWED_UIDS = [
  "2VqoJdZpE6NOtSWx3ko7OtzXBFk1",
  "BLqmftqFsgSKtceNI3c76jrdE0p1",
];
const CATEGORIES = ["-37kg","-50kg","-55kg","-60kg","-65kg","-70kg","-75kg"];

export default function Bracket({ user }) {
  const [columns, setColumns] = useState([]);
  const [editingCard, setEditingCard] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [stepFilter, setStepFilter] = useState("Tous");
  const [colorFilter, setColorFilter] = useState(COLOR_ALL);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingReset, setLoadingReset] = useState(false);
  const [isVertical, setIsVertical] = useState(window.innerWidth < 768);

  const canEdit = user && ALLOWED_UIDS.includes(user.uid);

  useEffect(() => {
    const handleResize = () => setIsVertical(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const snapshot = await getDocs(collection(db, "brackets"));
      const data = {};
      snapshot.forEach(docSnap => {
        data[docSnap.id] = docSnap.data().combats || [];
      });
      const cols = ETAPES.map(etape => {
        const arr = [];
        for (const key in data) {
          data[key].forEach(c => {
            if ((c.etape || "").toLowerCase() === etape.toLowerCase()) arr.push(c);
          });
        }
        return arr;
      });
      setColumns(cols);
    };
    fetchData();
  }, []);

  const handleSave = async (participantId, num) => {
    if (!canEdit) return;

    const newCols = columns.map(col =>
      col.map(c => (c.participant === participantId && c.num === num ? { ...c, ...editValues } : c))
    );
    setColumns(newCols);
    setEditingCard(null);
    setEditValues({});

    try {
      const docRef = doc(db, "brackets", participantId);
      const participantCombats = newCols.flat().filter(c => c.participant === participantId);
      await updateDoc(docRef, { combats: participantCombats });
    } catch (err) {
      console.error("Erreur updateDoc:", err);
    }
  };

  const handleStatusChange = async (combat, statutValue) => {
    if (!canEdit) return;

    const newCols = columns.map(col =>
      col.map(c => (c.participant === combat.participant && c.num === combat.num ? { ...c, statut: statutValue } : c))
    );
    setColumns(newCols);

    try {
      const docRef = doc(db, "brackets", combat.participant);
      const participantCombats = newCols.flat().filter(c => c.participant === combat.participant);
      await updateDoc(docRef, { combats: participantCombats });
    } catch (err) {
      console.error("Erreur updateDoc statut:", err);
    }
  };

  const handleResetStatuses = async () => {
    if (!canEdit) return;
    if (!window.confirm("Réinitialiser tous les statuts ?")) return;

    setLoadingReset(true);
    try {
      const bracketCol = collection(db, "brackets");
      const snapshot = await getDocs(bracketCol);

      const updates = [];
      snapshot.forEach(docSnap => {
        const combats = (docSnap.data().combats || []).map(c => ({ ...c, statut: "non_joué" }));
        updates.push(updateDoc(doc(db, "brackets", docSnap.id), { combats }));
      });
      await Promise.all(updates);

      const newCols = columns.map(col => col.map(c => ({ ...c, statut: "non_joué" })));
      setColumns(newCols);
    } catch (err) {
      console.error("Erreur reset statuts:", err);
    } finally {
      setLoadingReset(false);
    }
  };

  const hasLostBefore = (participant, currentEtape) => {
    const currentIndex = ETAPES.indexOf(currentEtape);
    if (currentIndex <= 0) return false;
    for (let i = 0; i < currentIndex; i++) {
      const col = columns[i] || [];
      for (const c of col) {
        if (c.participant === participant && (c.statut || "").toLowerCase() === "perdu") return true;
      }
    }
    return false;
  };

  const getVisibleColumns = () => {
    const term = (searchTerm || "").trim().toLowerCase();
    return columns.map(col => col.filter(c => {
      if (stepFilter !== "Tous" && c.etape !== stepFilter) return false;
      if (colorFilter !== COLOR_ALL && (c.couleur || "").toLowerCase() !== colorFilter.toLowerCase()) return false;
      if (term && !((c.participant || "").toLowerCase().includes(term) || (c.adversaire || "").toLowerCase().includes(term))) return false;
      if (hasLostBefore(c.participant, c.etape)) return false;
      return true;
    }));
  };

  const visibleColumns = getVisibleColumns();
  const visibleFlat = visibleColumns.flat();
  const countVisibleColor = (color) => visibleFlat.filter(c => (c.couleur || "").toLowerCase() === color.toLowerCase()).length;

  return (
    <>
      <div
        style={{
          background: user
            ? canEdit
              ? "#d4edda"
              : "#fff3cd"
            : "#f8d7da",
          color: "#333",
          padding: "10px",
          borderRadius: "8px",
          margin: "10px",
          textAlign: "center",
        }}
      >
        {user ? (
          canEdit ? "✅ Connecté et autorisé à modifier" : "⚠️ Connecté, lecture seule"
        ) : (
          "🔒 Non connecté — lecture seule"
        )}
      </div>

      {/* CONTROLS */}
      <div className="controls">
        <div className="toggle-orientation">
          <button onClick={() => setIsVertical(!isVertical)}>
            {isVertical ? <FaArrowsAltH /> : <FaArrowsAltV />}
          </button>
        </div>

        <div className="color-filters">
          <div className={`color-box rouge ${colorFilter === "Rouge" ? "active" : ""}`} onClick={() => setColorFilter(colorFilter === "Rouge" ? COLOR_ALL : "Rouge")}>
            🔴 {countVisibleColor("Rouge")}
          </div>
          <div className={`color-box bleu ${colorFilter === "Bleu" ? "active" : ""}`} onClick={() => setColorFilter(colorFilter === "Bleu" ? COLOR_ALL : "Bleu")}>
            🔵 {countVisibleColor("Bleu")}
          </div>
          <div className={`color-box tous ${colorFilter === COLOR_ALL ? "active" : ""}`} onClick={() => setColorFilter(COLOR_ALL)}>
            ⚪ Tous
          </div>
        </div>

        <div className="filter-wrapper">
          <FaFilter className="icon" />
          <select className="step-filter" value={stepFilter} onChange={(e) => setStepFilter(e.target.value)}>
            <option value="Tous">Toutes les étapes</option>
            {ETAPES.map(et => <option key={et} value={et}>{et}</option>)}
          </select>
        </div>

        <div className="search-wrapper">
          <FaSearch className="icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Rechercher un participant ou adversaire"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button className="reset-btn" onClick={handleResetStatuses} disabled={!canEdit || loadingReset}>
          <FaRedo style={{ marginRight: 6 }} />
          {loadingReset ? "Réinitialisation..." : "Réinitialiser les statuts"}
        </button>
      </div>

      {/* BRACKET */}
      <div className={`bracket-container ${isVertical ? "vertical" : "horizontal"}`}>
        {visibleColumns.map((col, colIdx) => {
          if (!col || col.length === 0) return null;
          if (stepFilter !== "Tous" && stepFilter !== ETAPES[colIdx]) return null;

          return (
            <div className="bracket-column" key={colIdx}>
              <h3>{ETAPES[colIdx]}</h3>
              {col.map((combat, idx) => {
                const isEditing = editingCard && editingCard.participant === combat.participant && editingCard.num === combat.num;
                const statutLower = (combat.statut || "").toLowerCase();

                return (
                  <div className={`combat-card-wrapper ${statutLower === "perdu" ? "dimmed" : ""}`} key={`${combat.participant}-${combat.num}-${idx}`}>
                    <div className={`combat-card ${(combat.couleur || "").toLowerCase() === "rouge" ? "rouge" : "bleu"}`}>
                      <div className={`status-badge ${statutLower}`}>
                        {statutLower === "gagné" ? "✅ Gagné" : statutLower === "perdu" ? "❌ Perdu" : ""}
                      </div>
                      <div className="etape-badge">{combat.etape}</div>
                      <div className="coach-badge">🎯 Coach : {combat.coach}</div>
                      <div className="categorie-badge">🏷 {combat.categorie}</div>

                      {isEditing && canEdit ? (
                        <div className="editing-fields">
                          <input defaultValue={combat.participant} disabled />
                          <input defaultValue={combat.adversaire} onChange={(e) => setEditValues(s => ({ ...s, adversaire: e.target.value }))} />
                          <input defaultValue={combat.num} onChange={(e) => setEditValues(s => ({ ...s, num: e.target.value }))} />
                          <input defaultValue={combat.heure} onChange={(e) => setEditValues(s => ({ ...s, heure: e.target.value }))} />
                          <input defaultValue={combat.aire} onChange={(e) => setEditValues(s => ({ ...s, aire: e.target.value }))} />
                          <select defaultValue={combat.couleur} onChange={(e) => setEditValues(s => ({ ...s, couleur: e.target.value }))}>
                            <option value="Rouge">Rouge</option>
                            <option value="Bleu">Bleu</option>
                          </select>
                          <select defaultValue={combat.coach} onChange={(e) => setEditValues(s => ({ ...s, coach: e.target.value }))}>
                            {["Mélanie","Nadège","Christophe","Guillaume"].map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                              <input
                                list="categories-list"
                                defaultValue={combat.categorie}
                                onChange={(e) => setEditValues(s => ({ ...s, categorie: e.target.value }))}
                                placeholder="Entrez une catégorie"
                              />
                              <datalist id="categories-list">
                                {CATEGORIES.map(cat => <option key={cat} value={cat} />)}
                              </datalist>

                          <div className="edit-buttons">
                            <button onClick={() => handleSave(combat.participant, combat.num)}>✅ Valider</button>
                            <button onClick={() => { setEditingCard(null); setEditValues({}); }}>❌ Annuler</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="participant">{combat.participant}</div>
                          <div className="versus">vs {combat.adversaire}</div>
                          <div className="combat-info">#{combat.num} - {combat.heure} - Aire {combat.aire}</div>
                          <div className="status-buttons">
                            <button className={`btn-win ${statutLower === "gagné" ? "active" : ""}`} onClick={() => canEdit && handleStatusChange(combat, "gagné")}>Gagné</button>
                            <button className={`btn-lose ${statutLower === "perdu" ? "active" : ""}`} onClick={() => canEdit && handleStatusChange(combat, "perdu")}>Perdu</button>
                          </div>
                          {canEdit && <button className="edit-btn" onClick={() => {
                            setEditingCard({ participant: combat.participant, num: combat.num });
                            setEditValues({
                              adversaire: combat.adversaire,
                              num: combat.num,
                              heure: combat.heure,
                              aire: combat.aire,
                              couleur: combat.couleur,
                              coach: combat.coach,
                              categorie: combat.categorie
                            });
                          }}>Modifier</button>}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </>
  );
}
