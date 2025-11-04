// src/MiniBrackets.js
import { useEffect, useState } from "react";
import "./Bracket.css"; // Tu peux créer ou utiliser ton Bracket.css existant

export default function MiniBrackets() {
  const [brackets, setBrackets] = useState({});
  const [discipline, setDiscipline] = useState("LightContact");

  useEffect(() => {
    fetch("/brackets.json")
      .then((res) => res.json())
      .then((data) => setBrackets(data))
      .catch((err) => console.error("Erreur chargement JSON", err));
  }, []);

  if (!brackets[discipline]) return <p>Chargement...</p>;

  const renderBracket = (discipline) => {
    const data = brackets[discipline];
    return Object.keys(data).map((participant) => (
      <div key={participant} className="participant-card">
        <h3 className="participant-name">{participant}</h3>
        {data[participant].map((fight, i) => (
          <p key={i} className="fight-info">
            {fight.etape} — {fight.categorie} — {fight.heure}
          </p>
        ))}
      </div>
    ));
  };

  return (
    <div className="mini-brackets-container">
      <div className="sidebar">
        {Object.keys(brackets).map((d) => (
          <button
            key={d}
            className={discipline === d ? "active" : ""}
            onClick={() => setDiscipline(d)}
          >
            {d}
          </button>
        ))}
      </div>
      <div className="bracket-container">{renderBracket(discipline)}</div>
    </div>
  );
}
