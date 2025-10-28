import React, { useState, useEffect } from "react";
import "./Bracket.css";

const ETAPES = ["16ème", "8ème", "Quart", "Demi", "Finale"];

const Bracket = () => {
  const [columns, setColumns] = useState([]);
  const [editMode, setEditMode] = useState(false); // ✅ mode édition activé ou non

  // Charger le JSON
  useEffect(() => {
    fetch(`${process.env.PUBLIC_URL}/brackets.json`)
      .then((res) => res.json())
      .then((data) => {
        const cols = ETAPES.map((etape) => {
          const combats = [];
          for (const key in data) {
            const participantCombats = data[key];
            participantCombats.forEach((c) => {
              if (c.etape === etape) {
                combats.push({ ...c });
              }
            });
          }
          return combats;
        });
        setColumns(cols);
      })
      .catch((err) => console.error("Erreur chargement JSON:", err));
  }, []);

  // Mise à jour locale d'un champ
  const handleChange = (colIdx, combatIdx, field, value) => {
    setColumns((prev) => {
      const updated = [...prev];
      updated[colIdx][combatIdx][field] = value;
      return updated;
    });
  };

  // ✅ Fonction pour basculer mode édition
  const toggleEditMode = () => setEditMode((prev) => !prev);

  return (
    <div className="bracket-container">
      {/* ✅ Bouton Modifier / Valider */}
      <div className="edit-bar">
        <button className="edit-toggle" onClick={toggleEditMode}>
          {editMode ? "💾 Valider les modifications" : "✏️ Modifier"}
        </button>
      </div>

      {columns.map((combats, colIdx) => (
        <div className="bracket-column" key={colIdx}>
          <h3>{ETAPES[colIdx]}</h3>
          {combats.map((combat, idx) => (
            <div className="combat-card-wrapper" key={idx}>
              <div
                className={`combat-card ${
                  combat.couleur?.toLowerCase() === "rouge"
                    ? "rouge"
                    : "bleu"
                } etape-${ETAPES[colIdx]
                  .toLowerCase()
                  .replace("è", "e")}`}
              >
                {editMode ? (
                  <>
                    {/* ✅ Mode édition */}
                    <input
                      type="text"
                      value={combat.num || ""}
                      onChange={(e) =>
                        handleChange(colIdx, idx, "num", e.target.value)
                      }
                      className="combat-num"
                    />
                    <input
                      type="text"
                      value={combat.participant}
                      onChange={(e) =>
                        handleChange(colIdx, idx, "participant", e.target.value)
                      }
                      className="participant-input"
                    />
                    <div className="versus">
                      vs{" "}
                      <input
                        type="text"
                        value={combat.adversaire}
                        onChange={(e) =>
                          handleChange(
                            colIdx,
                            idx,
                            "adversaire",
                            e.target.value
                          )
                        }
                        className="adversaire-input"
                      />
                    </div>
                    <div className="info">
                      <input
                        type="time"
                        value={combat.heure || ""}
                        onChange={(e) =>
                          handleChange(colIdx, idx, "heure", e.target.value)
                        }
                      />
                      <label className="aire-label">
                        Aire{" "}
                        <input
                          type="number"
                          min="1"
                          value={combat.aire || ""}
                          onChange={(e) =>
                            handleChange(colIdx, idx, "aire", e.target.value)
                          }
                        />
                      </label>
                    </div>
                  </>
                ) : (
                  <>
                    {/* ✅ Mode lecture seule */}
                    <div className="combat-num">#{combat.num}</div>
                    <div className="participant">{combat.participant}</div>
                    <div className="versus">
                      vs <strong>{combat.adversaire}</strong>
                    </div>
                    <div className="info">
                      <span>{combat.heure}</span> ·{" "}
                      <span>Aire {combat.aire}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* ✅ Légende */}
      <div className="bracket-legend">
        <h4>Légende des couleurs :</h4>
        <p>
          <strong style={{ color: "#ff5050" }}>Rouge</strong> = combattant en rouge ·{" "}
          <strong style={{ color: "#5080ff" }}>Bleu</strong> = combattant en bleu
        </p>
      </div>
    </div>
  );
};

export default Bracket;
