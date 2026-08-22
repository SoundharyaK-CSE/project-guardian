import { useEffect, useState } from "react";
import { api } from "../api";
import { DriftPulse } from "../components/Badge";

export default function Traceability() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.traceability.matrix().then(setRows).catch((e) => setError(e.message));
  }, []);

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="font-display text-2xl font-semibold">Traceability matrix</h1>
      <p className="text-ash text-sm mt-1">Which components implement which requirements, and where drift has been flagged.</p>

      {error && <p className="text-alert font-mono text-sm mt-4">{error}</p>}

      <div className="mt-6 bg-panel border border-line rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-mono uppercase text-ash border-b border-line">
              <th className="px-4 py-3">Requirement</th>
              <th className="px-4 py-3">Component</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Relationship</th>
              <th className="px-4 py-3">Confidence</th>
              <th className="px-4 py-3">Drift</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line/60 last:border-0">
                <td className="px-4 py-3 font-mono text-signal text-xs">{r.requirement_code}</td>
                <td className="px-4 py-3">{r.component_name}</td>
                <td className="px-4 py-3 text-ash text-xs">{r.component_type}</td>
                <td className="px-4 py-3 text-xs capitalize">{r.relationship}</td>
                <td className="px-4 py-3">
                  <div className="w-24 h-1.5 bg-panel2 rounded-full overflow-hidden">
                    <div className="h-full bg-signal" style={{ width: `${r.confidence}%` }} />
                  </div>
                  <span className="text-[11px] text-ash font-mono">{r.confidence}%</span>
                </td>
                <td className="px-4 py-3"><DriftPulse hasDrift={r.has_drift} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && !error && (
          <p className="p-6 text-ash text-sm">No traceability links yet. Seed the database to see the REQ-001 example.</p>
        )}
      </div>
    </div>
  );
}
