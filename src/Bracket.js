import React, { useState, useEffect, useMemo, useCallback } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import {
  FaSearch,
  FaFilter,
  FaRedo,
  FaArrowsAltV,
  FaArrowsAltH,
} from "react-icons/fa";
import "./Bracket.css";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const mobileQuery = window.matchMedia("(max-width: 768px)");
const ETAPES = ["Tour2", "Tour1", "16ème", "8ème", "Quart", "Demi", "Finale"];
const COLOR_ALL = "Tous";
const TYPE_COMBATS = ["Tous", "LightContact", "KickLight", "K1Light"];
const ALLOWED_UIDS = [
  "2VqoJdZpE6NOtSWx3ko7OtzXBFk1",
  "BLqmftqFsgSKtceNI3c76jrdE0p1",
];

export default function Bracket({ user }) {
  const [columns, setColumns] = useState({});
  const [editingCard, setEditingCard] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [stepFilter, setStepFilter] = useState("Tous");
  const [colorFilter, setColorFilter] = useState(COLOR_ALL);
  const [combatTypeFilter, setCombatTypeFilter] = useState("Tous");
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingReset, setLoadingReset] = useState(false);
  const [isVertical, setIsVertical] = useState(mobileQuery.matches);
  const [userForcedOrientation, setUserForcedOrientation] = useState(false);
  const [categories] = useState([
    "-37kg",
    "-50kg",
    "-55kg",
    "-60kg",
    "-65kg",
    "-70kg",
    "-75kg",
  ]);
  const [showSidebar, setShowSidebar] = useState(window.innerWidth >= 768);
  const [isMobile, setIsMobile] = useState(mobileQuery.matches);
  const [searchUpcoming, setSearchUpcoming] = useState("");

  const canEdit = user && ALLOWED_UIDS.includes(user.uid);

  const normalizeText = (str) =>
    (str || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const [, month, day] = dateStr.split("-");
    return `${day}/${month}`;
  };

  // 🔹 Fetch data
  useEffect(() => {
    const fetchData = async () => {
      const snapshot = await getDocs(collection(db, "brackets"));
      const data = {};
      snapshot.forEach((docSnap) => {
        const combats = docSnap.data().combats || [];
        const combatsWithDocId = combats.map((c) => ({
          ...c,
          docId: docSnap.id,
        }));
        data[docSnap.id] = combatsWithDocId;
      });
      setColumns(data);
    };
    fetchData();
  }, []);

  // 🔹 Responsive
  useEffect(() => {
    const handleResize = () => {
      if (userForcedOrientation) return;
      const mobile = window.innerWidth < 768;
      setIsVertical(mobile);
      setIsMobile(mobile);
      setShowSidebar(!mobile);
    };
    if (!userForcedOrientation) {
      window.addEventListener("resize", handleResize);
      handleResize();
    }
    return () => window.removeEventListener("resize", handleResize);
  }, [userForcedOrientation]);

  // 🔹 useCallback pour hasLostBefore
  const hasLostBefore = useCallback(
    (participant, currentEtape) => {
      const currentIndex = ETAPES.indexOf(currentEtape);
      if (currentIndex <= 0) return false;
      const combats = columns[participant] || [];
      for (let i = 0; i < currentIndex; i++) {
        if (
          combats.some(
            (c) =>
              c.etape === ETAPES[i] &&
              (c.statut || "").toLowerCase() === "perdu"
          )
        ) {
          return true;
        }
      }
      return false;
    },
    [columns]
  );

  const handleToggleOrientation = () => {
    setIsVertical((prev) => !prev);
    setUserForcedOrientation(true);
  };

  // 🔹 Tous les combats aplatis
  const allCombats = useMemo(() => {
    let arr = [];
    Object.values(columns).forEach((fighterCombats) => {
      arr = arr.concat(fighterCombats);
    });
    if (combatTypeFilter !== "Tous") {
      arr = arr.filter(
        (c) =>
          (c.typeCombat || "").toLowerCase() === combatTypeFilter.toLowerCase()
      );
    }
    return arr;
  }, [columns, combatTypeFilter]);

  // 🔹 Colonnes visibles par étape avec tri par date + heure
  const visibleColumns = useMemo(() => {
    const term = normalizeText(searchTerm.trim());
    return ETAPES.map((etape) => {
      const filtered = allCombats.filter((c) => {
        const participant = normalizeText(c.participant);
        const adversaire = normalizeText(c.adversaire);

        // Filtre par étape
        if (stepFilter !== "Tous" && c.etape !== stepFilter) return false;

        // Filtre par couleur
        if (
          colorFilter !== COLOR_ALL &&
          (c.couleur || "").toLowerCase() !== colorFilter.toLowerCase()
        )
          return false;

        // Filtre par recherche de terme
        if (term && !(participant.includes(term) || adversaire.includes(term)))
          return false;

        // Filtrer les combats perdus
        if (c.statut === "perdu") return false;

        // Filtrer les combats déjà perdus avant cette étape (fonction personnalisée)
        if (hasLostBefore(c.participant, etape)) return false;

        // Combats cachés après une défaite
        if (c.hiddenAfterLoss) return false;

        return c.etape === etape;
      });

      // Tri par date puis par heure
      filtered.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        const [ah, am] = (a.time || "00:00").split(":").map(Number);
        const [bh, bm] = (b.time || "00:00").split(":").map(Number);
        return ah * 60 + am - (bh * 60 + bm);
      });

      return filtered;
    });
  }, [allCombats, stepFilter, colorFilter, searchTerm, hasLostBefore]);

  // Combats visibles dans un tableau plat
  const visibleFlat = visibleColumns.flat();

  // 🔹 Combats à venir
  const upcomingCombats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10); // yyyy-mm-dd
    const nowMinutes = now.getHours() * 60 + now.getMinutes(); // temps actuel en minutes

    return visibleFlat
      .filter((c) => c.date === todayStr) // Combats du jour
      .filter((c) => c.time) // Les combats doivent avoir une heure définie
      .filter((c) => !["gagné", "perdu"].includes(c.status)) // Exclure les combats gagnés ou perdus
      .filter((c) => {
        const [h, m] = c.time.split(":").map(Number); // Conversion de l'heure en minutes
        if (isNaN(h) || isNaN(m)) return false; // Si l'heure est invalide, ignorer ce combat
        const combatMinutes = h * 60 + m;
        return combatMinutes >= nowMinutes && combatMinutes <= nowMinutes + 60; // Combats dans l'heure à venir
      })
      .sort((a, b) => {
        const [ah, am] = a.time.split(":").map(Number);
        const [bh, bm] = b.time.split(":").map(Number);
        return ah * 60 + am - (bh * 60 + bm); // Tri par heure
      })
      .map((combat) => {
        const [h, m] = combat.time.split(":").map(Number);
        const combatMinutes = h * 60 + m;

        // Détection du retard
        const isLate = combatMinutes < nowMinutes; // Combat en retard si l'heure est déjà passée

        return {
          ...combat,
          isLate, // Ajout de la propriété "isLate"
        };
      });
  }, [visibleFlat]);

  const countVisibleColor = (color) =>
    visibleFlat.filter(
      (c) => (c.couleur || "").toLowerCase() === color.toLowerCase()
    ).length;

  // 🔹 Sauvegarde après édition
  const handleSave = async (docId, num) => {
    if (!canEdit) return;
    const newColumns = { ...columns };
    const combats = newColumns[docId] || [];
    newColumns[docId] = combats.map((c) =>
      c.num === num ? { ...c, ...editValues } : c
    );
    setColumns(newColumns);
    setEditingCard(null);
    setEditValues({});
    try {
      await updateDoc(doc(db, "brackets", docId), {
        combats: newColumns[docId],
      });
    } catch (err) {
      console.error("Erreur updateDoc:", err);
    }
  };

  const handleStatusChange = async (combat, statutValue) => {
    if (!canEdit) return;
    const newColumns = { ...columns };
    const currentEtapeIndex = ETAPES.indexOf(combat.etape);
    const combats = newColumns[combat.docId] || [];
    newColumns[combat.docId] = combats.map((c) => {
      if (c.num === combat.num) c = { ...c, statut: statutValue };
      if (c.participant === combat.participant && statutValue === "perdu") {
        const etapeIndex = ETAPES.indexOf(c.etape);
        if (etapeIndex > currentEtapeIndex)
          return { ...c, hiddenAfterLoss: true };
      }
      if (c.hiddenAfterLoss && statutValue !== "perdu")
        c = { ...c, hiddenAfterLoss: false };
      return c;
    });
    setColumns(newColumns);
    try {
      await updateDoc(doc(db, "brackets", combat.docId), {
        combats: newColumns[combat.docId],
      });
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
      snapshot.forEach((docSnap) => {
        const combats = (docSnap.data().combats || []).map((c) => ({
          ...c,
          statut: "non_joué",
          hiddenAfterLoss: false,
        }));
        updates.push(updateDoc(doc(db, "brackets", docSnap.id), { combats }));
      });
      await Promise.all(updates);
      const newCols = { ...columns };
      Object.keys(newCols).forEach((p) => {
        newCols[p] = newCols[p].map((c) => ({
          ...c,
          statut: "non_joué",
          hiddenAfterLoss: false,
        }));
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
    const dateNow = new Date().toLocaleDateString("fr-FR");
    doc.setFontSize(16);
    doc.text("Bilan des combats - Bracket", 40, 40);
    doc.setFontSize(10);
    doc.text(`Exporté le ${dateNow}`, 40, 55);

    // 🔹 Trier les combats par date, puis typeCombat, puis heure
    const sortedCombats = [...visibleFlat].sort((a, b) => {
      // 1️⃣ Par date (plus ancien au plus récent)
      if (a.date && b.date && a.date !== b.date) {
        return new Date(a.date) - new Date(b.date);
      }

      // 2️⃣ Par typeCombat
      if (a.typeCombat && b.typeCombat && a.typeCombat !== b.typeCombat) {
        return a.typeCombat.localeCompare(b.typeCombat);
      }

      // 3️⃣ Par heure
      const [ah, am] = (a.time || "00:00").split(":").map(Number);
      const [bh, bm] = (b.time || "00:00").split(":").map(Number);
      return ah * 60 + am - (bh * 60 + bm);
    });

    const rows = sortedCombats.map((c) => [
      c.participant,
      c.adversaire,
      c.categorie,
      c.couleur,
      c.statut === "gagné"
        ? "✅ Gagné"
        : c.statut === "perdu"
        ? "❌ Perdu"
        : "⏳ Non joué",
      `${formatDate(c.date)} ${c.time || "-"}`,
      c.aire || "-",
      c.coach || "-",
    ]);

    autoTable(doc, {
      head: [
        [
          "Participant",
          "Adversaire",
          "Catégorie",
          "Couleur",
          "Statut",
          "Date / Heure",
          "Aire",
          "Coach",
        ],
      ],
      body: rows,
      startY: 80,
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [80, 128, 255] },
    });

    doc.save(`bracket_${dateNow}.pdf`);
  };

  return (
    <div className="bracket-wrapper">
      {/* Status Banner */}
      <div
        className={`status-banner ${
          user ? (canEdit ? "authorized" : "readonly") : "non-connected"
        }`}
      >
        {user
          ? canEdit
            ? "✅ Connecté et autorisé"
            : "⚠️ Connecté en lecture seule"
          : "🔒 Non connecté"}
      </div>

      {/* Controls */}
      <div className="controls">
        <div className="controls-left">
          <div className="combat-type-filter">
            {TYPE_COMBATS.map((type) => (
              <button
                key={type}
                className={`${type} ${
                  combatTypeFilter === type ? "active" : ""
                }`}
                onClick={() => setCombatTypeFilter(type)}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="controls-right">
          {/* Wrapper pour filtres couleur + toggle */}
          <div className="color-toggle-wrapper">
            <div className="color-filters">
              <div
                className={`color-box rouge ${
                  colorFilter === "Rouge" ? "active" : ""
                }`}
                onClick={() =>
                  setColorFilter(colorFilter === "Rouge" ? COLOR_ALL : "Rouge")
                }
              >
                🔴 {countVisibleColor("Rouge")}
              </div>
              <div
                className={`color-box bleu ${
                  colorFilter === "Bleu" ? "active" : ""
                }`}
                onClick={() =>
                  setColorFilter(colorFilter === "Bleu" ? COLOR_ALL : "Bleu")
                }
              >
                🔵 {countVisibleColor("Bleu")}
              </div>
              <div
                className={`color-box tous ${
                  colorFilter === COLOR_ALL ? "active" : ""
                }`}
                onClick={() => setColorFilter(COLOR_ALL)}
              >
                ⚪ Tous
              </div>
            </div>

            {isMobile && (
              <div className="toggle-orientation">
                <button onClick={handleToggleOrientation}>
                  {isVertical ? <FaArrowsAltV /> : <FaArrowsAltH />}
                </button>
              </div>
            )}
          </div>

          <div className="controls-row">
            <div className="filter-wrapper">
              <FaFilter className="icon" />
              <select
                className="step-filter"
                value={stepFilter}
                onChange={(e) => setStepFilter(e.target.value)}
              >
                <option value="Tous">Toutes les étapes</option>
                {ETAPES.map((et) => (
                  <option key={et} value={et}>
                    {et}
                  </option>
                ))}
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
          </div>

          <div className="search-reset-wrapper">
            <button
              className="reset-btn"
              onClick={handleResetStatuses}
              disabled={!canEdit || loadingReset}
            >
              <FaRedo style={{ marginRight: 6 }} />
              {loadingReset
                ? "Réinitialisation..."
                : "Réinitialiser les statuts"}
            </button>
          </div>

          {canEdit && (
            <button
              className="export-btn"
              onClick={handleExportPDF}
              disabled={!visibleFlat.length}
            >
              📄 Exporter en PDF
            </button>
          )}
        </div>
      </div>

      {/* Main Bracket + Sidebar */}
      <div
        className="main-bracket-container"
        style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}
      >
        {/* Sidebar toggle pour mobile */}
        {isVertical && (
          <button
            onClick={() => setShowSidebar((prev) => !prev)}
            style={{
              marginBottom: "10px",
              padding: "6px 12px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "#2575fc",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            {showSidebar
              ? "Masquer les combats à venir"
              : "Afficher les combats à venir"}
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
                onChange={(e) => setSearchUpcoming(e.target.value)}
              />
            </div>

            {/* Combats filtrés */}
            {upcomingCombats
              .filter((c) => {
                // Exclure les combats terminés (gagné ou perdu)
                return !["gagné", "perdu"].includes(c.statut);
              })
              .map((c) => {
                // Application de la classe "late-combat" si le combat est en retard
                const combatClass = c.isLate
                  ? "sidebar-combat late-combat"
                  : "sidebar-combat";

                return (
                  <div
                    key={`${c.participant}-${c.num}`}
                    className={combatClass}
                  >
                    <div>
                      <strong>{c.time}</strong> - {formatDate(c.date)}{" "}
                      <img
                        src={
                          c.couleur === "Rouge"
                            ? "/images/casque_rouge.png"
                            : "/images/casque_bleu.png"
                        }
                        alt={c.couleur}
                        className="helmet-icon"
                      />
                      {c.participant} vs {c.adversaire}
                    </div>
                    <div>
                      Catégorie: {c.categorie} | Aire {c.aire}
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* Bracket */}
        <div
          className={`bracket-container ${
            isVertical ? "vertical" : "horizontal"
          }`}
          style={{ flex: 1 }}
        >
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
                    <div
                      className={`combat-card-wrapper ${
                        statutLower === "perdu" ? "dimmed" : ""
                      }`}
                      key={`${combat.participant}-${combat.num}-${idx}`}
                    >
                      <div
                        className={`combat-card ${
                          (combat.couleur || "").toLowerCase() === "rouge"
                            ? "rouge"
                            : "bleu"
                        } ${
                          statutLower === "gagné"
                            ? "gagné"
                            : statutLower === "perdu"
                            ? "perdu"
                            : ""
                        }`}
                      >
                        <div className="status-badge">
                          {statutLower === "gagné"
                            ? "✅ Gagné"
                            : statutLower === "perdu"
                            ? "❌ Perdu"
                            : ""}
                        </div>
                        <div className="etape-badge">{combat.etape}</div>

                        {/* Badge type combat */}
                        <div
                          className={`type-badge ${combat.typeCombat || ""}`}
                        >
                          {combat.typeCombat === "LightContact" &&
                            "⚡ LightContact"}
                          {combat.typeCombat === "KickLight" && "🥷 KickLight"}
                          {combat.typeCombat === "K1Light" && "🔥 K1Light"}
                        </div>

                        <div className="coach-badge">
                          🎯 Coach : {combat.coach}
                        </div>
                        <div className="categorie-badge">
                          🏷 {combat.categorie}
                        </div>

                        {/* Edition */}
                        {isEditing && canEdit ? (
                          <div className="editing-fields">
                            <input defaultValue={combat.participant} disabled />

                            <input
                              defaultValue={combat.adversaire}
                              onChange={(e) =>
                                setEditValues((s) => ({
                                  ...s,
                                  adversaire: e.target.value,
                                }))
                              }
                            />

                            <input
                              defaultValue={combat.num}
                              onChange={(e) =>
                                setEditValues((s) => ({
                                  ...s,
                                  num: e.target.value,
                                }))
                              }
                            />

                            {/* Date input */}
                            <input
                              type="date"
                              defaultValue={combat.date || ""}
                              onChange={(e) =>
                                setEditValues((s) => ({
                                  ...s,
                                  date: e.target.value,
                                }))
                              }
                            />

                            {/* Time input */}
                            <input
                              type="time"
                              defaultValue={combat.time || ""}
                              onChange={(e) =>
                                setEditValues((s) => ({
                                  ...s,
                                  time: e.target.value,
                                }))
                              }
                            />

                            <input
                              defaultValue={combat.aire}
                              onChange={(e) =>
                                setEditValues((s) => ({
                                  ...s,
                                  aire: e.target.value,
                                }))
                              }
                            />

                            <select
                              defaultValue={combat.couleur}
                              onChange={(e) =>
                                setEditValues((s) => ({
                                  ...s,
                                  couleur: e.target.value,
                                }))
                              }
                            >
                              <option value="Rouge">Rouge</option>
                              <option value="Bleu">Bleu</option>
                            </select>

                            <select
                              defaultValue={combat.coach}
                              onChange={(e) =>
                                setEditValues((s) => ({
                                  ...s,
                                  coach: e.target.value,
                                }))
                              }
                            >
                              {[
                                "Julien",
                                "Nadège",
                                "Christophe",
                                "Guillaume",
                              ].map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>

                            <input
                              list="categories"
                              defaultValue={combat.categorie}
                              onChange={(e) =>
                                setEditValues((s) => ({
                                  ...s,
                                  categorie: e.target.value,
                                }))
                              }
                            />
                            <datalist id="categories">
                              {categories.map((cat) => (
                                <option key={cat} value={cat} />
                              ))}
                            </datalist>

                            <div className="edit-buttons">
                              <button
                                onClick={() =>
                                  handleSave(combat.docId, combat.num)
                                }
                              >
                                ✅ Valider
                              </button>
                              <button
                                onClick={() => {
                                  setEditingCard(null);
                                  setEditValues({});
                                }}
                              >
                                ❌ Annuler
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="participant">
                              {combat.participant}
                            </div>
                            <div className="versus">vs {combat.adversaire}</div>
                            <div className="combat-info">
                              #{combat.num} - {formatDate(combat.date) || "-"}{" "}
                              {combat.time || "-"} - Aire {combat.aire}
                            </div>
                            <div className="status-buttons">
                              <button
                                className={`btn-win ${
                                  statutLower === "gagné" ? "active" : ""
                                }`}
                                onClick={() =>
                                  canEdit && handleStatusChange(combat, "gagné")
                                }
                              >
                                Gagné
                              </button>
                              <button
                                className={`btn-lose ${
                                  statutLower === "perdu" ? "active" : ""
                                }`}
                                onClick={() =>
                                  canEdit && handleStatusChange(combat, "perdu")
                                }
                              >
                                Perdu
                              </button>
                            </div>
                            {canEdit && (
                              <button
                                className="edit-btn"
                                onClick={() => {
                                  setEditingCard({
                                    docId: combat.docId,
                                    num: combat.num,
                                  });
                                  setEditValues({ ...combat });
                                }}
                              >
                                Modifier
                              </button>
                            )}
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
