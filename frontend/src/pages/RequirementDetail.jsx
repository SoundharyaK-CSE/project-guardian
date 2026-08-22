import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import { RiskBadge } from "../components/Badge";

export default function RequirementDetail() {
  const { id } = useParams();
  const [requirement, setRequirement] = useState(null);
  const [newVersionText, setNewVersionText] = useState("");
  const [impactHistory, setImpactHistory] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    const r = await api.requirements.get(id);
    setRequirement(r);
    setImpactHistory(await api.analysis.history(id));
    setSuggestions(await api.analysis.suggestions(id));
  };

  useEffect(() => { load().catch((e) => setError(e.message)); }, [id]);

  async function handleAddVersion(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.requirements.addVersion(id, newVersionText);
      setNewVersionText("");
      await load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  async function runImpact() {
    setBusy(true);
    try {
      await api.analysis.runImpact(id);
      await load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  async function makeSuggestions() {
    setBusy(true);
    try {
      await api.analysis.generateSuggestions(id);
      await load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  async function decide(sid, status) {
    await api.analysis.decideSuggestion(sid, status);
    await load();
  }

  if (error) return <div className="p-8 text-alert font-mono text-sm">{error}</div>;
  if (!requirement) return <div className="p-8 text-ash">Loading...</div>;

  const latestImpact = impactHistory[0];

  return (
    <div className="p-8 max-w-5xl space-y-8">
      <div>
        <span className="font-mono text-xs text-signal">{requirement.code}</span>
        <h1 className="font-display text-2xl font-semibold mt-1">{requirement.title}</h1>
      </div>

      {/* Version history */}
      <section>
        <h2 className="font-display text-lg font-semibold mb-3">Version history</h2>
        <div className="space-y-2">
          {requirement.versions.map((v) => (
            <div key={v.id} className="bg-panel border border-line rounded-lg p-4">
              <div className="flex items-center gap-2 text-xs font-mono text-ash">
                <span>v{v.version}</span>
                <span>·</span>
                <span>{new Date(v.created_at).toLocaleString()}</span>
              </div>
              <p className="mt-1 text-sm">{v.text}</p>
              {v.understanding && (
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  {v.understanding.entities?.length > 0 && (
                    <div><span className="text-ash">Entities: </span>{v.understanding.entities.join(", ")}</div>
                  )}
                  {v.understanding.related_modules?.length > 0 && (
                    <div><span className="text-ash">Modules: </span>{v.understanding.related_modules.join(", ")}</div>
                  )}
                  {v.understanding.security_notes?.length > 0 && (
                    <div className="col-span-2 text-gold"><span className="text-ash">Security: </span>{v.understanding.security_notes.join("; ")}</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleAddVersion} className="mt-3 flex gap-2">
          <input
            value={newVersionText}
            onChange={(e) => setNewVersionText(e.target.value)}
            placeholder="Describe the new/updated requirement..."
            className="flex-1 bg-panel2 border border-line rounded px-3 py-2 text-sm"
            required
          />
          <button disabled={busy} className="bg-signal text-white text-sm font-medium px-4 py-2 rounded-md">
            Add version
          </button>
        </form>
      </section>

      {/* Impact analysis */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Impact analysis</h2>
          <button onClick={runImpact} disabled={busy || requirement.current_version < 2} className="bg-panel2 border border-line text-sm px-3 py-1.5 rounded-md disabled:opacity-40">
            Run impact analysis (latest vs previous)
          </button>
        </div>

        {latestImpact ? (
          <div className="mt-3 bg-panel border border-line rounded-lg p-5">
            <div className="flex items-center gap-3">
              <span className="font-display text-2xl font-semibold text-gold">{latestImpact.impact_score}/100</span>
              <RiskBadge level={latestImpact.risk_level} />
            </div>
            {latestImpact.reasoning && <p className="text-sm text-ash mt-2">{latestImpact.reasoning}</p>}

            <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
              <div>
                <p className="text-xs text-ash font-mono uppercase mb-1">Directly affected</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {(latestImpact.directly_affected || []).map((c, i) => (
                    <li key={i}>{c.component} <span className="text-ash">— {c.reason}</span></li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs text-ash font-mono uppercase mb-1">Indirectly affected</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {(latestImpact.indirectly_affected || []).map((c, i) => (
                    <li key={i}>{c.component} <span className="text-ash">— {c.reason}</span></li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs text-ash font-mono uppercase mb-1">Testing impact</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {(latestImpact.testing_impact || []).map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              </div>
              <div>
                <p className="text-xs text-ash font-mono uppercase mb-1">Database impact</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {(latestImpact.database_impact || []).map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              </div>
            </div>

            <button onClick={makeSuggestions} disabled={busy} className="mt-4 bg-teal/90 text-ink font-semibold text-sm px-4 py-2 rounded-md">
              Generate AI change suggestions
            </button>
          </div>
        ) : (
          <p className="text-ash text-sm mt-3">No analysis yet. Add a second version and run impact analysis.</p>
        )}
      </section>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <section>
          <h2 className="font-display text-lg font-semibold mb-3">AI change suggestions — developer approval required</h2>
          <div className="space-y-3">
            {suggestions.map((s) => (
              <div key={s.id} className="bg-panel border border-line rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{s.component_id ? s.component_id : s.proposed_change?.slice(0, 40)}</span>
                  <RiskBadge level={s.risk_level} />
                </div>
                <p className="text-sm mt-2">{s.proposed_change}</p>
                <p className="text-xs text-ash mt-1">{s.reason}</p>
                <div className="mt-2 font-mono text-xs bg-panel2 rounded p-2 space-y-1">
                  <div className="text-alert">- {s.diff_before}</div>
                  <div className="text-teal">+ {s.diff_after}</div>
                </div>
                {s.status === "pending" ? (
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => decide(s.id, "approved")} className="bg-teal/90 text-ink text-xs font-semibold px-3 py-1.5 rounded">Approve</button>
                    <button onClick={() => decide(s.id, "rejected")} className="bg-panel2 border border-line text-xs px-3 py-1.5 rounded">Reject</button>
                  </div>
                ) : (
                  <p className={`mt-3 text-xs font-mono ${s.status === "approved" ? "text-teal" : "text-alert"}`}>{s.status}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
