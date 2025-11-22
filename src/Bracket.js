// src/Bracket.js
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
import {
  DISCIPLINES,
  ALL_TYPES,
  TYPE_ICONS,
  TYPE_COLORS,
  HELMET_ICONS,
} from "./disciplines";

const mobileQuery = window.matchMedia("(max-width: 768px)");
const ETAPES = ["Tour2", "Tour1", "16ème", "8ème", "Quart", "Demi", "Finale"];
// Precompute index map for ETAPES to avoid repeated indexOf
const ETAPES_INDEX = ETAPES.reduce((m, e, i) => {
  m[e] = i;
  return m;
}, {});
const COLOR_ALL = "Tous";
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
  const [searchUpcoming, setSearchUpcoming] = useState("");
  const [loadingReset, setLoadingReset] = useState(false);
  const [categories] = useState([
    "-37kg",
    "-50kg",
    "-55kg",
    "-60kg",
    "-65kg",
    "-70kg",
    "-75kg",
  ]);

  const [combatTypeOpen, setCombatTypeOpen] = useState(false);
  const [nextCombat, setNextCombat] = useState(null);
  const showNextCombat = () => {
    if (!upcomingCombats || upcomingCombats.length === 0) return;
    const next = upcomingCombats[0];
    setNextCombat(next); // afficher le combat

    // cacher après 5 secondes
    setTimeout(() => setNextCombat(null), 5000);
  };

  const canEdit = user && ALLOWED_UIDS.includes(user.uid);
  const [layout, setLayout] = useState({
    isVertical: mobileQuery.matches,
    showSidebar: window.innerWidth >= 768,
    userForced: false,
  });

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
  const [editingCombat, setEditingCombat] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const openEditModal = (combat, index) => {
    setEditingCombat({ ...combat });
    setEditingIndex(index);
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
      setLayout((prev) => {
        if (prev.userForced) return prev;
        const mobile = window.innerWidth < 768;
        return {
          ...prev,
          isVertical: mobile,
          showSidebar: !mobile,
        };
      });
    };

    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleToggleOrientation = () => {
    setLayout((prev) => ({
      ...prev,
      isVertical: !prev.isVertical,
      userForced: true,
    }));
  };

  const timeToMinutes = (time = "00:00") => {
    // guard if time is empty or invalid
    if (!time) return 0;
    const [h = "0", m = "0"] = time.split(":");
    const hh = Number(h) || 0;
    const mm = Number(m) || 0;
    return hh * 60 + mm;
  };

  // -------------------------
  // Performance optimizations
  // -------------------------

  // 1) Flattened list of combats with precomputed normalized/search fields.
  const normalizedCombats = useMemo(() => {
    // columns is map docId -> combats[]
    // produce a flat array of combats each with derived fields used repeatedly
    const arr = [];
    Object.values(columns).forEach((combatsArray) => {
      (combatsArray || []).forEach((c) => {
        const participantNorm = normalizeText(c.participant || "");
        const adversaireNorm = normalizeText(c.adversaire || "");
        const statutLower = (c.statut || "").toLowerCase();
        const timeMinutes = timeToMinutes(c.time || "00:00");
        arr.push({
          ...c,
          participantNorm,
          adversaireNorm,
          statutLower,
          timeMinutes,
        });
      });
    });
    return arr;
  }, [columns]); // only when columns change

  // 2) Map participant -> combats (for fast lookup in hasLostBefore)
  const participantMap = useMemo(() => {
    const map = new Map();
    normalizedCombats.forEach((c) => {
      const p = c.participant || "";
      const arr = map.get(p) || [];
      arr.push(c);
      map.set(p, arr);
    });
    return map;
  }, [normalizedCombats]);

  // hasLostBefore uses precomputed map + ETAPES_INDEX
  const hasLostBefore = useCallback(
    (participant, currentEtape) => {
      if (!participant) return false;
      const combats = participantMap.get(participant) || [];
      const currentIndex = ETAPES_INDEX[currentEtape] ?? -1;
      if (currentIndex <= 0) return false;
      for (let i = 0; i < currentIndex; i++) {
        const et = ETAPES[i];
        if (
          combats.some(
            (c) =>
              c.etape === et &&
              (c.statutLower || c.statut || "").toLowerCase() === "perdu"
          )
        ) {
          return true;
        }
      }
      return false;
    },
    [participantMap]
  );

  // 3) allCombats: filtered by combatTypeFilter (reuse normalizedCombats)
  const allCombats = useMemo(() => {
    if (combatTypeFilter === "Tous") return normalizedCombats;
    return normalizedCombats.filter((c) => c.typeCombat === combatTypeFilter);
  }, [normalizedCombats, combatTypeFilter]);

  // 4) visibleColumns uses precomputed fields and avoids repeated normalization
  const visibleColumns = useMemo(() => {
    const term = normalizeText(searchTerm.trim());
    return ETAPES.map((etape) => {
      const filtered = allCombats.filter((c) => {
        // filters:
        if (stepFilter !== "Tous" && c.etape !== stepFilter) return false;
        if (
          colorFilter !== COLOR_ALL &&
          (c.couleur || "").toLowerCase() !== colorFilter.toLowerCase()
        )
          return false;
        if (
          term &&
          !(c.participantNorm.includes(term) || c.adversaireNorm.includes(term))
        )
          return false;
        if ((c.statutLower || "").toLowerCase() === "perdu") return false;
        if (hasLostBefore(c.participant, etape)) return false;
        if (c.hiddenAfterLoss) return false;

        return c.etape === etape;
      });

      filtered.sort((a, b) => {
        if (a.date !== b.date)
          return (a.date || "").localeCompare(b.date || "");
        return (a.timeMinutes || 0) - (b.timeMinutes || 0);
      });

      return filtered;
    });
  }, [allCombats, stepFilter, colorFilter, searchTerm, hasLostBefore]);

  const visibleFlat = useMemo(() => visibleColumns.flat(), [visibleColumns]);

  // 5) upcomingCombats: operate on visibleFlat (already normalized)
  const upcomingCombats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    return visibleFlat
      .filter(
        (c) => !["gagné", "perdu"].includes((c.statutLower || "").toLowerCase())
      )
      .filter((c) => c.date === todayStr) // on reste sur les combats du jour
      .filter((c) => c.time)
      .map((c) => {
        const combatMinutes = c.timeMinutes || 0;

        // 🟥 En retard = l’heure est passée
        const isLate = combatMinutes < nowMinutes;

        // 🟦 Dans l’heure qui vient = entre maintenant et +60 min
        const isComingSoon =
          combatMinutes >= nowMinutes && combatMinutes <= nowMinutes + 60;

        return { ...c, isLate, isComingSoon };
      })
      .filter((c) => c.isLate || c.isComingSoon) // 👉 On garde uniquement 2 cas
      .sort((a, b) => (a.timeMinutes || 0) - (b.timeMinutes || 0));
  }, [visibleFlat]);

  const countVisibleColor = (color) =>
    visibleFlat.filter(
      (c) => (c.couleur || "").toLowerCase() === color.toLowerCase()
    ).length;

  // -------------------------
  // Save / status functions (unchanged logic)
  // -------------------------
  const handleSave = async (docId, num) => {
    if (!canEdit) return;
    const newColumns = { ...columns };
    const combats = newColumns[docId] || [];
    newColumns[docId] = combats.map((c) =>
      c.num === num ? { ...c, ...editValues } : c
    );
    setColumns(newColumns);
    setEditingCard(null);
    setEditingCombat(null);
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
      let updated = { ...c };
      if (c.num === combat.num) updated.statut = statutValue;
      if (c.participant === combat.participant && statutValue === "perdu") {
        const etapeIndex = ETAPES.indexOf(c.etape);
        if (etapeIndex > currentEtapeIndex) updated.hiddenAfterLoss = true;
      }
      if (updated.hiddenAfterLoss && statutValue !== "perdu")
        updated.hiddenAfterLoss = false;
      return updated;
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

  const handleExportPDF = () => {
    const doc = new jsPDF("p", "pt");
    const dateNow = new Date().toLocaleDateString("fr-FR");
    doc.setFontSize(16);
    doc.text("Bilan des combats - Bracket", 40, 40);
    doc.setFontSize(10);
    doc.text(`Exporté le ${dateNow}`, 40, 55);

    const sortedCombats = [...visibleFlat].sort((a, b) => {
      if (a.date && b.date && a.date !== b.date)
        return new Date(a.date) - new Date(b.date);
      if (a.typeCombat && b.typeCombat && a.typeCombat !== b.typeCombat)
        return a.typeCombat.localeCompare(b.typeCombat);
      return (a.timeMinutes || 0) - (b.timeMinutes || 0);
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

  // -------------------------
  // Render (unchanged structure)
  // -------------------------
  return (
    <div className="bracket-wrapper">
      {/* Prochain combat */}
      {nextCombat && (
        <div className="next-combat-popup">
          <h2>Prochain combat !</h2>
          <div className="next-combat-info">
            <div className="participant-info">
              <img
                src={HELMET_ICONS[nextCombat.couleur] || ""}
                alt={nextCombat.couleur}
                className="helmet-icon"
              />
              <span>{nextCombat.participant}</span>
            </div>
            <div className="versus">vs</div>
            <div className="participant-info">
              <img
                src={
                  HELMET_ICONS[
                    nextCombat.couleur === "Rouge" ? "Bleu" : "Rouge"
                  ] || ""
                }
                alt={nextCombat.couleur === "Rouge" ? "Bleu" : "Rouge"}
                className="helmet-icon"
              />
              <span>{nextCombat.adversaire}</span>
            </div>
          </div>
          <p>
            {formatDate(nextCombat.date)} {nextCombat.time || "-"}
          </p>
          <p>🏟 Aire : {nextCombat.aire || "-"}</p>
        </div>
      )}

      {/* Status banner */}
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
        {/* Left controls */}
        <div className="combat-type-wrapper">
          <label htmlFor="combat-type" className="combat-type-label">
            Type de combat
          </label>
          <select
            id="combat-type"
            value={combatTypeFilter}
            onChange={(e) => setCombatTypeFilter(e.target.value)}
            className="combat-type-select"
          >
            <option value="Tous">Tous</option>
            <optgroup label="Light Contact">
              {DISCIPLINES.find((d) => d.label === "Light Contact").options.map(
                (o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                )
              )}
            </optgroup>
            <optgroup label="Plein Contact">
              {DISCIPLINES.find((d) => d.label === "Full Contact").options.map(
                (o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                )
              )}
            </optgroup>
          </select>
        </div>

        <button className="next-combat-btn" onClick={showNextCombat}>
          Prochain combat
        </button>

        {/* Right controls */}
        <div className="controls-right">
          {/* Color filters */}
          <div className="color-filters">
            {["Rouge", "Bleu", COLOR_ALL].map((color) => (
              <div
                key={color}
                className={`color-box ${color.toLowerCase()} ${
                  colorFilter === color ? "active" : ""
                }`}
                onClick={() =>
                  setColorFilter(color === colorFilter ? COLOR_ALL : color)
                }
              >
                {color} {color !== COLOR_ALL && countVisibleColor(color)}
              </div>
            ))}
          </div>

          {/* Step + Search */}
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
                placeholder="Rechercher participant ou adversaire"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Reset + Export */}
          <div className="controls-actions">
            <button
              className="reset-btn"
              onClick={handleResetStatuses}
              disabled={!canEdit || loadingReset}
            >
              <FaRedo style={{ marginRight: 6 }} />
              {loadingReset ? "Réinitialisation..." : "Réinitialiser"}
            </button>

            {canEdit && (
              <button
                className="export-btn"
                onClick={handleExportPDF}
                disabled={!visibleFlat.length}
              >
                Exporter PDF
              </button>
            )}
          </div>

          {/* Mobile orientation toggle */}
          {layout.isVertical && (
            <div className="toggle-orientation">
              <button onClick={handleToggleOrientation}>
                {layout.isVertical ? <FaArrowsAltV /> : <FaArrowsAltH />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Bracket + Sidebar */}
      <div
        className="main-bracket-container"
        style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}
      >
        {/* Sidebar toggle mobile */}
        {layout.isVertical && (
          <button
            onClick={() =>
              setLayout((prev) => ({ ...prev, showSidebar: !prev.showSidebar }))
            }
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
            {layout.showSidebar
              ? "Masquer les combats à venir"
              : "Afficher les combats à venir"}
          </button>
        )}

        {/* Sidebar */}
        {layout.showSidebar && (
          <div className="sidebar" style={{ width: "225px", flexShrink: 0 }}>
            <h3>Combats à venir (fond blanc) en retard (fond rouge)</h3>
            <div className="sidebar-search">
              <input
                type="text"
                placeholder="Rechercher un participant"
                value={searchUpcoming}
                onChange={(e) => setSearchUpcoming(e.target.value)}
              />
            </div>

            {upcomingCombats
              .filter((c) => {
                const term = normalizeText(searchUpcoming.trim());
                if (!term) return true;
                const participant = c.participantNorm;
                const adversaire = c.adversaireNorm;
                return participant.includes(term) || adversaire.includes(term);
              })
              .map((c) => (
                <div
                  key={`${c.participant}-${c.num}`}
                  className={`sidebar-combat ${c.isLate ? "late-combat" : ""}`}
                >
                  <div>
                    <strong>{c.time}</strong> - {formatDate(c.date)}{" "}
                    <img
                      src={HELMET_ICONS[c.couleur] || ""}
                      alt={c.couleur}
                      className="helmet-icon"
                    />
                    {c.participant} vs {c.adversaire}
                  </div>
                  <div>
                    Catégorie: {c.categorie} | Aire {c.aire}
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Bracket */}
        <div
          className={`bracket-container ${
            layout.isVertical ? "vertical" : "horizontal"
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
                        } ${isEditing ? "editing" : ""}`}
                      >
                        <div className="status-badge">
                          {statutLower === "gagné"
                            ? "✅ Gagné"
                            : statutLower === "perdu"
                            ? "❌ Perdu"
                            : ""}
                        </div>
                        <div className="etape-badge">{combat.etape}</div>
                        <div
                          className={`type-badge ${combat.typeCombat || ""}`}
                        >
                          {TYPE_ICONS[combat.typeCombat]}
                        </div>
                        <div className="coach-badge">
                          🎯 Coach : {combat.coach}
                        </div>
                        <div className="categorie-badge">
                          🏷 {combat.categorie}
                        </div>

                        {isEditing && canEdit ? (
                          <div className="editing-fields">
                            <input defaultValue={combat.participant} disabled />
                            <input
                              placeholder="nom de l'adversaire"
                              defaultValue={combat.adversaire}
                              onChange={(e) =>
                                setEditValues((s) => ({
                                  ...s,
                                  adversaire: e.target.value,
                                }))
                              }
                            />
                            <input
                              placeholder="numéro du combat"
                              type="number"
                              defaultValue={combat.num}
                              onChange={(e) =>
                                setEditValues((s) => ({
                                  ...s,
                                  num: Number(e.target.value),
                                }))
                              }
                            />
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
                              placeholder="numéro de l'aire"
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
                                  setEditingCombat(null);
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
                                  setEditingCard({ ...combat }); // <-- important
                                  setEditingCombat({ ...combat });
                                  setEditingIndex(idx);
                                }}
                              >
                                ✏️ Modifier
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
