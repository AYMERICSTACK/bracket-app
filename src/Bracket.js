import React, { useState, useEffect, useRef } from "react";
import "./Bracket.css";

const ETAPES = ["16ème", "8ème", "Quart", "Demi", "Finale"];

const Bracket = () => {
  const [columns, setColumns] = useState([]);
  const [couleursParticipants, setCouleursParticipants] = useState({});
  const svgRef = useRef(null);

  // refs pour chaque carte : refs[participant][etape] = ref
  const refs = useRef({});

  const genererCouleurUnique = (nom) => {
    const hash = Array.from(nom)
      .reduce((acc, char) => acc + char.charCodeAt(0), 0)
      .toString(16);
    const hue = parseInt(hash.substring(0, 3), 16) % 360;
    return `hsl(${hue}, 70%, 60%)`;
  };

  useEffect(() => {
    fetch(`${process.env.PUBLIC_URL}/brackets.json`)
      .then((res) => res.json())
      .then((data) => {
        const couleurs = {};
        Object.keys(data).forEach((nom) => {
          couleurs[nom] = genererCouleurUnique(nom);
          refs.current[nom] = {}; // init refs
        });
        setCouleursParticipants(couleurs);

        const cols = ETAPES.map((etape) => {
          const combats = [];
          for (const key in data) {
            const participantCombats = data[key];
            participantCombats.forEach((c) => {
              if (c.etape === etape) combats.push({ ...c, participant: key });
            });
          }
          return combats;
        });
        setColumns(cols);
      })
      .catch((err) => console.error("Erreur chargement JSON:", err));
  }, []);

  // Dessiner les lignes après rendu complet
  useEffect(() => {
    if (!columns.length) return;
    const svg = svgRef.current;
    const cont = svg.parentElement;

    while (svg.firstChild) svg.removeChild(svg.firstChild);

    Object.keys(refs.current).forEach((participant) => {
      const etapesParticipant = ETAPES.filter(
        (etape) => refs.current[participant][etape]
      );

      for (let i = 0; i < etapesParticipant.length - 1; i++) {
        const startRef = refs.current[participant][etapesParticipant[i]];
        const endRef = refs.current[participant][etapesParticipant[i + 1]];

        if (!startRef.current || !endRef.current) continue;

        const r = startRef.current.getBoundingClientRect();
        const n = endRef.current.getBoundingClientRect();
        const offset = cont.getBoundingClientRect();

        const x1 = r.right - offset.left;
        const y1 = r.top + r.height / 2 - offset.top;
        const x2 = n.left - offset.left;
        const y2 = n.top + n.height / 2 - offset.top;

        const path = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path"
        );
        path.setAttribute(
          "d",
          `M${x1},${y1} C${x1 + 50},${y1} ${x2 - 50},${y2} ${x2},${y2}`
        );
        path.setAttribute("stroke", couleursParticipants[participant]);
        path.setAttribute("stroke-width", 3);
        path.setAttribute("fill", "none");

        svg.appendChild(path);
      }
    });
  }, [columns, couleursParticipants]);

  return (
    <div className="bracket-container" style={{ position: "relative" }}>
      <svg
        ref={svgRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      />
      {columns.map((combats, colIdx) => (
        <div className="bracket-column" key={colIdx}>
          <h3>{ETAPES[colIdx]}</h3>
          {combats.map((combat, idx) => {
            if (!refs.current[combat.participant][ETAPES[colIdx]]) {
              refs.current[combat.participant][ETAPES[colIdx]] = React.createRef();
            }
            const cardRef = refs.current[combat.participant][ETAPES[colIdx]];
            return (
              <div className="combat-card-wrapper" key={idx} ref={cardRef}>
                <div
                  className={`combat-card ${
                    combat.couleur?.toLowerCase() === "rouge" ? "rouge" : "bleu"
                  }`}
                  style={{
                    borderLeft: `5px solid ${
                      couleursParticipants[combat.participant] || "#999"
                    }`,
                  }}
                >
                  <div className="etape-badge">{ETAPES[colIdx]}</div>
                  <div className="participant">{combat.participant}</div>
                  <div className="versus">vs {combat.adversaire}</div>
                  <div className="info">
                    {combat.heure} - Aire {combat.aire}
                  </div>
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
