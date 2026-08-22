import { useEffect, useState } from "react";
import { api } from "../api";
import StatCard from "../components/StatCard";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.dashboard().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="p-8">
        <p className="text-alert font-mono text-sm">Could not reach the API: {error}</p>
        <p className="text-ash text-sm mt-2">
          Make sure the backend is running (`npm run dev` in /backend) and the database is seeded (`npm run seed`).
        </p>
      </div>
    );
  }
  if (!data) return <div className="p-8 text-ash">Loading project health...</div>;

  const healthColor = data.projectHealth >= 80 ? "text-teal" : data.projectHealth >= 50 ? "text-gold" : "text-alert";

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="font-display text-2xl font-semibold">Project Health</h1>
      <p className="text-ash text-sm mt-1">How closely the implementation currently tracks the known requirements.</p>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-1 bg-panel border border-line rounded-lg p-6 flex flex-col items-center justify-center">
          <p className={`font-display text-5xl font-bold ${healthColor}`}>{data.projectHealth}</p>
          <p className="text-ash text-xs font-mono mt-1">/ 100</p>
        </div>
        <div className="md:col-span-3 grid grid-cols-3 gap-4">
          <StatCard label="Requirement Alignment" value={`${data.requirementAlignment}%`} accent="text-signal" />
          <StatCard label="Implementation Coverage" value={`${data.implementationCoverage}%`} accent="text-teal" />
          <StatCard label="Test Alignment" value={`${data.testAlignment}%`} accent="text-gold" />
        </div>
      </div>

      <h2 className="font-display text-lg font-semibold mt-10">Overview</h2>
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Requirements" value={data.requirements} />
        <StatCard label="Code Components" value={data.codeComponents} />
        <StatCard label="Changed Requirements" value={data.changedRequirements} accent="text-gold" />
        <StatCard label="Drift Issues" value={data.driftIssues} accent={data.driftIssues > 0 ? "text-alert" : "text-teal"} sub={`level: ${data.driftLevel}`} />
        <StatCard label="High Impact Changes" value={data.highImpactChanges} accent="text-alert" />
        <StatCard label="Pending Suggestions" value={data.pendingSuggestions} accent="text-signal" />
      </div>
    </div>
  );
}
