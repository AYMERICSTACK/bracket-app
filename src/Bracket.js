import React, { useState, useEffect, useMemo } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { FaSearch, FaFilter, FaRedo, FaArrowsAltV, FaArrowsAltH } from "react-icons/fa";
import "./Bracket.css";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const ETAPES = ["Tour2", "Tour1", "16ème", "8ème", "Quart", "Demi", "Finale"];
const COLOR_ALL = "Tous";
const TYPE_COMBATS = ["Tous", "LightContact", "KickLight", "K1Light"];
const ALLOWED_UIDS = [
  "2VqoJdZpE6NOtSWx3ko7OtzXBFk1",
  "BLqmftqFsgSKtceNI3c76jrdE0p1",
];

export default function Bracket({ user }) {
  const [columns, setColumns] = useState({}); // ⚠ objet participantId -> [combats]
  const [editingCard, setEditingCard] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [stepFilter, setStepFilter] = useState("Tous");
  const [colorFilter, setColorFilter] = useState(COLOR_ALL);
  const [combatTypeFilter, setCombatTypeFilter] = useState("Tous");
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingReset, setLoadingReset] = useState(false);
  const [isVertical, setIsVertical] = useState(window.innerWidth < 768);
  const [userForcedOrientation, setUserForcedOrientation] = useState(false);
  const [categories, setCategories] = useState(["-37kg","-50kg","-55kg","-60kg","-65kg","-70kg","-75kg"]);
  const [showSidebar, setShowSidebar] = useState(window.innerWidth >= 768);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [searchUpcoming, setSearchUpcoming] = useState("");

  const canEdit = user && ALLOWED_UIDS.includes(user.uid);

  // 🔹 Fetch data
useEffect(() => {
  const fetchData = async () => {
    const snapshot = await getDocs(collection(db, "brackets"));
    const data = {};
    snapshot.forEach(docSnap => {
      const combats = docSnap.data().combats || [];
      // ⚡ Ajouter docId à chaque combat
      const combatsWithDocId = combats.map(c => ({ ...c, docId: docSnap.id }));
      data[docSnap.id] = combatsWithDocId;
    });
    setColumns(data);
  };
  fetchData();
}, []);


  // 🔹 Responsive
