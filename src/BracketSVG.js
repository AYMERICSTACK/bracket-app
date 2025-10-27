import React, { useState, useEffect } from "react";

const ETAPES = ["16ème", "8ème", "Quart", "Demi", "Finale"];
const STEP_X = 220; // espacement horizontal entre colonnes
const BOX_WIDTH = 160;
const BOX_HEIGHT = 40;
const V_SPACING = 20; // espace vertical minimum entre combats

const BracketSVG = () => {
  const [combatsPositions, setCombatsPositions] = useState([]);

  useEffect(() => {
    fetch(`${process.env.PUBLIC_URL}/brackets.json`)
      .then((res) => res.json())
      .then((data) => {
        const combatsByEtape = {};
        ETAPES.forEach((e) => (combatsByEtape[e] = []));

        // Organiser les combats par étape
        for (const key in data) {
          data[key].forEach((c) => {
            combatsByEtape[c.etape].push(c);
          });
        }

        // Fonction récursive pour calculer la position Y
        const positions = [];
        const assignY = (etapeIdx, index, parentY = null) => {
          const etape = ETAPES[etapeIdx];
          const col = combatsByEtape[etape];
          if (!col[index]) return null;

          let y;
          if (parentY !== null) {
            // Si on a un parent, centre vertical par rapport à lui
            y = parentY;
          } else {
            // Si pas de parent, position en fonction de l’index
            y = index * (BOX_HEIGHT + V_SPACING);
          }

          const combat = col[index];
          const x = etapeIdx * STEP_X;

          positions.push({ ...combat, x, y });

          // Appeler récursivement pour la prochaine étape
          const nextEtapeIdx = etapeIdx + 1;
          if (nextEtapeIdx < ETAPES.length) {
            const nextCol = combatsByEtape[ETAPES[nextEtapeIdx]];
            // trouver le combat dans la prochaine étape pour ce participant
            nextCol.forEach((cNext, idxNext) => {
              if (cNext.participant === combat.participant) {
                assignY(nextEtapeIdx, idxNext, y);
              }
            });
          }
        };

        // Lancer la récursion pour chaque combat de la première étape (16ème)
        combatsByEtape["16ème"].forEach((_, idx) => assignY(0, idx));

        setCombatsPositions(positions);
      })
      .catch((err) => console.error("Erreur JSON:", err));
  }, []);

  return (
    <svg width="1200" height="1000">
      {combatsPositions.map((c, idx) => (
        <g key={idx}>
          {/* Box */}
          <rect
            x={c.x}
            y={c.y}
            width={BOX_WIDTH}
            height={BOX_HEIGHT}
            fill={c.couleur.toLowerCase() === "rouge" ? "#ff5050" : "#5080ff"}
            stroke="#000"
            rx="8"
          />
          {/* Texte */}
          <text x={c.x + 10} y={c.y + 20} fill="#fff" fontSize="12">
            {c.participant} vs {c.adversaire}
          </text>
          <text x={c.x + 10} y={c.y + 35} fill="#eee" fontSize="10">
            {c.heure} - Aire {c.aire}
          </text>

          {/* Connecteur vers la colonne suivante */}
          {idx + 1 < combatsPositions.length &&
            combatsPositions[idx + 1].x > c.x && (
              <line
                x1={c.x + BOX_WIDTH}
                y1={c.y + BOX_HEIGHT / 2}
                x2={combatsPositions[idx + 1].x}
                y2={combatsPositions[idx + 1].y + BOX_HEIGHT / 2}
                stroke="#888"
                strokeWidth="2"
              />
            )}
        </g>
      ))}
    </svg>
  );
};

export default BracketSVG;
