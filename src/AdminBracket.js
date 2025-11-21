// src/AdminBracket.js
import React, { useState, useEffect } from "react";
import { getAuth, signOut } from "firebase/auth";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { useNavigate } from "react-router-dom";
import "./AdminBracket.css";
import { DISCIPLINES } from "./disciplines";

export default function AdminBracket() {
  const navigate = useNavigate();
  const auth = getAuth();

  const [brackets, setBrackets] = useState({});
  const [discipline, setDiscipline] = useState("");
  const [participant, setParticipant] = useState("");
  const [combats, setCombats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importBusy, setImportBusy] = useState(false);

  // quel document (docId) est en train d'être édité (si on a cliqué "Éditer")
  const [editingDocId, setEditingDocId] = useState(null);

  // Confirm modal réutilisable
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [onConfirmCallback, setOnConfirmCallback] = useState(() => () => {});

  const openConfirm = (message, callback) => {
    setConfirmMessage(message || "Êtes-vous sûr ?");
    setOnConfirmCallback(() => callback || (() => {}));
    setConfirmOpen(true);
  };

  const [toast, setToast] = useState({ message: "", type: "" });
  const showToast = (message, type = "success", duration = 3000) => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "" }), duration);
  };

  const awaitConfirm = (message) => {
    return new Promise((resolve) => {
      openConfirm(message, () => resolve(true));
    });
  };

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

  function getDefaultValueForDiscipline(label) {
    const group = DISCIPLINES.find((d) => d.label === label);
    return group ? group.options[0].value : "";
  }

  const addCombat = () => {
    if (!discipline || !participant) {
      showToast("Discipline et Participant requis !", "error");
      return;
    }

    const last = combats[combats.length - 1] || {};
    setCombats((prev) => [
      ...prev,
      {
        etape: "",
        num: "",
        typeCombat: last.typeCombat || discipline,
        adversaire: "",
        couleur: "",
        coach: last.coach || "",
        date: last.date || "",
        time: "",
        participant,
        discipline,
        categorie: last.categorie || "",
        aire: last.aire || "",
        statut: "En attente",
      },
    ]);
  };

  const handleCombatChange = (index, field, value) => {
    setCombats((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const saveParticipant = () => {
    if (!discipline || !participant) {
      showToast("Discipline et Participant requis !", "error");
      return;
    }

    openConfirm(
      `💾 Confirmer la sauvegarde de ${participant} (${combats.length} combats) ?`,
      async () => {
        setLoading(true);
        try {
          const docId = `${discipline}_${participant}`;
          await setDoc(doc(db, "brackets", docId), {
            discipline,
            participant,
            combats,
          });
          await fetchBrackets();
          setCombats([]);
          setParticipant("");
          setDiscipline("");
          setEditingDocId(null);
          showToast(
            `✅ ${participant} sauvegardé (${combats.length} combats)`,
            "success"
          );
        } catch (err) {
          console.error(err);
          showToast("❌ Erreur lors de la sauvegarde", "error");
        } finally {
          setLoading(false);
        }
      }
    );
  };

  const clearAll = async () => {
    openConfirm(
      "Voulez-vous vraiment supprimer tous les brackets ?",
      async () => {
        setLoading(true);
        try {
          const snapshot = await getDocs(collection(db, "brackets"));
          for (const s of snapshot.docs) await deleteDoc(s.ref);
          setBrackets({});
          showToast("✅ Tous les documents supprimés", "success");
        } catch (err) {
          console.error(err);
          showToast("❌ Erreur lors de la suppression", "error");
        } finally {
          setLoading(false);
        }
      }
    );
  };

  const importJSON = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target.result);
        let proceed = false;
        await awaitConfirm(
          "⚠️ Cette action va écraser toute la base actuelle. Continuer ?"
        ).then(() => (proceed = true));
        if (!proceed) return setImportBusy(false);
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
            const newCombats = (rawCombats || []).map((c) => ({
              ...c,
              participant: c.participant || participantName,
              discipline: c.discipline || disciplineName,
            }));
            await setDoc(
              doc(db, "brackets", `${disciplineName}_${participantName}`),
              {
                discipline: disciplineName,
                participant: participantName,
                combats: newCombats,
              }
            );
          }
        }

        showToast("✅ Import JSON terminé !", "success");
        await fetchBrackets();
      } catch (err) {
        console.error(err);
        showToast("❌ Erreur lors de l'import JSON", "error");
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
      showToast("❌ Erreur déconnexion", "error");
    }
  };

  const resetForm = () => {
    setDiscipline("");
    setParticipant("");
    setCombats([]);
    setEditingDocId(null);
  };

  // Supprimer un combat : si on édite un participant existant on update DB immédiatement,
  // sinon (création) on supprime juste du state local.
  const handleDeleteCombat = (index) => {
    // si on n'est pas sur un doc existant -> suppression locale
    if (!editingDocId) {
      setCombats((prev) => prev.filter((_, idx) => idx !== index));
      showToast("✅ Combat supprimé (local)", "success");
      return;
    }

    // sinon confirmation + updateDoc
    openConfirm("Voulez-vous vraiment supprimer ce combat ?", async () => {
      setLoading(true);
      try {
        const newCombats = combats.filter((_, idx) => idx !== index);
        await updateDoc(doc(db, "brackets", editingDocId), {
          combats: newCombats,
        });
        // mettre à jour l'état local et la liste de brackets
        setCombats(newCombats);
        setBrackets((prev) => {
          if (!prev) return prev;
          const copy = { ...prev };
          if (copy[editingDocId])
            copy[editingDocId] = { ...copy[editingDocId], combats: newCombats };
          return copy;
        });
        showToast("✅ Combat supprimé", "success");
      } catch (err) {
        console.error(err);
        showToast("❌ Erreur lors de la suppression du combat", "error");
      } finally {
        setLoading(false);
      }
    });
  };

  // Supprimer un participant (depuis la liste) : modal via openConfirm + toast
  const handleDeleteParticipant = (docId) => {
    openConfirm("Voulez-vous vraiment supprimer ce participant ?", async () => {
      setLoading(true);
      try {
        await deleteDoc(doc(db, "brackets", docId));
        setBrackets((prev) => {
          const copy = { ...prev };
          delete copy[docId];
          return copy;
        });
        // si on venait d'éditer ce doc, clear form
        if (editingDocId === docId) {
          resetForm();
        }
        showToast("✅ Participant supprimé", "success");
      } catch (err) {
        console.error(err);
        showToast("❌ Erreur lors de la suppression", "error");
      } finally {
        setLoading(false);
      }
    });
  };

  return (
    <div className="admin-wrap">
      {/* HEADER */}
      <header className="admin-header">
        <div>
          <h1>⚙️ Tableau de bord administrateur</h1>
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
            <h2>➕ Ajouter / Modifier un compétiteur</h2>
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
                  <optgroup key={d.label} label={d.label}>
                    {d.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </optgroup>
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
                        <optgroup key={d.label} label={d.label}>
                          {d.options.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </optgroup>
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
                      placeholder="Numéro du combat"
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
                      placeholder="Catégorie (ex -60kg)"
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

                    {/* Supprimer combat (maintenant supprime en base si on édite un doc existant) */}
                    <button
                      className="btn btn-sm btn-delete"
                      onClick={() => handleDeleteCombat(i)}
                      disabled={loading}
                    >
                      ❌
                    </button>
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
                        {/* Éditer */}
                        <button
                          className="btn btn-sm"
                          onClick={() => {
                            setDiscipline(entry.discipline || "");
                            setParticipant(entry.participant || "");
                            setCombats(
                              (entry.combats || []).map((c) => ({ ...c }))
                            );
                            setEditingDocId(docId);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                        >
                          ✏️ Éditer
                        </button>

                        {/* Supprimer participant via modal + toast */}
                        <button
                          className="btn btn-sm btn-delete"
                          onClick={() => handleDeleteParticipant(docId)}
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

      {/* Confirm Modal */}
      {confirmOpen && (
        <div
          className="modal-overlay"
          onMouseDown={() => setConfirmOpen(false)}
        >
          <div
            className="modal-box"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>❗ Confirmer</h3>
            <p style={{ marginBottom: 12 }}>{confirmMessage}</p>
            <div
              style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}
            >
              <button
                className="btn btn-gray"
                onClick={() => setConfirmOpen(false)}
              >
                Annuler
              </button>
              <button
                className="btn-red"
                onClick={async () => {
                  try {
                    await onConfirmCallback();
                  } catch (err) {
                    console.error("Erreur dans onConfirm callback:", err);
                  }
                  setConfirmOpen(false);
                }}
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast.message && (
        <div className={`toast ${toast.type}`}>{toast.message}</div>
      )}
    </div>
  );
}
