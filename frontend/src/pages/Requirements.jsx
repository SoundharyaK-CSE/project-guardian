import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

export default function Requirements() {
  const [list, setList] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: "", title: "", text: "" });
  const [error, setError] = useState(null);

  const load = () => api.requirements.list().then(setList).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await api.requirements.create(form);
      setForm({ code: "", title: "", text: "" });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Requirements</h1>
          <p className="text-ash text-sm mt-1">Plain-English requirements, understood and tracked by Guardian.</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="bg-signal text-white text-sm font-medium px-4 py-2 rounded-md hover:opacity-90"
        >
          {showForm ? "Cancel" : "New requirement"}
        </button>
      </div>

      {error && <p className="text-alert text-sm mt-4 font-mono">{error}</p>}

      {showForm && (
        <form onSubmit={handleCreate} className="mt-6 bg-panel border border-line rounded-lg p-5 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <input
              placeholder="Code (e.g. REQ-003)"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              className="col-span-1 bg-panel2 border border-line rounded px-3 py-2 text-sm font-mono"
              required
            />
            <input
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="col-span-2 bg-panel2 border border-line rounded px-3 py-2 text-sm"
              required
            />
          </div>
          <textarea
            placeholder="Requirement text, e.g. Users can log in using email and password."
            value={form.text}
            onChange={(e) => setForm({ ...form, text: e.target.value })}
            className="w-full bg-panel2 border border-line rounded px-3 py-2 text-sm h-20"
            required
          />
          <button type="submit" className="bg-teal/90 text-ink font-semibold text-sm px-4 py-2 rounded-md hover:opacity-90">
            Create & analyze
          </button>
        </form>
      )}

      <div className="mt-6 space-y-3">
        {list.map((r) => (
          <Link
            key={r.id}
            to={`/requirements/${r.id}`}
            className="block bg-panel border border-line rounded-lg p-4 hover:border-signal/50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-xs text-signal">{r.code}</span>
                <span className="text-ash text-xs ml-2">v{r.current_version}</span>
                <h3 className="font-medium mt-1">{r.title}</h3>
                <p className="text-sm text-ash mt-1">{r.current_text}</p>
              </div>
            </div>
          </Link>
        ))}
        {list.length === 0 && !error && <p className="text-ash text-sm">No requirements yet. Seed the database or create one above.</p>}
      </div>
    </div>
  );
}
