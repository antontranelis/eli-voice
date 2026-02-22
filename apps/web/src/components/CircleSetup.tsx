import { useState } from "react";

interface CircleSetupProps {
  participants: string[];
  onStart: (order: string[]) => void;
}

export function CircleSetup({ participants: initial, onStart }: CircleSetupProps) {
  const [order, setOrder] = useState<string[]>(initial);
  const [newName, setNewName] = useState("");

  const addParticipant = () => {
    const name = newName.trim();
    if (name && !order.includes(name)) {
      setOrder((prev) => [...prev, name]);
      setNewName("");
    }
  };

  const remove = (name: string) => {
    if (name === "Eli") return; // Eli bleibt immer
    setOrder((prev) => prev.filter((n) => n !== name));
  };

  const moveUp = (i: number) => {
    if (i === 0) return;
    setOrder((prev) => {
      const next = [...prev];
      [next[i - 1], next[i]] = [next[i], next[i - 1]];
      return next;
    });
  };

  const moveDown = (i: number) => {
    if (i === order.length - 1) return;
    setOrder((prev) => {
      const next = [...prev];
      [next[i], next[i + 1]] = [next[i + 1], next[i]];
      return next;
    });
  };

  return (
    <div className="circle-setup">
      <h2>Redekreis einrichten</h2>
      <p className="setup-hint">Reihenfolge der Sitzordnung im Kreis</p>

      <div className="participant-list">
        {order.map((name, i) => (
          <div key={name} className={`participant-item ${name === "Eli" ? "eli" : ""}`}>
            <span className="participant-number">{i + 1}</span>
            <span className="participant-name">{name}</span>
            <div className="participant-actions">
              <button onClick={() => moveUp(i)} disabled={i === 0} className="btn btn-tiny">^</button>
              <button onClick={() => moveDown(i)} disabled={i === order.length - 1} className="btn btn-tiny">v</button>
              {name !== "Eli" && (
                <button onClick={() => remove(name)} className="btn btn-tiny btn-remove">x</button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="add-participant">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addParticipant()}
          placeholder="Name hinzufugen"
        />
        <button onClick={addParticipant} className="btn btn-small">+</button>
      </div>

      <button
        onClick={() => onStart(order)}
        disabled={order.length < 2}
        className="btn btn-start-circle"
      >
        Kreis starten
      </button>
    </div>
  );
}
