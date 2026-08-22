const RISK_STYLES = {
  LOW: "bg-teal/10 text-teal border-teal/30",
  MEDIUM: "bg-gold/10 text-gold border-gold/30",
  HIGH: "bg-alert/10 text-alert border-alert/30",
  CRITICAL: "bg-alert/20 text-alert border-alert/50",
};

export function RiskBadge({ level }) {
  if (!level) return null;
  const cls = RISK_STYLES[level] || RISK_STYLES.MEDIUM;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-mono uppercase tracking-wide ${cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {level}
    </span>
  );
}

export function DriftPulse({ hasDrift }) {
  if (!hasDrift) {
    return <span className="text-[11px] font-mono text-teal">aligned</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-alert">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-alert opacity-60" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-alert" />
      </span>
      drift
    </span>
  );
}
