// src/AdminBracket.js
import React, { useState, useEffect } from "react";
import { getAuth, signOut } from "firebase/auth";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { useNavigate } from "react-router-dom";
import "./AdminBracket.css";

export default function AdminBracket() {
  const navigate = useNavigate();
  const auth = getAuth();

  const [brackets, setBrackets] = useState({});
  const [discipline, setDiscipline] = useState("");
  const [participant, setParticipant] = useState("");
  const [combats, setCombats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [toDeleteId, setToDeleteId] = useState(null);

  const DISCIPLINES = ["LightContact", "KickLight", "K1Light", "FullContact"];
  const COULEURS = ["Rouge", "Bleu"];
  const COACHS = [
    "Chris",
    "Benoit",
    "Guillaume",
    "Nadège",
    "Julien",
    "Mélanie",
  ];
  const ETAPES = ["Tour2", "Tour1", "16ème", "8ème", "Quart", "Demi", "Finale"];

  useEffect(() => {
    fetchBrackets();
  }, []);

  async function fetchBrackets() {
    const snapshot = await getDocs(collection(db, "brackets"));
    const data = {};
    snapshot.forEach((s) => {
      data[s.id] = s.data();
    });
    setBrackets(data);
  }

  function createEmptyCombat() {
    return {
      etape: "",
      num: "",
      typeCombat: "",
      adversaire: "",
      couleur: "",
      coach: "",
      date: "",
      time: "",
      participant: participant || "",
      discipline: discipline || "",
      poids: "", // optionnel si tu veux garder "poids" séparé
      categorie: "", // <-- nouveau champ
      aire: "", // <-- nouveau champ
      statut: "En attente", // pour suivre gagné/perdu/en attente
    };
  }

  const addCombat = () => {
    if (!discipline || !participant)
      return alert("Discipline et Participant requis !");
    setCombats((s) => [...s, createEmptyCombat()]);
  };

  const handleCombatChange = (index, field, value) => {
    setCombats((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const saveParticipant = async () => {
    if (!discipline || !participant)
      return alert("Discipline et Participant requis !");
    setLoading(true);
    try {
      const combatsWithMeta = combats.map((c) => ({
        ...createEmptyCombat(),
        ...c,
        participant,
        discipline,
      }));
      await setDoc(doc(db, "brackets", `${discipline}_${participant}`), {
        discipline,
        participant,
        combats: combatsWithMeta,
      });
      await fetchBrackets();
      setCombats([]);
      setParticipant("");
      setDiscipline("");
      alert(`✅ ${participant} sauvegardé (${combatsWithMeta.length} combats)`);
    } catch (err) {
      console.error(err);
      alert("❌ Erreur lors de la sauvegarde");
    } finally {
      setLoading(false);
    }
  };

  const clearAll = async () => {
    if (!window.confirm("Voulez-vous vraiment supprimer tous les brackets ?"))
      return;
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "brackets"));
      for (const s of snapshot.docs) await deleteDoc(s.ref);
      setBrackets({});
      alert("✅ Tous les documents supprimés");
    } catch (err) {
      console.error(err);
      alert("❌ Erreur lors de la suppression");
    } finally {
      setLoading(false);
    }
  };

  const deleteParticipant = async (docId) => {
    setLoading(true);
    try {
      await deleteDoc(doc(db, "brackets", docId));
      setBrackets((prev) => {
        const copy = { ...prev };
        delete copy[docId];
        return copy;
      });
      alert("✅ Participant supprimé");
    } catch (err) {
      console.error(err);
      alert("❌ Erreur lors de la suppression");
    } finally {
      setLoading(false);
    }
  };

  const importJSON = async (e) => {
    const file = e.target.files?.[0];
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
        setImportBusy(true);
        const snapshot = await getDocs(collection(db, "brackets"));
        for (const s of snapshot.docs) await deleteDoc(s.ref);

        for (const disciplineName in json) {
          const participants = json[disciplineName];
          for (const participantName in participants) {
            const participantData = participants[participantName];
            const rawCombats = Array.isArray(participantData)
              ? participantData
              : participantData.combats || participantData;
            const combats = (rawCombats || []).map((c) => ({
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
        await fetchBrackets();
      } catch (err) {
        console.error(err);
        alert("❌ Erreur lors de l'import JSON");
      } finally {
        setImportBusy(false);
      }
    };
    reader.readAsText(file);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (err) {
      console.error(err);
      alert("Erreur déconnexion");
    }
  };

  const resetForm = () => {
    setDiscipline("");
    setParticipant("");
    setCombats([]);
  };

  return (
    <div className="admin-wrap">
      {/* HEADER */}
      <header className="admin-header">
        <div>
          <h1>⚙️ Admin Dashboard</h1>
          <p className="subtitle">
            Gestion rapide des brackets — création / import / suppression
          </p>
        </div>
        <div className="admin-header-actions">
          <button className="btn btn-ghost" onClick={() => navigate("/")}>
            ⬅️ Retour au bracket
          </button>
          <button className="btn btn-danger" onClick={handleLogout}>
            🔒 Déconnexion
          </button>
        </div>
      </header>

      <main className="admin-main">
        {/* FORM */}
        <section className="card card--form">
          <div className="card-title">
            <h2>➕ Ajouter / Modifier un participant</h2>
          </div>
          <div className="form-row">
            <label>
              Discipline
              <select
                value={discipline}
                onChange={(e) => setDiscipline(e.target.value)}
              >
                <option value="">— Choisir —</option>
                {DISCIPLINES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Participant
              <input
                placeholder="Prénom"
                value={participant}
                onChange={(e) => setParticipant(e.target.value)}
              />
            </label>

            <div className="form-actions-row">
              <button className="btn" onClick={addCombat}>
                ➕ Ajouter un combat
              </button>
              <button
                className="btn btn-primary"
                onClick={saveParticipant}
                disabled={loading}
              >
                {loading ? "Enregistrement..." : "💾 Sauvegarder"}
              </button>
              <button className="btn btn-outline" onClick={resetForm}>
                ♻️ Réinitialiser
              </button>
            </div>
          </div>

          {/* COMBATS */}
          <div className="combats-list">
            {combats.length === 0 ? (
              <div className="muted">Aucun combat créé</div>
            ) : (
              combats.map((c, i) => (
                <div key={i} className="combat-row">
                  <div className="combat-row-left">
                    <select
                      value={c.typeCombat}
                      onChange={(e) =>
                        handleCombatChange(i, "typeCombat", e.target.value)
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
                      value={c.etape}
                      onChange={(e) =>
                        handleCombatChange(i, "etape", e.target.value)
                      }
                    >
                      <option value="">Étape</option>
                      {ETAPES.map((et) => (
                        <option key={et} value={et}>
                          {et}
                        </option>
                      ))}
                    </select>
                    <input
                      placeholder="Num (ex: combat 1)"
                      value={c.num}
                      onChange={(e) =>
                        handleCombatChange(i, "num", e.target.value)
                      }
                    />
                  </div>
                  <div className="combat-row-right">
                    <input
                      placeholder="Adversaire"
                      value={c.adversaire}
                      onChange={(e) =>
                        handleCombatChange(i, "adversaire", e.target.value)
                      }
                    />
                    <select
                      value={c.couleur}
                      onChange={(e) =>
                        handleCombatChange(i, "couleur", e.target.value)
                      }
                    >
                      <option value="">Couleur</option>
                      {COULEURS.map((co) => (
                        <option key={co} value={co}>
                          {co}
                        </option>
                      ))}
                    </select>
                    <input
                      placeholder="Catégorie (ex: -42kg)"
                      value={c.categorie}
                      onChange={(e) =>
                        handleCombatChange(i, "categorie", e.target.value)
                      }
                    />
                    <input
                      placeholder="Aire"
                      value={c.aire}
                      onChange={(e) =>
                        handleCombatChange(i, "aire", e.target.value)
                      }
                    />
                    <select
                      value={c.coach}
                      onChange={(e) =>
                        handleCombatChange(i, "coach", e.target.value)
                      }
                    >
                      <option value="">Coach</option>
                      {COACHS.map((co) => (
                        <option key={co} value={co}>
                          {co}
                        </option>
                      ))}
                    </select>
                    <input
                      type="date"
                      value={c.date}
                      onChange={(e) =>
                        handleCombatChange(i, "date", e.target.value)
                      }
                    />
                    <input
                      type="time"
                      value={c.time}
                      onChange={(e) =>
                        handleCombatChange(i, "time", e.target.value)
                      }
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* SIDE PANEL */}
        <aside className="side-panel">
          <div className="card card--actions">
            <h3>Actions rapides</h3>
            <div className="actions-grid">
              <button
                className="btn btn-warning"
                onClick={clearAll}
                disabled={loading}
              >
                🗑 Supprimer tous
              </button>
              <label className="btn btn-outline" style={{ cursor: "pointer" }}>
                📂 Importer JSON
                <input
                  type="file"
                  accept=".json"
                  onChange={importJSON}
                  style={{ display: "none" }}
                  disabled={importBusy}
                />
              </label>
              <button
                className="btn"
                onClick={fetchBrackets}
                disabled={loading}
              >
                🔄 Rafraîchir
              </button>
            </div>
          </div>

          <div className="card card--list">
            <h3>📋 Brackets existants ({Object.keys(brackets).length})</h3>
            {Object.keys(brackets).length === 0 && (
              <div className="muted">Aucun participant</div>
            )}
            <div className="list-scroll">
              {Object.keys(brackets).map((docId) => {
                const entry = brackets[docId];
                return (
                  <div key={docId} className="participant-card">
                    <div className="participant-head">
                      <div>
                        <div className="participant-name">
                          {entry.participant || "—"}
                        </div>
                        <div className="participant-sub">
                          {entry.discipline || docId.split("_")[0]}
                        </div>
                      </div>
                      <div className="participant-actions">
                        <button
                          className="btn btn-sm"
                          onClick={() => {
                            setDiscipline(entry.discipline || "");
                            setParticipant(entry.participant || "");
                            setCombats(
                              (entry.combats || []).map((c) => ({ ...c }))
                            );
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                        >
                          ✏️ Éditer
                        </button>
                        <button
                          className="btn btn-sm btn-delete"
                          onClick={() => {
                            setToDeleteId(docId);
                            setModalOpen(true);
                          }}
                          disabled={loading}
                        >
                          🗑 Supprimer
                        </button>
                      </div>
                    </div>
                    <div className="participant-body">
                      <div className="small-muted">
                        Combats: {(entry.combats || []).length}
                      </div>
                      <pre className="json-preview">
                        {JSON.stringify(entry, null, 2)}
                      </pre>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </main>

      <footer className="admin-footer muted">
        Tip: tu peux importer ton JSON ou créer/modifier manuellement. Les
        coachs et disciplines doivent matcher ceux du front pour un rendu
        identique.
      </footer>

      {/* MODAL SUPPRESSION */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3>❗ Confirmer la suppression</h3>
            <p>Voulez-vous vraiment supprimer ce participant ?</p>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "8px",
                marginTop: "12px",
              }}
            >
              <button className="btn-gray" onClick={() => setModalOpen(false)}>
                Annuler
              </button>
              <button
                className="btn-red"
                onClick={() => {
                  deleteParticipant(toDeleteId);
                  setModalOpen(false);
                }}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
