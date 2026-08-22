import { useEffect, useState } from "react";
import { api } from "../api";

export default function Drift() {
  const [issues, setIssues] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [form, setForm] = useState({ requirementId: "", observedImplementation: "" });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const load = () => api.drift.list().then(setIssues).catch((e) => setError(e.message));
  useEffect(() => {
    load();
    api.requirements.list().then(setRequirements).catch(() => {});
  }, []);

  async function runCheck(e) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const res = await api.drift.check(form);
      setResult(res);
      load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  async function decide(id, status) {
    await api.drift.decide(id, status);
    load();
  }

  const severityColor = { LOW: "text-teal", MEDIUM: "text-gold", HIGH: "text-alert", CRITICAL: "text-alert" };

  return (
    <div className="p-8 max-w-5xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">Drift detection</h1>
        <p className="text-ash text-sm mt-1">Compare a requirement's expected behavior to what's actually implemented.</p>
      </div>

      <form onSubmit={runCheck} className="bg-panel border border-line rounded-lg p-5 space-y-3">
        <select
          value={form.requirementId}
          onChange={(e) => setForm({ ...form, requirementId: e.target.value })}
          className="w-full bg-panel2 border border-line rounded px-3 py-2 text-sm"
          required
        >
          <option value="">Select a requirement...</option>
          {requirements.map((r) => (
            <option key={r.id} value={r.id}>{r.code} — {r.title}</option>
          ))}
        </select>
        <textarea
          placeholder="Describe what the implementation actually does..."
          value={form.observedImplementation}
          onChange={(e) => setForm({ ...form, observedImplementation: e.target.value })}
          className="w-full bg-panel2 border border-line rounded px-3 py-2 text-sm h-20"
          required
        />
        <button disabled={busy} className="bg-signal text-white text-sm font-medium px-4 py-2 rounded-md">
          Check for drift
        </button>
      </form>

      {error && <p className="text-alert font-mono text-sm">{error}</p>}

      {result && (
        <div className={`border rounded-lg p-4 ${result.has_drift ? "border-alert/40 bg-alert/5" : "border-teal/40 bg-teal/5"}`}>
          <p className={`font-mono text-xs uppercase ${result.has_drift ? "text-alert" : "text-teal"}`}>
            {result.has_drift ? "Drift detected" : "No drift detected"}
          </p>
          <p className="text-sm mt-1">{result.explanation}</p>
        </div>
      )}

      <section>
        <h2 className="font-display text-lg font-semibold mb-3">Open drift issues</h2>
        <div className="space-y-3">
          {issues.map((i) => (
            <div key={i.id} className="bg-panel border border-line rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-signal">{i.requirement_code}</span>
                <span className={`font-mono text-xs uppercase ${severityColor[i.severity]}`}>{i.severity} · {i.drift_type}</span>
              </div>
              <p className="text-sm mt-2"><span className="text-ash">Expected:</span> {i.expected_behavior}</p>
              <p className="text-sm mt-1"><span className="text-ash">Observed:</span> {i.observed_behavior}</p>
              {i.status === "open" && (
                <div className="mt-3 flex gap-2">
                  <button onClick={() => decide(i.id, "acknowledged")} className="bg-panel2 border border-line text-xs px-3 py-1.5 rounded">Acknowledge</button>
                  <button onClick={() => decide(i.id, "resolved")} className="bg-teal/90 text-ink text-xs font-semibold px-3 py-1.5 rounded">Mark resolved</button>
                </div>
              )}
              {i.status !== "open" && <p className="mt-2 text-xs font-mono text-ash">{i.status}</p>}
            </div>
          ))}
          {issues.length === 0 && <p className="text-ash text-sm">No drift issues recorded.</p>}
        </div>
      </section>
    </div>
  );
}
