import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import "./Bracket.css";

const ETAPES = ["16ème", "8ème", "Quart", "Demi", "Finale"];

const Bracket = () => {
  const [columns, setColumns] = useState([]);
  const [editingCard, setEditingCard] = useState(null); // { participant, num }

  // Charger les données depuis Firestore
  useEffect(() => {
    const fetchData = async () => {
      const bracketCol = collection(db, "brackets");
      const snapshot = await getDocs(bracketCol);
      const data = {};
      snapshot.forEach((docSnap) => {
        data[docSnap.id] = docSnap.data().combats;
      });

      const cols = ETAPES.map((etape) => {
        const combats = [];
        for (const key in data) {
          data[key].forEach((c) => {
            if (c.etape === etape) combats.push(c);
          });
        }
        return combats;
      });

      setColumns(cols);
    };
    fetchData();
  }, []);

  // Sauvegarder modification dans Firestore
  const handleSave = async (participantId, num, field, value) => {
    const newColumns = columns.map((combats) =>
      combats.map((c) => {
        if (c.participant === participantId && c.num === num) {
          return { ...c, [field]: value };
        }
        return c;
      })
    );
    setColumns(newColumns);

    const docRef = doc(db, "brackets", participantId);
    const participantCombats = newColumns.flat().filter(c => c.participant === participantId);
    await updateDoc(docRef, { combats: participantCombats });

    setEditingCard(null);
  };

  return (
    <div className="bracket-container">
      {columns.map((combats, colIdx) => (
        <div className="bracket-column" key={colIdx}>
          <h3>{ETAPES[colIdx]}</h3>
          {combats.map((combat, idx) => {
            const isEditing =
              editingCard &&
              editingCard.participant === combat.participant &&
              editingCard.num === combat.num;

            return (
              <div className="combat-card-wrapper" key={idx}>
                <div
                  className={`combat-card ${
                    combat.couleur.toLowerCase() === "rouge"
                      ? "rouge"
                      : "bleu"
                  } etape-${ETAPES[colIdx]
                    .toLowerCase()
                    .replace("è", "e")}`}
                >
                  {/* Badge étape */}
                  <div className="combat-step-badge">{ETAPES[colIdx]}</div>

                  {isEditing ? (
                    <div className="editing-fields">
                      <input
                        type="text"
                        value={combat.participant}
                        onChange={(e) =>
                          setColumns(prev => prev.map(col => col.map(c => c.participant === combat.participant && c.num === combat.num ? {...c, participant: e.target.value} : c)))
                        }
                        placeholder="Nom"
                      />
                      <input
                        type="text"
                        value={combat.adversaire}
                        onChange={(e) =>
                          setColumns(prev => prev.map(col => col.map(c => c.participant === combat.participant && c.num === combat.num ? {...c, adversaire: e.target.value} : c)))
                        }
                        placeholder="Adversaire"
                      />
                      <input
                        type="text"
                        value={combat.num}
                        onChange={(e) =>
                          setColumns(prev => prev.map(col => col.map(c => c.participant === combat.participant && c.num === combat.num ? {...c, num: e.target.value} : c)))
                        }
                        placeholder="Numéro"
                      />
                      <input
                        type="text"
                        value={combat.heure}
                        onChange={(e) =>
                          setColumns(prev => prev.map(col => col.map(c => c.participant === combat.participant && c.num === combat.num ? {...c, heure: e.target.value} : c)))
                        }
                        placeholder="Heure"
                      />
                      <input
                        type="text"
                        value={combat.aire}
                        onChange={(e) =>
                          setColumns(prev => prev.map(col => col.map(c => c.participant === combat.participant && c.num === combat.num ? {...c, aire: e.target.value} : c)))
                        }
                        placeholder="Aire"
                      />
                      <div className="editing-btns">
                        <button
                          onClick={() =>
                            handleSave(combat.participant, combat.num, "participant", combat.participant)
                          }
                        >
                          Valider
                        </button>
                        <button onClick={() => setEditingCard(null)}>Annuler</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="participant">{combat.participant}</div>
                      <div className="versus">vs {combat.adversaire}</div>
                      <div className="combat-info">
                        #{combat.num} - {combat.heure} - Aire {combat.aire}
                      </div>
                      <button
                        className="edit-btn"
                        onClick={() =>
                          setEditingCard({ participant: combat.participant, num: combat.num })
                        }
                      >
                        Modifier
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default Bracket;
