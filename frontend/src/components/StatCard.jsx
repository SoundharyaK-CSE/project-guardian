export default function StatCard({ label, value, accent = "text-white", sub }) {
  return (
    <div className="bg-panel border border-line rounded-lg p-4">
      <p className="text-xs text-ash font-mono uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-display font-semibold mt-2 ${accent}`}>{value}</p>
      {sub && <p className="text-xs text-ash mt-1">{sub}</p>}
    </div>
  );
}