useEffect(() => {
  const handleResize = () => {
    if (userForcedOrientation) return; // ⚡ Ne rien faire si l'utilisateur a forcé
    const mobile = window.innerWidth < 768;
    setIsVertical(mobile);
    if (!mobile) setShowSidebar(true);
  };

  window.addEventListener("resize", handleResize);
  handleResize();

  return () => window.removeEventListener("resize", handleResize);
}, [userForcedOrientation]);


  const normalizeText = str => (str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const hasLostBefore = (participant, currentEtape) => {
    const currentIndex = ETAPES.indexOf(currentEtape);
    if (currentIndex <= 0) return false;
    const combats = columns[participant] || [];
    for (let i = 0; i < currentIndex; i++) {
      if (combats.some(c => c.etape === ETAPES[i] && (c.statut || "").toLowerCase() === "perdu")) {
        return true;
      }
    }
    return false;
  };
const handleToggleOrientation = () => {
  setIsVertical(prev => !prev);
  setUserForcedOrientation(true); // ⚡ On indique que l’utilisateur force le mode
};


  // 🔹 Tous les combats aplatis
  const allCombats = useMemo(() => {
    let arr = [];
    Object.values(columns).forEach(fighterCombats => {
      arr = arr.concat(fighterCombats);
    });
    if (combatTypeFilter !== "Tous") {
      arr = arr.filter(c => (c.typeCombat || "").toLowerCase() === combatTypeFilter.toLowerCase());
    }
    return arr;
  }, [columns, combatTypeFilter]);

  // 🔹 Colonnes visibles par étape
  const visibleColumns = useMemo(() => {
    const term = normalizeText(searchTerm.trim());
    return ETAPES.map(etape =>
      allCombats.filter(c => {
        const participant = normalizeText(c.participant);
        const adversaire = normalizeText(c.adversaire);
        if (stepFilter !== "Tous" && c.etape !== stepFilter) return false;
        if (colorFilter !== COLOR_ALL && (c.couleur || "").toLowerCase() !== colorFilter.toLowerCase()) return false;
        if (term && !(participant.includes(term) || adversaire.includes(term))) return false;
        if (hasLostBefore(c.participant, etape)) return false;
        if (c.hiddenAfterLoss) return false;
        return c.etape === etape;
      })
    );
  }, [allCombats, stepFilter, colorFilter, searchTerm, columns]);

  const visibleFlat = visibleColumns.flat();

  const upcomingCombats = useMemo(() => {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const oneHourLaterMinutes = nowMinutes + 60;
    return visibleFlat
      .filter(c => c.heure)
      .filter(c => {
        const [h, m] = c.heure.split(":").map(Number);
        if (isNaN(h) || isNaN(m)) return false;
        const combatMinutes = h * 60 + m;
        return combatMinutes >= nowMinutes && combatMinutes <= oneHourLaterMinutes;
      })
      .sort((a, b) => {
        const [ah, am] = a.heure.split(":").map(Number);
        const [bh, bm] = b.heure.split(":").map(Number);
        return ah*60+am - (bh*60+bm);
      });
  }, [visibleFlat]);

  const countVisibleColor = color =>
    visibleFlat.filter(c => (c.couleur || "").toLowerCase() === color.toLowerCase()).length;

  // 🔹 Sauvegarde après édition
const handleSave = async (docId, num) => {
  if (!canEdit) return;

  const newColumns = { ...columns };
  const combats = newColumns[docId] || [];

  newColumns[docId] = combats.map(c =>
    c.num === num ? { ...c, ...editValues } : c
  );

  setColumns(newColumns);
  setEditingCard(null);
  setEditValues({});

  try {
    const docRef = doc(db, "brackets", docId); // 🔹 Utiliser docId ici
    await updateDoc(docRef, { combats: newColumns[docId] });
  } catch (err) {
    console.error("Erreur updateDoc:", err);
  }
};

  // 🔹 Changement de statut Gagné / Perdu
const handleStatusChange = async (combat, statutValue) => {
  if (!canEdit) return;

  const newColumns = { ...columns };
  const currentEtapeIndex = ETAPES.indexOf(combat.etape);
  const combats = newColumns[combat.docId] || [];

  newColumns[combat.docId] = combats.map(c => {
    if (c.num === combat.num) c = { ...c, statut: statutValue };

    if (c.participant === combat.participant && statutValue === "perdu") {
      const etapeIndex = ETAPES.indexOf(c.etape);
      if (etapeIndex > currentEtapeIndex) return { ...c, hiddenAfterLoss: true };
    }

    if (c.hiddenAfterLoss && statutValue !== "perdu") {
      c = { ...c, hiddenAfterLoss: false };
    }

    return c;
  });

  setColumns(newColumns);

  try {
    const docRef = doc(db, "brackets", combat.docId); // 🔹 Utiliser docId ici
    await updateDoc(docRef, { combats: newColumns[combat.docId] });
  } catch (err) {
    console.error("Erreur updateDoc statut:", err);
  }
};

  // 🔹 Reset statuts
  const handleResetStatuses = async () => {
    if (!canEdit) return;
    if (!window.confirm("Réinitialiser tous les statuts ?")) return;
    setLoadingReset(true);
    try {
      const snapshot = await getDocs(collection(db, "brackets"));
      const updates = [];
      snapshot.forEach(docSnap => {
        const combats = (docSnap.data().combats || []).map(c => ({ ...c, statut: "non_joué", hiddenAfterLoss: false }));
        updates.push(updateDoc(doc(db, "brackets", docSnap.id), { combats }));
      });
      await Promise.all(updates);
      const newCols = { ...columns };
      Object.keys(newCols).forEach(p => {
        newCols[p] = newCols[p].map(c => ({ ...c, statut: "non_joué", hiddenAfterLoss: false }));
      });
      setColumns(newCols);
    } catch (err) {
      console.error("Erreur reset statuts:", err);
    } finally {
      setLoadingReset(false);
    }
  };


  // 🔹 Export PDF
  const handleExportPDF = () => {
    const doc = new jsPDF("p", "pt");
    const date = new Date().toLocaleDateString("fr-FR");
    doc.setFontSize(16);
    doc.text("Bilan des combats - Bracket", 40, 40);
    doc.setFontSize(10);
    doc.text(`Exporté le ${date}`, 40, 55);

    const rows = visibleFlat.map(c => [
      c.participant, c.adversaire, c.categorie, c.couleur,
      c.statut === "gagné" ? "✅ Gagné" : c.statut === "perdu" ? "❌ Perdu" : "⏳ Non joué",
      c.heure || "-", c.aire || "-", c.coach || "-"
    ]);

    autoTable(doc, {
      head: [["Participant", "Adversaire", "Catégorie", "Couleur", "Statut", "Heure", "Aire", "Coach"]],
      body: rows,
      startY: 80,
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [80, 128, 255] },
    });
    doc.save(`bracket_${date}.pdf`);
  };

  return (
    <div className="bracket-wrapper">
      {/* Status Banner */}
      <div className={`status-banner ${user ? (canEdit ? "authorized" : "readonly") : "non-connected"}`}>
        {user ? (canEdit ? "✅ Connecté et autorisé" : "⚠️ Connecté en lecture seule") : "🔒 Non connecté"}
      </div>

      {/* Controls */}
      <div className="controls">
        <div className="controls-left">
          <div className="combat-type-filter">
            {TYPE_COMBATS.map(type => (
              <button key={type} className={`${type} ${combatTypeFilter === type ? "active" : ""}`} onClick={() => setCombatTypeFilter(type)}>
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="controls-right">
          <div className="color-filters">
            <div className={`color-box rouge ${colorFilter === "Rouge" ? "active" : ""}`} onClick={() => setColorFilter(colorFilter === "Rouge" ? COLOR_ALL : "Rouge")}>🔴 {countVisibleColor("Rouge")}</div>
            <div className={`color-box bleu ${colorFilter === "Bleu" ? "active" : ""}`} onClick={() => setColorFilter(colorFilter === "Bleu" ? COLOR_ALL : "Bleu")}>🔵 {countVisibleColor("Bleu")}</div>
            <div className={`color-box tous ${colorFilter === COLOR_ALL ? "active" : ""}`} onClick={() => setColorFilter(COLOR_ALL)}>⚪ Tous</div>
          </div>

          <div className="controls-row">
            <div className="filter-wrapper">
              <FaFilter className="icon" />
              <select className="step-filter" value={stepFilter} onChange={e => setStepFilter(e.target.value)}>
                <option value="Tous">Toutes les étapes</option>
                {ETAPES.map(et => <option key={et} value={et}>{et}</option>)}
              </select>
            </div>

            <div className="search-wrapper">
              <FaSearch className="icon" />
              <input type="text" className="search-input" placeholder="Rechercher un participant ou adversaire" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>

          <div className="search-reset-wrapper">
            <button className="reset-btn" onClick={handleResetStatuses} disabled={!canEdit || loadingReset}>
              <FaRedo style={{ marginRight: 6 }} />
              {loadingReset ? "Réinitialisation..." : "Réinitialiser les statuts"}
            </button>
          </div>

          {canEdit && (
            <button className="export-btn" onClick={handleExportPDF} disabled={!visibleFlat.length}>
              📄 Exporter en PDF
            </button>
          )}

          {isMobile && (
            <div className="toggle-orientation">
              <button onClick={handleToggleOrientation}>
                {isVertical ? <FaArrowsAltV /> : <FaArrowsAltH />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Bracket + Sidebar */}
      <div className="main-bracket-container" style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>

        {/* Sidebar toggle pour mobile */}
        {isVertical && (
          <button
            onClick={() => setShowSidebar(prev => !prev)}
            style={{
              marginBottom: "10px",
              padding: "6px 12px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "#2575fc",
              color: "#fff",
              cursor: "pointer"
            }}
          >
            {showSidebar ? "Masquer les combats à venir" : "Afficher les combats à venir"}
          </button>
        )}

        {/* Sidebar */}
        {showSidebar && (
          <div className="sidebar" style={{ width: "225px", flexShrink: 0 }}>
            <h3>Combats à venir</h3>

            <div className="sidebar-search">
              <input
                type="text"
                placeholder="Rechercher un participant"
                value={searchUpcoming}
                onChange={e => setSearchUpcoming(e.target.value)}
              />
            </div>

            {upcomingCombats
              .filter(c => !searchUpcoming || c.participant.toLowerCase().includes(searchUpcoming.toLowerCase()))
              .map(c => (
                <div key={`${c.participant}-${c.num}`} className="sidebar-combat">
                  <div>
                    <strong>{c.heure}</strong> - 
                    <span className={`helmet ${c.couleur?.toLowerCase()}`}></span>
                    {c.participant} vs {c.adversaire}
                  </div>
                  <div>Catégorie: {c.categorie} | Aire {c.aire}</div>
                </div>
              ))
            }
          </div>
        )}

        {/* Bracket */}
        <div className={`bracket-container ${isVertical ? "vertical" : "horizontal"}`} style={{ flex: 1 }}>
          {visibleColumns.map((col, colIdx) => {
            if (!col || col.length === 0) return null;
            return (
              <div className="bracket-column" key={colIdx}>
                <h3>{ETAPES[colIdx]}</h3>
                {col.map((combat, idx) => {
                  const isEditing =
  editingCard &&
  editingCard.docId === combat.docId &&
  editingCard.num === combat.num;

                  const statutLower = (combat.statut || "").toLowerCase();

                  return (
                    <div className={`combat-card-wrapper ${statutLower === "perdu" ? "dimmed" : ""}`} key={`${combat.participant}-${combat.num}-${idx}`}>
                      <div className={`combat-card ${(combat.couleur || "").toLowerCase() === "rouge" ? "rouge" : "bleu"} ${statutLower === "gagné" ? "gagné" : statutLower === "perdu" ? "perdu" : ""}`}>
                        
                        <div className="status-badge">{statutLower === "gagné" ? "✅ Gagné" : statutLower === "perdu" ? "❌ Perdu" : ""}</div>
                        <div className="etape-badge">{combat.etape}</div>
                        
                        {/* Badge type combat */}
                        <div className={`type-badge ${combat.typeCombat || ""}`}>
                          {combat.typeCombat === "LightContact" && "⚡ LightContact"}
                          {combat.typeCombat === "KickLight" && "🥷 KickLight"}
                          {combat.typeCombat === "K1Light" && "🔥 K1Light"}
                        </div>

                        <div className="coach-badge">🎯 Coach : {combat.coach}</div>
                        <div className="categorie-badge">🏷 {combat.categorie}</div>

                        {/* Edition */}
                        {isEditing && canEdit ? (
                          <div className="editing-fields">
                            <input defaultValue={combat.participant} disabled />
                            <input defaultValue={combat.adversaire} onChange={e => setEditValues(s => ({ ...s, adversaire: e.target.value }))}/>
                            <input defaultValue={combat.num} onChange={e => setEditValues(s => ({ ...s, num: e.target.value }))}/>
                            <input defaultValue={combat.heure} onChange={e => setEditValues(s => ({ ...s, heure: e.target.value }))}/>
                            <input defaultValue={combat.aire} onChange={e => setEditValues(s => ({ ...s, aire: e.target.value }))}/>
                            <select defaultValue={combat.couleur} onChange={e => setEditValues(s => ({ ...s, couleur: e.target.value }))}>
                              <option value="Rouge">Rouge</option>
                              <option value="Bleu">Bleu</option>
                            </select>
                            <select defaultValue={combat.coach} onChange={e => setEditValues(s => ({ ...s, coach: e.target.value }))}>
                              {["Mélanie", "Nadège", "Christophe", "Guillaume"].map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <input list="categories" defaultValue={combat.categorie} onChange={e => setEditValues(s => ({ ...s, categorie: e.target.value }))}/>
                            <datalist id="categories">{categories.map(cat => <option key={cat} value={cat} />)}</datalist>
                            <div className="edit-buttons">
                              <button onClick={() => handleSave(combat.docId, combat.num)}>✅ Valider</button>
                              <button onClick={() => { setEditingCard(null); setEditValues({}); }}>❌ Annuler</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="participant">{combat.participant}</div>
                            <div className="versus">vs {combat.adversaire}</div>
                            <div className="combat-info">#{combat.num} - {combat.heure} - Aire {combat.aire}</div>
                            <div className="status-buttons">
                              <button className={`btn-win ${statutLower === "gagné" ? "active" : ""}`} onClick={() => canEdit && handleStatusChange(combat,"gagné")}>Gagné</button>
                              <button className={`btn-lose ${statutLower === "perdu" ? "active" : ""}`} onClick={() => canEdit && handleStatusChange(combat,"perdu")}>Perdu</button>
                            </div>
                            {canEdit && <button className="edit-btn" onClick={() => { setEditingCard({ docId: combat.docId, num: combat.num }); setEditValues({...combat}); }}>Modifier</button>}
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
      </div>
    </div>
  );
}
